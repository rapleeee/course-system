"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, doc, getDoc, onSnapshot, orderBy, query, runTransaction, increment } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import AdminLayout from "@/components/layouts/AdminLayout";

type AssignmentDoc = {
  title?: string;
  points?: number;
  type?: "task" | "quiz";
};

type SubmissionDoc = {
  id: string;
  status: "submitted" | "approved" | "rejected" | "needs_correction";
  answers: unknown;
  autoScore?: number | null;
  awardedPoints?: number;
};

export default function ReviewAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const [assignmentId, setAssignmentId] = useState<string>("");
  const [assignment, setAssignment] = useState<AssignmentDoc | null>(null);
  const [subs, setSubs] = useState<SubmissionDoc[]>([]);
  const [award, setAward] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const p = await params;
      setAssignmentId(p.id);
    })();
  }, [params]);

  useEffect(() => {
    if (!assignmentId) return;
    (async () => {
      const asg = await getDoc(doc(db, "assignments", assignmentId));
      if (asg.exists()) setAssignment(asg.data() as AssignmentDoc);
    })();
    const q = query(collection(db, `assignments/${assignmentId}/submissions`), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setSubs(
        snap.docs.map((d) => {
          const data = d.data() as Omit<SubmissionDoc, "id">;
          return { id: d.id, ...data };
        })
      );
    });
    return () => unsub();
  }, [assignmentId]);

  const decide = async (uid: string, decision: "approved" | "rejected" | "needs_correction") => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const points = award[uid] ?? assignment?.points ?? 0;
      const res = await fetch(`/api/assignments/${assignmentId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid, decision, awardedPoints: points }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Gagal memproses keputusan");
      toast.success("Tersimpan");
    } catch (e) {
      // Fallback: update langsung via client jika server admin belum tersedia
      try {
        if (!assignmentId) throw e;
        const subRef = doc(db, `assignments/${assignmentId}/submissions/${uid}`);
        const userRef = doc(db, `users/${uid}`);
        const pts = Math.max(0, Math.floor(award[uid] ?? assignment?.points ?? 0));

        await runTransaction(db, async (tx) => {
          const subSnap = await tx.get(subRef);
          if (!subSnap.exists()) throw new Error("Submission not found");
          const sub = subSnap.data() as SubmissionDoc | undefined;
          if (!sub) throw new Error("Submission not found");
          const alreadyApproved = sub.status === "approved" && (sub.awardedPoints || 0) > 0;

          tx.set(
            subRef,
            {
              status: decision,
              updatedAt: new Date(),
              awardedPoints: decision === "approved" ? pts : sub.awardedPoints || 0,
            },
            { merge: true }
          );

          if (decision === "approved" && !alreadyApproved && pts > 0) {
            tx.set(
              userRef,
              {
                totalScore: increment(pts),
                seasonalScore: increment(pts),
              },
              { merge: true }
            );
          }
        });
        toast.success("Tersimpan (fallback)");
      } catch (e2) {
        const message =
          e2 instanceof Error
            ? e2.message
            : e instanceof Error
            ? e.message
            : String(e2 ?? e);
        toast.error(message);
      }
    }
  };

  return (
    <AdminLayout pageTitle={`Review: ${assignment?.title || "Tugas"}`}>
      <div className="max-w-full space-y-6">
        <h1 className="text-2xl font-bold">Review: {assignment?.title}</h1>
        <p className="text-sm text-gray-500">Max poin: {assignment?.points ?? 0}</p>

        <div className="space-y-3">
          {subs.length === 0 ? (
            <div className="text-sm text-gray-500">Belum ada submission.</div>
          ) : (
            subs.map((s) => (
              <div key={s.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">UID: {s.id}</div>
                  <div className="text-xs text-gray-500">Status: {s.status}</div>
                </div>
                <pre className="text-xs bg-neutral-50 dark:bg-neutral-800 p-3 rounded-md overflow-x-auto">{JSON.stringify(s.answers, null, 2)}</pre>
                {typeof s.autoScore === "number" ? (
                  <div className="text-xs text-gray-500">AutoScore: {(s.autoScore * 100).toFixed(0)}%</div>
                ) : null}
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-28"
                    placeholder="Poin"
                    value={(award[s.id] ?? assignment?.points ?? 0) as number}
                    onChange={(e) => setAward((x) => ({ ...x, [s.id]: parseInt(e.target.value || "0", 10) }))}
                  />
                  <Button onClick={() => decide(s.id, "approved")} className="bg-emerald-600 hover:bg-emerald-700 text-white">Approve</Button>
                  <Button onClick={() => decide(s.id, "needs_correction")} variant="outline">Perlu Koreksi</Button>
                  <Button onClick={() => decide(s.id, "rejected")} variant="destructive">Tolak</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
