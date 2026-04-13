import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

/**
 * Mask a secret key for safe display: show first 4 and last 4 chars only.
 * Returns empty string for empty/missing values.
 */
function maskSecret(value: string | undefined): string {
  if (!value || value.length === 0) return "";
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••••••" + value.slice(-4);
}

// GET /api/admin/payment-settings - Get payment settings
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const doc = await adminDb.collection("settings").doc("payment").get();

    if (!doc.exists) {
      // Return defaults from env vars (masked)
      return NextResponse.json({
        activeProvider: "paydunya",
        paydunya: {
          masterKey: maskSecret(process.env.PAYDUNYA_MASTER_KEY),
          privateKey: maskSecret(process.env.PAYDUNYA_PRIVATE_KEY),
          publicKey: maskSecret(process.env.PAYDUNYA_PUBLIC_KEY),
          token: maskSecret(process.env.PAYDUNYA_TOKEN),
          mode: process.env.PAYDUNYA_MODE || "test",
          hasKeys: !!(process.env.PAYDUNYA_MASTER_KEY && process.env.PAYDUNYA_PRIVATE_KEY && process.env.PAYDUNYA_TOKEN),
        },
        kkiapay: {
          publicKey: maskSecret(process.env.NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY),
          privateKey: maskSecret(process.env.KKIAPAY_PRIVATE_KEY),
          secret: maskSecret(process.env.KKIAPAY_SECRET),
          sandbox: true,
          hasKeys: !!(process.env.NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY && process.env.KKIAPAY_PRIVATE_KEY),
        },
        stripe: {
          publishableKey: maskSecret(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
          secretKey: maskSecret(process.env.STRIPE_SECRET_KEY),
          webhookSecret: maskSecret(process.env.STRIPE_WEBHOOK_SECRET),
          mode: "test",
          hasKeys: !!(process.env.STRIPE_SECRET_KEY),
        },
      });
    }

    const data = doc.data()!;

    // If Firestore keys are corrupted (contain bullet chars from old masking bug),
    // fall back to env vars
    const clean = (val: string | undefined, envFallback: string) => {
      if (!val || val.includes("•")) return envFallback;
      return val;
    };

    const pdMasterKey = clean(data.paydunya?.masterKey, process.env.PAYDUNYA_MASTER_KEY || "");
    const pdPrivateKey = clean(data.paydunya?.privateKey, process.env.PAYDUNYA_PRIVATE_KEY || "");
    const pdPublicKey = clean(data.paydunya?.publicKey, process.env.PAYDUNYA_PUBLIC_KEY || "");
    const pdToken = clean(data.paydunya?.token, process.env.PAYDUNYA_TOKEN || "");
    const kkPublicKey = clean(data.kkiapay?.publicKey, process.env.NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY || "");
    const kkPrivateKey = clean(data.kkiapay?.privateKey, process.env.KKIAPAY_PRIVATE_KEY || "");
    const kkSecret = clean(data.kkiapay?.secret, process.env.KKIAPAY_SECRET || "");
    const stripePublishableKey = clean(data.stripe?.publishableKey, process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");
    const stripeSecretKey = clean(data.stripe?.secretKey, process.env.STRIPE_SECRET_KEY || "");
    const stripeWebhookSecret = clean(data.stripe?.webhookSecret, process.env.STRIPE_WEBHOOK_SECRET || "");

    return NextResponse.json({
      activeProvider: data.activeProvider || "paydunya",
      paydunya: {
        masterKey: maskSecret(pdMasterKey),
        privateKey: maskSecret(pdPrivateKey),
        publicKey: maskSecret(pdPublicKey),
        token: maskSecret(pdToken),
        mode: data.paydunya?.mode || "test",
        hasKeys: !!(pdMasterKey && pdPrivateKey && pdToken),
      },
      kkiapay: {
        publicKey: maskSecret(kkPublicKey),
        privateKey: maskSecret(kkPrivateKey),
        secret: maskSecret(kkSecret),
        sandbox: data.kkiapay?.sandbox ?? true,
        hasKeys: !!(kkPublicKey && kkPrivateKey),
      },
      stripe: {
        publishableKey: maskSecret(stripePublishableKey),
        secretKey: maskSecret(stripeSecretKey),
        webhookSecret: maskSecret(stripeWebhookSecret),
        mode: data.stripe?.mode || "test",
        hasKeys: !!(stripeSecretKey),
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
    const { activeProvider, paydunya, kkiapay, stripe } = body;

    if (activeProvider && !["paydunya", "kkiapay", "stripe"].includes(activeProvider)) {
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

    if (stripe) {
      update.stripe = {
        publishableKey: sanitize(stripe.publishableKey),
        secretKey: sanitize(stripe.secretKey),
        webhookSecret: sanitize(stripe.webhookSecret),
        mode: stripe.mode || "test",
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
