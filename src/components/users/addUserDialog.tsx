// components/users/AddUserDialog.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { collection, doc, setDoc, getDocs, query, where } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

export default function AddUserDialog({ onUserAdded }: { onUserAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("murid");

  useEffect(() => {
    if (!open) {
      setNama("");
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("murid");
    }
  }, [open]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Validasi unik username & email
      const q = query(collection(db, "users"), where("username", "==", username));
      const snap = await getDocs(q);
      if (!snap.empty) {
        toast.error("Username sudah digunakan.");
        setLoading(false);
        return;
      }

      const emailQ = query(collection(db, "users"), where("email", "==", email));
      const emailSnap = await getDocs(emailQ);
      if (!emailSnap.empty) {
        toast.error("Email sudah digunakan.");
        setLoading(false);
        return;
      }

      // Buat user di Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Simpan data user ke Firestore
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, {
        uid,
        nama,
        username,
        email,
        role,
        createdAt: new Date(),
      });

      toast.success("User berhasil didaftarkan!");
      onUserAdded();
      setOpen(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error("Gagal menambahkan user: " + err.message);
      } else {
        toast.error("Gagal menambahkan user karena error tidak diketahui.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Tambah User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Pengguna Baru</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-user-name">Nama Lengkap</Label>
            <Input
              id="add-user-name"
              placeholder="Contoh: Raditya Panji"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-user-username">Username</Label>
            <Input
              id="add-user-username"
              placeholder="Contoh: raditya.panji"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-user-email">Email</Label>
            <Input
              id="add-user-email"
              type="email"
              placeholder="nama@domain.sch.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-user-password">Password</Label>
            <Input
              id="add-user-password"
              type="password"
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-user-role">Role Pengguna</Label>
            <select
              id="add-user-role"
              className="w-full rounded border px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="murid">Murid</option>
              <option value="guru">Guru</option>
            </select>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="secondary">Batal</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
