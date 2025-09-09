"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import ChatBubble from "@/components/mentorai/ChatBubble";
import ChatInput from "@/components/mentorai/ChatInput";
import { Loader2 } from "lucide-react";
import Layout from "@/components/layout";

export type ChatMessage = {
  id?: string;
  content: string;
  role: "user" | "assistant";
  createdAt: Timestamp | null;
};

export default function MentorAIPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [showLimit, setShowLimit] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Ambil data dari Firestore
  useEffect(() => {
    if (!user) return;
    const chatRef = collection(db, "users", user.uid, "chats");
    const q = query(chatRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats: ChatMessage[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          content: data.content,
          role: data.role,
          createdAt: data.createdAt ?? null,
        };
      });
      setAllMessages(chats);
      setMessages(chats.slice(-showLimit));
    });

    return () => unsubscribe();
  }, [user, showLimit]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!user || !text.trim()) return;

    const chatRef = collection(db, "users", user.uid, "chats");

    const userMessage: ChatMessage = {
      content: text,
      role: "user",
      createdAt: null,
    };

    await addDoc(chatRef, {
      ...userMessage,
      createdAt: serverTimestamp(),
    });

    setIsLoading(true);

    try {
      // Kirim seluruh riwayat percakapan (user+assistant) agar respons lebih kontekstual
      const historyMessages = [...allMessages, userMessage].map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      const res = await fetch("/api/mentorai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyMessages }),
      });

      const data = (await res.json()) as { reply?: string };
      const reply = data.reply || "Maaf, aku belum bisa menjawab itu.";

      const aiMessage: ChatMessage = {
        content: reply,
        role: "assistant",
        createdAt: null,
      };

      await addDoc(chatRef, {
        ...aiMessage,
        createdAt: serverTimestamp(),
      });
    } catch {
      await addDoc(chatRef, {
        content: "Maaf, AI sedang error. Coba lagi nanti ya.",
        role: "assistant",
        createdAt: serverTimestamp(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !id) return;
    const docRef = doc(db, "users", user.uid, "chats", id);
    await deleteDoc(docRef);
  };

  const handleShowMore = () => {
    setShowLimit((prev) => prev + 15);
  };

  return (
    <Layout pageTitle="MentorAI - Ngoding Santai">
      <div className="w-full p-4 min-h-screen flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-gray-500">
              Belum ada percakapan. Ayo mulai bertanya!
            </p>
          )}

          {messages.length < allMessages.length && (
            <div className="text-center">
              <button
                className="text-sm text-blue-600 underline"
                onClick={handleShowMore}
              >
                Lihat Sebelumnya
              </button>
            </div>
          )}

          {messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              id={msg.id}
              content={msg.content}
              role={msg.role}
              isOwn={msg.role === "user"}
              onDelete={handleDelete}
            />
          ))}

          {isLoading && (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="animate-spin w-4 h-4" /> MentorAI sedang mengetik...
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="mt-4">
          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
      </div>
    </Layout>
  );
}
