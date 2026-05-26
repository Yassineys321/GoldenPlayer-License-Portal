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

async function fix() {
  try {
    const mac = "6A:DD:F6:02:6C:A4";
    console.log(`Fixing database paths and credentials for MAC: ${mac}`);
    
    const devRef = rtdb.ref(`devices/${mac}`);
    const legacyBalRef = rtdb.ref(`users_balance/${mac}`);
    
    const devSnap = await devRef.get();
    const legacySnap = await legacyBalRef.get();
    
    let currentCoins = 0;
    if (devSnap.exists()) {
      currentCoins = devSnap.val().coins || 0;
    }
    
    let legacyCoins = 0;
    if (legacySnap.exists()) {
      legacyCoins = legacySnap.val().coins || 0;
      console.log(`Found ${legacyCoins} legacy coins in users_balance.`);
    }
    
    const newCoins = currentCoins + legacyCoins;
    
    // Update the device node
    await devRef.update({
      deviceKey: "3928B6",
      licenseKey: "3928B6",
      coins: newCoins,
    });
    console.log(`✅ Updated devices/${mac} with deviceKey: "3928B6", licenseKey: "3928B6", coins: ${newCoins}`);
    
    // Remove the legacy users_balance node
    if (legacySnap.exists()) {
      await legacyBalRef.remove();
      console.log(`✅ Removed legacy users_balance/${mac} node.`);
    }
    
    console.log("Fix complete! Verification dump:");
    const finalSnap = await devRef.get();
    console.log(JSON.stringify(finalSnap.val(), null, 2));
    
  } catch (err) {
    console.error("Error during fix:", err.message);
  } finally {
    process.exit(0);
  }
}

fix();
