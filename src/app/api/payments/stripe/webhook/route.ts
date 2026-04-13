import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { sendTemplateEmail } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";
import Stripe from "stripe";

async function getStripeConfig(): Promise<{ stripe: Stripe; webhookSecret: string } | null> {
  const doc = await adminDb.collection("settings").doc("payment").get();
  const data = doc.exists ? doc.data() : null;
  const secretKey = data?.stripe?.secretKey || process.env.STRIPE_SECRET_KEY;
  const webhookSecret = data?.stripe?.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) return null;
  return { stripe: new Stripe(secretKey), webhookSecret };
}

// POST /api/payments/stripe/webhook
export async function POST(request: NextRequest) {
  try {
    const config = await getStripeConfig();
    if (!config) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = config.stripe.webhooks.constructEvent(body, sig, config.webhookSecret);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};
      const userId = metadata.userId;

      if (!userId) {
        console.error("Stripe webhook: no userId in metadata");
        return NextResponse.json({ received: true });
      }

      if (metadata.type === "subscription") {
        await handleSubscriptionPayment(metadata, session);
      } else if (metadata.type === "dataset") {
        await handleDatasetPayment(metadata, session);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function handleDatasetPayment(
  metadata: Record<string, string>,
  session: Stripe.Checkout.Session
) {
  const { userId, datasetId } = metadata;
  if (!datasetId) return;

  // Check if already purchased
  const existing = await adminDb
    .collection("purchases")
    .where("userId", "==", userId)
    .where("datasetId", "==", datasetId)
    .where("status", "==", "completed")
    .limit(1)
    .get();

  if (!existing.empty) return;

  const datasetDoc = await adminDb.collection("datasets").doc(datasetId).get();
  const dataset = datasetDoc.exists ? datasetDoc.data()! : null;

  await adminDb.collection("purchases").add({
    userId,
    datasetId,
    datasetTitle: dataset?.title || "Unknown",
    amount: (session.amount_total || 0) / 100,
    currency: (session.currency || "xof").toUpperCase(),
    paymentMethod: "stripe",
    transactionId: session.id,
    status: "completed",
    allowDownload: dataset?.allowDownload !== false,
    createdAt: new Date().toISOString(),
  });

  // Generate download token
  await adminDb.collection("downloadTokens").add({
    userId,
    datasetId,
    token: uuidv4(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    used: false,
  });

  // Send purchase confirmation email
  try {
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data()!;
      const amt = (session.amount_total || 0) / 100;
      const cur = (session.currency || "xof").toUpperCase();
      const formatted = (cur === "XOF" || cur === "CFA") ? `${amt.toLocaleString()} CFA` : `$${amt.toLocaleString()}`;
      sendTemplateEmail("purchase_confirmation", userData.email, {
        name: userData.displayName || userData.email,
        datasetTitle: dataset?.title || "Dataset",
        amount: formatted,
        currency: cur,
        date: new Date().toLocaleDateString(),
      }).catch(() => {});
    }
  } catch { /* non-blocking */ }
}

async function handleSubscriptionPayment(
  metadata: Record<string, string>,
  session: Stripe.Checkout.Session
) {
  const { userId, planId, billingCycle } = metadata;
  if (!planId) return;

  const planDoc = await adminDb.collection("membershipPlans").doc(planId).get();
  if (!planDoc.exists) return;
  const plan = planDoc.data()!;

  const cycle = billingCycle === "yearly" ? "yearly" : "monthly";
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + (cycle === "yearly" ? 365 : 30));

  const nowISO = now.toISOString();
  const endISO = endDate.toISOString();

  const paymentRecord = {
    amount: (session.amount_total || 0) / 100,
    currency: (session.currency || "xof").toUpperCase(),
    paymentMethod: "stripe",
    transactionId: session.id,
    paidAt: nowISO,
    periodStart: nowISO,
    periodEnd: endISO,
    billingCycle: cycle,
  };

  // Check for existing subscription to renew
  const existingSub = await adminDb
    .collection("subscriptions")
    .where("userId", "==", userId)
    .where("planId", "==", planId)
    .limit(1)
    .get();

  if (!existingSub.empty) {
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
      lastPaymentAmount: paymentRecord.amount,
      lastPaymentMethod: "stripe",
      lastTransactionId: session.id,
      payments,
      cancelledAt: null,
      updatedAt: nowISO,
    });
  } else {
    await adminDb.collection("subscriptions").add({
      userId,
      planId,
      planName: plan.name,
      billingCycle: cycle,
      status: "active",
      startDate: nowISO,
      endDate: endISO,
      renewalCount: 0,
      lastPaymentDate: nowISO,
      lastPaymentAmount: paymentRecord.amount,
      lastPaymentMethod: "stripe",
      lastTransactionId: session.id,
      payments: [paymentRecord],
      cancelledAt: null,
      createdAt: nowISO,
      updatedAt: nowISO,
    });

    await adminDb
      .collection("membershipPlans")
      .doc(planId)
      .update({
        subscriberCount: (plan.subscriberCount || 0) + 1,
        updatedAt: nowISO,
      });
  }

  await adminDb.collection("users").doc(userId).update({
    activePlanId: planId,
  });

  // Send subscription email
  try {
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data()!;
      const amt = paymentRecord.amount;
      const cur = paymentRecord.currency;
      const formatted = (cur === "XOF" || cur === "CFA") ? `${amt.toLocaleString()} CFA` : `$${amt.toLocaleString()}`;
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
}
