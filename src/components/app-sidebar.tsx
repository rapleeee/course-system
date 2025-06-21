"use client"
import { Calendar, Home, Inbox, Search, Settings, LogOut } from "lucide-react"
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import Link from 'next/link'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Menu items.
const items = [
  {
    title: "Home",
    url: "/pages/dashboard",
    icon: Home,
  },
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Calendar",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Settings",
    url: "/pages/settings",
    icon: Settings,
  },
  {
    title: "Logout",
    url: "/auth/login",  // Redirect to login directly using Link
    icon: LogOut,
    action: "logout", // Action for logout
  },
]

export function AppSidebar() {
  // Function to handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth)  // Firebase signOut function
    } catch (err) {
      console.error('Error logging out:', err)
    }
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    {item.action === "logout" ? (
                      <Link href={item.url} onClick={handleLogout} className="flex items-center gap-3 w-full">
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    ) : (
                      <Link href={item.url} className="flex items-center gap-3 w-full">
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}