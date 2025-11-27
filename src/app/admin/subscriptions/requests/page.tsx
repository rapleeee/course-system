"use client";

import AdminLayout from "@/components/layouts/AdminLayout";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  doc,
  setDoc,
  getDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, CheckCircle2, XCircle, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Req = {
  id: string;
  uid: string;
  userName?: string | null;
  userEmail?: string | null;
  amount?: number;
  bank?: string;
  accountName?: string;
  accountNumber?: string;
  transferAt?: Timestamp | null;
  proofUrl?: string;
  notes?: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export default function SubscriptionRequestsPage() {
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const q = query(collection(db, "subscription_requests"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setItems(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Req, "id">) })) as Req[]
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (r: Req) => {
    setBusyId(r.id);
    try {
      const now = Timestamp.now();
      const subRef = doc(db, "subscriptions", r.uid);
      const subSnap = await getDoc(subRef);
      let start = now;
      let end = Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000);
      if (subSnap.exists()) {
        const d = subSnap.data() as { currentPeriodEnd?: Timestamp; status?: string };
        const base = d.currentPeriodEnd?.toMillis() ?? 0;
        if (d.status === "active" && base > now.toMillis()) {
          start = Timestamp.fromMillis(base);
          end = Timestamp.fromMillis(base + 30 * 24 * 60 * 60 * 1000);
        }
      }
      await setDoc(subRef, { planId: "manual", price: r.amount ?? 0, status: "active", currentPeriodStart: start, currentPeriodEnd: end, lastPaymentAt: now, updatedAt: now, method: "manual_transfer", requestId: r.id }, { merge: true });
      await updateDoc(doc(db, "users", r.uid), { subscriptionActive: true, subscriberUntil: end, updatedAt: now, roles: arrayUnion("subscriber") });
      await updateDoc(doc(db, "subscription_requests", r.id), { status: "approved", updatedAt: now });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (r: Req) => {
    setBusyId(r.id);
    try {
      await updateDoc(doc(db, "subscription_requests", r.id), { status: "rejected", updatedAt: Timestamp.now() });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return items.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!term) return true;
      const name = (r.userName || "").toLowerCase();
      const email = (r.userEmail || "").toLowerCase();
      const uid = r.uid.toLowerCase();
      const bank = (r.bank || "").toLowerCase();
      return [name, email, uid, bank].some((value) => value.includes(term));
    });
  }, [items, statusFilter, searchTerm]);

  const pendingCount = useMemo(
    () => items.filter((r) => r.status === "pending").length,
    [items]
  );
  const approvedCount = useMemo(
    () => items.filter((r) => r.status === "approved").length,
    [items]
  );
  const rejectedCount = useMemo(
    () => items.filter((r) => r.status === "rejected").length,
    [items]
  );

  const formatDateTime = (value?: Timestamp | null) => {
    if (!value) return "-";
    return new Date(value.toMillis()).toLocaleString("id-ID");
  };

  const formatAmount = (value?: number) =>
    `Rp ${(value ?? 0).toLocaleString("id-ID")}`;

  const renderStatusBadge = (status: Req["status"]) => {
    const base = "px-2 py-0.5 rounded-full text-xs font-medium";
    if (status === "pending") {
      return <span className={`${base} bg-amber-100 text-amber-700`}>Pending</span>;
    }
    if (status === "approved") {
      return <span className={`${base} bg-emerald-100 text-emerald-700`}>Approved</span>;
    }
    return <span className={`${base} bg-rose-100 text-rose-700`}>Rejected</span>;
  };

  const isBusy = (id: string) => busyId === id;
  const isLoading = loading || refreshing;

  return (
    <AdminLayout pageTitle="Permintaan Langganan (Transfer)">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Permintaan Langganan (Transfer)</CardTitle>
              <CardDescription>
                Review bukti transfer, approve untuk menambah masa aktif langganan, atau tolak bila tidak valid.
              </CardDescription>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Total: {items.length}</span>
                <span>· Pending: {pendingCount}</span>
                <span>· Approved: {approvedCount}</span>
                <span>· Rejected: {rejectedCount}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex rounded-md border bg-background px-1 py-0.5 text-xs">
                {(["all", "pending", "approved", "rejected"] as const).map((status) => {
                  const label =
                    status === "all"
                      ? "Semua"
                      : status === "pending"
                      ? "Pending"
                      : status === "approved"
                      ? "Approved"
                      : "Rejected";
                  const active = statusFilter === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`px-2 py-1 rounded-md transition text-xs ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted/70"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-48">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-7 h-8 text-xs"
                    placeholder="Cari nama, email, UID, bank…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between gap-3 rounded-md border bg-card p-3">
                    <div className="flex flex-1 flex-col gap-1">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-7 w-32" />
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {items.length === 0
                  ? "Belum ada permintaan langganan."
                  : "Tidak ada permintaan yang cocok dengan filter."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pemohon</TableHead>
                    <TableHead>Nominal</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Tanggal Transfer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Bukti</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {r.userName || r.userEmail || r.uid}
                          </span>
                          <span className="text-xs text-muted-foreground">UID: {r.uid}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatAmount(r.amount)}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span>{r.bank || "-"}</span>
                          {r.accountName && (
                            <span className="text-[11px] text-muted-foreground">
                              {r.accountName} · {r.accountNumber || "-"}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(r.transferAt)}
                      </TableCell>
                      <TableCell>{renderStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-center">
                        {r.proofUrl ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setPreviewUrl(r.proofUrl ?? null)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 px-3 text-xs"
                              disabled={isBusy(r.id)}
                              onClick={() => approve(r)}
                            >
                              {isBusy(r.id) ? (
                                "Memproses…"
                              ) : (
                                <>
                                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                  Approve +30 hari
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs text-rose-700"
                              disabled={isBusy(r.id)}
                              onClick={() => reject(r)}
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                              Tolak
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            Tidak ada aksi
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        {previewUrl && (
          <Dialog
            open={!!previewUrl}
            onOpenChange={(open) => {
              if (!open) setPreviewUrl(null);
            }}
          >
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Bukti Transfer</DialogTitle>
              </DialogHeader>
              <div className="mt-2">
                <img
                  src={previewUrl}
                  alt="Bukti transfer"
                  className="max-h-[70vh] w-full rounded-md border object-contain"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}
