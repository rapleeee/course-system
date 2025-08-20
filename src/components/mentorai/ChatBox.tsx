"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ChartAreaIcon, Construction } from "lucide-react";

type ChatBoxProps = {
  chatList: { id: string; name: string }[]; // List of chats
};

export default function ChatBox({ chatList }: ChatBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const toggleChat = () => setIsOpen((prev) => !prev);

  const openChat = (chatId: string) => {
    // Redirect to a specific chat conversation page
    router.push(`/chat/${chatId}`);
  };

  return (
    <div className="relative">
      {/* Chat Box Button */}
      <Button
        className="fixed bottom-4 right-4 flex items-center gap-2 bg-[#1B3C53] hover:bg-[#252d46] text-white"
        onClick={toggleChat}
      >
        <ChartAreaIcon size={18} />
        Chat with MentorAI
      </Button>

      {/* Chat Conversation List - Only Visible When Open */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 border shadow-lg rounded-lg w-64 p-4">
          <h3 className="font-semibold text-sm">
            <Construction size={20} className="inline mr-2" color="orange"/>
            Sorry we are still working on this feature
          </h3>
          <ul className="space-y-2 mt-2">
            {chatList.map((chat) => (
              <li
                key={chat.id}
                className="text-blue-600 cursor-pointer hover:text-blue-800"
                onClick={() => openChat(chat.id)}
              >
                {chat.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}