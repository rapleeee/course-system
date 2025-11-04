"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { deleteCookie, getCookie } from "cookies-next";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
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

type SidebarSection = {
  title: string;
  items: Array<{ name: string; icon: React.ReactNode; href: string }>;
};

const sidebarMenu: SidebarSection[] = [
  {
    title: "Dasbor",
    items: [{ name: "Dashboard", icon: <LayoutDashboard size={18} />, href: "/admin/dashboard" }],
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
  name?: string;
  nama?: string;
  email?: string;
  level?: string;
  description?: string;
  photoURL?: string;
  role?: string;
};

export default function AdminLayout({ children, pageTitle = "Admin Dashboard" }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const token = getCookie("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (!currentUser) {
          setAuthorized(false);
          setProfile(null);
          setRole(null);
          router.push("/auth/login");
          return;
        }

        let fetchedProfile: ProfileData | null = null;
        try {
          const docSnap = await getDoc(doc(db, "users", currentUser.uid));
          if (docSnap.exists()) {
            fetchedProfile = docSnap.data() as ProfileData;
          }
        } catch (error) {
          console.error("Failed to fetch admin profile:", error);
        }

        const inferredRole =
          fetchedProfile?.role ||
          (currentUser.email === "admin@gmail.com" ? "admin" : undefined);

        if (!inferredRole || (inferredRole !== "admin" && inferredRole !== "guru")) {
          setAuthorized(false);
          setRole(null);
          setProfile(fetchedProfile);
          router.push("/pages/dashboard");
          return;
        }

        setAuthorized(true);
        setRole(inferredRole);
        setProfile({
          name: fetchedProfile?.name || fetchedProfile?.nama || currentUser.displayName || "Admin",
          email: fetchedProfile?.email || currentUser.email || "",
          photoURL: fetchedProfile?.photoURL || currentUser.photoURL || undefined,
          level: fetchedProfile?.level,
          description: fetchedProfile?.description,
          role: inferredRole,
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const filteredMenu = useMemo(() => {
    if (role !== "guru") return sidebarMenu;

    return sidebarMenu
      .map<SidebarSection | null>((section) => {
        if (["Dasbor", "Manajemen Konten", "Fitur"].includes(section.title)) {
          return section;
        }
        if (section.title === "Lainnya") {
          const items = section.items.filter((item) => item.href === "/admin/adminSettings");
          if (items.length === 0) return null;
          return { ...section, items };
        }
        return null;
      })
      .filter(Boolean) as SidebarSection[];
  }, [role]);

  const allowedGuruRoutes = useMemo(() => {
    if (role !== "guru") return null;
    const direct = filteredMenu.flatMap((section) => section.items.map((item) => item.href));
    const additionalPrefixes = ["/admin/course"];
    return [...direct, ...additionalPrefixes];
  }, [filteredMenu, role]);

  useEffect(() => {
    if (!role || role !== "guru" || !allowedGuruRoutes || !pathname) return;
    const isAllowed = allowedGuruRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
    if (!isAllowed) {
      router.replace("/admin/dashboard");
    }
  }, [allowedGuruRoutes, pathname, role, router]);

  const handleLogout = async () => {
    deleteCookie("token");
    await signOut(auth);
    router.push("/auth/login");
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!authorized) {
    return null;
  }

  const panelTitle = role === "guru" ? "Guru Panel" : "Admin Panel";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-neutral-900">
      <aside
        className={`fixed top-0 left-0 z-40 flex h-full w-64 transform flex-col border-r border-gray-200 bg-white p-6 transition-transform dark:border-neutral-700 dark:bg-neutral-800 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{panelTitle}</h2>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
              <X className="text-gray-600 dark:text-white" />
            </button>
          </div>
          <nav className="flex-1 space-y-6 overflow-y-auto pr-2">
            {filteredMenu.map((section) => (
              <div key={section.title} className="pb-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-neutral-700"
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
        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-neutral-700">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-md border bg-red-50 px-4 py-2 text-red-600 transition-all hover:bg-red-100 hover:text-red-700 dark:bg-neutral-800 dark:hover:bg-red-900/30"
            onClick={handleLogout}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex h-full flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4 dark:bg-neutral-900">
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
                <CircleUser className="h-7 w-7 cursor-pointer text-gray-600 dark:text-white" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-bold">{profile?.name || "Admin"}</div>
                  <div className="text-sm text-muted-foreground">
                    @{profile?.email?.split("@")[0] || "admin"}
                  </div>
                  {role ? (
                    <div className="text-xs capitalize text-muted-foreground">Role: {role}</div>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/pages/settings">Pengaturan</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-600">
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-neutral-950">{children}</div>
      </main>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
