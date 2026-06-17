"use client";

import Layout from "@/components/layout";
import { useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { normalizeDiscountCode, validateDiscountCode } from "@/lib/discount-code";

type UserLite = { uid: string; name?: string | null; email?: string | null };

type AppliedPromo = {
  code: string;
  title: string | null;
  discountType: "fixed" | "percentage";
  discountValue: number;
  discountAmount: number;
};

const BASE_PRICE = 5000;

const buildPricing = (base: number, promoDiscount = 0) => {
  const safeBase = Math.max(0, Math.floor(base));
  const safePromo = Math.min(safeBase, Math.max(0, Math.floor(promoDiscount)));
  return {
    base: safeBase,
    promoDiscount: safePromo,
    discountApplied: safePromo,
    final: Math.max(0, safeBase - safePromo),
  };
};

export default function ManualSubscriptionPage() {
  const [authUser, setAuthUser] = useState<UserLite | null>(null);
  const [pricing, setPricing] = useState(buildPricing(BASE_PRICE, 0));
  const [bank, setBank] = useState(process.env.NEXT_PUBLIC_BANK_NAME || "Mandiri");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [transferAt, setTransferAt] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);

  useEffect(() => {
    const off = onAuthStateChanged(getAuth(), (u) => {
      if (!u) {
        setAuthUser(null);
        return;
      }
      setAuthUser({ uid: u.uid, name: u.displayName, email: u.email });
    });
    return () => off();
  }, []);

  const amountLabel = useMemo(() => {
    if (pricing.final <= 0) return "Gratis";
    return `Rp ${pricing.final.toLocaleString("id-ID")}`;
  }, [pricing.final]);

  const applyPromo = async () => {
    const normalized = normalizeDiscountCode(promoCode);
    if (!normalized) {
      setPromoError("Masukkan kode unik terlebih dahulu.");
      setPromoSuccess("");
      return;
    }

    if (pricing.base <= 0) {
      setPromoError("Nominal transaksi sudah Rp 0.");
      setPromoSuccess("");
      return;
    }

    setPromoLoading(true);
    setPromoError("");
    setPromoSuccess("");

    try {
      const result = await validateDiscountCode({
        code: normalized,
        target: "subscription",
        amount: pricing.base,
      });

      if (!result.ok) {
        setAppliedPromo(null);
        setPricing((prev) => buildPricing(prev.base, 0));
        setPromoError(result.error);
        return;
      }

      setPromoCode(result.code);
      setAppliedPromo({
        code: result.code,
        title: result.title,
        discountType: result.discountType,
        discountValue: result.discountValue,
        discountAmount: result.discountAmount,
      });
      setPricing((prev) => buildPricing(prev.base, result.discountAmount));

      const discountLabel =
        result.discountType === "percentage"
          ? `${result.discountValue}%`
          : `Rp ${result.discountValue.toLocaleString("id-ID")}`;
      setPromoSuccess(`Kode ${result.code} aktif (${discountLabel}).`);
    } finally {
      setPromoLoading(false);
    }
  };

  const clearPromo = () => {
    setPromoCode("");
    setAppliedPromo(null);
    setPromoError("");
    setPromoSuccess("");
    setPricing((prev) => buildPricing(prev.base, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser?.uid) return alert("Silakan login terlebih dahulu");
    if (!file) return alert("Unggah bukti transfer terlebih dahulu");
    if (promoCode.trim() && !appliedPromo) {
      return alert("Klik tombol Terapkan untuk memvalidasi kode unik sebelum kirim bukti.");
    }

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
        basePrice: pricing.base,
        promoCode: appliedPromo?.code ?? null,
        promoCodeTitle: appliedPromo?.title ?? null,
        promoDiscountApplied: pricing.promoDiscount,
        promoDiscountType: appliedPromo?.discountType ?? null,
        promoDiscountValue: appliedPromo?.discountValue ?? null,
        discountApplied: pricing.discountApplied,
        finalPrice: pricing.final,
        amount: pricing.final,
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
            <div>
              Bank: <span className="font-medium">{process.env.NEXT_PUBLIC_BANK_NAME || "Mandiri"}</span>
            </div>
            <div>
              No Rekening: <span className="font-mono font-semibold tracking-wide">{process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || "1670003540134"}</span>
            </div>
            <div>
              Atas Nama: <span className="font-medium">{process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER || "Rafli Maulana"}</span>
            </div>
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
          <div className="mt-3 text-sm space-y-1">
            <div>
              Harga langganan: <span className="font-semibold">Rp {pricing.base.toLocaleString("id-ID")}</span>
            </div>
            {pricing.promoDiscount > 0 && appliedPromo && (
              <div className="text-emerald-600">
                Diskon kode unik {appliedPromo.code}: Rp {pricing.promoDiscount.toLocaleString("id-ID")}
              </div>
            )}
            <div>
              Nominal transfer: <span className="font-semibold">{amountLabel}</span>
            </div>
          </div>
        </div>
        {!authUser && (
          <div className="rounded-md border p-3 text-sm bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-300/30 dark:text-amber-300">
            Silakan login terlebih dahulu untuk mengisi form.
          </div>
        )}
        {authUser && !submitted && (
          <form onSubmit={handleSubmit} className="space-y-3 rounded-md border p-4 bg-white dark:bg-neutral-900">
            <div>
              <label className="block text-sm mb-1">Kode Unik Diskon (opsional)</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="w-full border rounded px-3 py-2 uppercase"
                  value={promoCode}
                  onChange={(e) => {
                    const value = normalizeDiscountCode(e.target.value);
                    setPromoCode(value);
                    setPromoError("");
                    setPromoSuccess("");
                    if (appliedPromo) {
                      setAppliedPromo(null);
                      setPricing((prev) => buildPricing(prev.base, 0));
                    }
                  }}
                  placeholder="Contoh: HEMAT10"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center rounded bg-neutral-800 text-white px-4 py-2 text-sm disabled:opacity-60"
                    onClick={() => void applyPromo()}
                    disabled={promoLoading || !promoCode.trim()}
                  >
                    {promoLoading ? "Memeriksa..." : "Terapkan"}
                  </button>
                  {appliedPromo && (
                    <button
                      type="button"
                      className="inline-flex items-center rounded border px-4 py-2 text-sm"
                      onClick={clearPromo}
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
              {promoError && <p className="mt-2 text-xs text-rose-600">{promoError}</p>}
              {promoSuccess && <p className="mt-2 text-xs text-emerald-600">{promoSuccess}</p>}
            </div>
            <div>
              <label className="block text-sm mb-1">Nominal (Rp)</label>
              <input className="w-full border rounded px-3 py-2 bg-neutral-100 text-neutral-600" value={pricing.final} readOnly />
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
