import { NextRequest, NextResponse } from "next/server";
import midtransClient from "midtrans-client";
import { Timestamp, FieldValue as AdminFieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type MidtransStatus = {
  transaction_status?: string;
  payment_type?: string;
  fraud_status?: string;
  gross_amount?: string | number;
  [key: string]: unknown;
};

export async function POST(req: NextRequest) {
  try {
    const { orderId } = (await req.json()) as { orderId?: string };
    if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

    const parseBool = (v?: string | null) => {
      const s = (v || "").trim().toLowerCase();
      return ["true", "1", "yes", "on", "prod", "production"].includes(s);
    };

    let isProduction = parseBool(process.env.MIDTRANS_IS_PRODUCTION);
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) return NextResponse.json({ error: "Missing MIDTRANS_SERVER_KEY" }, { status: 500 });
    const looksSandboxKey = serverKey.startsWith("SB-") || serverKey.includes("SB-Mid-server");
    const looksProdKey = serverKey.startsWith("Mid-server-");
    if (looksSandboxKey && isProduction) isProduction = false;
    if (looksProdKey && !isProduction) isProduction = true;

    // Query status to Midtrans
    const core = new midtransClient.CoreApi({ isProduction, serverKey });
    let status: MidtransStatus | undefined;
    try {
      // midtrans-client typings may return unknown; cast to our shape
      status = (await core.transaction.status(orderId)) as unknown as MidtransStatus;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `Midtrans status error: ${msg}` }, { status: 500 });
    }

    const transaction_status: string = status?.transaction_status || "pending";
    const payment_type: string = status?.payment_type || "";
    const fraud_status: string = status?.fraud_status || "";
    const gross_amount: number = Number(status?.gross_amount || 0);

    // Update payment doc
    const payRef = adminDb.collection("payments").doc(orderId);
    const paySnap = await payRef.get();
    const pay = paySnap.data() as { uid?: string } | undefined;
    const uid = pay?.uid;

    await payRef.set(
      { status: transaction_status, paymentType: payment_type, fraudStatus: fraud_status, midtrans: status, updatedAt: Timestamp.now() },
      { merge: true }
    );

    const success = transaction_status === "capture" || transaction_status === "settlement";

    if (uid) {
      // Extend 30 days from now or chain if already active
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

      await subRef.set(
        {
          planId: "basic_monthly",
          price: gross_amount || 5000,
          status: success ? "active" : transaction_status,
          lastPaymentAt: now,
          currentPeriodStart,
          currentPeriodEnd,
          orderId,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      // Add role + flags
      const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
      if (success) {
        updates["roles"] = AdminFieldValue.arrayUnion("subscriber");
        updates["subscriptionActive"] = true;
        updates["subscriberUntil"] = currentPeriodEnd;
      }
      await adminDb.collection("users").doc(uid).set(updates, { merge: true });
    }

    return NextResponse.json({ ok: true, status: transaction_status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
