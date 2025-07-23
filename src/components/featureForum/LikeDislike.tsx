"use client";

import { useEffect, useState, useMemo } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";

type Props = {
  type: "post" | "comment";
  postId: string;
  commentId?: string;
};

export default function LikeDislike({ postId, commentId }: Props) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);

  const likeRef = useMemo(() => {
    return commentId
      ? collection(db, "forumPosts", postId, "comments", commentId, "likes")
      : collection(db, "forumPosts", postId, "likes");
  }, [postId, commentId]);

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(likeRef, (snap) => {
      let likes = 0;
      let dislikes = 0;
      let userLiked = false;
      let userDisliked = false;

      snap.forEach((doc) => {
        const data = doc.data();
        if (data.type === "like") likes++;
        if (data.type === "dislike") dislikes++;
        if (doc.id === user.uid) {
          userLiked = data.type === "like";
          userDisliked = data.type === "dislike";
        }
      });

      setLikeCount(likes);
      setDislikeCount(dislikes);
      setLiked(userLiked);
      setDisliked(userDisliked);
    });

    return () => unsub();
  }, [user, likeRef]);

  const handleToggle = async (type: "like" | "dislike") => {
    if (!user) return;

    const userLikeDoc = doc(likeRef, user.uid);
    const current = liked ? "like" : disliked ? "dislike" : null;

    if (current === type) {
      await deleteDoc(userLikeDoc);
    } else {
      await setDoc(userLikeDoc, { type });
    }
  };

  return (
    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 mt-2">
      <button
        onClick={() => handleToggle("like")}
        className={cn(
          "flex items-center gap-1 hover:text-blue-500",
          liked && "text-blue-600 font-semibold"
        )}
      >
        <ThumbsUp size={18} />
        <span>{likeCount}</span>
      </button>
      <button
        onClick={() => handleToggle("dislike")}
        className={cn(
          "flex items-center gap-1 hover:text-red-500",
          disliked && "text-red-600 font-semibold"
        )}
      >
        <ThumbsDown size={18} />
        <span>{dislikeCount}</span>
      </button>
    </div>
  );
}