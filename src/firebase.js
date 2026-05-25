import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBQp1mmbRz61aAZ2ryrLUxlYKL7TPdsMio",
  authDomain: "golden-player-d064c.firebaseapp.com",
  databaseURL: "https://golden-player-d064c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "golden-player-d064c",
  storageBucket: "golden-player-d064c.firebasestorage.app",
  messagingSenderId: "519859328411",
  appId: "1:519859328411:web:cf21bc4f3b42244682fd3e",
  measurementId: "G-KC1N5XRZ0X"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export default app;
