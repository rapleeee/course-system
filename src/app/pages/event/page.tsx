"use client"

import React, { useEffect, useMemo, useState } from "react"
import Layout from "@/components/layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore"
import { CATEGORIES, MODES, type Category, type Mode, type Event as AdminEvent, type EventDoc } from "@/lib/events-schema"
import Image from "next/image"
import { CalendarDays, MapPin, Monitor, ExternalLink, Filter } from "lucide-react"
import { motion } from "framer-motion"
import { GridSkeleton } from "@/components/feature-events/GridSkeleton"
import { EmptyState } from "@/components/feature-events/EmptyState"

// ================= Helpers =================
function formatDateTimeParts(ts: Timestamp | null) {
  if (!ts) return { date: "-", time: "-" }
  const d = ts.toDate()
  const date = d.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  return { date, time }
}

function buildIcs(ev: AdminEvent): string {
  const dt = (t: Timestamp | null) => {
    if (!t) return ""
    const d = t.toDate()
    const pad = (n: number) => n.toString().padStart(2, "0")
    const yyyy = d.getUTCFullYear()
    const mm = pad(d.getUTCMonth() + 1)
    const dd = pad(d.getUTCDate())
    const hh = pad(d.getUTCHours())
    const mi = pad(d.getUTCMinutes())
    const ss = pad(d.getUTCSeconds())
    return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`
  }
  const start = dt(ev.startAt)
  const end = dt(ev.endAt ?? ev.startAt)
  const desc = (ev.description || "").replace(/\n/g, "\\n")
  const loc = ev.mode === "online" ? (ev.meetingUrl || "Online") : (ev.location || "Offline")
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mentora//Event//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.id}@mentora`,
    start ? `DTSTART:${start}` : "",
    end ? `DTEND:${end}` : "",
    `SUMMARY:${ev.title}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${loc}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n")
}

function downloadIcs(ev: AdminEvent) {
  const ics = buildIcs(ev)
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${ev.slug || ev.id}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

type Event = AdminEvent

export default function EventsPage() {
  // filters
  const [search, setSearch] = useState<string>("")
  const [cat, setCat] = useState<"All" | Category>("All")
  const [mode, setMode] = useState<"All" | Mode>("All")

  // data state
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selected, setSelected] = useState<Event | null>(null)

  // Firestore: hanya published + urut startAt
  useEffect(() => {
    const q = query(
      collection(db, "events"),
      where("status", "==", "published"),
      orderBy("startAt", "asc")
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: Event[] = snap.docs.map((d) => {
          const v = d.data() as Partial<EventDoc>
          return {
            id: d.id,
            title: v.title ?? "",
            category: (v.category ?? "Workshop") as Category,
            location: v.location ?? "",
            description: v.description ?? "",
            gform: v.gform ?? "",
            imageUrl: v.imageUrl ?? "",
            slug: v.slug ?? d.id,
            status: "published",
            mode: (v.mode ?? "offline") as Mode,
            meetingUrl: v.meetingUrl ?? "",
            mapsUrl: v.mapsUrl ?? "",
            capacity: typeof v.capacity === "number" ? v.capacity : 0,
            rsvpCount: typeof v.rsvpCount === "number" ? v.rsvpCount : 0,
            startAt: (v.startAt as Timestamp | null) ?? null,
            endAt: (v.endAt as Timestamp | null) ?? null,
            createdAt: (v.createdAt as Timestamp | null) ?? null,
          }
        })
        setEvents(data)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [])

  const categories: Array<"All" | Category> = ["All", ...CATEGORIES]
  const modes: Array<"All" | Mode> = ["All", ...MODES]
  const now = new Date()

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return events.filter((e) => {
      const matchSearch =
        !s ||
        e.title.toLowerCase().includes(s) ||
        e.location.toLowerCase().includes(s) ||
        e.description.toLowerCase().includes(s)
      const matchCat = cat === "All" || e.category === cat
      const matchMode = mode === "All" || e.mode === mode
      return matchSearch && matchCat && matchMode
    })
  }, [events, search, cat, mode])

  return (
    <Layout pageTitle="Acara Komunitas">
      <section className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Acara Komunitas</h1>
          <p className="text-muted-foreground">Belajar bareng, networking, dan upgrade skill bersama komunitas.</p>
        </div>

        <Card className="p-4">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Input
                placeholder="Cari judul, lokasi, atau topik…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {categories.map((c) => (
                  <Button
                    key={c}
                    variant={cat === c ? "default" : "outline"}
                    size="sm"
                    className="rounded-full capitalize"
                    onClick={() => setCat(c)}
                  >
                    {c}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {modes.map((m) => (
                  <Button
                    key={m}
                    variant={mode === m ? "default" : "outline"}
                    size="sm"
                    className="rounded-full capitalize"
                    onClick={() => setMode(m)}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>
        {loading ? (
          <GridSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((event) => {
              const isFull = event.capacity > 0 && event.rsvpCount >= event.capacity
              const isPast = event.startAt ? event.startAt.toDate() < now : false
              const start = formatDateTimeParts(event.startAt)
              const end = formatDateTimeParts(event.endAt)

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card className="overflow-hidden group border shadow-sm hover:shadow-md transition-shadow h-full">
                    <div className="relative aspect-[16/9] w-full">
                      {event.imageUrl ? (
                        <Image
                          src={event.imageUrl}
                          alt={event.title}
                          fill
                          sizes="(max-width: 1280px) 100vw, 33vw"
                          className="object-cover"
                          priority={false}
                        />
                      ) : (
                        <div className="h-full w-full bg-muted" />
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                      <div className="absolute left-3 top-3 flex gap-2">
                        <Badge variant="secondary" className="backdrop-blur-sm">{event.category}</Badge>
                        {isFull && <Badge variant="destructive">Penuh</Badge>}
                        {isPast && <Badge variant="secondary">Selesai</Badge>}
                      </div>
                    </div>

                    <div className="p-4 flex flex-col gap-3">
                      <h3 className="font-semibold text-lg leading-snug line-clamp-2">{event.title}</h3>

                      <div className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <CalendarDays className="h-4 w-4 mt-1" />
                          <div>
                            <div>{start.date}</div>
                            <div className="flex">

                            <div className="text-xs">{start.time} - </div>
                            <div className="text-xs">{end.time}</div>
                            </div>
                            
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {event.mode === "online" ? (
                            <>
                              <Monitor className="h-4 w-4" />
                              <span className="truncate">
                                Online{event.meetingUrl ? ` • ${new URL(event.meetingUrl).hostname}` : ""}
                              </span>
                            </>
                          ) : (
                            <>
                              <MapPin className="h-4 w-4" />
                              <span className="truncate">{event.location}</span>
                            </>
                          )}
                        </div>
                        <p className="line-clamp-2">{event.description}</p>
                        {event.capacity > 0 && (
                          <p className="text-xs">{isFull ? "Penuh" : `${event.rsvpCount}/${event.capacity} terdaftar`}</p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Button size="sm" variant="outline" onClick={() => downloadIcs(event)}>
                          Tambah ke Kalender
                        </Button>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelected(event)}>
                            Detail
                          </Button>
                          <Button
                            size="sm"
                            className="gap-2"
                            disabled={isPast || !event.gform || isFull}
                            onClick={() => window.open(event.gform, "_blank")}
                          >
                            Join <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </section>
      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selected.title}
                <Badge variant="secondary">{selected.category}</Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative w-full aspect-[16/9] rounded-md overflow-hidden bg-muted">
                {selected.imageUrl && (
                  <Image
                    src={selected.imageUrl}
                    alt={selected.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 66vw"
                    className="object-cover"
                  />
                )}
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CalendarDays className="h-4 w-4 mt-1" />
                  <div>
                    <div>{formatDateTimeParts(selected.startAt).date}</div>
                    <div className="text-xs">{formatDateTimeParts(selected.startAt).time}</div>
                    {selected.endAt && (
                      <>
                        <div className="mt-2">{formatDateTimeParts(selected.endAt).date}</div>
                        <div className="text-xs">{formatDateTimeParts(selected.endAt).time}</div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selected.mode === "online" ? (
                    <>
                      <Monitor className="h-4 w-4" />
                      {selected.meetingUrl ? (
                        <a
                          href={selected.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-4 truncate"
                        >
                          {selected.meetingUrl}
                        </a>
                      ) : (
                        <span>Online</span>
                      )}
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" />
                      {selected.mapsUrl ? (
                        <a
                          href={selected.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-4 truncate"
                        >
                          {selected.location}
                        </a>
                      ) : (
                        <span className="truncate">{selected.location}</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <p className="text-sm">{selected.description}</p>

              <div className="flex items-center justify-between gap-2 pt-2">
                <Button variant="outline" onClick={() => downloadIcs(selected)}>
                  Tambah ke Kalender
                </Button>
                <Button
                  className="gap-2"
                  disabled={!selected.gform}
                  onClick={() => window.open(selected.gform, "_blank")}
                >
                  Buka Form Pendaftaran <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  )
}
