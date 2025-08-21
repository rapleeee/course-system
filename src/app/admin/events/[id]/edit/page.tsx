"use client"
import * as React from "react"
import AdminLayout from "@/components/layouts/AdminLayout"
import { EventForm } from "@/components/feature-events/EventForm"

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)  
  return (
    <AdminLayout pageTitle="Admin • Edit Event">
      <EventForm mode="edit" id={id} />
    </AdminLayout>
  )
}