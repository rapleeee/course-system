import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Profile = {
  name?: string;
  nama?: string;
  username?: string;
  email?: string;
  nisn?: string;
  gender?: string;
  jenisKelamin?: string;
  role?: "guru" | "murid";
};

async function listAllUsers(): Promise<{ uid: string; email?: string | null; displayName?: string | null }[]> {
  const auth = getAuth();
  let pageToken: string | undefined = undefined;
  const all: { uid: string; email?: string | null; displayName?: string | null }[] = [];
  do {
    const res = await auth.listUsers(1000, pageToken);
    for (const u of res.users) {
      all.push({ uid: u.uid, email: u.email, displayName: u.displayName });
    }
    pageToken = res.pageToken;
  } while (pageToken);
  return all;
}

export async function GET() {
  try {
    const authUsers = await listAllUsers();
    // Batch ambil profil Firestore
    const refs = authUsers.map((u) => adminDb.collection("users").doc(u.uid));
    const snaps = await adminDb.getAll(...refs);
    const byUid: Record<string, Profile | undefined> = {};
    snaps.forEach((s) => {
      if (!s.exists) return;
      byUid[s.id] = s.data() as Profile;
    });

    const users = authUsers.map((u) => {
      const p = byUid[u.uid] || {};
      const name = p.name || p.nama || u.displayName || undefined;
      const email = p.email || u.email || undefined;
      const username = p.username || (email ? email.split("@")[0] : undefined);
      const role = p.role || "murid";
      return {
        id: u.uid,
        name,
        nama: p.nama,
        email,
        username,
        nisn: p.nisn || undefined,
        gender: p.gender || undefined,
        jenisKelamin: p.jenisKelamin || undefined,
        role,
      };
    });

    // Urutkan by username/email
    users.sort((a, b) => (a.username || a.email || "").localeCompare(b.username || b.email || ""));

    return NextResponse.json({ users });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ users: [], error: msg }, { status: 500 });
  }
}
