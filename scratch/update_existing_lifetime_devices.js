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

async function run() {
  try {
    const rootSnap = await rtdb.ref("devices").get();
    if (!rootSnap.exists()) {
      console.log("No devices to update!");
      return;
    }
    const val = rootSnap.val();
    for (const [mac, dev] of Object.entries(val)) {
      if (dev.lastPlan === "LIFETIME" || dev.expiryDate === "2099-12-31T23:59:59.000Z") {
        const randomYear = Math.floor(Math.random() * (3100 - 3000 + 1)) + 3000;
        const newExpiryDate = `${randomYear}-12-31T23:59:59.000Z`;
        await rtdb.ref(`devices/${mac}`).update({
          expiryDate: newExpiryDate
        });
        console.log(`Updated device ${mac} expiryDate to ${newExpiryDate}`);
      }
    }
    console.log("Database update completed!");
  } catch (err) {
    console.error("Error updating database:", err.message);
  } finally {
    process.exit(0);
  }
}

run();
