"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCookie, getCookie } from "cookies-next";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";

import { ModeToggle } from "@/components/ui/ModeToogle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
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
  Settings
} from "lucide-react";

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

const adminSidebar = [
  { name: "Dashboard", icon: <LayoutDashboard size={18} />, href: "/admin/dashboard" },
  { name: "Manajemen Course", icon: <BookOpen size={18} />, href: "/admin/addcourses" },
  { name: "Manajemen Event", icon: <CalendarCheck size={18} />, href: "/admin/events" },
  { name: "Kategori", icon: <Layers size={18} />, href: "/admin/categories" },
  { name: "Leaderboard", icon: <Award size={18} />, href: "/admin/leaderboard" },
  { name: "Sertifikat", icon: <UserCheck size={18} />, href: "/admin/certificates" },
  { name: "Feedback", icon: <MessageCircle size={18} />, href: "/admin/feedback" },
  { name: "Manajemen User", icon: <Users size={18} />, href: "/admin/users" },
  { name: "Pengaturan", icon: <Settings size={18} />, href: "/admin/adminSettings" }
];

export default function AdminLayout({ children, pageTitle = "Admin Dashboard" }: Props) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
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
    <div className="flex min-h-screen bg-gray-100 dark:bg-neutral-900">
      <aside className="w-64 bg-white dark:bg-neutral-800 border-r border-gray-200 dark:border-neutral-700 p-6 space-y-6">
        <div className="text-2xl font-bold">Admin Panel</div>
        <nav className="space-y-2">
          {adminSidebar.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-700 px-3 py-2 rounded-md"
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>
        <button
          className="w-full flex items-center justify-center gap-2 mt-10 text-red-500 hover:bg-red-800 hover:text-white border bg-red-200 rounded-md px-4 py-2"
          onClick={handleLogout}
        >
          <LogOut size={16} /> Logout
        </button>
      </aside>

      <main className="flex-1">
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-bold">{pageTitle}</h1>
          <div className="flex items-center gap-4">
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <CircleUser className="w-7 h-7 cursor-pointer" />
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
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}