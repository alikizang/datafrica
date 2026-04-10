import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

// POST /api/memberships/renew - Initiate renewal payment for an existing subscription
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "subscriptionId is required" },
        { status: 400 }
      );
    }

    // Fetch subscription
    const subDoc = await adminDb
      .collection("subscriptions")
      .doc(subscriptionId)
      .get();

    if (!subDoc.exists) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    const sub = subDoc.data()!;

    if (sub.userId !== user!.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch the plan
    const planDoc = await adminDb
      .collection("membershipPlans")
      .doc(sub.planId)
      .get();

    if (!planDoc.exists) {
      return NextResponse.json(
        { error: "Plan no longer exists" },
        { status: 404 }
      );
    }

    const plan = planDoc.data()!;
    const billingCycle = sub.billingCycle || "monthly";
    const pricing = plan.pricing[billingCycle];
    const amount = pricing.price;
    const currency = pricing.currency || "XOF";

    // Load PayDunya settings
    const settingsDoc = await adminDb
      .collection("settings")
      .doc("payment")
      .get();
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
        { error: "Payment is not configured." },
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
            name: `${plan.name} - ${cycleLabel} Renewal`,
            quantity: 1,
            unit_price: amount,
            total_price: amount,
          },
        },
        total_amount: amount,
        description: `${plan.name} ${cycleLabel} Subscription Renewal`,
      },
      store: {
        name: "Datafrica",
        tagline: "African Data Marketplace",
        website_url: appUrl,
        logo_url: `${appUrl}/logo.png`,
      },
      custom_data: {
        type: "renewal",
        subscriptionId,
        planId: sub.planId,
        planName: plan.name,
        billingCycle,
        userId: user!.uid,
        amount,
        currency,
      },
      actions: {
        return_url: `${appUrl}/dashboard?tab=membership&payment=renewed`,
        cancel_url: `${appUrl}/dashboard?tab=membership&payment=cancelled`,
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
      console.error("PayDunya renewal invoice failed:", JSON.stringify(data));
      return NextResponse.json(
        { error: data.response_text || "Failed to create payment" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Renew error:", err);
    return NextResponse.json(
      { error: "Failed to initiate renewal" },
      { status: 500 }
    );
  }
}
