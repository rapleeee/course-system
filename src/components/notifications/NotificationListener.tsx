"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { collection, limit, onSnapshot, orderBy, query, doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/firebase";
import type { UserNotification, UserNotificationDoc } from "@/components/notifications/UserNotificationBell";
import { resolveNotificationLink } from "@/components/notifications/UserNotificationBell";

export default function NotificationListener() {
  const { user } = useAuth();
  const router = useRouter();
  const initializedRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    unsubscribeRef.current?.();
    initializedRef.current = false;

    if (!user?.uid) {
      return undefined;
    }

    const currentUid = user.uid;

    const notificationsQuery = query(
      collection(db, "users", currentUid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      if (!initializedRef.current) {
        initializedRef.current = true;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type !== "added") return;
        const data = (change.doc.data() as UserNotificationDoc) ?? {};
        const notification: UserNotification = {
          id: change.doc.id,
          ...data,
          createdAtDate: data.createdAt?.toDate?.() ?? null,
        };
        if (notification.read) return;
        const destination = resolveNotificationLink(notification);
        toast(notification.title || "Notifikasi baru", {
          description: notification.message,
          action: destination
            ? {
                label: "Lihat",
                onClick: () => {
                  void markAsRead(currentUid, notification.id);
                  router.push(destination);
                },
              }
            : undefined,
        });
      });
    });

    unsubscribeRef.current = unsubscribe;
    return unsubscribe;
  }, [user?.uid, router]);

  return null;
}

async function markAsRead(uid: string, notificationId: string) {
  try {
    await updateDoc(doc(db, "users", uid, "notifications", notificationId), { read: true });
  } catch (err) {
    console.error("Failed to mark notification as read", err);
  }
}
