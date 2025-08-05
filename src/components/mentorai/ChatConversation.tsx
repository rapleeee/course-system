"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useRouter } from "next/router";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import ChatBubble from "@/components/mentorai/ChatBubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Define the type for each chat message
type ChatMessage = {
  id: string;
  content: string;
  role: "user" | "assistant"; // role can either be 'user' or 'assistant'
  createdAt: Timestamp; // Firebase timestamp type
};

export default function ChatConversation() {
  const router = useRouter();
  const { chatId } = router.query;
  const [messages, setMessages] = useState<ChatMessage[]>([]); // Set the type of messages state
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!chatId) return;
    const fetchMessages = async () => {
      const chatRef = collection(db, "chats", chatId as string, "messages");
      const querySnapshot = await getDocs(chatRef);

      const fetchedMessages: ChatMessage[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        // Ensure all required fields are present and add the document id
        return {
          id: doc.id,
          content: data.content,
          role: data.role,
          createdAt: data.createdAt, // or use serverTimestamp() if missing
        };
      });

      setMessages(fetchedMessages);
    };

    fetchMessages();
  }, [chatId]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    const message = {
      content: newMessage,
      role: "user", // Or "assistant" based on the role
      createdAt: new Date(),
    };

    // Add the new message to Firestore
    await addDoc(collection(db, "chats", chatId as string, "messages"), message);
    setNewMessage(""); // Reset the input
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
        <Button onClick={handleSend} className="mt-3">
          Send
        </Button>
      </div>
    </div>
  );
}