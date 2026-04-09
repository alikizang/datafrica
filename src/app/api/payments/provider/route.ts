import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// GET /api/payments/provider - Get the active payment provider (public)
export async function GET() {
  try {
    const doc = await adminDb.collection("settings").doc("payment").get();
    const data = doc.exists ? doc.data()! : {};

    return NextResponse.json({
      activeProvider: data.activeProvider || "paydunya",
      kkiapayPublicKey:
        data.activeProvider === "kkiapay"
          ? data.kkiapay?.publicKey || process.env.NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY || ""
          : "",
      kkiapaySandbox: data.kkiapay?.sandbox ?? true,
    });
  } catch {
    return NextResponse.json({
      activeProvider: "paydunya",
      kkiapayPublicKey: "",
      kkiapaySandbox: true,
    });
  }
}
