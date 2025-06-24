"use client";

import AdminLayout from "@/components/layouts/AdminLayout";

export default function AdminDashboardPage() {
  return (
    <AdminLayout pageTitle="Dashboard">
      <h1 className="text-2xl font-bold mb-4">Selamat datang, Admin!</h1>
      <p className="text-gray-600 dark:text-gray-300">
        Ini adalah dashboard admin. Di sini kamu bisa mengelola data pengguna dan fitur lainnya.
      </p>
    </AdminLayout>
  );
}