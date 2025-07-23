"use client";

import { MoreVertical, Trash, Pencil, Flag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";

type Props = {
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  isOwner: boolean;
};

export default function EditDeleteMenu({ onEdit, onDelete, onReport, isOwner }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-3 right-3 text-gray-500 hover:text-black"
        >
          <MoreVertical size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {isOwner && onEdit && (
          <DropdownMenuItem onClick={onEdit} className="gap-2">
            <Pencil size={14} /> Edit
          </DropdownMenuItem>
        )}
        {isOwner && onDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            className="gap-2 text-red-600 hover:bg-red-50"
          >
            <Trash size={14} /> Hapus
          </DropdownMenuItem>
        )}
        {isOwner && onReport && (
          <DropdownMenuItem
            onClick={onReport}
            className="gap-2 hover:bg-orange-50"
          >
            <Flag size={14} /> Laporkan
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}