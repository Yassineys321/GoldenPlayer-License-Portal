import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import fs from "fs";
import path from "path";

const serviceAccountPath = path.resolve("./firebase-service-account.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

const adminApp = initializeApp({
  databaseURL: "https://golden-player-d064c-default-rtdb.europe-west1.firebasedatabase.app",
  credential: cert(serviceAccount),
});

const rtdb = getDatabase(adminApp);

async function check() {
  try {
    const mac = "6A:DD:F6:02:6C:A4";
    
    const devSnap = await rtdb.ref(`devices/${mac}`).get();
    console.log(`--- devices/${mac} ---`);
    console.log(devSnap.exists() ? devSnap.val() : "Not Found");

    const userSnap = await rtdb.ref(`users/${mac}`).get();
    console.log(`--- users/${mac} ---`);
    console.log(userSnap.exists() ? userSnap.val() : "Not Found");

    const balSnap = await rtdb.ref(`users_balance/${mac}`).get();
    console.log(`--- users_balance/${mac} ---`);
    console.log(balSnap.exists() ? balSnap.val() : "Not Found");

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    process.exit(0);
  }
}

check();
