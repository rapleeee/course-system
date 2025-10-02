"use client";

import AdminLayout from "@/components/layouts/AdminLayout";
import { Card } from "@/components/ui/card";
import { Users, BookOpen, CalendarCheck, Award, PlusCircle, UserPlus, FilePlus, Megaphone, CreditCard, Crown, Activity } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

type StatItem = {
  title: string;
  icon: React.ElementType; // ganti dari `any`
  color: string;
  value: number;
};

type ActivityLog = {
  id: string;
  actor: string;
  action: string;
  target?: string;
  description?: string;
  type: string;
  timestamp: Date | null;
  amount?: number;
};

type PaymentRow = {
  id: string;
  orderId: string;
  userName?: string;
  userEmail?: string;
  method?: string;
  status: string;
  amount: number;
  currency?: string;
  timestamp: Date | null;
};

const activityTypeMeta: Record<
  string,
  {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    badgeClass: string;
    label: string;
  }
> = {
  user: {
    icon: UserPlus,
    iconBg: "bg-sky-100",
    iconColor: "text-sky-700",
    badgeClass: "bg-sky-100 text-sky-700",
    label: "User",
  },
  course: {
    icon: FilePlus,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-700",
    badgeClass: "bg-emerald-100 text-emerald-700",
    label: "Course",
  },
  event: {
    icon: Megaphone,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-700",
    badgeClass: "bg-violet-100 text-violet-700",
    label: "Event",
  },
  payment: {
    icon: CreditCard,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-700",
    badgeClass: "bg-amber-100 text-amber-700",
    label: "Pembayaran",
  },
  subscription: {
    icon: Crown,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-700",
    badgeClass: "bg-purple-100 text-purple-700",
    label: "Langganan",
  },
  assignment: {
    icon: Activity,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-700",
    badgeClass: "bg-rose-100 text-rose-700",
    label: "Tugas",
  },
};

