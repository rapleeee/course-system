import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore"
import type { User } from "firebase/auth"

import { db } from "@/lib/firebase"

export interface UserProfileDefaults {
  name?: string | null
  email?: string | null
  photoURL?: string | null
}

export async function ensureUserProfile(user: User, overrides: Record<string, unknown> = {}) {
  const userRef = doc(db, "users", user.uid)
  const snap = await getDoc(userRef)

  const basePayload = {
    name: user.displayName || overrides.name || "",
    email: user.email || overrides.email || "",
    photoURL: user.photoURL || overrides.photoURL || "",
    totalScore: 0,
    seasonalScore: 0,
    seasonalScoreUpdatedAt: serverTimestamp(),
    surveyCompleted: false,
    recommendedTrack: null,
    surveyResponses: null,
    roles: ["student"],
    subscriptionActive: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (!snap.exists()) {
    await setDoc(userRef, { ...basePayload, ...overrides })
  } else if (Object.keys(overrides).length > 0) {
    await setDoc(
      userRef,
      {
        ...overrides,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
  }
}
