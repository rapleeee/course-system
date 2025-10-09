"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  setDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type CourseRequest = {
  id: string;
  uid: string;
  userName?: string | null;
  userEmail?: string | null;
  courseId: string;
  courseTitle?: string;
  basePrice?: number;
  discountApplied?: number;
  finalPrice?: number;
  proofUrl?: string;
  notes?: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

const formatCurrency = (value?: number) =>
  `Rp ${(value ?? 0).toLocaleString("id-ID")}`;

export default function CourseRequestsAdminPage() {
  const [items, setItems] = useState<CourseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const q = query(collection(db, "course_purchase_requests"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    setItems(
      snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<CourseRequest, "id">),
      })) as CourseRequest[],
    );
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const approve = async (request: CourseRequest) => {
    setBusyId(request.id);
    try {
      const now = Timestamp.now();
      await setDoc(
        doc(db, "users", request.uid),
        { claimedCourses: arrayUnion(request.courseId) },
        { merge: true },
      );
      await updateDoc(doc(db, "course_purchase_requests", request.id), {
        status: "approved",
        approvedAt: now,
        updatedAt: now,
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (request: CourseRequest) => {
    setBusyId(request.id);
    try {
      await updateDoc(doc(db, "course_purchase_requests", request.id), {
        status: "rejected",
        updatedAt: Timestamp.now(),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout pageTitle="Permintaan Pembelian Kelas">
      {loading ? (
        <div>Memuat…</div>
      ) : (
        <div className="space-y-3">
          {items.length === 0 && (
            <div className="text-sm text-muted-foreground">Belum ada permintaan pembelian.</div>
          )}
          {items.map((item) => (
            <div key={item.id} className="rounded-md border bg-white dark:bg-neutral-900 p-4 space-y-3">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="space-y-1 text-sm">
                  <div className="font-semibold text-base">{item.courseTitle ?? item.courseId}</div>
                  <div className="text-xs text-muted-foreground">Course ID: {item.courseId}</div>
                  <div className="mt-2 font-medium">{item.userName || item.userEmail || item.uid}</div>
                  <div className="text-xs text-muted-foreground">UID: {item.uid}</div>
                  <div className="pt-2 space-y-1">
                    <div>Harga normal: {formatCurrency(item.basePrice)}</div>
                    {item.discountApplied ? (
                      <div>Diskon subscriber: Rp {item.discountApplied.toLocaleString("id-ID")}</div>
                    ) : null}
                    <div>Nominal transfer: {formatCurrency(item.finalPrice)}</div>
                  </div>
                  {item.notes && <div className="text-xs pt-1">Catatan: {item.notes}</div>}
                  <div className="text-xs pt-1">
                    Status: <span className="font-semibold capitalize">{item.status}</span>
                  </div>
                  {item.createdAt && (
                    <div className="text-xs text-muted-foreground">
                      Diajukan: {new Date(item.createdAt.toMillis()).toLocaleString("id-ID")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {item.proofUrl && (
                    <a
                      href={item.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm underline text-blue-600"
                    >
                      Lihat Bukti
                    </a>
                  )}
                  {item.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1 rounded bg-emerald-600 text-white text-sm disabled:opacity-60"
                        onClick={() => approve(item)}
                        disabled={busyId === item.id}
                      >
                        {busyId === item.id ? "Memproses…" : "Approve"}
                      </button>
                      <button
                        className="px-3 py-1 rounded bg-rose-600 text-white text-sm disabled:opacity-60"
                        onClick={() => reject(item)}
                        disabled={busyId === item.id}
                      >
                        Tolak
                      </button>
                    </div>
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
