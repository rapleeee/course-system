"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import Link from "next/link";
import Swal from "sweetalert2"; // ✅ Import SweetAlert2
import { useAdminProfile } from "@/hooks/useAdminProfile";

type CourseAccessType = "free" | "subscription" | "paid";

export default function AddCoursesPage() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [mentor, setMentor] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [accessType, setAccessType] = useState<CourseAccessType>("free");
  const [price, setPrice] = useState<string>("0");
  const [materialType, setMaterialType] = useState("video");
  const [loading, setLoading] = useState(false);
  const { user, profile, profileLoading } = useAdminProfile();

  const profileName = useMemo(() => {
    if (!profile) return "";
    return (
      (typeof profile.name === "string" && profile.name) ||
      (typeof profile.nama === "string" && profile.nama) ||
      (typeof profile.username === "string" && profile.username) ||
      (typeof profile.email === "string" && profile.email.split("@")[0]) ||
      ""
    );
  }, [profile]);

  const isGuru = profile?.role === "guru";

  useEffect(() => {
    if (!profileLoading && isGuru && profileName) {
      setMentor(profileName);
    }
  }, [isGuru, profileLoading, profileName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!user) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Pengguna tidak terautentikasi.",
        confirmButtonColor: "#e3342f",
      });
      setLoading(false);
      return;
    }

    const mentorValue = isGuru ? profileName : mentor;
    let imageUrl = "https://firebasestorage.googleapis.com/v0/b/sarayaplus.appspot.com/o/default-course.jpg?alt=media";
    try {
      if (image) {
        const imageRef = ref(storage, `course-images/${Date.now()}-${image.name}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, "courses"), {
        title,
        description: desc,
        mentor: mentorValue,
        imageUrl,
        accessType,
        price: accessType === "paid" ? Number(price) || 0 : 0,
        isFree: accessType === "free",
        materialType,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        createdByName: profileName || mentorValue,
        createdByEmail: user.email ?? null,
      });

      // Reset form
      setTitle("");
      setDesc("");
      setMentor(isGuru ? profileName : "");
      setImage(null);
      setAccessType("free");
      setPrice("0");
      setMaterialType("video");

      // ✅ SweetAlert sukses
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Course berhasil ditambahkan!",
        confirmButtonColor: "#1d857c",
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Terjadi kesalahan saat menambahkan course.",
        confirmButtonColor: "#e3342f",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout pageTitle="Tambah Course">
      <div className="flex mb-4">
        <Link
          href="/admin/managementcourse"
          className="text-sm px-4 py-2 bg-[#1d857c] text-white rounded-md hover:bg-[#1d827c] transition"
        >
          Lihat Semua Course
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div>
          <Label htmlFor="title" className="block mb-1">Judul Course</Label>
          <Input
            id="title"
            className="border rounded-md px-3 py-2 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="desc" className="block mb-1">Deskripsi</Label>
          <Textarea
            id="desc"
            className="border rounded-md px-3 py-2 w-full min-h-[100px]"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="mentor" className="block mb-1">Mentor</Label>
          <Input
            id="mentor"
            className="border rounded-md px-3 py-2 w-full"
            value={mentor}
            onChange={(e) => setMentor(e.target.value)}
            disabled={isGuru}
            required
          />
          </div>

        <div>
          <Label htmlFor="image" className="block mb-1">Upload Gambar</Label>
          <Input
            id="image"
            type="file"
            accept="image/*"
            className="border rounded-md px-3 py-2 w-full"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </div>

        <div>
          <Label htmlFor="accessType" className="block mb-1">Tipe Akses</Label>
          <select
            id="accessType"
            className="border rounded-md px-3 py-2 w-full"
            value={accessType}
            onChange={(e) => setAccessType(e.target.value as CourseAccessType)}
          >
            <option value="free">Gratis</option>
            <option value="subscription">Hanya Subscriber</option>
            <option value="paid">Berbayar (Manual)</option>
          </select>
        </div>

        {accessType === "paid" && (
          <div>
            <Label htmlFor="price" className="block mb-1">Harga Course (Rp)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              className="border rounded-md px-3 py-2 w-full"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required={accessType === "paid"}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Pengguna dengan langganan aktif akan mendapatkan diskon Rp5.000 secara otomatis.
            </p>
          </div>
        )}

        <div>
          <Label htmlFor="materialType" className="block mb-1">Tipe Pembelajaran</Label>
          <select
            id="materialType"
            className="border rounded-md px-3 py-2 w-full"
            value={materialType}
            onChange={(e) => setMaterialType(e.target.value)}
          >
            <option value="video">Video</option>
            <option value="module">E-Module</option>
          </select>
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan Course"}
        </Button>
      </form>
    </AdminLayout>
  );
}
