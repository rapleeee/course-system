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

    const isProduction = (process.env.MIDTRANS_IS_PRODUCTION === "true") || false;
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

    return NextResponse.json({ token, orderId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
