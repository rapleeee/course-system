"use client";

import {
  Calendar,
  Home,
  LogOut,
  ClipboardList,
  Medal,
  FileText,
  Rocket,
  Settings,
  MessageCircle,
  Wallet,
  School,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export function AppSidebar() {
  const { collapsed } = useSidebar();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const menuGroups = [
    {
      label: "Dashboard",
      items: [
        { title: "Beranda", url: "/pages/dashboard", icon: Home },
        { title: "Langganan", url: "/pages/subscription", icon: Wallet },
      ],
    },
    {
      label: "Pembelajaran",
      items: [
        { title: "Kelas", url: "/pages/courses", icon: ClipboardList },
        { title: "Tugas & Kuis", url: "/pages/assignments", icon: FileText },
        { title: "Progress Belajar", url: "/pages/progress", icon: Rocket },
        { title: "Leaderboard", url: "/pages/leaderboard", icon: Medal },
        { title: "Leaderboard SMK Pesat", url: "/pages/mentoraxpesat", icon: School },
      ],
    },
    {
      label: "Komunitas",
      items: [
        { title: "Event Komunitas", url: "/pages/event", icon: Calendar },
        { title: "Forum Diskusi", url: "/pages/forum", icon: MessageCircle },
      ],
    },
    {
      label: "Akun",
      items: [
        { title: "Pengaturan Profil", url: "/pages/settings", icon: Settings },
        {
          title: "Logout",
          url: "/auth/login",
          icon: LogOut,
          action: "logout",
        },
      ],
    },
  ];

  return (
    <Sidebar>
      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="uppercase text-sm font-semibold tracking-wide text-muted-foreground mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const content = (
                    <SidebarMenuButton asChild>
                      {item.action === "logout" ? (
                        <Link
                          href={item.url}
                          onClick={handleLogout}
                          className="flex items-center w-full"
                        >
                          <item.icon className="shrink-0" />
                          <span
                            className={`ml-3 truncate text-[15px] font-medium ${
                              collapsed ? "hidden" : ""
                            }`}
                          >
                            {item.title}
                          </span>
                        </Link>
                      ) : (
                        <Link href={item.url} className="flex items-center w-full">
                          <item.icon className="shrink-0" />
                          <span
                            className={`ml-3 truncate text-[15px] font-medium ${
                              collapsed ? "hidden" : ""
                            }`}
                          >
                            {item.title}
                          </span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  );

                  return (
                    <SidebarMenuItem key={item.title}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{content}</TooltipTrigger>
                          <TooltipContent side="right">{item.title}</TooltipContent>
                        </Tooltip>
                      ) : (
                        content
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
