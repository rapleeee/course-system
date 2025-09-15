"use client";

import Layout from "@/components/layout";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

type UserLite = { uid: string; name?: string | null; email?: string | null };

export default function ManualSubscriptionPage() {
  const [authUser, setAuthUser] = useState<UserLite | null>(null);
  const [amount, setAmount] = useState("5000");
  const [bank, setBank] = useState(process.env.NEXT_PUBLIC_BANK_NAME || "Mandiri");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [transferAt, setTransferAt] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const off = onAuthStateChanged(getAuth(), (u) => {
      if (!u) { setAuthUser(null); return; }
      setAuthUser({ uid: u.uid, name: u.displayName, email: u.email });
    });
    return () => off();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser?.uid) return alert("Silakan login terlebih dahulu");
    if (!file) return alert("Unggah bukti transfer terlebih dahulu");
    setLoading(true);
    try {
      const storage = getStorage();
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const objectPath = `subscription-requests/${authUser.uid}/${Date.now()}-${safeName}`;
      const r = ref(storage, objectPath);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);

      await addDoc(collection(db, "subscription_requests"), {
        uid: authUser.uid,
        userName: authUser.name ?? null,
        userEmail: authUser.email ?? null,
        amount: Number(amount) || 0,
        bank,
        accountName,
        accountNumber,
        transferAt: transferAt ? new Date(transferAt) : null,
        proofUrl: url,
        notes: notes || null,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        method: "manual_transfer",
      });
      setSubmitted(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`Gagal mengirim bukti transfer: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout pageTitle="Langganan Manual (Transfer Bank)">
      <div className="max-w-xl mx-auto">
        <div className="mb-4 rounded-md border p-4 bg-white dark:bg-neutral-900">
          <h3 className="text-base font-semibold mb-2">Rekening Tujuan</h3>
          <div className="text-sm">
            <div>Bank: <span className="font-medium">{process.env.NEXT_PUBLIC_BANK_NAME || "Mandiri"}</span></div>
            <div>No Rekening: <span className="font-mono font-semibold tracking-wide">{process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || "1670003540134"}</span></div>
            <div>Atas Nama: <span className="font-medium">{process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER || "Rafli Maulana"}</span></div>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || "")}
              className="inline-flex items-center rounded border px-3 py-1.5 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Salin No. Rekening
            </button>
          </div>
        </div>
        <div className="mb-4 rounded-md border p-4 bg-white dark:bg-neutral-900">
          <h2 className="text-lg font-semibold mb-1">Form Bukti Transfer</h2>
          <p className="text-sm text-muted-foreground">Kirim bukti transfer untuk aktivasi langganan manual. Admin akan memeriksa dan mengaktifkan langganan Anda.</p>
        </div>
        {!authUser && (
          <div className="rounded-md border p-3 text-sm bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-300/30 dark:text-amber-300">
            Silakan login terlebih dahulu untuk mengisi form.
          </div>
        )}
        {authUser && !submitted && (
          <form onSubmit={handleSubmit} className="space-y-3 rounded-md border p-4 bg-white dark:bg-neutral-900">
            <div>
              <label className="block text-sm mb-1">Nominal (Rp)</label>
              <input className="w-full border rounded px-3 py-2" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Bank Tujuan</label>
                <input className="w-full border rounded px-3 py-2" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Mandiri" />
              </div>
              <div>
                <label className="block text-sm mb-1">Tanggal Transfer</label>
                <input type="datetime-local" className="w-full border rounded px-3 py-2" value={transferAt} onChange={(e) => setTransferAt(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Nama Pengirim</label>
                <input className="w-full border rounded px-3 py-2" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Nomor Rekening</label>
                <input className="w-full border rounded px-3 py-2" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Unggah Bukti Transfer (jpg/png/pdf)</label>
              <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Catatan (opsional)</label>
              <textarea className="w-full border rounded px-3 py-2" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="submit" disabled={loading} className="inline-flex items-center rounded bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-60">
                {loading ? "Mengirim..." : "Kirim Bukti"}
              </button>
            </div>
          </form>
        )}
        {submitted && (
          <div className="rounded-md border p-4 bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-300/30 dark:text-emerald-300">
            Bukti transfer berhasil dikirim. Mohon tunggu konfirmasi dari admin.
          </div>
        )}
      </div>
    </Layout>
  );
}
