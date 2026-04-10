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

    // If Firestore keys are corrupted (contain bullet chars from old masking bug),
    // fall back to env vars so admin sees the real keys
    const clean = (val: string | undefined, envFallback: string) => {
      if (!val || val.includes("•")) return envFallback;
      return val;
    };

    return NextResponse.json({
      activeProvider: data.activeProvider || "paydunya",
      paydunya: {
        masterKey: clean(data.paydunya?.masterKey, process.env.PAYDUNYA_MASTER_KEY || ""),
        privateKey: clean(data.paydunya?.privateKey, process.env.PAYDUNYA_PRIVATE_KEY || ""),
        publicKey: clean(data.paydunya?.publicKey, process.env.PAYDUNYA_PUBLIC_KEY || ""),
        token: clean(data.paydunya?.token, process.env.PAYDUNYA_TOKEN || ""),
        mode: data.paydunya?.mode || "test",
      },
      kkiapay: {
        publicKey: clean(data.kkiapay?.publicKey, process.env.NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY || ""),
        privateKey: clean(data.kkiapay?.privateKey, process.env.KKIAPAY_PRIVATE_KEY || ""),
        secret: clean(data.kkiapay?.secret, process.env.KKIAPAY_SECRET || ""),
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

    // Strip any value that still contains bullet characters (corruption guard)
    const sanitize = (val: string | undefined) => {
      if (!val || val.includes("\u2022")) return "";
      return val;
    };

    if (activeProvider) {
      update.activeProvider = activeProvider;
    }

    if (paydunya) {
      update.paydunya = {
        masterKey: sanitize(paydunya.masterKey),
        privateKey: sanitize(paydunya.privateKey),
        publicKey: sanitize(paydunya.publicKey),
        token: sanitize(paydunya.token),
        mode: paydunya.mode || "test",
      };
    }

    if (kkiapay) {
      update.kkiapay = {
        publicKey: sanitize(kkiapay.publicKey),
        privateKey: sanitize(kkiapay.privateKey),
        secret: sanitize(kkiapay.secret),
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
