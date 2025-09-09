"use client";

import AdminLayout from "@/components/layouts/AdminLayout";
import { Card } from "@/components/ui/card";
import { Users, BookOpen, CalendarCheck, Award, PlusCircle, UserPlus, FilePlus, Megaphone, CreditCard, Crown, Activity } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getCountFromServer, getDocs, orderBy, query, limit, where, Timestamp } from "firebase/firestore";

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
  const [activeSubs, setActiveSubs] = useState<number>(0);
  const [expiringSubs, setExpiringSubs] = useState<number>(0);
  const [recentPays, setRecentPays] = useState<Array<{ orderId: string; amount: number; status: string }>>([]);
  const [recentCourses, setRecentCourses] = useState<Array<{ id: string; title: string; mentor?: string }>>([]);

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

    const fetchSubscriptions = async () => {
      const now = Timestamp.now();
      const activeQ = query(
        collection(db, "subscriptions"),
        where("status", "==", "active"),
        where("currentPeriodEnd", ">=", now)
      );
      const activeCount = await getCountFromServer(activeQ);
      setActiveSubs(activeCount.data().count);

      const soon = Timestamp.fromMillis(now.toMillis() + 7 * 24 * 60 * 60 * 1000);
      const expiringQ = query(
        collection(db, "subscriptions"),
        where("status", "==", "active"),
        where("currentPeriodEnd", ">=", now),
        where("currentPeriodEnd", "<=", soon)
      );
      const expiringCount = await getCountFromServer(expiringQ);
      setExpiringSubs(expiringCount.data().count);
    };

    const fetchRecentPayments = async () => {
      const q = query(collection(db, "payments"), orderBy("createdAt", "desc"), limit(5));
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => {
        const data = d.data() as { orderId?: string; amount?: number; status?: string };
        return {
          orderId: data.orderId || d.id,
          amount: Number(data.amount || 0),
          status: data.status || "-",
        };
      });
      setRecentPays(rows);
    };

    const fetchRecentCourses = async () => {
      try {
        const q1 = query(collection(db, "courses"), orderBy("createdAt", "desc"), limit(5));
        const snap = await getDocs(q1);
        if (!snap.empty) {
          setRecentCourses(
            snap.docs.map((d) => {
              const data = d.data() as { title?: string; mentor?: string };
              return { id: d.id, title: data.title || d.id, mentor: data.mentor };
            })
          );
          return;
        }
      } catch {}
      // fallback: no createdAt field
      const snap = await getDocs(query(collection(db, "courses"), limit(5)));
      setRecentCourses(
        snap.docs.map((d) => {
          const data = d.data() as { title?: string; mentor?: string };
          return { id: d.id, title: data.title || d.id, mentor: data.mentor };
        })
      );
    };

    fetchData();
    fetchActivity();
    fetchSubscriptions();
    fetchRecentPayments();
    fetchRecentCourses();
  }, []);

  const fmt = new Intl.NumberFormat("id-ID");
  const fmtIdr = (n: number) => `Rp ${fmt.format(n)}`;

  return (
    <AdminLayout pageTitle="Dashboard Admin Mentora">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((item, index) => (
          <Card key={index} className="p-4 border bg-card shadow-sm">
            <div className="flex items-center gap-3">
              <div className={clsx("rounded-full p-3", item.color)}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm text-muted-foreground">{item.title}</div>
                <div className="text-2xl font-semibold text-foreground">{fmt.format(item.value)}</div>
              </div>
            </div>
          </Card>
        ))}
      </section>

      {/* Subscription Overview */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-4 border bg-card shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-full bg-amber-100 text-amber-700"><Crown className="w-5 h-5" /></div>
          <div>
            <div className="text-sm text-muted-foreground">Pelanggan Aktif</div>
          </div>
            <div className="text-2xl font-semibold">{fmt.format(activeSubs)}</div>
        </Card>
        <Card className="p-4 border bg-card shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-full bg-cyan-100 text-cyan-700"><Activity className="w-5 h-5" /></div>
          <div>
            <div className="text-sm text-muted-foreground">Akan Berakhir ≤ 7 hari</div>
          </div>
            <div className="text-2xl font-semibold">{fmt.format(expiringSubs)}</div>
        </Card>
        <Card className="p-4 border bg-card shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-full bg-emerald-100 text-emerald-700"><CreditCard className="w-5 h-5" /></div>
          <div>
            <div className="text-sm text-muted-foreground">Transaksi Terakhir</div>
          </div>
            <div className="text-2xl font-semibold">{recentPays[0]?.amount ? fmtIdr(recentPays[0].amount) : '-'}</div>
        </Card>
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Aktivitas Terbaru</h2>
          <span className="text-xs text-muted-foreground">5 aktivitas terakhir</span>
        </div>
        {activities.length === 0 ? (
          <Card className="p-4 border bg-card text-sm text-muted-foreground">Belum ada aktivitas terbaru.</Card>
        ) : (
          <Card className="p-0 border bg-card">
            <div className="divide-y">
              {activities.map((act, index) => (
                <div key={index} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="p-2 bg-muted rounded-full"><act.icon className="w-5 h-5 text-foreground" /></div>
                  <span className="truncate">
                    <span className="font-medium">{act.name}</span> {act.action}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* Recent payments and courses */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-0 border bg-card">
          <div className="px-4 py-3 border-b"><h3 className="font-semibold">Pembayaran Terbaru</h3></div>
          {recentPays.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">Belum ada pembayaran.</div>
          ) : (
            <div className="px-2 py-2">
              {recentPays.map((p, i) => (
                <div key={i} className="grid grid-cols-12 items-center px-2 py-2 text-sm rounded hover:bg-accent">
                  <div className="col-span-7 truncate">{p.orderId}</div>
                  <div className="col-span-3 text-right text-muted-foreground">{fmtIdr(p.amount)}</div>
                  <div className="col-span-2 text-right">
                    <span className={clsx(
                      "inline-block rounded px-2 py-0.5 text-xs border",
                      p.status === "settlement" || p.status === "capture" ? "border-emerald-300 text-emerald-700" :
                      p.status === "pending" ? "border-amber-300 text-amber-700" :
                      "border-neutral-300 text-neutral-700"
                    )}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-0 border bg-card">
          <div className="px-4 py-3 border-b"><h3 className="font-semibold">Kelas Terbaru</h3></div>
          {recentCourses.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">Belum ada kelas.</div>
          ) : (
            <div className="px-2 py-2">
              {recentCourses.map((c) => (
                <div key={c.id} className="grid grid-cols-12 items-center px-2 py-2 text-sm rounded hover:bg-accent">
                  <div className="col-span-8 truncate">{c.title}</div>
                  <div className="col-span-4 text-right text-muted-foreground">{c.mentor || "-"}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3 mt-4">
          <h2 className="text-lg font-semibold">Aksi Cepat</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Tambah Course", href: "/admin/addcourses", icon: PlusCircle, color: "text-emerald-700", ring: "ring-emerald-300" },
            { label: "Tambah Event", href: "/admin/events", icon: PlusCircle, color: "text-blue-700", ring: "ring-blue-300" },
            { label: "Lihat Sertifikat", href: "/admin/certificates", icon: Award, color: "text-purple-700", ring: "ring-purple-300" },
          ].map(({ label, href, icon: Icon, color, ring }, idx) => (
            <Link href={href} key={idx}>
              <Card className={clsx("p-4 border bg-card shadow-sm hover:shadow transition-all flex items-center gap-3", "hover:ring-2", ring)}>
                <Icon className={clsx(color)} />
                <span className="font-medium text-foreground">{label}</span>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </AdminLayout>
  );
}
