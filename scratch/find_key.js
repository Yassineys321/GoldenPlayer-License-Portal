import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import fs from "fs";
import path from "path";

const serviceAccountPath = path.resolve("./firebase-service-account.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ firebase-service-account.json not found!");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

const adminApp = initializeApp({
  databaseURL: "https://golden-player-d064c-default-rtdb.europe-west1.firebasedatabase.app",
  credential: cert(serviceAccount),
});

const rtdb = getDatabase(adminApp);

async function search() {
  try {
    const rootSnap = await rtdb.ref().get();
    const db = rootSnap.val() || {};
    
    const target = "3928B6";
    console.log(`Searching for "${target}" in Firebase database...`);
    
    function recurse(obj, path) {
      if (!obj) return;
      if (typeof obj === "string") {
        if (obj.toLowerCase() === target.toLowerCase()) {
          console.log(`FOUND string match at path: "${path}" = "${obj}"`);
        }
      } else if (typeof obj === "object") {
        for (const [k, v] of Object.entries(obj)) {
          recurse(v, path ? `${path}/${k}` : k);
        }
      }
    }
    
    recurse(db, "");
    console.log("Search finished.");
  } catch (err) {
    console.error("Error searching:", err.message);
  } finally {
    process.exit(0);
  }
}

search();
