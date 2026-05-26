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
    const rootSnap = await rtdb.ref().get();
    const db = rootSnap.val() || {};
    
    const mac = "6A:DD:F6:02:6C:A4";
    console.log(`=== TIMELINE FOR ${mac} ===`);
    
    const events = [];
    
    // Add payments
    if (db.payment_requests) {
      for (const [id, req] of Object.entries(db.payment_requests)) {
        if (req.mac === mac) {
          events.push({
            time: new Date(req.timestamp),
            type: "PAYMENT_REQUEST",
            status: req.status,
            coins: req.coins,
            amount: req.amount,
            id
          });
        }
      }
    }
    
    // Add audit logs
    if (db.audit_logs && db.audit_logs[mac]) {
      for (const [id, log] of Object.entries(db.audit_logs[mac])) {
        events.push({
          time: new Date(log.timestamp),
          type: "AUDIT_LOG",
          eventType: log.eventType,
          details: log.details,
          id
        });
      }
    }
    
    // Add devices info
    if (db.devices && db.devices[mac]) {
      const dev = db.devices[mac];
      if (dev.registeredAt) {
        events.push({
          time: new Date(dev.registeredAt),
          type: "DEVICE_REGISTERED",
          deviceKey: dev.deviceKey
        });
      }
      if (dev.expiryDate) {
        // Since expiry date is 1 year from activation, let's find the activation date
        // which is in dev.activationDate (timestamp in ms)
        const actTime = dev.activationDate ? new Date(dev.activationDate) : new Date(new Date(dev.expiryDate).getTime() - 365*24*60*60*1000);
        events.push({
          time: actTime,
          type: "DEVICE_ACTIVATED",
          licenseKey: dev.licenseKey,
          lastPlan: dev.lastPlan
        });
      }
    }
    
    events.sort((a, b) => a.time - b.time);
    
    events.forEach(e => {
      console.log(`[${e.time.toISOString()}] Type: ${e.type}`);
      for (const [k, v] of Object.entries(e)) {
        if (k !== "time" && k !== "type") {
          console.log(`  ${k}: ${v}`);
        }
      }
      console.log("");
    });
    
  } catch (err) {
    console.error("Error inspecting:", err.message);
  } finally {
    process.exit(0);
  }
}

inspect();
