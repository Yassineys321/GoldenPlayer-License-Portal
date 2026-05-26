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

async function updateDevice() {
  try {
    const mac = "6A:DD:F6:02:6C:A4";
    const targetKey = "C6Y5UJ";
    
    console.log(`Updating device ${mac} to have device key ${targetKey} and active status...`);
    
    await rtdb.ref(`devices/${mac}`).update({
      deviceKey: targetKey,
      device_key: targetKey,
      key: targetKey,
      licenseKey: targetKey,
      status: "Active",
      active: true,
      expiryDate: "2027-05-25T19:04:25.068Z"
    });
    
    console.log("Device updated successfully!");
    
    // Fetch and print the updated device data
    const snap = await rtdb.ref(`devices/${mac}`).get();
    console.log("Updated device data in RTDB:", snap.val());
  } catch (err) {
    console.error("Error updating:", err.message);
  } finally {
    process.exit(0);
  }
}

updateDevice();
