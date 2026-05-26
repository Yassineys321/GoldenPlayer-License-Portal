import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBQp1mmbRz61aAZ2ryrLUxlYKL7TPdsMio",
  authDomain: "golden-player-d064c.firebaseapp.com",
  databaseURL: "https://golden-player-d064c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "golden-player-d064c",
  storageBucket: "golden-player-d064c.firebasestorage.app",
  messagingSenderId: "519859328411",
  appId: "1:519859328411:web:cf21bc4f3b42244682fd3e"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function testRead() {
  try {
    console.log("Attempting to read devices/6A:DD:F6:02:6C:A4 using client SDK...");
    const snap = await get(ref(db, "devices/6A:DD:F6:02:6C:A4"));
    if (snap.exists()) {
      console.log("✅ Success! Read data:", snap.val());
    } else {
      console.log("❌ Node does not exist.");
    }
  } catch (err) {
    console.error("❌ Permission/Read Error:", err.message);
  } finally {
    process.exit(0);
  }
}

testRead();
