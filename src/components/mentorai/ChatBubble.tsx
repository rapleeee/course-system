"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { MoreVertical, Trash } from "lucide-react";
import { useState } from "react";

type Props = {
  id?: string;
  content: string;
  role: "user" | "assistant";
  isOwn?: boolean;
  onDelete?: (id: string) => void;
};

export default function ChatBubble({ id, content, role, isOwn = false, onDelete }: Props) {
  const isUser = role === "user";
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={cn(
        "flex items-start gap-3 relative group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Image
          src="/ai-avatar.png"
          alt="AI"
          width={32}
          height={32}
          className="rounded-full"
        />
      )}

      <div
        className={cn(
          "px-4 py-2 rounded-lg max-w-[80%] whitespace-pre-wrap text-sm",
          isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-neutral-200 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded-bl-none"
        )}
      >
        {content}
      </div>

      {isUser && (
        <Image
          src="/photos/boy.png"
          alt="User"
          width={32}
          height={32}
          className="rounded-full"
        />
      )}

      {isOwn && id && (
        <div className="absolute top-0 right-0">
          <button onClick={() => setShowMenu(!showMenu)} className="text-gray-400 hover:text-gray-600">
            <MoreVertical size={16} />
          </button>

          {showMenu && (
            <div className="absolute bg-white dark:bg-neutral-800 shadow-md rounded p-1 text-sm z-10 right-4 top-4">
              <button
                className="text-red-500 hover:underline"
                onClick={() => onDelete?.(id)}
              >
                <Trash size={14} className="inline mr-1" />
                Hapus
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}