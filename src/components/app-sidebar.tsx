"use client";

import {
  Calendar,
  Home,
  LogOut,
  ClipboardList,
  Medal,
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

  type MenuItem = {
    title: string;
    url: string;
    icon: React.ElementType;
    action?: 'logout';
  };

  type MenuGroup = {
    label: string;
    items: MenuItem[];
  };

  // Kelompokkan menu
  const menuGroups: MenuGroup[] = [
    {
      label: "Dashboard",
      items: [
        {
          title: "Beranda",
          url: "/pages/dashboard",
          icon: Home,
        },
      ],
    },
    {
      label: "Pembelajaran",
      items: [
        {
          title: "Kelas",
          url: "/pages/courses",
          icon: ClipboardList,
        },
        {
          title: "Leaderboard",
          url: "/pages/leaderboard",
          icon: Medal,
        },
      ],
    },
    {
      label: "Komunitas",
      items: [
        {
          title: "Event Komunitas",
          url: "/pages/event",
          icon: Calendar,
        },
      ],
    },
    {
      label: "Akun",
      items: [
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