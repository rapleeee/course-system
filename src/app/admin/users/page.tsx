"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import AddUserDialog from "@/components/users/addUserDialog";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, Timestamp, arrayUnion, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Search, RefreshCw, Users as UsersIcon } from "lucide-react";

type Role = "murid" | "guru";

interface User {
  id: string;
  name?: string;
  nama?: string;
  username?: string;
  email?: string;
  role?: Role;
  photoURL?: string;
  level?: string;
}

type SubscriptionInfo = { status?: string; currentPeriodEnd?: Timestamp | null };

const rowsPerPageOptions = [10, 20, 30, 40, 50];

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [subLoadingIds, setSubLoadingIds] = useState<string[]>([]);
  const [subsMap, setSubsMap] = useState<Record<string, SubscriptionInfo>>({});
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users/list");
      if (!res.ok) {
        throw new Error(`Gagal memuat data (status ${res.status})`);
      }
      const json = (await res.json()) as { users: User[] };
      const data = json.users || [];
      setUsers(data);

      // Ambil status subscription untuk tiap user (best-effort)
      const subPairs: [string, SubscriptionInfo][] = [];
      for (const u of data) {
        try {
          const s = await getDoc(doc(db, "subscriptions", u.id));
          if (s.exists()) {
            const d = s.data() as { status?: string; currentPeriodEnd?: Timestamp };
            subPairs.push([u.id, { status: d.status, currentPeriodEnd: d.currentPeriodEnd ?? null }]);
          } else {
            subPairs.push([u.id, { status: undefined, currentPeriodEnd: null }]);
          }
        } catch {
          // ignore per user failure
        }
      }
      setSubsMap(Object.fromEntries(subPairs));
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Gagal memuat data pengguna.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers().catch(() => undefined);
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) => {
      const displayName = user.name || user.nama || "";
      const username = user.username || "";
      const email = user.email || "";
      const role = user.role || "murid";
      const level = user.level || "";
      return [displayName, username, email, role, level].some((value) => value.toLowerCase().includes(keyword));
    });
  }, [users, searchTerm]);

  const totalUsers = users.length;
  const totalFiltered = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredUsers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredUsers, currentPage, rowsPerPage]);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setUpdatingRoleId(userId);
    try {
      await setDoc(doc(db, "users", userId), { role: newRole }, { merge: true });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      toast.success("Role pengguna diperbarui.");
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Gagal memperbarui role.");
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const activate30Days = async (uid: string) => {
    setSubLoadingIds((prev) => [...prev, uid]);
    try {
      const now = Timestamp.now();
      const subRef = doc(db, "subscriptions", uid);
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
      await setDoc(
        subRef,
        {
          planId: "manual",
          price: 0,
          status: "active",
          currentPeriodStart: start,
          currentPeriodEnd: end,
          updatedAt: now,
          lastPaymentAt: now,
          method: "manual_admin",
        },
        { merge: true }
      );

      try {
        await updateDoc(doc(db, "users", uid), {
          subscriptionActive: true,
          subscriberUntil: end,
          roles: arrayUnion("subscriber"),
          updatedAt: now,
        });
      } catch {
        // ignore profile update failure
      }
      setSubsMap((prev) => ({ ...prev, [uid]: { status: "active", currentPeriodEnd: end } }));
      toast.success("Langganan +30 hari berhasil diaktifkan.");
    } catch (error) {
      console.error("Failed to activate subscription:", error);
      toast.error("Gagal mengaktifkan langganan manual.");
    } finally {
      setSubLoadingIds((prev) => prev.filter((x) => x !== uid));
    }
  };

  const deactivateSub = async (uid: string) => {
    setSubLoadingIds((prev) => [...prev, uid]);
    try {
      const now = Timestamp.now();
      const subRef = doc(db, "subscriptions", uid);
      await setDoc(subRef, { status: "cancel", updatedAt: now }, { merge: true });
      try {
        await updateDoc(doc(db, "users", uid), { subscriptionActive: false, updatedAt: now });
      } catch {
        // ignore profile update failure
      }
      setSubsMap((prev) => ({
        ...prev,
        [uid]: { status: "cancel", currentPeriodEnd: prev[uid]?.currentPeriodEnd ?? null },
      }));
      toast.success("Langganan dinonaktifkan.");
    } catch (error) {
      console.error("Failed to deactivate subscription:", error);
      toast.error("Gagal menonaktifkan langganan.");
    } finally {
      setSubLoadingIds((prev) => prev.filter((x) => x !== uid));
    }
  };

  const renderSubscriptionInfo = (userId: string) => {
    const sub = subsMap[userId];
    const endDate =
      sub?.currentPeriodEnd instanceof Timestamp
        ? new Date(sub.currentPeriodEnd.toMillis()).toLocaleDateString("id-ID")
        : "-";
    const status = sub?.status ?? "-";
    const isActive = status === "active";
    const badgeVariant = isActive ? "default" : status === "cancel" ? "outline" : "secondary";
    return (
      <div className="space-y-1">
        <Badge variant={badgeVariant}>{status}</Badge>
        <p className="text-xs text-muted-foreground">Hingga {endDate}</p>
      </div>
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers().catch(() => undefined);
  };

  const isLoadingData = loading || refreshing;

  return (
    <AdminLayout pageTitle="Manajemen User">
      <div className="mx-auto max-w-6xl space-y-8 px-2 sm:px-4">
        <header className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/95 p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <UsersIcon className="h-3.5 w-3.5" />
              Direktori Pengguna
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Kelola Pengguna</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Pantau data siswa dan guru, ubah role, serta kendalikan langganan manual dalam satu tempat.
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cari nama, email, atau role..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Muat Ulang
              </Button>
              <AddUserDialog onUserAdded={fetchUsers} />
            </div>
          </div>
        </header>

        <Card className="border-border/60 bg-card/95 shadow-sm">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">Daftar Pengguna</CardTitle>
              <CardDescription>
                {totalFiltered} dari {totalUsers} pengguna ditampilkan.
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              Halaman {currentPage} dari {totalPages}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-border/60">
              {isLoadingData ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">No</TableHead>
                      <TableHead>Pengguna</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Langganan</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: rowsPerPage }, (_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell>
                          <Skeleton className="h-4 w-8" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-36" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-9 w-32" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : paginatedUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <h3 className="text-lg font-semibold text-foreground">Tidak ada data pengguna</h3>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Coba ubah kata kunci pencarian atau tambahkan pengguna baru melalui tombol di atas.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">No</TableHead>
                      <TableHead>Pengguna</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Langganan</TableHead>
                      <TableHead className="min-w-[220px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user, index) => {
                      const displayIndex = (currentPage - 1) * rowsPerPage + index + 1;
                      const displayName = user.name || user.nama || user.username || "Tanpa Nama";
                      const username = user.username || (user.email ? user.email.split("@")[0] : "-");
                      const email = user.email || "-";
                      const role = user.role || "murid";
                      const isRoleUpdating = updatingRoleId === user.id;
                      const isSubscriptionUpdating = subLoadingIds.includes(user.id);
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-semibold text-muted-foreground">{displayIndex}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.photoURL ?? ""} alt={displayName} />
                                <AvatarFallback>
                                  {displayName
                                    .split(" ")
                                    .map((part) => part[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="space-y-1">
                                <p className="font-semibold text-foreground">{displayName}</p>
                                <p className="text-xs text-muted-foreground">username: {username}</p>
                                {user.level ? (
                                  <Badge variant="secondary" className="text-xs">
                                    Level {user.level}
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <p className="font-medium text-foreground">{email}</p>
                              <p className="text-xs text-muted-foreground">ID: {user.id.slice(0, 6)}…</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <select
                              className="w-full rounded-md border border-border/60 bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                              value={role}
                              disabled={isRoleUpdating}
                              onChange={(event) =>
                                handleRoleChange(user.id, event.target.value as Role)
                              }
                            >
                              <option value="murid">murid</option>
                              <option value="guru">guru</option>
                            </select>
                          </TableCell>
                          <TableCell>{renderSubscriptionInfo(user.id)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isSubscriptionUpdating}
                                onClick={() => activate30Days(user.id)}
                              >
                                {isSubscriptionUpdating ? "Memproses..." : "+30 hari"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={isSubscriptionUpdating}
                                onClick={() => deactivateSub(user.id)}
                              >
                                Nonaktifkan
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Tampilkan</span>
                <select
                  value={rowsPerPage}
                  onChange={(event) => {
                    setRowsPerPage(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-md border border-border/60 bg-transparent px-2 py-1 text-sm"
                >
                  {rowsPerPageOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <span>baris per halaman</span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  Sebelumnya
                </Button>
                <span className="text-sm text-muted-foreground">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
