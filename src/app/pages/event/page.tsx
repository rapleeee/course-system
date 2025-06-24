"use client"

import React, { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"
import Layout from "@/components/layout"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"

type Event = {
  id: string
  title: string
  date: string
  category: string
  location: string
  description: string
  gform: string
}

export default function EventPage() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("All")
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [events, setEvents] = useState<Event[]>([])

  useEffect(() => {
    const fetchEvents = async () => {
      const querySnapshot = await getDocs(collection(db, "events"))
      const data: Event[] = []
      querySnapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Event)
      })
      setEvents(data)
    }

    fetchEvents()
  }, [])

  const filteredEvents = events.filter((event) => {
    const matchTitle = event.title.toLowerCase().includes(search.toLowerCase())
    const matchCategory = filter === "All" || event.category === filter
    return matchTitle && matchCategory
  })

  const categories = ["All", "Workshop", "Kompetisi", "Meetup"]

  return (
    <Layout pageTitle="Event Komunitas">
      <div className="w-full mx-auto space-y-6">
        <div className="">
          <h1 className="text-3xl font-bold">Acara Komunitas</h1>
          <p className="text-neutral-600 dark:text-neutral-300">
            Temukan event komunitas seru dan edukatif.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Input
            placeholder="Cari nama acara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-1/2"
          />

          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={filter === cat ? "default" : "outline"}
                onClick={() => setFilter(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.length === 0 ? (
            <p className="col-span-full text-center text-gray-500">
              Tidak ada event yang ditemukan.
            </p>
          ) : (
            filteredEvents.map((event) => (
              <motion.div key={event.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Card className="p-4 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg mb-1">{event.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {event.date} • {event.location} • {event.category}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {event.description}
                    </p>
                  </div>
                  <div className="flex justify-between mt-4">
                    <Button size="sm" variant="outline" onClick={() => setSelectedEvent(event)}>
                      Detail
                    </Button>
                    <Button size="sm" onClick={() => window.open(event.gform, "_blank")}>
                      Join Event
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {selectedEvent && (
        <Dialog open onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p><strong>Tanggal:</strong> {selectedEvent.date}</p>
              <p><strong>Lokasi:</strong> {selectedEvent.location}</p>
              <p><strong>Kategori:</strong> {selectedEvent.category}</p>
              <p>{selectedEvent.description}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  )
}