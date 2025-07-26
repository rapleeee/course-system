"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import ChatBubble from "./ChatBubble";
import { useEffect, useRef } from "react";

export type ChatItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Props = {
  messages: ChatItem[];
};

export default function ChatList({ messages }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll ke bawah saat ada pesan baru
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <ScrollArea className="flex-1 overflow-y-auto p-4">
      <div className="space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-center text-gray-500 mt-10">Belum ada percakapan</p>
        ) : (
          messages.map((msg) => (
            <ChatBubble key={msg.id} content={msg.content} role={msg.role} />
          ))
        )}
        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}