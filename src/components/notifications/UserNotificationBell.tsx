"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  updateDoc,
  query,
  Timestamp,
} from "firebase/firestore";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export type UserNotificationDoc = {
  title: string;
  message?: string;
  type?: string;
  read?: boolean;
  createdAt?: Timestamp;
  data?: Record<string, unknown>;
};

export type UserNotification = UserNotificationDoc & {
  id: string;
  createdAtDate: Date | null;
};

export default function UserNotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  useEffect(() => {
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      return () => undefined;
    }

    const notificationsQuery = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snap) => {
      const rows = snap.docs.map((docSnap) => {
        const data = (docSnap.data() as UserNotificationDoc) ?? {};
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null;
        return {
          id: docSnap.id,
          ...data,
          createdAtDate: createdAt,
        } as UserNotification;
      });
      setItems(rows);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const markAsRead = async (notificationId: string) => {
    const uid = user?.uid;
    if (!uid) return;
    try {
      await updateDoc(doc(db, "users", uid, "notifications", notificationId), {
        read: true,
      });
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const markAllAsRead = async () => {
    const uid = user?.uid;
    if (!uid) return;
    const unread = items.filter((item) => !item.read);
    await Promise.all(
      unread.map((item) =>
        updateDoc(doc(db, "users", uid, "notifications", item.id), { read: true }).catch((err) => {
          console.error("Failed to mark notification as read", err);
        })
      )
    );
  };

  const handleNavigate = (notification: UserNotification) => {
    if (!notification.read) void markAsRead(notification.id);
    const destination = resolveNotificationLink(notification);
    if (destination) {
      router.push(destination);
    }
  };

  const badgeContent = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifikasi">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-4 text-white">
              {badgeContent}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-2">
          <span className="text-sm font-semibold">Notifikasi</span>
          {unreadCount > 0 ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
              <CheckCheck className="mr-1 h-3 w-3" /> Tandai sudah dibaca
            </Button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Belum ada notifikasi.</div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="py-1">
              {items.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => handleNavigate(notification)}
                  className={`flex cursor-pointer flex-col items-start gap-1 px-4 py-3 text-sm ${notification.read ? "opacity-70" : ""}`}
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="font-medium text-foreground">{notification.title}</span>
                    {notification.createdAtDate && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(notification.createdAtDate, { addSuffix: true, locale: localeId })}
                      </span>
                    )}
                  </div>
                  {notification.message ? (
                    <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">{notification.message}</p>
                  ) : null}
                  {!notification.read ? (
                    <span className="text-[10px] font-semibold uppercase text-primary">Baru</span>
                  ) : null}
                </DropdownMenuItem>
              ))}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function resolveNotificationLink(notification: UserNotification): string | null {
  if (notification.data && typeof notification.data === "object") {
    const { certificateId, courseId } = notification.data as {
      certificateId?: string;
      courseId?: string;
    };
    if (certificateId) {
      return "/certificates";
    }
    if (courseId) {
      return `/pages/courses/${courseId}`;
    }
  }
  return null;
}
