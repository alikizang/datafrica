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
          privateKey: "",
          publicKey: "",
          token: process.env.PAYDUNYA_TOKEN || "",
          mode: process.env.PAYDUNYA_MODE || "test",
        },
        kkiapay: {
          publicKey: process.env.NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY || "",
          privateKey: "",
          secret: "",
          sandbox: true,
        },
      });
    }

    const data = doc.data()!;

    // Mask sensitive keys for the frontend (show last 8 chars)
    const mask = (key: string) =>
      key && key.length > 8 ? "•".repeat(key.length - 8) + key.slice(-8) : key || "";

    return NextResponse.json({
      activeProvider: data.activeProvider || "paydunya",
      paydunya: {
        masterKey: mask(data.paydunya?.masterKey || ""),
        privateKey: mask(data.paydunya?.privateKey || ""),
        publicKey: mask(data.paydunya?.publicKey || ""),
        token: mask(data.paydunya?.token || ""),
        mode: data.paydunya?.mode || "test",
      },
      kkiapay: {
        publicKey: mask(data.kkiapay?.publicKey || ""),
        privateKey: mask(data.kkiapay?.privateKey || ""),
        secret: mask(data.kkiapay?.secret || ""),
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

    // Get existing settings to preserve masked fields
    const existingDoc = await adminDb.collection("settings").doc("payment").get();
    const existing = existingDoc.exists ? existingDoc.data()! : {};

    // Helper to keep existing value if new value is masked (contains bullets)
    const resolveKey = (newVal: string | undefined, existingVal: string | undefined) => {
      if (!newVal) return existingVal || "";
      if (newVal.includes("•")) return existingVal || "";
      return newVal;
    };

    const update: Record<string, unknown> = {};

    if (activeProvider) {
      update.activeProvider = activeProvider;
    }

    if (paydunya) {
      update.paydunya = {
        masterKey: resolveKey(paydunya.masterKey, existing.paydunya?.masterKey),
        privateKey: resolveKey(paydunya.privateKey, existing.paydunya?.privateKey),
        publicKey: resolveKey(paydunya.publicKey, existing.paydunya?.publicKey),
        token: resolveKey(paydunya.token, existing.paydunya?.token),
        mode: paydunya.mode || existing.paydunya?.mode || "test",
      };
    }

    if (kkiapay) {
      update.kkiapay = {
        publicKey: resolveKey(kkiapay.publicKey, existing.kkiapay?.publicKey),
        privateKey: resolveKey(kkiapay.privateKey, existing.kkiapay?.privateKey),
        secret: resolveKey(kkiapay.secret, existing.kkiapay?.secret),
        sandbox: kkiapay.sandbox ?? existing.kkiapay?.sandbox ?? true,
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
