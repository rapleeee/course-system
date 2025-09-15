// components/SubscribeButton.tsx
"use client";

import { useState } from "react";

type CreatePayResponse = { token?: string; error?: string };

// Definisikan tipe Snap sekali di sini
type SnapCallbacks = Partial<{
  onSuccess: (res?: unknown) => void;
  onPending: (res?: unknown) => void;
  onError: (res?: unknown) => void;
  onClose: () => void;
}>;

interface SnapJS {
  pay: (token: string, callbacks?: SnapCallbacks) => void;
}

// Augment Window agar punya properti snap yang *optional*
declare global {
  interface Window {
    snap?: SnapJS;
  }
}

export default function SubscribeButton({
  uid,
  name,
  email,
}: {
  uid: string;
  name?: string;
  email?: string;
}) {
  const [loading, setLoading] = useState(false);

  // Inject snap.js (sekali)
  const ensureSnapLoaded = () =>
    new Promise<void>((resolve, reject) => {
      if (typeof window === "undefined") return reject(new Error("Window not available"));
      if (window.snap) return resolve();

      const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";
      if (!clientKey) return reject(new Error("Missing NEXT_PUBLIC_MIDTRANS_CLIENT_KEY env"));

      const s = document.createElement("script");
      s.src =
        process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL ||
        "https://app.sandbox.midtrans.com/snap/snap.js";
      s.async = true;
      s.setAttribute("data-client-key", clientKey);
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Midtrans snap.js"));
      document.head.appendChild(s);
    });

  const onPay = async () => {
    if (!uid || loading) return;
    setLoading(true);
    try {
      await ensureSnapLoaded();

      const res = await fetch("/api/pay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, name, email }),
      });

      const data: CreatePayResponse = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data.error ?? `Create transaction failed (${res.status})`);
      }

      const snap = window.snap;
      if (!snap) throw new Error("Midtrans not loaded");

      snap.pay(data.token, {
        onSuccess: (res?: unknown) => {
          const r = res as { order_id?: string; orderId?: string } | undefined;
          const orderId = r?.order_id || r?.orderId;
          if (orderId) {
            fetch("/api/pay/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId }),
            }).catch(() => {});
          }
          window.location.href = "/pages/subscription/thanks";
        },
        onPending: (res?: unknown) => {
          // Sync best-effort supaya halaman status tidak tertinggal
          const r = res as { order_id?: string; orderId?: string } | undefined;
          const orderId = r?.order_id || r?.orderId;
          if (orderId) {
            fetch("/api/pay/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId }),
            }).catch(() => {});
          }
        },
        onError: () => {
          alert("Pembayaran gagal. Coba lagi.");
        },
        onClose: () => {
          // user menutup popup
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memulai pembayaran";
      console.error(e);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onPay}
      disabled={loading || !uid}
      aria-disabled={loading || !uid}
      aria-busy={loading}
    >
      {loading ? "Menyiapkan..." : "Langganan Rp5.000/bulan"}
    </button>
  );
}
