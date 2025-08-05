"use client";
import React, { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "./ui/ModeToogle";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CircleUser } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import ChatBox from "./mentorai/ChatBox";

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
};

export default function Layout({ children, pageTitle = "Dashboard" }: LayoutProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [chatList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.uid) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as ProfileData);
          }
        } catch (err) {
          console.error("Failed to fetch profile:", err);
        }
      }
    };

    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/auth/login";
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        <div className="flex items-center p-4 w-full border-b justify-between">
          <div className="flex items-center">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold ml-4">{pageTitle}</h1>

          </div>

          <div className="flex items-center gap-4">
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <CircleUser className="cursor-pointer w-7 h-7" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-bold">{profile?.name || "User"}</div>
                  <div className="text-sm text-muted-foreground">
                    @{user?.email?.split("@")[0] || "rapler"}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/pages/courses">Kelas Saya</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/pages/courses">Sertifikat Saya</Link>
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
              <ChatBox chatList={chatList} />

        <div className="w-full p-8">{children}</div>
      </main>
    </SidebarProvider>
  );
}