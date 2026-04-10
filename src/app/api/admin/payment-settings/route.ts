import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

// GET /api/admin/payment-settings - Get payment settings
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const doc = await adminDb.collection("settings").doc("payment").get();

    if (!doc.exists) {
      // Return defaults from env vars
      return NextResponse.json({
        activeProvider: "paydunya",
        paydunya: {
          masterKey: process.env.PAYDUNYA_MASTER_KEY || "",
          privateKey: process.env.PAYDUNYA_PRIVATE_KEY || "",
          publicKey: process.env.PAYDUNYA_PUBLIC_KEY || "",
          token: process.env.PAYDUNYA_TOKEN || "",
          mode: process.env.PAYDUNYA_MODE || "test",
        },
        kkiapay: {
          publicKey: process.env.NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY || "",
          privateKey: process.env.KKIAPAY_PRIVATE_KEY || "",
          secret: process.env.KKIAPAY_SECRET || "",
          sandbox: true,
        },
      });
    }

    const data = doc.data()!;

    // Return real keys to admin (the admin panel is already auth-protected).
    // The eye toggle on the frontend handles visual show/hide via type="password".
    return NextResponse.json({
      activeProvider: data.activeProvider || "paydunya",
      paydunya: {
        masterKey: data.paydunya?.masterKey || "",
        privateKey: data.paydunya?.privateKey || "",
        publicKey: data.paydunya?.publicKey || "",
        token: data.paydunya?.token || "",
        mode: data.paydunya?.mode || "test",
      },
      kkiapay: {
        publicKey: data.kkiapay?.publicKey || "",
        privateKey: data.kkiapay?.privateKey || "",
        secret: data.kkiapay?.secret || "",
        sandbox: data.kkiapay?.sandbox ?? true,
      },
    });
  } catch (err) {
    console.error("Error fetching payment settings:", err);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// PUT /api/admin/payment-settings - Update payment settings
export async function PUT(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { activeProvider, paydunya, kkiapay } = body;

    if (activeProvider && !["paydunya", "kkiapay"].includes(activeProvider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const update: Record<string, unknown> = {};

    if (activeProvider) {
      update.activeProvider = activeProvider;
    }

    if (paydunya) {
      update.paydunya = {
        masterKey: paydunya.masterKey || "",
        privateKey: paydunya.privateKey || "",
        publicKey: paydunya.publicKey || "",
        token: paydunya.token || "",
        mode: paydunya.mode || "test",
      };
    }

    if (kkiapay) {
      update.kkiapay = {
        publicKey: kkiapay.publicKey || "",
        privateKey: kkiapay.privateKey || "",
        secret: kkiapay.secret || "",
        sandbox: kkiapay.sandbox ?? true,
      };
    }

    update.updatedAt = new Date().toISOString();

    await adminDb.collection("settings").doc("payment").set(update, { merge: true });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating payment settings:", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
