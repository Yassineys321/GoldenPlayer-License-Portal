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

async function inspect() {
  try {
    const rootSnap = await rtdb.ref("devices").get();
    if (!rootSnap.exists()) {
      console.log("No devices in DB!");
      return;
    }
    const val = rootSnap.val();
    console.log("Devices count:", Object.keys(val).length);
    console.log("Devices sample:");
    console.dir(Object.entries(val).slice(0, 5), { depth: null });
  } catch (err) {
    console.error("Error inspecting:", err.message);
  } finally {
    process.exit(0);
  }
}

inspect();
