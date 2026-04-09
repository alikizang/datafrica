import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import crypto from "crypto";

// POST /api/payments/webhook - KKiaPay webhook callback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, status, amount, data } = body;

    // Verify the webhook is from KKiaPay using the secret key
    const signature = request.headers.get("x-kkiapay-signature");
    if (signature) {
      const secret = process.env.KKIAPAY_SECRET || "";
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(body))
        .digest("hex");

      if (signature !== expectedSignature) {
        console.error("Webhook signature mismatch");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    if (!transactionId) {
      return NextResponse.json({ error: "Missing transactionId" }, { status: 400 });
    }

    // Parse custom data if present
    let datasetId: string | undefined;
    let userId: string | undefined;
    if (data) {
      try {
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        datasetId = parsed.datasetId;
        userId = parsed.userId;
      } catch {
        // data parsing failed
      }
    }

    if (status === "SUCCESS" && datasetId && userId) {
      // Check if purchase already exists (from client-side verify)
      const existingPurchase = await adminDb
        .collection("purchases")
        .where("transactionId", "==", transactionId)
        .limit(1)
        .get();

      if (existingPurchase.empty) {
        // Fetch dataset for metadata
        const datasetDoc = await adminDb.collection("datasets").doc(datasetId).get();
        if (datasetDoc.exists) {
          const dataset = datasetDoc.data()!;

          // Create purchase record
          await adminDb.collection("purchases").add({
            userId,
            datasetId,
            datasetTitle: dataset.title,
            amount: amount || dataset.price,
            currency: dataset.currency || "XOF",
            paymentMethod: "kkiapay",
            transactionId,
            status: "completed",
            source: "webhook",
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    // Return 200 anyway to prevent KKiaPay from retrying
    return NextResponse.json({ received: true });
  }
}
