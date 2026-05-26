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

const normalizeMac = (mac) => {
  if (!mac || typeof mac !== "string") return "";
  let clean = mac.trim().toUpperCase().replace(/[-_]/g, ":");
  if (/^[0-9A-Z]{12}$/.test(clean)) {
    clean = clean.match(/.{1,2}/g).join(":");
  }
  return clean;
};

async function migrate() {
  console.log("🚀 Starting database migration...");
  try {
    const rootSnap = await rtdb.ref().get();
    if (!rootSnap.exists()) {
      console.log("Database is empty, nothing to migrate.");
      return;
    }
    const db = rootSnap.val();

    // 1. Migrate node keys (where key is the MAC address)
    const collectionsWithMacKeys = ["devices", "users_balance", "playlists", "audit_logs"];
    for (const col of collectionsWithMacKeys) {
      if (!db[col]) {
        console.log(`ℹ️ Node '${col}' not found in database. Skipping.`);
        continue;
      }
      console.log(`⚙️ Migrating keys in '${col}'...`);
      const items = db[col];
      for (const [oldKey, value] of Object.entries(items)) {
        const newKey = normalizeMac(oldKey);
        if (oldKey !== newKey) {
          console.log(`  -> Renaming '${col}/${oldKey}' to '${col}/${newKey}'`);
          // Set new key
          await rtdb.ref(`${col}/${newKey}`).set(value);
          // Delete old key
          await rtdb.ref(`${col}/${oldKey}`).remove();
        }
      }
    }

    // 2. Migrate objects containing a "mac" property
    const collectionsWithMacProperty = ["payment_requests", "pending_payments", "invoices"];
    for (const col of collectionsWithMacProperty) {
      if (!db[col]) {
        console.log(`ℹ️ Node '${col}' not found in database. Skipping.`);
        continue;
      }
      console.log(`⚙️ Migrating properties in '${col}'...`);
      const items = db[col];
      for (const [id, record] of Object.entries(items)) {
        if (record && record.mac) {
          const oldMac = record.mac;
          const newMac = normalizeMac(oldMac);
          if (oldMac !== newMac) {
            console.log(`  -> Updating '${col}/${id}' mac from '${oldMac}' to '${newMac}'`);
            await rtdb.ref(`${col}/${id}/mac`).set(newMac);
          }
        }
      }
    }

    console.log("✅ Database migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    process.exit(0);
  }
}

migrate();
