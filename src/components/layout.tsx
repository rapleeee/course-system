"use client"
import React from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main>
        <SidebarTrigger/>
        <div className="p-8">
        {children}
        </div>
      </main> 
    </SidebarProvider>
  )
}