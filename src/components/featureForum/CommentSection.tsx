"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useAuth } from "@/lib/useAuth";
import LikeDislike from "./LikeDislike";
import { toast } from "sonner";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import Swal from "sweetalert2";

type Comment = {
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
  postId: string;
};

export default function CommentSection({ postId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<{ [uid: string]: UserProfile }>({});
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

 const fetchComments = useCallback(async () => {
  const q = query(collection(db, "forumPosts", postId, "comments"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);

  const fetched: Comment[] = [];
  const uids: string[] = [];

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    fetched.push({ id: docSnap.id, ...data } as Comment);
    uids.push(data.userId);
  });

  const profileMap: { [uid: string]: UserProfile } = {};
  const uniqueUids = [...new Set(uids)];
  await Promise.all(
    uniqueUids.map(async (uid) => {
      const profileSnap = await getDocs(collection(db, "users"));
      profileSnap.forEach((p) => {
        if (p.id === uid) {
          profileMap[uid] = p.data() as UserProfile;
        }
      });
    })
  );

  setProfiles(profileMap);
  setComments(fetched);
}, [postId]);


  const handleAddComment = async () => {
    if (!newComment.trim() || !user?.uid) return;

    try {
      await addDoc(collection(db, "forumPosts", postId, "comments"), {
        content: newComment.trim(),
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      setNewComment("");
      toast.success("Komentar ditambahkan");
      fetchComments();
    } catch {
      toast.error("Gagal menambahkan komentar");
    }
  };

  const handleDelete = async (commentId: string) => {
    const result = await Swal.fire({
      title: "Yakin ingin menghapus komentar ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteDoc(doc(db, "forumPosts", postId, "comments", commentId));
      toast.success("Komentar dihapus");
      fetchComments();
    } catch {
      toast.error("Gagal menghapus komentar");
    }
  };

  const handleEdit = (commentId: string, currentContent: string) => {
    setEditingId(commentId);
    setEditContent(currentContent);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await updateDoc(doc(db, "forumPosts", postId, "comments", editingId), {
        content: editContent,
      });
      toast.success("Komentar diperbarui");
      setEditingId(null);
      fetchComments();
    } catch {
      toast.error("Gagal menyimpan perubahan");
    }
  };
useEffect(() => {
  fetchComments();
}, [fetchComments]); 

  return (
    <div className="mt-4 space-y-6">
      <div className="flex gap-2 items-start">
        <Textarea
          placeholder="Tulis komentar..."
          className="flex-1"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <Button onClick={handleAddComment} disabled={!newComment.trim()}>
          Kirim
        </Button>
      </div>

      {comments.map((comment) => {
        const commenter = profiles[comment.userId];
        const isOwner = comment.userId === user?.uid;

        return (
          <div key={comment.id} className="flex gap-3 items-start">
            <Image
              src={commenter?.photoURL || "/photos/boy.png"}
              alt="avatar"
              width={32}
              height={32}
              className="rounded-full border object-cover"
            />
            <div className="flex-1 bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold">{commenter?.name || "User"}</p>
                  <p className="text-xs text-gray-500">
                    {comment.createdAt?.toDate?.().toLocaleString("id-ID") ?? ""}
                  </p>
                </div>

                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-6 w-6">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(comment.id, comment.content)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(comment.id)}>
                        Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {editingId === comment.id ? (
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
                      onClick={() => setEditingId(null)}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm mt-2">{comment.content}</p>
                  <LikeDislike
                    type="comment"
                    postId={postId}
                    commentId={comment.id}
                  />
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}