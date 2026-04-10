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
      !!key && key.length > 0 && !key.includes("•");

    const pdSettings = settings?.paydunya;
    const masterKey = isValidKey(pdSettings?.masterKey) ? pdSettings.masterKey : (process.env.PAYDUNYA_MASTER_KEY || "");
    const privateKey = isValidKey(pdSettings?.privateKey) ? pdSettings.privateKey : (process.env.PAYDUNYA_PRIVATE_KEY || "");
    const publicKey = isValidKey(pdSettings?.publicKey) ? pdSettings.publicKey : (process.env.PAYDUNYA_PUBLIC_KEY || "");
    const token = isValidKey(pdSettings?.token) ? pdSettings.token : (process.env.PAYDUNYA_TOKEN || "");
    const mode = pdSettings?.mode || process.env.PAYDUNYA_MODE || "test";

    if (!masterKey || !privateKey || !publicKey || !token) {
      return NextResponse.json(
        { error: "PayDunya is not configured. Please set up payment settings in admin." },
        { status: 500 }
      );
    }

    const baseURL =
      mode === "live"
        ? "https://app.paydunya.com/api/v1"
        : "https://app.paydunya.com/sandbox-api/v1";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mydatafrica.web.app";

    // Create PayDunya checkout invoice via REST API
    const invoicePayload = {
      invoice: {
        items: {
          item_0: {
            name: dataset.title,
            quantity: 1,
            unit_price: dataset.price,
            total_price: dataset.price,
            description: dataset.description || `Dataset: ${dataset.title}`,
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
        return_url: `${appUrl}/datasets/${datasetId}?payment=success`,
        cancel_url: `${appUrl}/datasets/${datasetId}?payment=cancelled`,
        callback_url: `${appUrl}/api/payments/paydunya/webhook`,
      },
      custom_data: {
        datasetId,
        userId: user!.uid,
        datasetTitle: dataset.title,
        amount: dataset.price,
        currency: dataset.currency || "XOF",
      },
    };

    const res = await fetch(`${baseURL}/checkout-invoice/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYDUNYA-MASTER-KEY": masterKey,
        "PAYDUNYA-PRIVATE-KEY": privateKey,
        "PAYDUNYA-PUBLIC-KEY": publicKey,
        "PAYDUNYA-TOKEN": token,
      },
      body: JSON.stringify(invoicePayload),
    });

    const data = await res.json();

    if (data.response_code === "00") {
      return NextResponse.json({
        success: true,
        url: data.response_text,
        token: data.token,
      });
    } else {
      console.error("PayDunya invoice creation failed:", data);
      return NextResponse.json(
        { error: data.response_text || "Failed to create payment" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("PayDunya checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
