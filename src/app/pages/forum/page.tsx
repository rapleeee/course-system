"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  QueryDocumentSnapshot,
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

  const [isFetching, setIsFetching] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // guard agar scroll handler tak nge-spam fetch
  const fetchingRef = useRef(false);

  const fetchProfilesFor = useCallback(
    async (uids: string[]) => {
      const missing = uids.filter((u) => !profiles[u]);
      if (missing.length === 0) return;

      const profileMap: Record<string, UserProfile> = {};
      await Promise.all(
        missing.map(async (uid) => {
          const userRef = doc(db, "users", uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            profileMap[uid] = userSnap.data() as UserProfile;
          }
        })
      );
      setProfiles((prev) => ({ ...prev, ...profileMap }));
    },
    [profiles]
  );

  const fetchPosts = useCallback(
    async (initial = false) => {
      if (isFetching || fetchingRef.current) return;
      if (!hasMore && !initial) return;

      try {
        setIsFetching(true);
        fetchingRef.current = true;

        const base = query(
          collection(db, "forumPosts"),
          orderBy("createdAt", "desc"),
          limit(5)
        );

        const q = initial || !lastDoc ? base : query(base, startAfter(lastDoc));
        const snapshot = await getDocs(q);

        // mapping post
        const fetched = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ForumPost, "id">),
        })) as ForumPost[];

        // update cursor & hasMore
        setLastDoc(
          snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : null
        );
        setHasMore(snapshot.docs.length === 5);

        // set posts
        setPosts((prev) => (initial ? fetched : [...prev, ...fetched]));

        // fetch profiles yang belum ada
        const uids = Array.from(new Set(fetched.map((p) => p.userId)));
        await fetchProfilesFor(uids);
      } catch (e) {
        console.error(e);
        toast.error("Gagal memuat postingan.");
      } finally {
        setIsFetching(false);
        fetchingRef.current = false;
      }
    },
    [isFetching, hasMore, lastDoc, fetchProfilesFor]
  );

  const handlePostSubmit = async () => {
    if (!user) {
      toast.error("Silakan login terlebih dahulu.");
      return;
    }
    const content = newPost.trim();
    if (!content) return;

    try {
      setIsPosting(true);

      const ref = await addDoc(collection(db, "forumPosts"), {
        content,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      const optimistic: ForumPost = {
        id: ref.id,
        content,
        userId: user.uid,
        createdAt: Timestamp.now(),
      };
      setPosts((prev) => [optimistic, ...prev]);
      setNewPost("");
      setLastDoc(null);
      setHasMore(true);
      fetchPosts(true);

      toast.success("Postingan berhasil dikirim!");
    } catch (e) {
      console.error(e);
      toast.error("Gagal mengirim postingan.");
    } finally {
      setIsPosting(false);
    }
  };

  useEffect(() => {
    fetchPosts(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
      if (nearBottom && !isFetching && hasMore && posts.length >= 5) {
        fetchPosts(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fetchPosts, isFetching, hasMore, posts.length]);

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
            <Button
              className="mt-3 w-full"
              onClick={handlePostSubmit}
              disabled={isPosting}
            >
              {isPosting ? "Mengirim..." : "Kirim"}
            </Button>
          </div>
        )}

        {posts.length === 0 && !isFetching && (
          <p className="text-center text-gray-500 text-sm">
            Belum ada diskusi apapun di sini.
          </p>
        )}

        {posts.map((post) => (
          <PostItem
            key={post.id}
            post={post}
            profile={profiles[post.userId]}
            onDeleted={async () => {
              setLastDoc(null);
              setHasMore(true);
              await fetchPosts(true);
            }}
            onRefresh={async () => {
              setLastDoc(null);
              setHasMore(true);
              await fetchPosts(true);
            }}
          />
        ))}

        {(isFetching || isPosting) && (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>
    </Layout>
  );
}
