"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCookie, getCookie } from "cookies-next";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";

import { ModeToggle } from "@/components/ui/ModeToogle";
import { Toaster } from "@/components/ui/sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CircleUser,
  LayoutDashboard,
  Users,
  LogOut,
  BookOpen,
  CalendarCheck,
  Layers,
  Award,
  MessageCircle,
  UserCheck,
  Settings,
  Menu,
  X,
  FilePlus2,
  School2,
  Megaphone,
} from "lucide-react";

// Sidebar menu structure
const sidebarMenu = [
  {
    title: "Dasbor",
    items: [
      { name: "Dashboard", icon: <LayoutDashboard size={18} />, href: "/admin/dashboard" },
    ],
  },
  {
    title: "Manajemen Konten",
    items: [
      { name: "Tambah Course", icon: <FilePlus2 size={18} />, href: "/admin/addcourses" },
      { name: "Manajemen Course", icon: <BookOpen size={18} />, href: "/admin/managementcourse" },
      { name: "Manajemen Event", icon: <CalendarCheck size={18} />, href: "/admin/events" },
      { name: "Tugas & Kuis", icon: <Layers size={18} />, href: "/admin/assignments" },
      { name: "Kategori", icon: <Layers size={18} />, href: "/admin/categories" },
      { name: "Pengumuman", icon: <Megaphone size={18} />, href: "/admin/announcements" },
    ],
  },
  {
    title: "Fitur",
    items: [
      { name: "Leaderboard", icon: <Award size={18} />, href: "/admin/leaderboard" },
      { name: "SMK Pesat", icon: <School2 size={18} />, href: "/admin/mentorapesat" },
      { name: "Sertifikat", icon: <UserCheck size={18} />, href: "/admin/certificates" },
      { name: "Feedback", icon: <MessageCircle size={18} />, href: "/admin/feedback" },
    ],
  },
  {
    title: "Lainnya",
    items: [
      { name: "Manajemen User", icon: <Users size={18} />, href: "/admin/users" },
      { name: "Permintaan Langganan", icon: <UserCheck size={18} />, href: "/admin/subscriptions/requests" },
      { name: "Permintaan Kelas Berbayar", icon: <BookOpen size={18} />, href: "/admin/course-requests" },
      { name: "Pengaturan", icon: <Settings size={18} />, href: "/admin/adminSettings" },
    ],
  },
];

type Props = {
  children: React.ReactNode;
  pageTitle?: string;
};

type ProfileData = {
  name: string;
  email: string;
  level?: string;
  description?: string;
  photoURL?: string;
};

export default function AdminLayout({ children, pageTitle = "Admin Dashboard" }: Props) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    const token = getCookie("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user?.email === "admin@gmail.com") {
        setAuthorized(true);
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          setProfile(docSnap.data() as ProfileData);
        }
      } else {
        router.push("/pages/dashboard");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    deleteCookie("token");
    await signOut(auth);
    router.push("/auth/login");
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!authorized) return null;

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-neutral-900 overflow-hidden">
      <aside
        className={`fixed lg:static z-40 top-0 left-0 h-full w-64 bg-white dark:bg-neutral-800 border-r border-gray-200 dark:border-neutral-700 flex flex-col p-6 transform transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Admin Panel</h2>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
              <X className="text-gray-600 dark:text-white" />
            </button>
          </div>
          <nav className="space-y-6 overflow-y-auto pr-2 -mr-2 flex-1 min-h-0">
            {sidebarMenu.map((section) => (
              <div key={section.title} className="pb-2">
                <p className="text-xs uppercase font-semibold text-gray-400 tracking-wide mb-2">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 text-sm px-3 py-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-neutral-700">
          <button
            className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 border bg-red-50 dark:bg-neutral-800 rounded-md px-4 py-2 transition-all"
            onClick={handleLogout}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b bg-white dark:bg-neutral-900 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="text-gray-700 dark:text-white" />
            </button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <CircleUser className="w-7 h-7 cursor-pointer text-gray-600 dark:text-white" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-bold">{profile?.name || "Admin"}</div>
                  <div className="text-sm text-muted-foreground">
                    @{profile?.email?.split("@")[0] || "admin"}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/pages/settings">Pengaturan</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        <Toaster position="top-right" richColors closeButton />
      </main>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
