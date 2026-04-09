import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

// POST /api/payments/paydunya/webhook - PayDunya IPN callback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json({ received: true });
    }

    const { status, hash, invoice, custom_data: customData } = data;

    // Verify the hash using SHA-512 of the master key
    const settingsDoc = await adminDb.collection("settings").doc("payment").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : null;
    const masterKey = settings?.paydunya?.masterKey || process.env.PAYDUNYA_MASTER_KEY || "";

    if (masterKey && hash) {
      const expectedHash = crypto.createHash("sha512").update(masterKey).digest("hex");
      if (hash !== expectedHash) {
        console.error("PayDunya webhook hash mismatch");
        return NextResponse.json({ error: "Invalid hash" }, { status: 401 });
      }
    }

    if (status === "completed" && customData) {
      const { datasetId, userId, datasetTitle, amount, currency } = customData;

      if (!datasetId || !userId) {
        return NextResponse.json({ received: true });
      }

      // Check if purchase already exists
      const transactionId = invoice?.token || `paydunya_${Date.now()}`;
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
