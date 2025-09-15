"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, Timestamp, arrayUnion, updateDoc } from "firebase/firestore";
import AddUserDialog from "@/components/users/addUserDialog";

interface User {
  id: string;
  name?: string; // bisa dari Firestore atau Auth
  nama?: string; // beberapa dokumen memakai key "nama"
  username?: string; // bisa kosong jika belum ada profil
  email?: string;
  nisn?: string;
  gender?: string; // beberapa dokumen memakai key "jenisKelamin"
  jenisKelamin?: string;
  role?: "guru" | "murid";
}

const rowsPerPageOptions = [10, 20, 30, 40, 50];

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [subLoadingIds, setSubLoadingIds] = useState<string[]>([]);
  const [subsMap, setSubsMap] = useState<Record<string, { status?: string; currentPeriodEnd?: Timestamp | null }>>({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users/list");
      const json = (await res.json()) as { users: User[] };
      const data = json.users || [];
      setUsers(data);
      // Ambil status subscription untuk tiap user (best-effort)
      const subPairs: [string, { status?: string; currentPeriodEnd?: Timestamp | null }][] = [];
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedUsers = users.slice(startIndex, endIndex);
  const totalPages = Math.ceil(users.length / rowsPerPage);

  const activate30Days = async (uid: string) => {
    setSubLoadingIds((prev) => [...prev, uid]);
    try {
      const now = Timestamp.now();
      // extend dari currentPeriodEnd jika masih aktif
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

      // Tambah role subscriber dan flag di profil user (best-effort)
      try {
        await updateDoc(doc(db, "users", uid), {
          subscriptionActive: true,
          subscriberUntil: end,
          roles: arrayUnion("subscriber"),
          updatedAt: now,
        });
      } catch {}
      setSubsMap((prev) => ({ ...prev, [uid]: { status: "active", currentPeriodEnd: end } }));
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
      } catch {}
      setSubsMap((prev) => ({ ...prev, [uid]: { status: "cancel", currentPeriodEnd: prev[uid]?.currentPeriodEnd ?? null } }));
    } finally {
      setSubLoadingIds((prev) => prev.filter((x) => x !== uid));
    }
  };

  return (
    <AdminLayout pageTitle="Manajemen User">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manajemen User</h1>
        <AddUserDialog onUserAdded={fetchUsers} />
      </div>

      {loading ? (
        <p className="text-gray-500">Memuat data user...</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>NISN/NIP</TableHead>
                <TableHead>Jenis Kelamin</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user, index) => (
                <TableRow key={user.id}>
                  <TableCell>{startIndex + index + 1}</TableCell>
                  <TableCell>{user.name || user.nama || "-"}</TableCell>
                  <TableCell>{user.username || (user.email ? user.email.split("@")[0] : "-")}</TableCell>
                  <TableCell>{user.email || "-"}</TableCell>
                  <TableCell>{user.nisn || "-"}</TableCell>
                  <TableCell>{user.gender || user.jenisKelamin || "-"}</TableCell>
                  <TableCell>
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={user.role || "murid"}
                      onChange={async (e) => {
                        const newRole = e.target.value as User["role"];
                        await setDoc(doc(db, "users", user.id), { role: newRole }, { merge: true });
                        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
                      }}
                    >
                      <option value="murid">murid</option>
                      <option value="guru">guru</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const sub = subsMap[user.id];
                      const end = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd.toMillis()).toLocaleDateString("id-ID") : "-";
                      const status = sub?.status ?? "-";
                      return (
                        <div className="text-sm">
                          <div className="font-medium">{status}</div>
                          <div className="text-xs text-muted-foreground">hingga: {end}</div>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={subLoadingIds.includes(user.id)} onClick={() => activate30Days(user.id)}>
                        {subLoadingIds.includes(user.id) ? "Memproses..." : "+30 hari"}
                      </Button>
                      <Button size="sm" variant="destructive" disabled={subLoadingIds.includes(user.id)} onClick={() => deactivateSub(user.id)}>
                        Nonaktifkan
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-2">
              <label htmlFor="rowsPerPage">Tampilkan:</label>
              <select
                id="rowsPerPage"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border rounded px-2 py-1"
              >
                {rowsPerPageOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <span>data</span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Previous
              </Button>
              <span>
                Halaman {currentPage} dari {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
