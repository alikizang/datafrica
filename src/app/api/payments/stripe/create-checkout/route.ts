import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import Stripe from "stripe";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

async function getStripeClient(): Promise<Stripe | null> {
  const doc = await adminDb.collection("settings").doc("payment").get();
  const data = doc.exists ? doc.data() : null;
  const secretKey = data?.stripe?.secretKey || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

// POST /api/payments/stripe/create-checkout
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 checkout creations per minute per IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(`stripe-checkout:${ip}`, { maxRequests: 5, windowSeconds: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { datasetId, type, planId, billingCycle } = body;

    const stripe = await getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mydatafrica.web.app";

    // --- Subscription checkout ---
    if (type === "subscription" && planId) {
      const planDoc = await adminDb.collection("membershipPlans").doc(planId).get();
      if (!planDoc.exists) {
        return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      }

      const plan = planDoc.data()!;
      const cycle = billingCycle === "yearly" ? "yearly" : "monthly";
      const pricing = plan.pricing[cycle];

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user!.email ?? undefined,
        line_items: [
          {
            price_data: {
              currency: (pricing.currency || "XOF").toLowerCase(),
              product_data: {
                name: plan.name || "Subscription",
                description: `${cycle === "yearly" ? "Annual" : "Monthly"} subscription`,
              },
              unit_amount: Math.round(pricing.price * 100),
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: user!.uid,
          type: "subscription",
          planId,
          billingCycle: cycle,
        },
        success_url: `${appUrl}/pricing?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/pricing?payment=cancelled`,
      });

      return NextResponse.json({ success: true, url: session.url });
    }

    // --- Dataset purchase checkout ---
    if (!datasetId) {
      return NextResponse.json(
        { error: "Missing datasetId" },
        { status: 400 }
      );
    }

    const datasetDoc = await adminDb.collection("datasets").doc(datasetId).get();
    if (!datasetDoc.exists) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    const dataset = datasetDoc.data()!;

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
        { error: "Already purchased", alreadyPurchased: true },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user!.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: (dataset.currency || "XOF").toLowerCase(),
            product_data: {
              name: dataset.title,
              description: `Dataset: ${dataset.title}`,
            },
            unit_amount: Math.round(dataset.price * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user!.uid,
        type: "dataset",
        datasetId,
      },
      success_url: `${appUrl}/datasets/${datasetId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/datasets/${datasetId}?payment=cancelled`,
    });

    // Track pending payment for abandonment handling (30 min TTL)
    await adminDb.collection("pending_payments").add({
      userId: user!.uid,
      datasetId,
      provider: "stripe",
      sessionId: session.id,
      amount: dataset.price,
      currency: dataset.currency || "XOF",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
