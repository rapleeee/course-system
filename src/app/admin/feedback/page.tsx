"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Megaphone, SendHorizonal, Users } from "lucide-react";

type UserSummary = {
  id: string;
  name: string;
  email?: string;
  username?: string;
  role?: string;
  level?: string;
  photoURL?: string;
  createdAt?: Timestamp;
};

const USERS_FETCH_LIMIT = 200;

function getDisplayName(payload: Record<string, unknown>): string {
  return (
    (typeof payload.name === "string" && payload.name) ||
    (typeof payload.nama === "string" && payload.nama) ||
    (typeof payload.username === "string" && payload.username) ||
    (typeof payload.email === "string" && payload.email.split("@")[0]) ||
    "Pengguna"
  );
}

export default function AdminFeedbackPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sendToAll, setSendToAll] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const snap = await getDocs(collection(db, "users"));
        if (!mounted) return;
        const rows: UserSummary[] = snap.docs.slice(0, USERS_FETCH_LIMIT).map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          return {
            id: docSnap.id,
            name: getDisplayName(data),
            email: typeof data.email === "string" ? data.email : undefined,
            username: typeof data.username === "string" ? data.username : undefined,
            role: typeof data.role === "string" ? data.role : undefined,
            level: typeof data.level === "string" ? data.level : undefined,
            photoURL: typeof data.photoURL === "string" ? data.photoURL : undefined,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
          };
        });
        setUsers(rows);
      } catch (error) {
        console.error("Failed to load users:", error);
        toast.error("Gagal memuat daftar pengguna.");
      } finally {
        if (mounted) {
          setLoadingUsers(false);
        }
      }
    };

    fetchUsers().catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (sendToAll) {
      setSelectedUserId(null);
    }
  }, [sendToAll]);

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) => {
      const values = [user.name, user.email, user.username, user.role, user.level].filter(Boolean);
      return values.some((value) => value?.toLowerCase().includes(keyword));
    });
  }, [users, searchTerm]);

  const selectedUser = selectedUserId ? users.find((user) => user.id === selectedUserId) ?? null : null;

  const handleSendNotification = async () => {
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    if (!trimmedTitle) {
      toast.error("Judul notifikasi tidak boleh kosong.");
      return;
    }
    if (!trimmedMessage) {
      toast.error("Isi pesan tidak boleh kosong.");
      return;
    }
    if (!sendToAll && !selectedUser) {
      toast.error("Pilih penerima notifikasi terlebih dahulu.");
      return;
    }
    if (sendToAll && users.length === 0) {
      toast.error("Belum ada pengguna untuk menerima notifikasi.");
      return;
    }

    setSending(true);
    try {
      const targets = sendToAll ? users : selectedUser ? [selectedUser] : [];
      const chunks: UserSummary[][] = [];
      const size = 15;
      for (let i = 0; i < targets.length; i += size) {
        chunks.push(targets.slice(i, i + size));
      }

      let delivered = 0;
      const payload = {
        title: trimmedTitle,
        message: trimmedMessage,
        type: "admin_message",
        read: false,
        createdAt: serverTimestamp(),
        data: {
          audience: sendToAll ? "broadcast" : "direct",
        },
      };

      for (const chunk of chunks) {
        const results = await Promise.allSettled(
          chunk.map((target) =>
            addDoc(collection(db, "users", target.id, "notifications"), payload)
          )
        );
        delivered += results.filter((result) => result.status === "fulfilled").length;
      }

      if (delivered === targets.length) {
        toast.success(sendToAll ? `Broadcast dikirim ke ${delivered} pengguna.` : "Notifikasi berhasil dikirim.");
      } else if (delivered > 0) {
        toast.warning(`Sebagian notifikasi gagal. Berhasil dikirim ke ${delivered} dari ${targets.length} pengguna.`);
      } else {
        toast.error("Gagal mengirim notifikasi. Coba lagi.");
      }

      if (delivered > 0) {
        setTitle("");
        setMessage("");
      }
    } catch (error) {
      console.error("Failed to send notifications:", error);
      toast.error("Terjadi kesalahan saat mengirim notifikasi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout pageTitle="Kirim Notifikasi">
      <div className="mx-auto max-w-6xl space-y-8 px-2 sm:px-4">
        <header className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/95 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Megaphone className="h-3.5 w-3.5" />
              Pusat Notifikasi
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Kirim Pesan ke Pengguna
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Gunakan halaman ini untuk mengirim pengumuman, reminder progres, atau apresiasi kepada siswa secara
                langsung. Pesan akan muncul di panel notifikasi pengguna.
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card className="border-border/60 bg-card/95 shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle>Tujuan Notifikasi</CardTitle>
              <CardDescription>Pilih penerima atau aktifkan broadcast untuk menjangkau semua pengguna.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/40 px-4 py-3">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-foreground">Broadcast ke seluruh pengguna</Label>
                  <p className="text-xs text-muted-foreground">
                    Kirim pengumuman umum. Semua pengguna aktif akan menerima notifikasi ini.
                  </p>
                </div>
                <Switch checked={sendToAll} onCheckedChange={setSendToAll} aria-label="Broadcast ke seluruh pengguna" />
              </div>

              {!sendToAll ? (
                <div className="space-y-4">
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Cari nama, email, atau username..."
                    className="w-full"
                  />
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {filteredUsers.length} ditemukan
                      </span>
                      <span>Total {users.length} pengguna</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background">
                    <ScrollArea className="h-72 overflow-hidden">
                      <div className="divide-y divide-border/60">
                        {loadingUsers ? (
                          Array.from({ length: 6 }).map((_, index) => (
                            <div key={`user-skeleton-${index}`} className="flex items-center gap-3 px-4 py-3">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-3 w-1/3" />
                              </div>
                            </div>
                          ))
                        ) : filteredUsers.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                            Tidak ada pengguna yang sesuai dengan pencarian.
                          </div>
                        ) : (
                          filteredUsers.map((user) => {
                            const isSelected = user.id === selectedUserId;
                            return (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => setSelectedUserId(user.id)}
                                className={cn(
                                  "flex w-full items-center gap-3 px-4 py-3 text-left transition",
                                  isSelected ? "bg-primary/10" : "hover:bg-muted/60"
                                )}
                              >
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={user.photoURL ?? ""} alt={user.name} />
                                  <AvatarFallback>
                                    {user.name
                                      .split(" ")
                                      .map((part) => part[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {user.email || user.username || "Tidak ada email"}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {user.role ? <Badge variant="secondary">{user.role}</Badge> : null}
                                  {user.level ? (
                                    <span className="text-xs text-muted-foreground">Level {user.level}</span>
                                  ) : null}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {selectedUser ? (
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        Mengirim ke:
                        <span className="text-primary">{selectedUser.name}</span>
                      </div>
                      <div className="mt-1 space-y-1">
                        {selectedUser.email ? <div>Email: {selectedUser.email}</div> : null}
                        {selectedUser.username ? <div>Username: {selectedUser.username}</div> : null}
                        {selectedUser.role ? <div>Role: {selectedUser.role}</div> : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                  Semua pengguna aktif akan menerima notifikasi ini.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/95 shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle>Konten Notifikasi</CardTitle>
              <CardDescription>Isi judul dan pesan yang akan tampil di panel notifikasi pengguna.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notification-title" className="text-sm font-medium text-foreground">
                  Judul
                </Label>
                <Input
                  id="notification-title"
                  placeholder="Contoh: Pengumuman kelas baru tersedia"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={80}
                />
                <p className="text-xs text-muted-foreground">Maksimal 80 karakter.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification-message" className="text-sm font-medium text-foreground">
                  Pesan
                </Label>
                <Textarea
                  id="notification-message"
                  placeholder="Tuliskan pesan yang ingin disampaikan..."
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Pesan ini akan terlihat utuh di panel notifikasi. Gunakan bahasa yang jelas dan singkat.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleSendNotification}
                disabled={sending || loadingUsers || (!sendToAll && !selectedUser)}
                className="w-full sm:w-auto"
              >
                {sending ? "Mengirim..." : (
                  <>
                    <SendHorizonal className="mr-2 h-4 w-4" />
                    Kirim Notifikasi
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
