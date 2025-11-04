"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";

export type AdminProfile = {
  id: string;
  name?: string;
  nama?: string;
  username?: string;
  email?: string;
  role?: string;
  level?: string;
  photoURL?: string;
  [key: string]: unknown;
} | null;

type UseAdminProfileResult = {
  user: ReturnType<typeof useAuth>["user"];
  authLoading: boolean;
  profile: AdminProfile;
  profileLoading: boolean;
  error: Error | null;
};

export function useAdminProfile(): UseAdminProfileResult {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<AdminProfile>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!user) {
        if (active) {
          setProfile(null);
          setProfileLoading(false);
        }
        return;
      }

      setProfileLoading(true);
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (!active) return;
        if (snap.exists()) {
          const data = snap.data() as Record<string, unknown>;
          setProfile({
            id: user.uid,
            ...data,
            email: (data.email as string | undefined) ?? user.email ?? undefined,
            photoURL: (data.photoURL as string | undefined) ?? user.photoURL ?? undefined,
          });
        } else {
          setProfile({
            id: user.uid,
            email: user.email ?? undefined,
            name: user.displayName ?? undefined,
          });
        }
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err as Error);
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    };

    if (!authLoading) {
      void loadProfile();
    }

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  return useMemo(
    () => ({
      user,
      authLoading,
      profile,
      profileLoading,
      error,
    }),
    [user, authLoading, profile, profileLoading, error]
  );
}
