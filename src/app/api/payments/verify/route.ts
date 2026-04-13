import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { sendTemplateEmail } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";
import Stripe from "stripe";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

// POST /api/payments/verify - Verify KKiaPay or Stripe payment (purchases + subscriptions)
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 payment verifications per minute per IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(`payment-verify:${ip}`, { maxRequests: 10, windowSeconds: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { transactionId, datasetId, paymentMethod, type, planId, billingCycle } = body;

    if (!transactionId || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required fields: transactionId, paymentMethod" },
        { status: 400 }
      );
    }

    // ─── Subscription payment ────────────────────────────────────────
    if (type === "subscription" && planId) {
      return handleSubscriptionVerify(user!, transactionId, paymentMethod, planId, billingCycle || "monthly");
    }

    // ─── Dataset purchase (existing flow) ────────────────────────────
    if (!datasetId) {
      return NextResponse.json(
        { error: "Missing datasetId for purchase verification" },
        { status: 400 }
      );
    }

    // Check if already purchased
    const existingPurchase = await adminDb
      .collection("purchases")
      .where("userId", "==", user!.uid)
      .where("datasetId", "==", datasetId)
      .where("status", "==", "completed")
      .limit(1)
      .get();

    if (!existingPurchase.empty) {
      return NextResponse.json(
        { error: "You have already purchased this dataset", alreadyPurchased: true },
        { status: 400 }
      );
    }

    // Fetch dataset to verify price
    const datasetDoc = await adminDb.collection("datasets").doc(datasetId).get();
    if (!datasetDoc.exists) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    const dataset = datasetDoc.data()!;
    let verified = false;

    verified = await verifyPayment(transactionId, paymentMethod, dataset.price);

    if (!verified) {
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      );
    }

    // Create purchase record
    const purchaseRef = adminDb.collection("purchases").doc();
    await purchaseRef.set({
      userId: user!.uid,
      datasetId,
      datasetTitle: dataset.title,
      amount: dataset.price,
      currency: dataset.currency || "XOF",
      paymentMethod,
      transactionId,
      status: "completed",
      allowDownload: dataset.allowDownload !== false,
      createdAt: new Date().toISOString(),
    });

    // Generate download token
    const downloadToken = uuidv4();
    await adminDb.collection("downloadTokens").add({
      userId: user!.uid,
      datasetId,
      token: downloadToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      used: false,
    });

    // Clean up pending payment record
    const pendingSnap = await adminDb
      .collection("pending_payments")
      .where("userId", "==", user!.uid)
      .where("datasetId", "==", datasetId)
      .limit(5)
      .get();
    const batch = adminDb.batch();
    pendingSnap.docs.forEach((doc) => batch.delete(doc.ref));
    if (!pendingSnap.empty) await batch.commit();

    // Send purchase confirmation email
    try {
      const userDoc = await adminDb.collection("users").doc(user!.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data()!;
        const cur = dataset.currency || "XOF";
        const formatted = (cur === "XOF" || cur === "CFA")
          ? `${dataset.price.toLocaleString()} CFA`
          : `$${dataset.price.toLocaleString()}`;
        sendTemplateEmail("purchase_confirmation", userData.email, {
          name: userData.displayName || userData.email,
          datasetTitle: dataset.title,
          amount: formatted,
          currency: cur,
          date: new Date().toLocaleDateString(),
        }).catch(() => {});
      }
    } catch { /* non-blocking */ }

    return NextResponse.json({
      success: true,
      purchaseId: purchaseRef.id,
      downloadToken,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}

// ─── Verify payment with provider ──────────────────────────────────────
async function verifyPayment(
  transactionId: string,
  paymentMethod: string,
  expectedAmount: number
): Promise<boolean> {
  if (paymentMethod === "kkiapay") {
    try {
      const kkiapayResponse = await fetch(
        "https://api.kkiapay.me/api/v1/transactions/status",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-private-key": process.env.KKIAPAY_PRIVATE_KEY || "",
            "x-secret-key": process.env.KKIAPAY_SECRET || "",
            "x-api-key": process.env.NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY || "",
          },
          body: JSON.stringify({ transactionId }),
        }
      );

      if (kkiapayResponse.ok) {
        const kkData = await kkiapayResponse.json();
        if (kkData.status === "SUCCESS" && kkData.amount >= expectedAmount) {
          return true;
        }
      }
    } catch (kkError) {
      console.error("KKiaPay verification error:", kkError);
    }
  } else if (paymentMethod === "paydunya") {
    try {
      const settingsDoc = await adminDb.collection("settings").doc("payment").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : null;

      const isValidKey = (key: string | undefined): key is string =>
        !!key && key.length > 0 && !key.includes("\u2022");

      const pdSettings = settings?.paydunya;
      const masterKey = isValidKey(pdSettings?.masterKey) ? pdSettings.masterKey : (process.env.PAYDUNYA_MASTER_KEY || "");
      const privateKey = isValidKey(pdSettings?.privateKey) ? pdSettings.privateKey : (process.env.PAYDUNYA_PRIVATE_KEY || "");
      const token = isValidKey(pdSettings?.token) ? pdSettings.token : (process.env.PAYDUNYA_TOKEN || "");
      const mode = pdSettings?.mode || process.env.PAYDUNYA_MODE || "test";

      const baseURL = mode === "live"
        ? "https://app.paydunya.com/api/v1"
        : "https://app.paydunya.com/sandbox-api/v1";

      const confirmRes = await fetch(`${baseURL}/checkout-invoice/confirm/${transactionId}`, {
        headers: {
          "PAYDUNYA-MASTER-KEY": masterKey,
          "PAYDUNYA-PRIVATE-KEY": privateKey,
          "PAYDUNYA-TOKEN": token,
        },
      });

      if (confirmRes.ok) {
        const confirmData = await confirmRes.json();
        if (confirmData.response_code === "00" && confirmData.status === "completed") {
          return true;
        }
      }
    } catch (pdError) {
      console.error("PayDunya verification error:", pdError);
    }
  } else if (paymentMethod === "stripe") {
    try {
      const settingsDoc = await adminDb.collection("settings").doc("payment").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : null;
      const secretKey = settings?.stripe?.secretKey || process.env.STRIPE_SECRET_KEY;
      if (secretKey) {
        const stripe = new Stripe(secretKey);
        const session = await stripe.checkout.sessions.retrieve(transactionId);
        if (session.payment_status === "paid") {
          const amountPaid = (session.amount_total || 0) / 100;
          if (amountPaid >= expectedAmount) return true;
        }
      }
    } catch (stripeError) {
      console.error("Stripe verification error:", stripeError);
    }
  }

  return false;
}

