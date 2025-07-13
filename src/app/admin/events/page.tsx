"use client";

import React from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Construction } from "lucide-react";

export default function EventPage() {
  return (
    <AdminLayout pageTitle="Halaman Event">
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center text-center space-y-6 max-w-md px-4">
          <Construction className="w-16 h-16 text-yellow-500 animate-bounce" />
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Halaman Event Sedang Dalam Perbaikan
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Kami sedang mengembangkan fitur event untuk pengalaman yang lebih baik.
            Silakan kembali lagi nanti atau hubungi admin jika ada kebutuhan mendesak.
          </p>
          <div className="bg-yellow-100 text-yellow-800 text-sm px-4 py-2 rounded shadow">
            Terima kasih atas kesabaran Anda 🙏
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}