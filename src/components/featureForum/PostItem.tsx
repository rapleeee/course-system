"use client";

import { useState } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { doc, deleteDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { useAuth } from "@/lib/useAuth";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import LikeDislike from "./LikeDislike";
import CommentSection from "./CommentSection";
import EditDeleteMenu from "./EditDeleteMenu";

type ForumPost = {
  id: string;
  content: string;
  createdAt: Timestamp;
  userId: string;
};

type UserProfile = {
  name?: string;
  photoURL?: string;
};

type Props = {
  post: ForumPost;
  profile: UserProfile;
  onDeleted: () => void;
  onRefresh: () => Promise<void>;
};

export default function PostItem({
  post,
  profile,
  onDeleted,
  onRefresh,
}: Props) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const isOwner = user?.uid === post.userId;
  const bannedWords = [
    "bodoh",
    "goblok",
    "anjing",
    "bangsat",
    "kontol",
    "memek",
    "tai",
    "sialan",
    "asu",
    "tolol",
    "kampret",
    "jancuk",
    "brengsek",
    "babi",
    "pelacur",
    "pelacuran",
    "pelacur",
    "pelacuran",
    "pukimak",
    "ngentot",
    "sjahuri",
    "sahuri",
  ];

  const checkForBannedWords = (text: string) => {
    return bannedWords.some((word) =>
      text.toLowerCase().includes(word.toLowerCase())
    );
  };

  const handleReport = async () => {
    const result = await Swal.fire({
      title: "Laporkan Postingan?",
      text: "Apakah kamu yakin ingin melaporkan postingan ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Laporkan",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    if (checkForBannedWords(post.content)) {
      await deleteDoc(doc(db, "forumPosts", post.id));
      toast.success("Postingan dihapus karena mengandung kata terlarang.");
      onDeleted();
      onRefresh();
    } else {
      toast.info("Laporan terkirim. Admin akan memeriksa konten ini.");
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Yakin ingin menghapus postingan ini?",
      text: "Tindakan ini tidak dapat dibatalkan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteDoc(doc(db, "forumPosts", post.id));
      toast.success("Post berhasil dihapus.");
      onDeleted();
    } catch {
      toast.error("Gagal menghapus post.");
    } finally {
      onRefresh();
    }
  };

  const handleEdit = () => {
    setEditing(true);
    setEditContent(post.content);
  };

  const handleSaveEdit = async () => {
    try {
      await updateDoc(doc(db, "forumPosts", post.id), {
        content: editContent,
      });
      setEditing(false);
      toast.success("Post berhasil diperbarui.");
      onRefresh();
    } catch {
      toast.error("Gagal memperbarui post.");
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white dark:bg-neutral-900 space-y-3 relative">
      <div className="flex items-start gap-3">
        <Image
          src={profile?.photoURL || "/photos/boy.png"}
          alt="avatar"
          width={40}
          height={40}
          className="rounded-full border object-cover"
        />
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold">{profile?.name || "User"}</p>
              <p className="text-sm text-gray-500">
                {formatDistanceToNow(post.createdAt?.toDate?.() || new Date(), {
                  addSuffix: true,
                  locale: id,
                })}
              </p>
            </div>
            {isOwner && (
              <EditDeleteMenu
                isOwner={isOwner}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onReport={handleReport}
              />
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit}>
                  Simpan
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(false)}
                >
                  Batal
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 whitespace-pre-line text-gray-800 dark:text-gray-200">
              {post.content}
            </p>
          )}

          <div className="mt-3">
            <LikeDislike type="post" postId={post.id} />
            <CommentSection postId={post.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
