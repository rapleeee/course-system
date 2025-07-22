"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/useAuth";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  doc,
  getDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { toast } from "sonner";
import { Trash } from "lucide-react";

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

export default function ForumDiscuss() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [newPost, setNewPost] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const q = query(collection(db, "forumPosts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    const fetchedPosts: ForumPost[] = [];
    const userIds = new Set<string>();

    snap.forEach((doc) => {
      const data = doc.data() as Omit<ForumPost, "id">;
      fetchedPosts.push({ id: doc.id, ...data });
      userIds.add(data.userId);
    });

    setPosts(fetchedPosts);
    await fetchProfiles(Array.from(userIds));
  };

  const fetchProfiles = async (uids: string[]) => {
    const data: Record<string, UserProfile> = {};
    await Promise.all(
      uids.map(async (uid) => {
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) {
          data[uid] = docSnap.data() as UserProfile;
        }
      })
    );
    setProfiles(data);
  };

  const handleSubmit = async () => {
    if (!newPost.trim() || !user?.uid) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "forumPosts"), {
        content: newPost.trim(),
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      setNewPost("");
      toast.success("Post berhasil dikirim!");
      fetchPosts();
    } catch (err) {
      toast.error("Gagal membuat post");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm("Yakin ingin menghapus postingan ini?")) return;

    try {
      await deleteDoc(doc(db, "forumPosts", postId));
      toast.success("Post berhasil dihapus.");
      fetchPosts();
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghapus post.");
    }
  };

  return (
    <Layout pageTitle="Forum Diskusi">
      <div className="max-w-full space-y-6">
        {user && (
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow">
            <Textarea
              placeholder="Apa yang ingin kamu diskusikan?"
              className="mb-3"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Mengirim..." : "Kirim"}
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {posts.map((post) => {
            const profile = profiles[post.userId];
            const isOwner = user?.uid === post.userId;

            return (
              <div
                key={post.id}
                className="p-4 border rounded-lg dark:bg-neutral-900 bg-white shadow-sm relative"
              >
                <div className="flex items-center mb-2">
                  <Image
                    src={profile?.photoURL || "/photos/boy.png"}
                    alt="avatar"
                    width={40}
                    height={40}
                    className="rounded-full mr-3 border object-cover"
                  />
                  <div>
                    <p className="font-semibold">{profile?.name || "User"}</p>
                    <p className="text-sm text-gray-500">
                      {post.createdAt?.toDate?.().toLocaleString("id-ID") ?? ""}
                    </p>
                  </div>
                </div>

                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line">
                  {post.content}
                </p>

                {isOwner && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="absolute top-3 right-3 text-red-500 hover:text-red-700"
                    title="Hapus Post"
                  >
                    <Trash size={18} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}