"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { Download, Link as LinkIcon, Pencil, Trash2 } from "lucide-react"
import type { Event, Category, Status, Mode } from "@/lib/events-schema"

export type RowActions = {
  onExportIcs: (ev: Event) => void
  onCopyLink: (ev: Event) => void
  onDelete: (id: string) => void
}

export const eventColumns = (actions: RowActions): ColumnDef<Event>[] => [
  {
    accessorKey: "imageUrl",
    header: "Gambar",
    cell: ({ row }) => {
      const url = row.original.imageUrl
      return (
        <div className="relative h-12 w-20 overflow-hidden rounded bg-muted">
          {url && <Image src={url} alt={row.original.title} fill sizes="80px" className="object-cover" />}
        </div>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: "title",
    header: "Judul",
    cell: ({ row }) => (
      <div className="max-w-[260px]">
        <div className="font-medium line-clamp-1">{row.original.title}</div>
        <div className="text-xs text-muted-foreground line-clamp-1">{row.original.location}</div>
      </div>
    ),
  },
  {
    accessorKey: "startAt",
    header: "Waktu",
    cell: ({ row }) => {
      const start = row.original.startAt?.toDate().toLocaleString() ?? "-"
      const end = row.original.endAt?.toDate().toLocaleString() ?? ""
      return (
        <div className="text-sm">
          <div>{start}</div>
          <div className="text-xs text-muted-foreground">{end}</div>
        </div>
      )
    },
  },
  {
    accessorKey: "category",
    header: "Kategori",
    cell: ({ row }) => <Badge variant="secondary">{row.original.category as Category}</Badge>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const s = row.original.status as Status
      const v = s === "published" ? "default" : s === "draft" ? "secondary" : "destructive"
      return <Badge variant={v}>{s}</Badge>
    },
  },
  {
    accessorKey: "mode",
    header: "Mode",
    cell: ({ row }) => <span className="capitalize text-sm">{row.original.mode as Mode}</span>,
  },
  {
    accessorKey: "capacity",
    header: "Slot",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.rsvpCount}/{row.original.capacity}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Aksi",
    cell: ({ row }) => {
      const ev = row.original
      return (
        <div className="flex items-center justify-end gap-2">
          <Button size="icon" variant="outline" onClick={() => actions.onExportIcs(ev)} aria-label="Export ICS">
            <Download className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={() => actions.onCopyLink(ev)} aria-label="Copy link">
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" asChild aria-label="Edit event">
            <Link href={`/admin/events/${ev.id}/edit`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="icon" variant="destructive" onClick={() => actions.onDelete(ev.id)} aria-label="Hapus event">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    },
    enableSorting: false,
  },
]