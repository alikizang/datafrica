import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

// POST /api/payments/paydunya/create - Create a PayDunya checkout invoice
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { datasetId } = await request.json();
    if (!datasetId) {
      return NextResponse.json({ error: "Missing datasetId" }, { status: 400 });
    }

    // Check if already purchased
    const existing = await adminDb
      .collection("purchases")
      .where("userId", "==", user!.uid)
      .where("datasetId", "==", datasetId)
      .where("status", "==", "completed")
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json(
        { error: "You have already purchased this dataset", alreadyPurchased: true },
        { status: 400 }
      );
    }

    // Fetch dataset
    const datasetDoc = await adminDb.collection("datasets").doc(datasetId).get();
    if (!datasetDoc.exists) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }
    const dataset = datasetDoc.data()!;

    // Load PayDunya settings from Firestore or env
    const settingsDoc = await adminDb.collection("settings").doc("payment").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : null;

    // Use Firestore values only if they're real keys (not masked with bullets from old bug)
    const isValidKey = (key: string | undefined): key is string =>
      !!key && key.length > 0 && !key.includes("\u2022");

    const pdSettings = settings?.paydunya;
    const masterKey = isValidKey(pdSettings?.masterKey) ? pdSettings.masterKey : (process.env.PAYDUNYA_MASTER_KEY || "");
    const privateKey = isValidKey(pdSettings?.privateKey) ? pdSettings.privateKey : (process.env.PAYDUNYA_PRIVATE_KEY || "");
    const token = isValidKey(pdSettings?.token) ? pdSettings.token : (process.env.PAYDUNYA_TOKEN || "");
    const mode = pdSettings?.mode || process.env.PAYDUNYA_MODE || "test";

    if (!masterKey || !privateKey || !token) {
      return NextResponse.json(
        { error: "PayDunya is not configured. Please set up payment settings in admin." },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mydatafrica.web.app";

    // Build the API URL - sandbox for test, live for production
    // Matches official SDK behavior: https://app.paydunya.com/sandbox-api/v1 vs /api/v1
    const baseUrl = mode === "live"
      ? "https://app.paydunya.com/api/v1"
      : "https://app.paydunya.com/sandbox-api/v1";

    // Official SDK sends exactly these 3 auth headers (no PUBLIC-KEY)
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "PAYDUNYA-MASTER-KEY": masterKey,
      "PAYDUNYA-PRIVATE-KEY": privateKey,
      "PAYDUNYA-TOKEN": token,
    };

    const body = {
      invoice: {
        items: {
          item_0: {
            name: dataset.title,
            quantity: 1,
            unit_price: dataset.price,
            total_price: dataset.price,
          },
        },
        total_amount: dataset.price,
        description: `Purchase: ${dataset.title}`,
      },
      store: {
        name: "Datafrica",
        tagline: "African Data Marketplace",
        website_url: appUrl,
        logo_url: `${appUrl}/logo.png`,
      },
      custom_data: {
        datasetId,
        userId: user!.uid,
        datasetTitle: dataset.title,
        amount: dataset.price,
        currency: dataset.currency || "XOF",
      },
      actions: {
        return_url: `${appUrl}/datasets/${datasetId}`,
        cancel_url: `${appUrl}/datasets/${datasetId}?payment=cancelled`,
        callback_url: `${appUrl}/api/payments/paydunya/webhook`,
      },
    };

    const res = await fetch(`${baseUrl}/checkout-invoice/create`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.response_code === "00" && data.token) {
      // Track pending payment for abandonment handling (30 min TTL)
      await adminDb.collection("pending_payments").add({
        userId: user!.uid,
        datasetId,
        provider: "paydunya",
        invoiceToken: data.token,
        amount: dataset.price,
        currency: dataset.currency || "XOF",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });

      return NextResponse.json({
        success: true,
        url: data.response_text, // PayDunya returns the redirect URL here
        token: data.token,
      });
    } else {
      console.error("PayDunya invoice creation failed:", JSON.stringify(data));
      return NextResponse.json(
        { error: data.response_text || "Failed to create payment" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("PayDunya checkout error:", err);
    const message = err instanceof Error ? err.message : "Failed to create payment";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
