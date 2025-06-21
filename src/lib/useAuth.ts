// useAuth.ts (hook)
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null); // Store user info
  const [loading, setLoading] = useState(true); // Loading state for auth check

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user); // Set user state based on Firebase authentication
      setLoading(false); // Set loading to false once auth state is checked
    });

    return () => unsubscribe(); // Cleanup the listener when component unmounts
  }, []);

  return { user, loading }; // Return user and loading state
};