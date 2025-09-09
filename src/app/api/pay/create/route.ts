import { NextRequest, NextResponse } from "next/server";
import midtransClient, { SnapTransactionParams } from "midtrans-client";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { uid, name, email } = (await req.json()) as { uid: string; name?: string; email?: string };
    if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });

    const parseBool = (v?: string | null) => {
      const s = (v || "").trim().toLowerCase();
      return ["true", "1", "yes", "on", "prod", "production"].includes(s);
    };
    const isProduction = parseBool(process.env.MIDTRANS_IS_PRODUCTION);
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const clientKey = process.env.MIDTRANS_CLIENT_KEY;
    if (!serverKey || !clientKey) {
      return NextResponse.json({ error: "Missing MIDTRANS_SERVER_KEY or MIDTRANS_CLIENT_KEY env" }, { status: 500 });
    }

    const snap = new midtransClient.Snap({
      isProduction,
      serverKey,
      clientKey,
    });

    const orderId = `sub_${uid}_${Date.now()}`;
    const grossAmount = 30000;

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (host ? `${proto}://${host}` : "");

    const parameter: SnapTransactionParams = {
      transaction_details: { order_id: orderId, gross_amount: grossAmount },
      customer_details: { first_name: name || "User", email },
      item_details: [{ id: "basic_monthly", price: grossAmount, quantity: 1, name: "Mentora Monthly Subscription" }],
      enabled_payments: ["qris","gopay","shopeepay","bri_va","bca_va","bni_va","permata_va","other_va","echannel"],
      ...(baseUrl ? { callbacks: { finish: `${baseUrl}/pages/subscription/thanks` } } : {}),
      expiry: { unit: "minutes", duration: 60 },
    };

    const { token } = await snap.createTransaction(parameter);

    // Best-effort write; jangan blokir token ketika admin credential belum siap
    try {
      await adminDb.collection("payments").doc(orderId).set({
        uid, orderId, amount: grossAmount, status: "pending", createdAt: Timestamp.now(),
      });
    } catch (e) {
      console.error("[pay/create] Firestore admin write failed", e);
    }
    // Minimal logging untuk membantu debug mismatch env di Vercel (tanpa membocorkan secret)
    try {
      const snapUrl = process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL || "";
      const frontIsProd = /app\.midtrans\.com/.test(snapUrl) && !/sandbox/.test(snapUrl);
      const keyPrefix = serverKey.slice(0, 10);
      const looksSandboxKey = serverKey.startsWith("SB-") || serverKey.includes("SB-Mid-server");
      const looksProdKey = serverKey.startsWith("Mid-server-");
      if (frontIsProd !== isProduction) {
        console.warn("[pay/create] WARN mismatch frontend vs backend env:", { frontIsProd, isProduction });
      }
      if (isProduction && !looksProdKey) {
        console.warn("[pay/create] WARN production mode but serverKey looks sandbox", { keyPrefix });
      }
      if (isProduction && looksSandboxKey) {
        console.warn("[pay/create] WARN production mode and serverKey flagged as sandbox", { keyPrefix });
      }
      if (!isProduction && looksProdKey) {
        console.warn("[pay/create] WARN sandbox mode but serverKey looks production", { keyPrefix });
      }
      if (!isProduction && !looksSandboxKey) {
        console.warn("[pay/create] WARN sandbox mode and serverKey doesn't look sandbox", { keyPrefix });
      }
    } catch {}

    return NextResponse.json({ token, orderId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
