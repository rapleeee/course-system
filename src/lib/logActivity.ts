import { db } from "./firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

type LogType = "user" | "course" | "event";

export async function logActivity({
  name,
  action,
  type,
}: {
  name: string;
  action: string;
  type: LogType;
}) {
  try {
    await addDoc(collection(db, "activityLogs"), {
      name,
      action,
      type,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Gagal log aktivitas:", err);
  }
}