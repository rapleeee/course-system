// components/users/AddUserDialog.tsx
"use client";

import { useState } from "react";
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

export default function AddUserDialog({ onUserAdded }: { onUserAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [nisn, setNisn] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState("Laki-laki");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("murid");

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Validasi unik username, email, nisn/nip
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

      const nisnQ = query(collection(db, "users"), where("nisn", "==", nisn));
      const nisnSnap = await getDocs(nisnQ);
      if (!nisnSnap.empty) {
        toast.error("NISN/NIP sudah digunakan.");
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
        nisn,
        jenisKelamin,
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
        <div className="space-y-3">
          <Input placeholder="Nama Lengkap" value={nama} onChange={(e) => setNama(e.target.value)} />
          <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="NISN/NIP" value={nisn} onChange={(e) => setNisn(e.target.value)} />
          <select
            className="w-full border rounded p-2 text-sm"
            value={jenisKelamin}
            onChange={(e) => setJenisKelamin(e.target.value)}
          >
            <option value="Laki-laki">Laki-laki</option>
            <option value="Perempuan">Perempuan</option>
          </select>
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <select
            className="w-full border rounded p-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="murid">Murid</option>
            <option value="guru">Guru</option>
          </select>
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