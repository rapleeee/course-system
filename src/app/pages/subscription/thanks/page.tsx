"use client";

import Layout from "@/components/layout";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function ThanksPage() {
  return (
    <Layout pageTitle="Pembayaran Berhasil">
      <div className="max-w-lg mx-auto rounded-xl border p-6 bg-white dark:bg-neutral-900 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="mt-3 text-xl font-bold">Terima kasih!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jika pembayaran berhasil, status langganan akan segera aktif. Halaman ini akan menampilkan benefit premium setelah pembaruan.
        </p>
        <div className="mt-4">
          <Link href="/pages/subscription" className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition bg-blue-600 text-white hover:bg-blue-700">
            Lihat Status Langganan
          </Link>
        </div>
      </div>
    </Layout>
  );
}

