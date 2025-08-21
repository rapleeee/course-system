import { Timestamp, FieldValue } from "firebase/firestore"

export const CATEGORIES = ["Workshop", "Kompetisi", "Meetup"] as const
export type Category = typeof CATEGORIES[number]

export const STATUSES = ["draft", "published", "archived"] as const
export type Status = typeof STATUSES[number]

export const MODES = ["online", "offline"] as const
export type Mode = typeof MODES[number]

export type EventDoc = {
  title: string
  category: Category
  location: string
  description: string
  gform: string
  imageUrl: string
  slug: string
  status: Status
  mode: Mode
  meetingUrl: string
  mapsUrl: string
  capacity: number
  rsvpCount: number
  startAt: Timestamp | null
  endAt: Timestamp | null
  createdAt: Timestamp | null
}

export type Event = EventDoc & { id: string }
export type EventDocWrite = Omit<EventDoc, "createdAt"> & { createdAt: FieldValue }