"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  setDoc,
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

type CourseRequest = {
  id: string;
  uid: string;
  userName?: string | null;
  userEmail?: string | null;
  courseId: string;
  courseTitle?: string;
  basePrice?: number;
  discountApplied?: number;
  finalPrice?: number;
  proofUrl?: string;
  notes?: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

const formatCurrency = (value?: number) => `Rp ${(value ?? 0).toLocaleString("id-ID")}`;

export default function CourseRequestsAdminPage() {
  const [items, setItems] = useState<CourseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const q = query(collection(db, "course_purchase_requests"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    setItems(
      snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<CourseRequest, "id">),
      })) as CourseRequest[],
    );
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const approve = async (request: CourseRequest) => {
    setBusyId(request.id);
    try {
      const now = Timestamp.now();
      await setDoc(
        doc(db, "users", request.uid),
        { claimedCourses: arrayUnion(request.courseId) },
        { merge: true },
      );
      await updateDoc(doc(db, "course_purchase_requests", request.id), {
        status: "approved",
        approvedAt: now,
        updatedAt: now,
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (request: CourseRequest) => {
    setBusyId(request.id);
    try {
      await updateDoc(doc(db, "course_purchase_requests", request.id), {
        status: "rejected",
        updatedAt: Timestamp.now(),
      });
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
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!term) return true;
      const name = (item.userName || "").toLowerCase();
      const email = (item.userEmail || "").toLowerCase();
      const uid = item.uid.toLowerCase();
      const course = (item.courseTitle || item.courseId || "").toLowerCase();
      return [name, email, uid, course].some((value) => value.includes(term));
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

  const formatDateTime = (value?: Timestamp) => {
    if (!value) return "-";
    return new Date(value.toMillis()).toLocaleString("id-ID");
  };

  const renderStatusBadge = (status: CourseRequest["status"]) => {
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
    <AdminLayout pageTitle="Permintaan Pembelian Kelas">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Permintaan Pembelian Kelas</CardTitle>
              <CardDescription>
                Review transfer manual untuk kelas berbayar, lalu approve agar course langsung diklaim ke akun siswa.
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
                    placeholder="Cari nama, email, UID, atau kelas…"
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
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 rounded-md border bg-card p-3"
                  >
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
                  ? "Belum ada permintaan pembelian."
                  : "Tidak ada permintaan yang cocok dengan filter."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Pemohon</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Nominal Transfer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Bukti</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {item.courseTitle ?? item.courseId}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Course ID: {item.courseId}
                          </span>
                          {item.createdAt && (
                            <span className="mt-1 text-[11px] text-muted-foreground">
                              Diajukan: {formatDateTime(item.createdAt)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {item.userName || item.userEmail || item.uid}
                          </span>
                          <span className="text-xs text-muted-foreground">UID: {item.uid}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span>{formatCurrency(item.basePrice)}</span>
                          {item.discountApplied ? (
                            <span className="text-[11px] text-muted-foreground">
                              Diskon subscriber: Rp{" "}
                              {item.discountApplied.toLocaleString("id-ID")}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatCurrency(item.finalPrice)}
                      </TableCell>
                      <TableCell>{renderStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-center">
                        {item.proofUrl ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setPreviewUrl(item.proofUrl ?? null)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 px-3 text-xs"
                              disabled={isBusy(item.id)}
                              onClick={() => approve(item)}
                            >
                              {isBusy(item.id) ? (
                                "Memproses…"
                              ) : (
                                <>
                                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs text-rose-700"
                              disabled={isBusy(item.id)}
                              onClick={() => reject(item)}
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
