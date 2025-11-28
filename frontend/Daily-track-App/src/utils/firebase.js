// src/utils/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import.meta.env;VITE_FIREBASE_API_KEY;


// --- TEMPORARY: HARDCODED CONFIG ---
// We are using the raw strings directly to ensure it works immediately.
const firebaseConfig = {
  // apiKey: "AIzaSyDu-ysEbYgxSWGYY92djYoRfSAVXPTbVqA",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: "G-SY5HH5XNFT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Safe Analytics Initialization (Prevents AdBlocker crashes)
let analytics;
isSupported().then((yes) => {
  if (yes) {
    analytics = getAnalytics(app);
  }
}).catch((err) => {
  console.log("Firebase Analytics blocked (AdBlocker likely active). This is harmless.");
});

// Initialize Auth
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider, analytics };