// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCzNwWPIr1fZ3iOPrdPf4B3ZQgGklrJ7U0",
  authDomain: "mentora-07.firebaseapp.com",
  projectId: "mentora-07",
  storageBucket: "mentora-07.firebasestorage.app",
  messagingSenderId: "207237322799",
  appId: "1:207237322799:web:c17b8ef76d8f0cda180eda",
  measurementId: "G-1F98G63YKM"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase authentication
const auth = getAuth(app);

// Google authentication provider
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword };