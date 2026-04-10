import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

// Parse the request body - PayDunya sends application/x-www-form-urlencoded per their docs
// The data is nested under the "data" key
async function parsePaydunyaWebhook(request: NextRequest): Promise<Record<string, unknown> | null> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    // PayDunya sends nested form data under "data" key
    const dataStr = params.get("data");
    if (dataStr) {
      try {
        return JSON.parse(dataStr);
      } catch {
        // Try parsing as nested URL-encoded form fields
      }
    }
    // Fallback: reconstruct from nested form fields (data[status], data[hash], etc.)
    const result: Record<string, unknown> = {};
    for (const [key, value] of params.entries()) {
      if (key === "data") {
        // Already handled above
      } else if (key.startsWith("data[")) {
        // Simple one-level nesting only: data[status] -> status
        const field = key.slice(5, -1);
        try { result[field] = JSON.parse(value); } catch { result[field] = value; }
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  }

  // Fallback: try JSON parsing (some integrations may send JSON)
  try {
    const body = await request.json();
    return body.data || body;
  } catch {
    return null;
  }
}

// POST /api/payments/paydunya/webhook - PayDunya IPN callback
export async function POST(request: NextRequest) {
  try {
    const data = await parsePaydunyaWebhook(request);

    if (!data) {
      return NextResponse.json({ received: true });
    }

    const status = data.status as string | undefined;
    const hash = data.hash as string | undefined;
    const invoice = data.invoice as Record<string, unknown> | undefined;
    const customData = data.custom_data as Record<string, unknown> | undefined;

    // Verify the hash using SHA-512 of the master key
    const settingsDoc = await adminDb.collection("settings").doc("payment").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : null;

    const isValidKey = (key: string | undefined): key is string =>
      !!key && key.length > 0 && !key.includes("\u2022");

    const pdMasterKey = settings?.paydunya?.masterKey;
    const masterKey = isValidKey(pdMasterKey) ? pdMasterKey : (process.env.PAYDUNYA_MASTER_KEY || "");

    if (masterKey && hash) {
      const expectedHash = crypto.createHash("sha512").update(masterKey).digest("hex");
      if (hash !== expectedHash) {
        console.error("PayDunya webhook hash mismatch");
        return NextResponse.json({ error: "Invalid hash" }, { status: 401 });
      }
    }

    if (status === "completed" && customData) {
      const paymentType = customData.type as string | undefined;

      if (paymentType === "subscription" || paymentType === "renewal") {
        // ─── Subscription / Renewal payment ────────────────────────
        await handleSubscriptionWebhook(customData, invoice);
      } else {
        // ─── Dataset purchase (existing flow) ──────────────────────
        await handlePurchaseWebhook(customData, invoice);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayDunya webhook error:", error);
    return NextResponse.json({ received: true });
  }
}

// ─── Handle dataset purchase webhook ─────────────────────────────────
async function handlePurchaseWebhook(
  customData: Record<string, unknown>,
  invoice: Record<string, unknown> | undefined
) {
  const datasetId = customData.datasetId as string | undefined;
  const userId = customData.userId as string | undefined;
  const datasetTitle = customData.datasetTitle as string | undefined;
  const amount = customData.amount as number | undefined;
  const currency = customData.currency as string | undefined;

  if (!datasetId || !userId) return;

  const transactionId = (invoice?.token as string) || `paydunya_${Date.now()}`;
  const existingPurchase = await adminDb
    .collection("purchases")
    .where("userId", "==", userId)
    .where("datasetId", "==", datasetId)
    .where("status", "==", "completed")
    .limit(1)
    .get();

  if (existingPurchase.empty) {
    let title = datasetTitle;
    let purchaseAmount = amount;
    let purchaseCurrency = currency;

    if (!title) {
      const datasetDoc = await adminDb.collection("datasets").doc(datasetId).get();
      if (datasetDoc.exists) {
        const ds = datasetDoc.data()!;
        title = ds.title;
        purchaseAmount = purchaseAmount || ds.price;
        purchaseCurrency = purchaseCurrency || ds.currency || "XOF";
      }
    }

    await adminDb.collection("purchases").add({
      userId,
      datasetId,
      datasetTitle: title || "Unknown Dataset",
      amount: purchaseAmount || 0,
      currency: purchaseCurrency || "XOF",
      paymentMethod: "paydunya",
      transactionId,
      status: "completed",
      source: "webhook",
      createdAt: new Date().toISOString(),
    });

    const downloadToken = uuidv4();
    await adminDb.collection("downloadTokens").add({
      userId,
      datasetId,
      token: downloadToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      used: false,
    });
  }
}

// ─── Handle subscription / renewal webhook ───────────────────────────
async function handleSubscriptionWebhook(
  customData: Record<string, unknown>,
  invoice: Record<string, unknown> | undefined
) {
  const userId = customData.userId as string | undefined;
  const planId = customData.planId as string | undefined;
  const planName = customData.planName as string | undefined;
  const billingCycle = (customData.billingCycle as string) || "monthly";
  const amount = customData.amount as number | undefined;
  const currency = (customData.currency as string) || "XOF";
  const subscriptionId = customData.subscriptionId as string | undefined; // for renewals

  if (!userId || !planId) return;

  const transactionId = (invoice?.token as string) || `paydunya_sub_${Date.now()}`;
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + (billingCycle === "yearly" ? 365 : 30));

  const nowISO = now.toISOString();
  const endISO = endDate.toISOString();

  const paymentRecord = {
    amount: amount || 0,
    currency,
    paymentMethod: "paydunya",
    transactionId,
    paidAt: nowISO,
    periodStart: nowISO,
    periodEnd: endISO,
    billingCycle,
  };

  if (subscriptionId) {
    // Renewal of existing subscription
    const subDoc = await adminDb.collection("subscriptions").doc(subscriptionId).get();
    if (subDoc.exists) {
      const subData = subDoc.data()!;
      const payments = subData.payments || [];
      payments.push(paymentRecord);

      await subDoc.ref.update({
        status: "active",
        billingCycle,
        startDate: nowISO,
        endDate: endISO,
        renewalCount: (subData.renewalCount || 0) + 1,
        lastPaymentDate: nowISO,
        lastPaymentAmount: amount || 0,
        lastPaymentMethod: "paydunya",
        lastTransactionId: transactionId,
        payments,
        cancelledAt: null,
        updatedAt: nowISO,
      });
    }
  } else {
    // New subscription - check if one already exists
    const existing = await adminDb
      .collection("subscriptions")
      .where("userId", "==", userId)
      .where("planId", "==", planId)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Renew it
      const doc = existing.docs[0];
      const subData = doc.data();
      const payments = subData.payments || [];
      payments.push(paymentRecord);

      await doc.ref.update({
        status: "active",
        billingCycle,
        startDate: nowISO,
        endDate: endISO,
        renewalCount: (subData.renewalCount || 0) + 1,
        lastPaymentDate: nowISO,
        lastPaymentAmount: amount || 0,
        lastPaymentMethod: "paydunya",
        lastTransactionId: transactionId,
        payments,
        cancelledAt: null,
        updatedAt: nowISO,
      });
    } else {
      // Create new subscription
      const planDoc = await adminDb.collection("membershipPlans").doc(planId).get();
      const plan = planDoc.exists ? planDoc.data()! : null;

      await adminDb.collection("subscriptions").add({
        userId,
        planId,
        planName: planName || plan?.name || "Unknown Plan",
        billingCycle,
        status: "active",
        startDate: nowISO,
        endDate: endISO,
        renewalCount: 0,
        lastPaymentDate: nowISO,
        lastPaymentAmount: amount || 0,
        lastPaymentMethod: "paydunya",
        lastTransactionId: transactionId,
        payments: [paymentRecord],
        cancelledAt: null,
        createdAt: nowISO,
        updatedAt: nowISO,
      });

      // Increment subscriber count
      if (plan) {
        await adminDb.collection("membershipPlans").doc(planId).update({
          subscriberCount: (plan.subscriberCount || 0) + 1,
          updatedAt: nowISO,
        });
      }
    }

    // Update user's activePlanId
    await adminDb.collection("users").doc(userId).update({
      activePlanId: planId,
    });
  }
}
