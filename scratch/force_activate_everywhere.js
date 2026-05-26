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

async function forceActivateEverywhere() {
  try {
    const targetKey = "3928B6";
    const macVariants = [
      "6A:DD:F6:02:6C:A4",
      "6a:dd:f6:02:6c:a4",
      "6A-DD-F6-02-6C-A4",
      "6a-dd-f6-02-6c-a4",
      "6ADDF6026CA4",
      "6addf6026ca4"
    ];
    
    console.log(`Writing whitelisted device record under all possible MAC formats for Key ${targetKey}...`);
    
    for (const mac of macVariants) {
      await rtdb.ref(`devices/${mac}`).set({
        active: true,
        autoRegistered: true,
        coins: 0,
        deviceKey: targetKey,
        device_key: targetKey,
        key: targetKey,
        licenseKey: targetKey,
        macAddress: mac,
        status: "Active",
        expiryDate: "2027-05-25T19:04:25.068Z"
      });
      console.log(`  -> Whitelisted devices/${mac}`);
    }
    
    console.log("All MAC format variations registered successfully!");
  } catch (err) {
    console.error("Error updating:", err.message);
  } finally {
    process.exit(0);
  }
}

forceActivateEverywhere();
