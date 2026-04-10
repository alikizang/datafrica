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
      const datasetId = customData.datasetId as string | undefined;
      const userId = customData.userId as string | undefined;
      const datasetTitle = customData.datasetTitle as string | undefined;
      const amount = customData.amount as number | undefined;
      const currency = customData.currency as string | undefined;

      if (!datasetId || !userId) {
        return NextResponse.json({ received: true });
      }

      // Check if purchase already exists
      const transactionId = (invoice?.token as string) || `paydunya_${Date.now()}`;
      const existingPurchase = await adminDb
        .collection("purchases")
        .where("userId", "==", userId)
        .where("datasetId", "==", datasetId)
        .where("status", "==", "completed")
        .limit(1)
        .get();

      if (existingPurchase.empty) {
        // Fetch dataset if we don't have metadata
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

        // Create purchase record
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

        // Generate download token
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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayDunya webhook error:", error);
    return NextResponse.json({ received: true });
  }
}
