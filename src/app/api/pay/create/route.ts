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

    const snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
      clientKey: process.env.MIDTRANS_CLIENT_KEY!,
    });

    const orderId = `sub_${uid}_${Date.now()}`;
    const grossAmount = 30000;

    const parameter: SnapTransactionParams = {
      transaction_details: { order_id: orderId, gross_amount: grossAmount },
      customer_details: { first_name: name || "User", email },
      item_details: [{ id: "basic_monthly", price: grossAmount, quantity: 1, name: "Mentora Monthly Subscription" }],
      enabled_payments: ["qris","gopay","shopeepay","bri_va","bca_va","bni_va","permata_va","other_va","echannel"],
      callbacks: { finish: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription/thanks` },
      expiry: { unit: "minutes", duration: 60 },
    };

    const { token } = await snap.createTransaction(parameter);

    await adminDb.collection("payments").doc(orderId).set({
      uid, orderId, amount: grossAmount, status: "pending", createdAt: Timestamp.now(),
    });

    return NextResponse.json({ token, orderId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}