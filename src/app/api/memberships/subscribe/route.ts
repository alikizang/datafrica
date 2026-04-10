import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import type { BillingCycle } from "@/types";

// POST /api/memberships/subscribe - Initiate subscription payment
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { planId, billingCycle } = body as {
      planId: string;
      billingCycle: BillingCycle;
    };

    if (!planId || !billingCycle) {
      return NextResponse.json(
        { error: "planId and billingCycle are required" },
        { status: 400 }
      );
    }

    if (!["monthly", "yearly"].includes(billingCycle)) {
      return NextResponse.json(
        { error: "billingCycle must be 'monthly' or 'yearly'" },
        { status: 400 }
      );
    }

    // Fetch the plan
    const planDoc = await adminDb.collection("membershipPlans").doc(planId).get();
    if (!planDoc.exists) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const plan = planDoc.data()!;
    if (plan.status !== "active") {
      return NextResponse.json(
        { error: "This plan is no longer available" },
        { status: 400 }
      );
    }

    // Check if user already has an active subscription to this plan
    const existingSub = await adminDb
      .collection("subscriptions")
      .where("userId", "==", user!.uid)
      .where("planId", "==", planId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (!existingSub.empty) {
      const sub = existingSub.docs[0].data();
      if (new Date(sub.endDate) > new Date()) {
        return NextResponse.json(
          {
            error: "You already have an active subscription to this plan",
            alreadySubscribed: true,
            endDate: sub.endDate,
          },
          { status: 400 }
        );
      }
    }

    const pricing = plan.pricing[billingCycle];
    const amount = pricing.price;
    const currency = pricing.currency || "XOF";

    // Load PayDunya settings
    const settingsDoc = await adminDb.collection("settings").doc("payment").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : null;

    const isValidKey = (key: string | undefined): key is string =>
      !!key && key.length > 0 && !key.includes("\u2022");

    const pdSettings = settings?.paydunya;
    const masterKey = isValidKey(pdSettings?.masterKey)
      ? pdSettings.masterKey
      : process.env.PAYDUNYA_MASTER_KEY || "";
    const privateKey = isValidKey(pdSettings?.privateKey)
      ? pdSettings.privateKey
      : process.env.PAYDUNYA_PRIVATE_KEY || "";
    const token = isValidKey(pdSettings?.token)
      ? pdSettings.token
      : process.env.PAYDUNYA_TOKEN || "";
    const mode = pdSettings?.mode || process.env.PAYDUNYA_MODE || "test";

    if (!masterKey || !privateKey || !token) {
      return NextResponse.json(
        { error: "Payment is not configured. Please contact support." },
        { status: 500 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://mydatafrica.web.app";
    const baseUrl =
      mode === "live"
        ? "https://app.paydunya.com/api/v1"
        : "https://app.paydunya.com/sandbox-api/v1";

    const cycleLabel = billingCycle === "yearly" ? "Annual" : "Monthly";

    const invoiceBody = {
      invoice: {
        items: {
          item_0: {
            name: `${plan.name} - ${cycleLabel} Subscription`,
            quantity: 1,
            unit_price: amount,
            total_price: amount,
          },
        },
        total_amount: amount,
        description: `${plan.name} ${cycleLabel} Membership Subscription`,
      },
      store: {
        name: "Datafrica",
        tagline: "African Data Marketplace",
        website_url: appUrl,
        logo_url: `${appUrl}/logo.png`,
      },
      custom_data: {
        type: "subscription",
        planId,
        planName: plan.name,
        billingCycle,
        userId: user!.uid,
        amount,
        currency,
      },
      actions: {
        return_url: `${appUrl}/dashboard?tab=membership&payment=success`,
        cancel_url: `${appUrl}/pricing?payment=cancelled`,
        callback_url: `${appUrl}/api/payments/paydunya/webhook`,
      },
    };

    const res = await fetch(`${baseUrl}/checkout-invoice/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYDUNYA-MASTER-KEY": masterKey,
        "PAYDUNYA-PRIVATE-KEY": privateKey,
        "PAYDUNYA-TOKEN": token,
      },
      body: JSON.stringify(invoiceBody),
    });

    const data = await res.json();

    if (data.response_code === "00" && data.token) {
      return NextResponse.json({
        success: true,
        url: data.response_text,
        token: data.token,
      });
    } else {
      console.error("PayDunya subscription invoice failed:", JSON.stringify(data));
      return NextResponse.json(
        { error: data.response_text || "Failed to create payment" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json(
      { error: "Failed to initiate subscription" },
      { status: 500 }
    );
  }
}
