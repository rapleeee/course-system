"use client";
import React, { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "./ui/ModeToogle";
import UserNotificationBell from "@/components/notifications/UserNotificationBell";
import NotificationListener from "@/components/notifications/NotificationListener";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CircleUser, Star } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import ChatBox from "./mentorai/ChatBox";
import { Toaster } from "@/components/ui/sonner";
import { usePathname, useRouter } from "next/navigation";

type LayoutProps = {
  children: React.ReactNode;
  pageTitle?: string;
};

type ProfileData = {
  name: string;
  email: string;
  level?: string;
  description?: string;
  photoURL?: string;
  roles?: string[];
  subscriptionActive?: boolean;
  subscriberUntil?: unknown;
  surveyCompleted?: boolean;
};

export default function Layout({ children, pageTitle = "Dashboard" }: LayoutProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  // Chat list no longer used; ChatBox handles its own context

  useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      setProfileLoaded(false);
      return;
    }

    const ref = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setProfile((snap.data() as ProfileData | undefined) ?? null);
        setProfileLoaded(true);
      },
      (error) => {
        console.error("Failed to fetch profile:", error);
        setProfileLoaded(true);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/auth/login";
  };

  const isSubscriber = Boolean(
    profile?.subscriptionActive || (profile?.roles || []).includes("subscriber")
  );

  useEffect(() => {
    if (!user || !profileLoaded) return;

    const isSurveyPage = pathname?.startsWith("/pages/survey");
    const surveyDone = Boolean(profile?.surveyCompleted);

    if (!surveyDone && !isSurveyPage) {
      router.replace("/pages/survey");
      return;
    }

    if (surveyDone && isSurveyPage) {
      router.replace("/pages/dashboard");
    }
  }, [user, profile, profileLoaded, pathname, router]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        <NotificationListener />
        <div className="flex items-center p-4 w-full border-b justify-between">
          <div className="flex items-center">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold ml-4">{pageTitle}</h1>

          </div>

          <div className="flex items-center gap-4">
            <UserNotificationBell />
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <div className="relative">
                  <CircleUser className="cursor-pointer w-7 h-7" />
                  {isSubscriber && (
                    <Star
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 text-amber-400"
                      fill="currentColor"
                    />
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-bold flex items-center gap-2">
                    {profile?.name || "User"}
                    {isSubscriber && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-2 py-0.5 text-[10px] font-semibold">
                        <Star className="w-3 h-3" fill="currentColor" /> Subscriber
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    @{user?.email?.split("@")[0] || "rapler"}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/pages/courses">Kelas Saya</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/certificates">Sertifikat Saya</Link>
                </DropdownMenuItem>
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
              <ChatBox />

        <div className="w-full p-8">{children}</div>
        <Toaster position="top-right" richColors closeButton />
      </main>
    </SidebarProvider>
  );
}
