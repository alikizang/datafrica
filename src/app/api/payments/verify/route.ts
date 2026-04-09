import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";

// POST /api/payments/verify - Verify KKiaPay or Stripe payment
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { transactionId, datasetId, paymentMethod } = body;

    if (!transactionId || !datasetId || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required fields: transactionId, datasetId, paymentMethod" },
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

    if (paymentMethod === "kkiapay") {
      // Verify KKiaPay transaction via their API
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
          // Verify amount matches
          if (kkData.status === "SUCCESS" && kkData.amount >= dataset.price) {
            verified = true;
          }
        }
      } catch (kkError) {
        console.error("KKiaPay verification error:", kkError);
        // In sandbox/dev mode, auto-verify
        if (process.env.NODE_ENV === "development") {
          verified = true;
        }
      }
    } else if (paymentMethod === "paydunya") {
      // Verify PayDunya transaction by confirming invoice token
      try {
        const settingsDoc = await adminDb.collection("settings").doc("payment").get();
        const settings = settingsDoc.exists ? settingsDoc.data() : null;

        const masterKey = settings?.paydunya?.masterKey || process.env.PAYDUNYA_MASTER_KEY || "";
        const privateKey = settings?.paydunya?.privateKey || process.env.PAYDUNYA_PRIVATE_KEY || "";
        const token = settings?.paydunya?.token || process.env.PAYDUNYA_TOKEN || "";
        const mode = settings?.paydunya?.mode || process.env.PAYDUNYA_MODE || "test";

        const baseURL =
          mode === "live"
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
            verified = true;
          }
        }
      } catch (pdError) {
        console.error("PayDunya verification error:", pdError);
        if (process.env.NODE_ENV === "development") {
          verified = true;
        }
      }
    } else if (paymentMethod === "stripe") {
      // Stripe verification would go here
      // For now, mark as verified in development
      if (process.env.NODE_ENV === "development") {
        verified = true;
      }
    }

    // In development mode, always verify for testing
    if (process.env.NODE_ENV === "development") {
      verified = true;
    }

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
