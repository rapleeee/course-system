"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, addDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ChatBubble from "@/components/mentorai/ChatBubble";

type ChatMessage = {
  id: string;
  content: string;
  role: "user" | "assistant";
  createdAt: Date;
};

export default function ChatConversation() {
  const router = useRouter();
  const { chatId } = router.query; // Get chatId from URL

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!chatId) return;
    const fetchMessages = async () => {
      const chatRef = collection(db, "chats", chatId as string, "messages");
      const q = query(chatRef, orderBy("createdAt", "asc"));
      const querySnapshot = await getDocs(q);

      const fetchedMessages = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        content: doc.data().content,
        role: doc.data().role,
        createdAt: doc.data().createdAt,
      }));

      setMessages(fetchedMessages);
    };

    fetchMessages();
  }, [chatId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const message = {
      content: newMessage,
      role: "user",
      createdAt: new Date(),
    };

    // Add the new message to Firestore under the current chat
    await addDoc(collection(db, "chats", chatId as string, "messages"), message);
    setNewMessage("");
  };

  return (
    <div className="w-full p-4 min-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} content={msg.content} role={msg.role} />
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleSendMessage} className="mt-3">
          Send
        </Button>
      </div>
    </div>
  );
}