// ─── Handle subscription verification ──────────────────────────────────
async function handleSubscriptionVerify(
  user: { uid: string; email?: string },
  transactionId: string,
  paymentMethod: string,
  planId: string,
  billingCycle: string
) {
  // Fetch plan
  const planDoc = await adminDb.collection("membershipPlans").doc(planId).get();
  if (!planDoc.exists) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const plan = planDoc.data()!;
  const cycle = billingCycle === "yearly" ? "yearly" : "monthly";
  const pricing = plan.pricing[cycle];
  const amount = pricing.price;

  const verified = await verifyPayment(transactionId, paymentMethod, amount);
  if (!verified) {
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 400 }
    );
  }

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + (cycle === "yearly" ? 365 : 30));

  const nowISO = now.toISOString();
  const endISO = endDate.toISOString();

  // Check for existing subscription to renew
  const existingSub = await adminDb
    .collection("subscriptions")
    .where("userId", "==", user.uid)
    .where("planId", "==", planId)
    .limit(1)
    .get();

  const paymentRecord = {
    amount,
    currency: pricing.currency || "XOF",
    paymentMethod,
    transactionId,
    paidAt: nowISO,
    periodStart: nowISO,
    periodEnd: endISO,
    billingCycle: cycle,
  };

  let subscriptionId: string;

  if (!existingSub.empty) {
    // Renew existing subscription
    const doc = existingSub.docs[0];
    const subData = doc.data();
    const payments = subData.payments || [];
    payments.push(paymentRecord);

    await doc.ref.update({
      status: "active",
      billingCycle: cycle,
      startDate: nowISO,
      endDate: endISO,
      renewalCount: (subData.renewalCount || 0) + 1,
      lastPaymentDate: nowISO,
      lastPaymentAmount: amount,
      lastPaymentMethod: paymentMethod,
      lastTransactionId: transactionId,
      payments,
      cancelledAt: null,
      updatedAt: nowISO,
    });

    subscriptionId = doc.id;
  } else {
    // Create new subscription
    const subRef = await adminDb.collection("subscriptions").add({
      userId: user.uid,
      planId,
      planName: plan.name,
      billingCycle: cycle,
      status: "active",
      startDate: nowISO,
      endDate: endISO,
      renewalCount: 0,
      lastPaymentDate: nowISO,
      lastPaymentAmount: amount,
      lastPaymentMethod: paymentMethod,
      lastTransactionId: transactionId,
      payments: [paymentRecord],
      cancelledAt: null,
      createdAt: nowISO,
      updatedAt: nowISO,
    });

    subscriptionId = subRef.id;

    // Increment subscriber count on plan
    await adminDb
      .collection("membershipPlans")
      .doc(planId)
      .update({
        subscriberCount: (plan.subscriberCount || 0) + 1,
        updatedAt: nowISO,
      });
  }

  // Update user's activePlanId
  await adminDb.collection("users").doc(user.uid).update({
    activePlanId: planId,
  });

  // Send subscription email
  try {
    const userDoc = await adminDb.collection("users").doc(user.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data()!;
      const cur = paymentRecord.currency || "XOF";
      const formatted = (cur === "XOF" || cur === "CFA")
        ? `${amount.toLocaleString()} CFA`
        : `$${amount.toLocaleString()}`;
      const isRenewal = !existingSub.empty;
      sendTemplateEmail(
        isRenewal ? "subscription_renewed" : "subscription_created",
        userData.email,
        {
          name: userData.displayName || userData.email,
          planName: plan.name || "Subscription",
          billingCycle: cycle,
          startDate: new Date(nowISO).toLocaleDateString(),
          endDate: new Date(endISO).toLocaleDateString(),
          renewalDate: new Date(nowISO).toLocaleDateString(),
          nextEndDate: new Date(endISO).toLocaleDateString(),
          amount: formatted,
          currency: cur,
        }
      ).catch(() => {});
    }
  } catch { /* non-blocking */ }

  return NextResponse.json({
    success: true,
    subscriptionId,
    endDate: endISO,
  });
}
