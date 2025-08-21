"use client"

import React, { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  FieldValue,
} from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import Image from "next/image"
import { CATEGORIES, STATUSES, MODES, type Category, type Status, type Mode, type EventDoc } from "@/lib/events-schema"

const containerCls = "grid grid-cols-1 lg:grid-cols-2 gap-6"

export type EventDocWrite = Omit<EventDoc, "createdAt"> & { createdAt: FieldValue }

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-")
}

function toLocalInputValue(ts: Timestamp | null): string {
  if (!ts) return ""
  const d = ts.toDate()
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInputValue(v: string): Timestamp | null {
  if (!v) return null
  const date = new Date(v)
  if (isNaN(date.getTime())) return null
  return Timestamp.fromDate(date)
}

export function EventForm({ mode, id }: { mode: "create" | "edit"; id?: string }) {
  const router = useRouter()
  const [saving, setSaving] = useState<boolean>(false)

  const [form, setForm] = useState({
    title: "",
    category: "" as "" | Category,
    location: "",
    description: "",
    gform: "",
    imageUrl: "",
    status: "" as "" | Status,
    mode: "" as "" | Mode,
    meetingUrl: "",
    mapsUrl: "",
    capacity: "" as number | "",
    rsvpCount: 0,
    startAtStr: "",
    endAtStr: "",
  })

  const [imageFile, setImageFile] = useState<File | null>(null)

  useEffect(() => {
    if (mode === "edit" && id) {
      void (async () => {
        const snap = await getDoc(doc(db, "events", id))
        if (!snap.exists()) {
          toast.error("Event tidak ditemukan")
          router.push("/admin/events")
          return
        }
        const v = snap.data() as Partial<EventDoc>
        setForm({
          title: v.title ?? "",
          category: (v.category ?? "Workshop") as Category,
          location: v.location ?? "",
          description: v.description ?? "",
          gform: v.gform ?? "",
          imageUrl: v.imageUrl ?? "",
          status: (v.status ?? "draft") as Status,
          mode: (v.mode ?? "offline") as Mode,
          meetingUrl: v.meetingUrl ?? "",
          mapsUrl: v.mapsUrl ?? "",
          capacity: typeof v.capacity === "number" ? v.capacity : "",
          rsvpCount: typeof v.rsvpCount === "number" ? v.rsvpCount : 0,
          startAtStr: toLocalInputValue((v.startAt as Timestamp | null) ?? null),
          endAtStr: toLocalInputValue((v.endAt as Timestamp | null) ?? null),
        })
      })()
    }
  }, [mode, id, router])

  const validate = (): string | null => {
    if (!form.title.trim()) return "Judul wajib diisi"
    if (!form.category) return "Kategori wajib diisi"
    if (!CATEGORIES.includes(form.category as Category)) return "Kategori tidak valid"
    if (!form.status) return "Status wajib diisi"
    if (!STATUSES.includes(form.status as Status)) return "Status tidak valid"
    if (!form.mode) return "Mode wajib diisi"
    if (!MODES.includes(form.mode as Mode)) return "Mode tidak valid"
    if (!form.location.trim() && form.mode === "offline") return "Lokasi wajib diisi untuk mode offline"
    if (!form.meetingUrl.trim() && form.mode === "online") return "Meeting URL wajib diisi untuk mode online"
    if (!form.gform.trim()) return "Link pendaftaran wajib diisi"
    if (!/^https?:\/\//i.test(form.gform)) return "Link pendaftaran harus diawali http(s)://"
    if (form.meetingUrl && !/^https?:\/\//i.test(form.meetingUrl)) return "Meeting URL harus diawali http(s)://"
    if (form.mapsUrl && !/^https?:\/\//i.test(form.mapsUrl)) return "Maps URL harus diawali http(s)://"
    if (!form.startAtStr) return "Waktu mulai wajib diisi"
    const cap = typeof form.capacity === "number" ? form.capacity : parseInt(String(form.capacity || "0"), 10)
    if (isNaN(cap) || cap < 0) return "Capacity harus berupa angka ≥ 0"
    const start = fromLocalInputValue(form.startAtStr)
    const end = form.endAtStr ? fromLocalInputValue(form.endAtStr) : null
    if (!start) return "Format waktu mulai tidak valid"
    if (end && end.toMillis() < start.toMillis()) return "Waktu selesai tidak boleh sebelum mulai"
    return null
  }

  const onSubmit = async () => {
    const err = validate()
    if (err) { toast.error(err); return }
    setSaving(true)
    const storage = getStorage()

    try {
      const startAt = fromLocalInputValue(form.startAtStr)
      const endAt = form.endAtStr ? fromLocalInputValue(form.endAtStr) : null
      const capNum = typeof form.capacity === "number" ? form.capacity : parseInt(String(form.capacity || "0"), 10)

      if (mode === "edit" && id) {
        let imageUrlFinal = form.imageUrl
        if (imageFile) {
          const imageRef = ref(storage, `events/${id}`)
          await uploadBytes(imageRef, imageFile)
          imageUrlFinal = await getDownloadURL(imageRef)
        }
        const newSlug = `${slugify(form.title)}-${id.slice(0, 6)}`

        await updateDoc(doc(db, "events", id), {
          title: form.title,
          category: form.category as Category,
          location: form.location,
          description: form.description,
          gform: form.gform,
          imageUrl: imageUrlFinal,
          slug: newSlug,
          status: form.status as Status,
          mode: form.mode as Mode,
          meetingUrl: form.meetingUrl,
          mapsUrl: form.mapsUrl,
          capacity: capNum,
          rsvpCount: typeof form.rsvpCount === "number" ? form.rsvpCount : 0,
          startAt,
          endAt,
        } as Partial<EventDoc>)

        toast.success("Event diperbarui.")
        router.push("/admin/events")
      } else {
        const tempSlug = slugify(form.title)
        const payload: EventDocWrite = {
          title: form.title,
          category: form.category as Category,
          location: form.location,
          description: form.description,
          gform: form.gform,
          imageUrl: "",
          slug: tempSlug,
          status: form.status as Status,
          mode: form.mode as Mode,
          meetingUrl: form.meetingUrl,
          mapsUrl: form.mapsUrl,
          capacity: capNum,
          rsvpCount: typeof form.rsvpCount === "number" ? form.rsvpCount : 0,
          startAt,
          endAt,
          createdAt: serverTimestamp(),
        }
        const docRef = await addDoc(collection(db, "events"), payload)

        let imageUrlFinal = ""
        if (imageFile) {
          const imageRef = ref(storage, `events/${docRef.id}`)
          await uploadBytes(imageRef, imageFile)
          imageUrlFinal = await getDownloadURL(imageRef)
        }
        const finalSlug = `${tempSlug}-${docRef.id.slice(0,6)}`
        await updateDoc(docRef, { imageUrl: imageUrlFinal, slug: finalSlug })

        toast.success("Event dibuat.")
        router.push("/admin/events")
      }
    } catch (e) {
      console.error(e)
      toast.error("Gagal menyimpan event.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{mode === "edit" ? "Edit Event" : "Event Baru"}</h2>
            <p className="text-sm text-muted-foreground">Isi data event secara lengkap.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => history.back()}>Batal</Button>
            <Button onClick={onSubmit} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
          </div>
        </div>
      </Card>

      <div className={`${containerCls}`}>
        {/* Kolom 1 */}
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Judul</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as Category }))}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Status }))}>
                <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v) => setForm((f) => ({ ...f, mode: v as Mode }))}>
                <SelectTrigger><SelectValue placeholder="Pilih mode" /></SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity / Kuota</Label>
              <Input id="capacity" type="number" min={0} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value === "" ? "" : Number(e.target.value) }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Lokasi (untuk offline)</Label>
            <Input id="location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting">Meeting URL (untuk online)</Label>
            <Input id="meeting" value={form.meetingUrl} onChange={(e) => setForm((f) => ({ ...f, meetingUrl: e.target.value }))} placeholder="https://…" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maps">Maps URL (opsional)</Label>
            <Input id="maps" value={form.mapsUrl} onChange={(e) => setForm((f) => ({ ...f, mapsUrl: e.target.value }))} placeholder="https://…" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gform">Link Pendaftaran</Label>
            <Input id="gform" value={form.gform} onChange={(e) => setForm((f) => ({ ...f, gform: e.target.value }))} placeholder="https://forms.gle/…" />
          </div>
        </Card>

        {/* Kolom 2 */}
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startAt">Mulai</Label>
              <Input id="startAt" type="datetime-local" value={form.startAtStr} onChange={(e) => setForm((f) => ({ ...f, startAtStr: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endAt">Selesai (opsional)</Label>
              <Input id="endAt" type="datetime-local" value={form.endAtStr} onChange={(e) => setForm((f) => ({ ...f, endAtStr: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" rows={8} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Thumbnail (JPG/PNG)</Label>
            <Input id="image" type="file" accept="image/*" onChange={(e) => {
              const f = e.target.files?.[0] ?? null
              setImageFile(f)
              if (f) {
                const reader = new FileReader()
                reader.onload = () => setForm((prev) => ({ ...prev, imageUrl: String(reader.result) }))
                reader.readAsDataURL(f)
              }
            }} />
            <div className="relative w-full max-h-64 h-48 overflow-hidden rounded border bg-muted">
              {form.imageUrl && <Image src={form.imageUrl} alt="Preview" fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}