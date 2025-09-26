"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Bot, Loader2, MessageCircle, Phone, Send, X } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type ChatMessage = {
  id: string
  role: "assistant" | "user"
  content: string
}

const initialMessage: ChatMessage = {
  id: "mentor-welcome",
  role: "assistant",
  content:
    "Halo, aku MentorAI. Ceritakan kondisi kamu sekarang: mau belajar apa, bingung di bagian mana, atau target kamu apa. Aku jelasin pelan-pelan biar gampang diikuti. 🧑‍🏫",
}

const whatsappHref = "https://wa.me/6287831839131"

function renderFormattedLine(line: string, lineIdx: number) {
  if (!line.trim()) {
    return <span key={`blank-${lineIdx}`}>&nbsp;</span>
  }

  return line.split(/(\*\*[^*]+\*\*)/g).map((segment, idx) => {
    if (segment.startsWith("**") && segment.endsWith("**")) {
      return (
        <span key={`bold-${lineIdx}-${idx}`} className="font-semibold text-current">
          {segment.slice(2, -2)}
        </span>
      )
    }
    return <span key={`text-${lineIdx}-${idx}`}>{segment}</span>
  })
}

export default function ConsultWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [messages, isOpen])

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
    setError(null)
  }, [])

  const suggestions = useMemo(
    () => [
      "Aku baru mau mulai belajar, enaknya dari mana dulu?",
      "Aku bingung pilih jalur backend atau frontend",
      "Tolong jelasin konsep dasar Laravel 12 dengan sederhana",
    ],
    []
  )

  const sendMessage = useCallback(
    async (rawInput: string) => {
      const content = rawInput.trim()
      if (!content || isLoading) return

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      }

      const history = [...messages, userMessage]
      setMessages(history)
      setInput("")
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/consult", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: history.map(({ role, content: value }) => ({
              role,
              content: value,
            })),
          }),
        })

        const data = await response.json()

        if (!response.ok || !data?.content) {
          throw new Error(data?.error || "MentorAI sedang kesulitan menjawab")
        }

        const mentorReply: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.content,
        }

        setMessages((prev) => [...prev, mentorReply])
      } catch (err) {
        console.error("MentorAI chat error", err)
        setError("Waduh, MentorAI lagi macet. Coba ulang lagi ya.")
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, messages]
  )

  const handleSubmit = useCallback(() => {
    void sendMessage(input)
  }, [input, sendMessage])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <div className="fixed bottom-5 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="consult-widget"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-80 overflow-hidden rounded-[28px] border border-[#1B3C53]/15 bg-gradient-to-br from-white via-white to-[#F4F6F9] shadow-2xl dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900 sm:w-96"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/40 bg-gradient-to-r from-[#1B3C53] to-[#2C5C74] px-5 py-4 text-white dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold tracking-wide">MentorAI Konsul</p>
                  <p className="text-xs text-white/80">Jawaban sabar, rencana belajar terarah</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggle}
                className="rounded-full p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
                aria-label="Tutup konsultasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div className="flex flex-col gap-3 rounded-2xl border border-[#1B3C53]/10 bg-white/70 p-4 text-sm text-[#1B3C53] shadow-sm dark:border-[#D2C1B6]/20 dark:bg-neutral-900 dark:text-[#D2C1B6]">
                <p className="font-semibold">Butuh ngobrol langsung?</p>
                <Button
                  asChild
                  variant="outline"
                  className="justify-start gap-2 border-[#1B3C53]/30 text-[#1B3C53] transition hover:bg-[#1B3C53]/10 dark:border-[#D2C1B6]/30 dark:text-[#D2C1B6] dark:hover:bg-[#D2C1B6]/10"
                >
                  <Link href={whatsappHref} target="_blank" rel="noopener noreferrer">
                    <Phone className="h-4 w-4" />
                    Chat Whatsapp Mentor
                  </Link>
                </Button>
                <p className="text-xs text-[#1B3C53]/70 dark:text-[#D2C1B6]/70">
                  Tim akan balas di jam kerja. Mulai dulu dengan MentorAI supaya kamu punya gambaran awal.
                </p>
              </div>

              <div
                ref={scrollRef}
                className="flex max-h-72 flex-col gap-4 overflow-y-auto rounded-3xl border border-[#1B3C53]/10 bg-white/80 p-3 pr-2 shadow-inner dark:border-neutral-800 dark:bg-neutral-900"
              >
                {messages.map((message) => {
                  const isAssistant = message.role === "assistant"
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        isAssistant ? "justify-start" : "justify-end"
                      )}
                    >
                      <div className="max-w-[82%] sm:max-w-[75%]">
                        <div
                          className={cn(
                            "rounded-3xl px-4 py-3 text-left shadow-sm",
                            isAssistant
                              ? "border border-[#1B3C53]/10 bg-white text-[#1B3C53] dark:border-[#D2C1B6]/20 dark:bg-neutral-950 dark:text-[#D2C1B6]"
                              : "bg-[#1B3C53] text-white shadow-md dark:bg-[#D2C1B6] dark:text-neutral-900"
                          )}
                        >
                          {message.content.split("\n").map((line, lineIdx) => (
                            <p key={`${message.id}-line-${lineIdx}`} className="text-sm leading-relaxed">
                              {renderFormattedLine(line, lineIdx)}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {isLoading ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-[#1B3C53]/5 px-4 py-3 text-sm text-[#1B3C53] dark:bg-[#D2C1B6]/10 dark:text-[#D2C1B6]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    MentorAI lagi mikir buat susun jawabannya...
                  </div>
                ) : null}
                {!isLoading && messages.length === 1 ? (
                  <div className="space-y-3 rounded-2xl border border-dashed border-[#1B3C53]/20 bg-[#1B3C53]/5 p-4 text-xs text-[#1B3C53] dark:border-[#D2C1B6]/30 dark:bg-[#D2C1B6]/10 dark:text-[#D2C1B6]">
                    <p className="font-semibold uppercase tracking-wide">Mulai dari contoh ini</p>
                    <div className="flex flex-col gap-2">
                      {suggestions.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => void sendMessage(prompt)}
                          className="rounded-xl border border-[#1B3C53]/20 bg-white px-3 py-2 text-left text-sm text-[#1B3C53] transition hover:border-[#1B3C53]/40 hover:bg-[#1B3C53]/5 dark:border-[#D2C1B6]/30 dark:bg-neutral-950 dark:text-[#D2C1B6] dark:hover:border-[#D2C1B6]/60 dark:hover:bg-neutral-900"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600 shadow-sm dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-200">
                  {error}
                </div>
              ) : null}

              <div className="space-y-2">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tuliskan pertanyaan atau ceritakan kebingungan kamu di sini..."
                  disabled={isLoading}
                  className="min-h-[100px] rounded-2xl border-[#1B3C53]/20 bg-white/90 shadow-sm focus-visible:ring-[#1B3C53]/30 dark:border-neutral-700 dark:bg-neutral-950"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    className="ml-auto gap-2 rounded-full bg-[#1B3C53] px-5 text-white hover:bg-[#234d66] dark:bg-[#D2C1B6] dark:text-neutral-900 dark:hover:bg-[#c7b2a7]"
                    onClick={handleSubmit}
                    disabled={isLoading || !input.trim()}
                  >
                    Kirim
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={handleToggle}
        size="lg"
        className="flex items-center gap-2 rounded-full bg-[#1B3C53] px-5 py-5 text-white shadow-lg hover:bg-[#456882] dark:bg-[#D2C1B6] dark:text-neutral-900 dark:hover:bg-[#d9cabf]"
      >
        <MessageCircle className="h-5 w-5" />
        {isOpen ? "Tutup MentorAI" : "Konsultasi Gratis"}
      </Button>
    </div>
  )
}
