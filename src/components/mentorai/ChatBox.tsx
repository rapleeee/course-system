"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Bot, X } from "lucide-react";
import { usePathname } from "next/navigation";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hai! Aku MentorAI. Tanyakan apa saja tentang materi. Coba: 'ringkas materi', 'beri contoh soal', atau 'kuis singkat'." },
  ]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const courseId = useMemo(() => {
    // match /pages/courses/[id]
    const m = pathname?.match(/\/pages\/courses\/([^\/]+)/);
    return m?.[1];
  }, [pathname]);

  const quickPrompts = useMemo(() => [
    "Ringkas materi ini",
    "Beri 3 contoh soal dan jawabannya",
    "Jelaskan langkah-langkahnya dengan sederhana",
    "Buat kuis singkat 5 soal",
  ], []);

  const toggleChat = () => setIsOpen((v) => !v);

  // Draggable bubble button state
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const dragData = useRef<{ offsetX: number; offsetY: number; width: number; height: number } | null>(null);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!dragging || !dragData.current) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const { offsetX: dx, offsetY: dy, width: w, height: h } = dragData.current;
      let left = e.clientX - dx;
      let top = e.clientY - dy;
      // clamp
      left = Math.max(8, Math.min(left, vw - w - 8));
      top = Math.max(8, Math.min(top, vh - h - 8));
      setPos({ top, left });
    }
    function onUp() {
      setDragging(false);
      dragData.current = null;
    }
    if (dragging) {
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
      window.addEventListener("pointercancel", onUp, { once: true });
    }
    return () => {
      window.removeEventListener("pointermove", onMove);
    };
  }, [dragging]);

  const typeReply = (full: string) => {
    const tokens = Array.from(full);
    let idx = 0;
    const speed = 12; // chars per tick
    let current = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    const int = setInterval(() => {
      idx += speed;
      current = tokens.slice(0, idx).join("");
      setMessages((prev) => {
        const cloned = [...prev];
        cloned[cloned.length - 1] = { role: "assistant", content: current };
        return cloned;
      });
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      if (idx >= tokens.length) clearInterval(int);
    }, 30);
  };

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await fetch("/api/mentorai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content }], courseId }),
      });
      const data = (await res.json()) as { reply?: string };
      const reply = data.reply || "Maaf, aku belum bisa menjawab itu.";
      typeReply(reply);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Maaf, terjadi kendala koneksi." }]);
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <div className="relative">
      <Button
        className="fixed z-[9999] flex items-center gap-2 select-none touch-none"
        style={pos ? { top: pos.top, left: pos.left } : { bottom: 16, right: 16 }}
        onClick={toggleChat}
        onPointerDown={(e) => {
          const target = e.currentTarget as HTMLElement;
          const rect = target.getBoundingClientRect();
          dragData.current = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top, width: rect.width, height: rect.height };
          // initialize top/left if first drag
          if (!pos) setPos({ top: rect.top, left: rect.left });
          setDragging(true);
        }}
      >
        <MessageCircle size={18} />
        MentorAI
      </Button>

      {/* Light overlay behind the panel */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998] bg-black/20 dark:bg-black/40 backdrop-blur-[1px]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {isOpen && (
        <div className="fixed bottom-20 right-4 z-[9999] w-[min(380px,94vw)] h-[560px] rounded-lg border bg-card shadow-lg flex flex-col">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="size-4" /> MentorAI
              {courseId && <span className="text-xs font-normal text-muted-foreground">(konteks kelas aktif)</span>}
            </div>
            <button className="text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)}>
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-foreground text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}>{m.content}</div>
              </div>
            ))}
            {!loading && (
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((q) => (
                  <button
                    key={q}
                    className="text-xs px-2 py-1 rounded border bg-background hover:bg-accent hover:text-accent-foreground"
                    onClick={() => sendMessage(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {loading && (
              <div className="text-xs text-muted-foreground">Mengetik…</div>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="border-t p-2 flex items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              placeholder="Tulis pertanyaan…"
            />
            <Button type="submit" size="sm" disabled={loading || !input.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
