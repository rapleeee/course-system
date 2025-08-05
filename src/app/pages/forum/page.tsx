"use client";

import { useCallback, useEffect, useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  limit,
  startAfter,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import PostItem from "@/components/featureForum/PostItem";
import { Loader2 } from "lucide-react";

export type ForumPost = {
  id: string;
  content: string;
  createdAt: Timestamp;
  userId: string;
};

export type UserProfile = {
  name?: string;
  photoURL?: string;
};

export default function ForumDiscuss() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState<Timestamp | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(
    async (initial = false) => {
      if (loading) return;
      setLoading(true);

      try {
        const q = initial
          ? query(collection(db, "forumPosts"), orderBy("createdAt", "desc"), limit(5))
          : query(
              collection(db, "forumPosts"),
              orderBy("createdAt", "desc"),
              startAfter(lastVisible),
              limit(5)
            );

        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ForumPost[];

        if (fetched.length < 5) setHasMore(false);
        if (fetched.length > 0) setLastVisible(fetched[fetched.length - 1].createdAt);

        setPosts((prev) => (initial ? fetched : [...prev, ...fetched]));

        const uids = Array.from(new Set(fetched.map((p) => p.userId)));
        const profileMap: Record<string, UserProfile> = {};
        await Promise.all(
          uids.map(async (uid) => {
            if (!profiles[uid]) {
              const userRef = doc(db, "users", uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                profileMap[uid] = userSnap.data() as UserProfile;
              }
            }
          })
        );
        setProfiles((prev) => ({ ...prev, ...profileMap }));
      } catch {
        toast.error("Gagal memuat postingan.");
      } finally {
        setLoading(false);
      }
    },
    [loading, lastVisible, profiles]
  );

  const handlePostSubmit = async () => {
    if (!newPost.trim()) return;

    try {
      setLoading(true);
      await addDoc(collection(db, "forumPosts"), {
        content: newPost.trim(),
        userId: user?.uid,
        createdAt: serverTimestamp(),
      });
      setNewPost("");
      toast.success("Postingan berhasil dikirim!");
      fetchPosts(true); // Reload awal
    } catch {
      toast.error("Gagal mengirim postingan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(true);
  }, [fetchPosts]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 300 &&
        !loading &&
        hasMore &&
        posts.length >= 5
      ) {
        fetchPosts();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fetchPosts, loading, hasMore, posts]);

  return (
    <Layout pageTitle="Forum Diskusi">
      <div className="space-y-6">
        {user && (
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-md shadow">
            <Textarea
              placeholder="Apa yang ingin kamu diskusikan?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />
            <Button className="mt-3 w-full" onClick={handlePostSubmit} disabled={loading}>
              {loading ? "Mengirim..." : "Kirim"}
            </Button>
          </div>
        )}

        {posts.length === 0 && !loading && (
          <p className="text-center text-gray-500 text-sm">Belum ada diskusi apapun di sini.</p>
        )}

        {posts.map((post) => (
          <PostItem
            key={post.id}
            post={post}
            profile={profiles[post.userId]}
            onDeleted={() => fetchPosts(true)}
            onRefresh={() => fetchPosts(true)}
          />
        ))}

        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>
    </Layout>
  );
}