"use client";

import AdminLayout from "@/components/layouts/AdminLayout";
import { Card } from "@/components/ui/card";
import { Users, BookOpen, CalendarCheck, Award, PlusCircle, UserPlus, FilePlus, Megaphone } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getCountFromServer, getDocs, orderBy, query, limit } from "firebase/firestore";

type StatItem = {
  title: string;
  icon: React.ElementType; // ganti dari `any`
  color: string;
  value: number;
};

type ActivityLog = {
  name: string;
  action: string;
  icon: React.ElementType; // ganti dari `any`
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const userSnap = await getCountFromServer(collection(db, "users"));
      const courseSnap = await getCountFromServer(collection(db, "courses"));
      const eventSnap = await getCountFromServer(collection(db, "events"));
      const leaderboardSnap = await getCountFromServer(collection(db, "users")); // diasumsikan totalScore diambil dari users

      const statData: StatItem[] = [
        {
          title: "Total User",
          icon: Users,
          color: "bg-blue-100 text-blue-600",
          value: userSnap.data().count,
        },
        {
          title: "Total Course",
          icon: BookOpen,
          color: "bg-green-100 text-green-600",
          value: courseSnap.data().count,
        },
        {
          title: "Total Event",
          icon: CalendarCheck,
          color: "bg-yellow-100 text-yellow-600",
          value: eventSnap.data().count,
        },
        {
          title: "Leaderboard Entry",
          icon: Award,
          color: "bg-purple-100 text-purple-600",
          value: leaderboardSnap.data().count,
        },
      ];

      setStats(statData);
    };

    const fetchActivity = async () => {
      const q = query(collection(db, "activityLogs"), orderBy("timestamp", "desc"), limit(5));
      const snap = await getDocs(q);

      const activityData: ActivityLog[] = snap.docs.map((doc) => {
        const d = doc.data();
        let icon = UserPlus;
        if (d.type === "event") icon = Megaphone;
        if (d.type === "course") icon = FilePlus;

        return {
          name: d.name,
          action: d.action,
          icon,
        };
      });

      setActivities(activityData);
    };

    fetchData();
    fetchActivity();
  }, []);

  return (
    <AdminLayout pageTitle="Dashboard Admin Mentora">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((item, index) => (
          <Card
            key={index}
            className="p-4 flex-row flex items-center gap-4 shadow-sm border border-gray-200 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div className="flex gap-2">
              <div className={clsx("p-3 rounded-full", item.color, "flex items-center justify-center")}>
                <item.icon className="w-6 h-6" />
              </div>
              <div className="flex-col">
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.title}</p>
                <p className="text-xl font-bold text-[#1d857c] dark:text-white">{item.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Aktivitas Terbaru</h2>
        {activities.length === 0 ? (
          <Card className="p-4 text-sm text-gray-500 dark:text-gray-300 dark:bg-neutral-800">Belum ada aktivitas terbaru.</Card>
        ) : (
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
        )}
      </section>

      <section>
  <h2 className="text-lg font-semibold mb-3">Aksi Cepat</h2>

  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
    {[
      {
        label: "Tambah Course",
        href: "/admin/addcourses",
        icon: PlusCircle,
        color: "text-green-600",
        hover: "hover:bg-green-50 dark:hover:bg-green-900",
      },
      {
        label: "Tambah Event",
        href: "/admin/events",
        icon: PlusCircle,
        color: "text-blue-600",
        hover: "hover:bg-blue-50 dark:hover:bg-blue-900",
      },
      {
        label: "Lihat Sertifikat",
        href: "/admin/certificates",
        icon: Award,
        color: "text-purple-600",
        hover: "hover:bg-purple-50 dark:hover:bg-purple-900",
      },
    ].map(({ label, href, icon: Icon, color, hover }, idx) => (
      <Link href={href} key={idx}>
        <Card
          className={clsx(
            "p-4 flex items-center gap-3 cursor-pointer transition-all",
            hover
          )}
        >
          <Icon className={clsx(color)} />
          <span className="font-medium text-gray-800 dark:text-white">{label}</span>
        </Card>
      </Link>
    ))}
  </div>
</section>
    </AdminLayout>
  );
}