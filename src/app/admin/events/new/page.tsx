"use client"

import React from "react"
import AdminLayout from "@/components/layouts/AdminLayout"
import { EventForm } from "@/components/feature-events/EventForm"

export default function NewEventPage() {
  return (
    <AdminLayout pageTitle="Admin • Event Baru">
      <EventForm mode="create" />
    </AdminLayout>
  )
}