const defaultActivityMeta = {
  icon: Activity,
  iconBg: "bg-neutral-100",
  iconColor: "text-neutral-600",
  badgeClass: "bg-neutral-100 text-neutral-600",
  label: "Aktivitas",
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
const absoluteTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatRelativeTime = (date: Date | null) => {
  if (!date) return "Waktu tidak diketahui";
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  if (Math.abs(diffSec) < 60) return relativeTimeFormatter.format(diffSec, "second");
  if (Math.abs(diffMin) < 60) return relativeTimeFormatter.format(diffMin, "minute");
  if (Math.abs(diffHour) < 24) return relativeTimeFormatter.format(diffHour, "hour");
  if (Math.abs(diffDay) < 30) return relativeTimeFormatter.format(diffDay, "day");
  if (Math.abs(diffMonth) < 12) return relativeTimeFormatter.format(diffMonth, "month");
  return relativeTimeFormatter.format(diffYear, "year");
};

const formatAbsoluteTime = (date: Date | null) => {
  if (!date) return "-";
  return absoluteTimeFormatter.format(date);
};

const pickFirstString = (...candidates: unknown[]): string | undefined => {
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return undefined;
};

const parseAmount = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9+\-]/g, "");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const parseTimestamp = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds: unknown }).seconds === "number"
  ) {
    const { seconds, nanoseconds } = value as { seconds: number; nanoseconds?: number };
    const millis = seconds * 1000 + Math.floor((nanoseconds ?? 0) / 1_000_000);
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const mapActivityDocument = (doc: { id: string; data: () => Record<string, unknown> }): ActivityLog => {
  const raw = (doc.data() ?? {}) as Record<string, unknown>;
  const typeRaw = pickFirstString(raw.type, raw.category, raw.kind) ?? "activity";
  const type = typeRaw.toLowerCase();
  const actor =
    pickFirstString(
      raw.actorName,
      raw.actor,
      raw.initiatorName,
      raw.userName,
      raw.user,
      raw.userEmail,
      raw.adminName,
      raw.createdBy,
      raw.createdByName,
      raw.name
    ) ?? "Pengguna";
  const potentialTarget = pickFirstString(
    raw.targetName,
    raw.target,
    raw.entityName,
    raw.courseTitle,
    raw.courseName,
    raw.assignmentTitle,
    raw.eventTitle
  );
  const target = potentialTarget && potentialTarget !== actor ? potentialTarget : undefined;
  const action =
    pickFirstString(raw.action, raw.activity, raw.eventAction, raw.statusMessage, raw.title) ?? "melakukan aktivitas";
  const descriptionCandidate = pickFirstString(
    raw.description,
    raw.details,
    raw.detail,
    raw.note,
    raw.notes,
    raw.message
  );
  const description = descriptionCandidate && descriptionCandidate !== action ? descriptionCandidate : undefined;
  const amount = parseAmount(raw.amount ?? raw.value ?? raw.total ?? raw.paymentAmount ?? raw.nominal);
  const timestamp = parseTimestamp(raw.timestamp ?? raw.createdAt ?? raw.created_at ?? raw.time ?? raw.updatedAt ?? raw.date);

  return {
    id: doc.id,
    actor,
    action,
    target,
    description,
    type,
    timestamp,
    amount,
  };
};

const paymentStatusMeta: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  settlement: { label: "Settlement", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  capture: { label: "Captured", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  pending: { label: "Pending", className: "border-amber-300 bg-amber-50 text-amber-700" },
  expire: { label: "Expired", className: "border-neutral-300 bg-neutral-100 text-neutral-700" },
  canceled: { label: "Canceled", className: "border-red-300 bg-red-50 text-red-700" },
  cancel: { label: "Canceled", className: "border-red-300 bg-red-50 text-red-700" },
  deny: { label: "Denied", className: "border-red-300 bg-red-50 text-red-700" },
  refund: { label: "Refund", className: "border-blue-300 bg-blue-50 text-blue-700" },
  chargeback: { label: "Chargeback", className: "border-red-300 bg-red-50 text-red-700" },
  failure: { label: "Failed", className: "border-red-300 bg-red-50 text-red-700" },
};

const formatPaymentStatus = (status: string) => {
  const key = status.toLowerCase();
  const meta = paymentStatusMeta[key];
  if (meta) return meta;
  return { label: status, className: "border-neutral-300 bg-neutral-100 text-neutral-700" };
};

const mapPaymentDocument = (doc: { id: string; data: () => Record<string, unknown> }): PaymentRow => {
  const raw = (doc.data() ?? {}) as Record<string, unknown>;
  const orderId =
    pickFirstString(raw.orderId, raw.order_id, raw.invoiceId, raw.invoice, raw.reference, doc.id) ?? doc.id;
  const userName = pickFirstString(
    raw.customerName,
    raw.customer,
    raw.payerName,
    raw.userName,
    raw.user,
    raw.buyerName,
    raw.fullName
  );
  const userEmail = pickFirstString(raw.customerEmail, raw.email, raw.userEmail, raw.buyerEmail);
  const method = pickFirstString(raw.paymentType, raw.payment_type, raw.channel, raw.method, raw.bank);
  const status = pickFirstString(raw.status, raw.transactionStatus, raw.paymentStatus, raw.state) ?? "-";
  const currency = pickFirstString(raw.currency, raw.currencyCode, raw.currency_code) ?? "IDR";
  const amount =
    parseAmount(
      raw.amount ??
        raw.grossAmount ??
        raw.gross_amount ??
        raw.total ??
        raw.totalAmount ??
        raw.total_amount ??
        raw.nominal
    ) ?? 0;
  const timestamp = parseTimestamp(
    raw.createdAt ?? raw.created_at ?? raw.timestamp ?? raw.transactionTime ?? raw.updatedAt ?? raw.time
  );

  return {
    id: doc.id,
    orderId,
    userName,
    userEmail,
    method,
    status,
    amount,
    currency,
    timestamp,
  };
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activeSubs, setActiveSubs] = useState<number>(0);
  const [expiringSubs, setExpiringSubs] = useState<number>(0);
  const [recentPays, setRecentPays] = useState<PaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
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
    fetchSubscriptions();
    fetchRecentCourses();

    setActivitiesLoading(true);
    const activitiesQuery = query(
      collection(db, "activityLogs"),
      orderBy("timestamp", "desc"),
      limit(8)
    );
    const unsubscribeActivities = onSnapshot(
      activitiesQuery,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => mapActivityDocument(doc));
        setActivities(items);
        setActivitiesLoading(false);
      },
      (error) => {
        console.error("Failed to listen to activity logs:", error);
        setActivities([]);
        setActivitiesLoading(false);
      }
    );

    setPaymentsLoading(true);
    const paymentsQuery = query(
      collection(db, "payments"),
      orderBy("createdAt", "desc"),
      limit(6)
    );
    const unsubscribePayments = onSnapshot(
      paymentsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => mapPaymentDocument(doc));
        setRecentPays(items);
        setPaymentsLoading(false);
      },
      (error) => {
        console.error("Failed to listen to payments:", error);
        setRecentPays([]);
        setPaymentsLoading(false);
      }
    );

    return () => {
      unsubscribeActivities();
      unsubscribePayments();
    };
  }, []);

  const fmt = new Intl.NumberFormat("id-ID");
  const fmtIdr = (n: number) => `Rp ${fmt.format(n)}`;
  const formatMoney = (amount: number, currency?: string) => {
    if (!Number.isFinite(amount)) return "-";
    const code = currency?.toUpperCase();
    if (!code || code === "IDR") return fmtIdr(amount);
    return `${code} ${fmt.format(amount)}`;
  };

  const latestPayment = recentPays[0];
  const latestAmountLabel = latestPayment ? formatMoney(latestPayment.amount, latestPayment.currency) : "-";
  const latestPaymentTime = latestPayment ? formatRelativeTime(latestPayment.timestamp) : null;
  const latestPaymentTimeFull = latestPayment ? formatAbsoluteTime(latestPayment.timestamp) : null;

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
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Transaksi Terakhir</div>
            <div className="text-xs text-muted-foreground">
              {paymentsLoading
                ? "Memuat transaksi..."
                : latestPaymentTime
                ? `Terakhir ${latestPaymentTime}`
                : "Belum ada transaksi"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold">
              {paymentsLoading ? "…" : latestAmountLabel}
            </div>
            {latestPaymentTimeFull ? (
              <div className="text-[11px] text-muted-foreground">{latestPaymentTimeFull}</div>
            ) : null}
          </div>
        </Card>
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Aktivitas Terbaru</h2>
          <span className="text-xs text-muted-foreground">
            {activitiesLoading
              ? "Memuat aktivitas..."
              : `Realtime · ${Math.min(activities.length, 8)} entri`}
          </span>
        </div>
        {activitiesLoading ? (
          <Card className="p-4 border bg-card">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-3">
                    <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : activities.length === 0 ? (
          <Card className="p-4 border bg-card text-sm text-muted-foreground">
            Belum ada aktivitas terbaru.
          </Card>
        ) : (
          <Card className="p-0 border bg-card">
            <div className="divide-y">
              {activities.map((act) => {
                const meta = activityTypeMeta[act.type] ?? defaultActivityMeta;
                const amountValue =
                  typeof act.amount === "number" && Number.isFinite(act.amount) ? act.amount : null;
                const amountLabel =
                  amountValue !== null
                    ? `${amountValue < 0 ? "-" : "+"}${fmtIdr(Math.abs(amountValue))}`
                    : null;
                const amountColor =
                  amountValue !== null
                    ? amountValue < 0
                      ? "text-red-600"
                      : amountValue === 0
                      ? "text-muted-foreground"
                      : "text-emerald-600"
                    : "text-emerald-600";
                return (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 px-4 py-3 text-sm"
                  >
                    <div className={clsx("rounded-full p-2", meta.iconBg)}>
                      <meta.icon className={clsx("h-5 w-5", meta.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={clsx(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                            meta.badgeClass
                          )}
                        >
                          {meta.label}
                        </span>
                        <span className="truncate">
                          <span className="font-semibold text-foreground">{act.actor}</span> {act.action}
                          {act.target ? (
                            <span className="font-semibold text-foreground"> {act.target}</span>
                          ) : null}
                        </span>
                        <span
                          className="ml-auto text-xs text-muted-foreground"
                          title={formatAbsoluteTime(act.timestamp)}
                        >
                          {formatRelativeTime(act.timestamp)}
                        </span>
                      </div>
                      {act.description ? (
                        <p className="text-xs text-muted-foreground">{act.description}</p>
                      ) : null}
                      {amountLabel ? (
                        <p className={clsx("text-xs font-medium", amountColor)}>{amountLabel}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </section>

      {/* Recent payments and courses */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-0 border bg-card">
          <div className="px-4 py-3 border-b"><h3 className="font-semibold">Pembayaran Terbaru</h3></div>
          {paymentsLoading ? (
            <div className="px-4 py-6 space-y-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="h-3 w-32 rounded bg-muted animate-pulse" />
                    <span className="h-3 w-20 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="h-3 w-28 rounded bg-muted animate-pulse" />
                    <span className="h-3 w-24 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentPays.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">Belum ada pembayaran.</div>
          ) : (
            <div className="px-2 py-2">
              {recentPays.map((p) => {
                const statusMeta = formatPaymentStatus(p.status);
                const amountColor = p.amount < 0 ? "text-red-600" : "text-foreground";
                return (
                  <div
                    key={p.id}
                    className="grid grid-cols-12 gap-2 items-center px-2 py-3 text-sm rounded hover:bg-accent transition"
                  >
                    <div className="col-span-6 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{p.orderId}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p.userName || p.userEmail || "Pengguna"}
                        {p.method ? ` · ${p.method}` : ""}
                      </div>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className={clsx("font-semibold", amountColor)}>
                        {formatMoney(p.amount, p.currency)}
                      </span>
                      <div className="text-[11px] text-muted-foreground">
                        {formatRelativeTime(p.timestamp)}
                      </div>
                    </div>
                    <div className="col-span-3 flex justify-end">
                      <span className={clsx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", statusMeta.className)}>
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>
                );
              })}
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
