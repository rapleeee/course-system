"use client";

import { Calendar, Home, LogOut, ClipboardList, Medal } from "lucide-react";
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

const items = [
  {
    title: "Dashboard",
    url: "/pages/dashboard",
    icon: Home,
  },
  {
    title: "Kelas",
    url: "/pages/courses",
    icon: ClipboardList,
  },
  {
    title: "Event Komunitas",
    url: "/pages/event",
    icon: Calendar,
  },
  {
    title: "Leaderboard",
    url: "/pages/leaderboard",
    icon: Medal,
  },
  {
    title: "Logout",
    url: "/auth/login",
    icon: LogOut,
    action: "logout",
  },
];

export function AppSidebar() {
  const { collapsed } = useSidebar();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const content = (
                  <SidebarMenuButton asChild>
                    {item.action === "logout" ? (
                      <Link
                        href={item.url}
                        onClick={handleLogout}
                        className="flex items-center w-full"
                      >
                        <item.icon className="shrink-0"/>
                        <span
                          className={`ml-3 truncate text-base ${
                            collapsed ? "hidden" : ""
                          }`}
                        >
                          {item.title}
                        </span>
                      </Link>
                    ) : (
                      <Link
                        href={item.url}
                        className="flex items-center w-full"
                      >
                        <item.icon className="shrink-0 " />
                        <span
                          className={`ml-3 truncate text-base ${
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
                        <TooltipContent side="right">
                          {item.title}
                        </TooltipContent>
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
      </SidebarContent>
    </Sidebar>
  );
}
