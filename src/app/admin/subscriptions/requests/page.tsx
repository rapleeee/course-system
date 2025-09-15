"use client";

import AdminLayout from "@/components/layouts/AdminLayout";
import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, Timestamp, updateDoc, doc, setDoc, getDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Req = {
  id: string;
  uid: string;
  userName?: string | null;
  userEmail?: string | null;
  amount?: number;
  bank?: string;
  accountName?: string;
  accountNumber?: string;
  transferAt?: Timestamp | null;
  proofUrl?: string;
  notes?: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export default function SubscriptionRequestsPage() {
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const q = query(collection(db, "subscription_requests"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setItems(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Req, "id">) })) as Req[]
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (r: Req) => {
    setBusyId(r.id);
    try {
      const now = Timestamp.now();
      const subRef = doc(db, "subscriptions", r.uid);
      const subSnap = await getDoc(subRef);
      let start = now;
      let end = Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000);
      if (subSnap.exists()) {
        const d = subSnap.data() as { currentPeriodEnd?: Timestamp; status?: string };
        const base = d.currentPeriodEnd?.toMillis() ?? 0;
        if (d.status === "active" && base > now.toMillis()) {
          start = Timestamp.fromMillis(base);
          end = Timestamp.fromMillis(base + 30 * 24 * 60 * 60 * 1000);
        }
      }
      await setDoc(subRef, { planId: "manual", price: r.amount ?? 0, status: "active", currentPeriodStart: start, currentPeriodEnd: end, lastPaymentAt: now, updatedAt: now, method: "manual_transfer", requestId: r.id }, { merge: true });
      await updateDoc(doc(db, "users", r.uid), { subscriptionActive: true, subscriberUntil: end, updatedAt: now, roles: arrayUnion("subscriber") });
      await updateDoc(doc(db, "subscription_requests", r.id), { status: "approved", updatedAt: now });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (r: Req) => {
    setBusyId(r.id);
    try {
      await updateDoc(doc(db, "subscription_requests", r.id), { status: "rejected", updatedAt: Timestamp.now() });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout pageTitle="Permintaan Langganan (Transfer)">
      {loading ? (
        <div>Memuat…</div>
      ) : (
        <div className="space-y-3">
          {items.length === 0 && <div className="text-sm text-muted-foreground">Belum ada permintaan.</div>}
          {items.map((r) => (
            <div key={r.id} className="rounded-md border p-3 bg-white dark:bg-neutral-900">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{r.userName || r.userEmail || r.uid}</div>
                  <div className="text-xs text-muted-foreground">UID: {r.uid}</div>
                  <div className="mt-2 text-sm">Nominal: Rp {(r.amount ?? 0).toLocaleString("id-ID")}</div>
                  <div className="text-sm">Bank: {r.bank || "-"}</div>
                  <div className="text-sm">Tanggal: {r.transferAt ? new Date(r.transferAt.toMillis()).toLocaleString("id-ID") : "-"}</div>
                  {r.notes && <div className="text-sm">Catatan: {r.notes}</div>}
                  <div className="text-xs mt-1">Status: <span className="font-medium">{r.status}</span></div>
                </div>
                <div className="flex items-center gap-2">
                  {r.proofUrl && (
                    <a href={r.proofUrl} target="_blank" rel="noreferrer" className="text-sm underline">Lihat Bukti</a>
                  )}
                  {r.status === "pending" && (
                    <>
                      <button className="px-3 py-1 rounded bg-emerald-600 text-white text-sm disabled:opacity-60" disabled={busyId === r.id} onClick={() => approve(r)}>
                        {busyId === r.id ? "Memproses…" : "Approve +30 hari"}
                      </button>
                      <button className="px-3 py-1 rounded bg-rose-600 text-white text-sm disabled:opacity-60" disabled={busyId === r.id} onClick={() => reject(r)}>
                        Tolak
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
