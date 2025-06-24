"use client";

import AdminLayout from "@/components/layouts/AdminLayout";
import { Card } from "@/components/ui/card";
import {
  Users,
  BookOpen,
  CalendarCheck,
  Award,
  PlusCircle,
  UserPlus,
  FilePlus,
  Megaphone,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

const stats = [
  {
    title: "Total User",
    value: 128,
    icon: Users,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Total Course",
    value: 12,
    icon: BookOpen,
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Total Event",
    value: 6,
    icon: CalendarCheck,
    color: "bg-yellow-100 text-yellow-600",
  },
  {
    title: "Leaderboard Entry",
    value: 88,
    icon: Award,
    color: "bg-purple-100 text-purple-600",
  },
];

const activities = [
  {
    icon: UserPlus,
    name: "Farhan R.",
    action: "baru saja mendaftar",
  },
  {
    icon: Megaphone,
    name: "Webinar React 2025",
    action: "baru ditambahkan",
  },
  {
    icon: FilePlus,
    name: "Next.js Lanjutan",
    action: "baru diterbitkan",
  },
];

export default function AdminDashboardPage() {
  return (
    <AdminLayout pageTitle="Dashboard Admin Mentora">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((item, index) => (
          <Card
            key={index}
            className="p-4 flex-row flex items-center gap-4 shadow-sm border border-gray-200 dark:border-neutral-700"
          >
            <div className="flex gap-2">
            <div
              className={clsx(
                "p-3 rounded-full",
                item.color,
                "flex items-center justify-center"
              )}
            >
              <item.icon className="w-6 h-6" />
            </div>
            <div className="flex-col">
              <p className="text-sm text-gray-500 dark:text-gray-400">{item.title}</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white">{item.value}</p>
            </div>
            </div>
          </Card>
        ))}
      </section>
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Aktivitas Terbaru</h2>
        <Card className="p-4 space-y-4">
          {activities.map((act, index) => (
            <div key={index} className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-gray-100 dark:bg-neutral-800 rounded-full">
                <act.icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <span className="text-gray-700 dark:text-gray-300">
                <strong>{act.name}</strong> {act.action}
              </span>
            </div>
          ))}
        </Card>
      </section>

      {/* Aksi Cepat */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Aksi Cepat</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Link href="/admin/addcourses">
            <Card className="p-4 flex items-center gap-3 hover:bg-green-50 dark:hover:bg-green-900 cursor-pointer transition-all">
              <PlusCircle className="text-green-600" />
              <span className="font-medium text-gray-800 dark:text-white">Tambah Course</span>
            </Card>
          </Link>
          <Link href="/admin/events">
            <Card className="p-4 flex items-center gap-3 hover:bg-blue-50 dark:hover:bg-blue-900 cursor-pointer transition-all">
              <PlusCircle className="text-blue-600" />
              <span className="font-medium text-gray-800 dark:text-white">Tambah Event</span>
            </Card>
          </Link>
          <Link href="/admin/certificates">
            <Card className="p-4 flex items-center gap-3 hover:bg-purple-50 dark:hover:bg-purple-900 cursor-pointer transition-all">
              <Award className="text-purple-600" />
              <span className="font-medium text-gray-800 dark:text-white">Lihat Sertifikat</span>
            </Card>
          </Link>
        </div>
      </section>
    </AdminLayout>
  );
}