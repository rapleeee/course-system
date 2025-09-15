import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { Timestamp, FieldValue as AdminFieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY!;

function isValidSignature({
  order_id, status_code, gross_amount, signature_key,
}: { order_id: string; status_code: string; gross_amount: string; signature_key: string }) {
  const raw = order_id + status_code + gross_amount + SERVER_KEY;
  const expected = createHash("sha512").update(raw).digest("hex");
  return expected === signature_key;
}

type MidtransWebhook = {
  order_id: string;
  transaction_status: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  payment_type: string;
  fraud_status: string;
};

export async function POST(req: NextRequest) {
  try {
    const body: MidtransWebhook = await req.json();
    const { order_id, transaction_status, status_code, gross_amount, signature_key, payment_type, fraud_status } = body;

    if (!isValidSignature({ order_id, status_code, gross_amount, signature_key })) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const payRef = adminDb.collection("payments").doc(order_id);
    const paySnap = await payRef.get();
    const pay = paySnap.data() as { uid?: string } | undefined;
    const uid = pay?.uid;

    await payRef.set(
      { status: transaction_status, paymentType: payment_type, fraudStatus: fraud_status, midtrans: body, updatedAt: Timestamp.now() },
      { merge: true }
    );

    if (!uid) return NextResponse.json({ ok: true });

    // extend 30 hari
    const now = Timestamp.now();
    let currentPeriodStart = now;
    let currentPeriodEnd = Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000);

    const subRef = adminDb.collection("subscriptions").doc(uid);
    const subSnap = await subRef.get();
    const sub = subSnap.data() as { status?: string; currentPeriodEnd?: Timestamp } | undefined;

    if (sub?.status === "active" && sub.currentPeriodEnd) {
      const base = sub.currentPeriodEnd.toMillis();
      if (base > now.toMillis()) {
        currentPeriodStart = Timestamp.fromMillis(base);
        currentPeriodEnd = Timestamp.fromMillis(base + 30 * 24 * 60 * 60 * 1000);
      }
    }

    const success = transaction_status === "capture" || transaction_status === "settlement";
    const status = success ? "active" : transaction_status;

    await subRef.set(
      { planId: "basic_monthly", price: 5000, status, lastPaymentAt: now, currentPeriodStart, currentPeriodEnd, orderId: order_id, updatedAt: Timestamp.now() },
      { merge: true }
    );

    // Assign subscriber role and convenience flags on user profile when successful
    if (uid) {
      const userRef = adminDb.collection("users").doc(uid);
      const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
      if (success) {
        updates["roles"] = AdminFieldValue.arrayUnion("subscriber");
        updates["subscriptionActive"] = true;
        updates["subscriberUntil"] = currentPeriodEnd;
      } else {
        updates["subscriptionActive"] = false;
      }
      await userRef.set(updates, { merge: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
