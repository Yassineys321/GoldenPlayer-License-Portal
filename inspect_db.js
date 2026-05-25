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
    if (!rootSnap.exists()) {
      console.log("Database is empty!");
      return;
    }
    const val = rootSnap.val();
    console.log("Root keys:", Object.keys(val));
    
    if (val.invoices) {
      console.log("Invoices count:", Object.keys(val.invoices).length);
      console.log("Invoices sample:", Object.values(val.invoices).slice(0, 2));
    } else {
      console.log("❌ No invoices node in DB!");
    }
    
    if (val.payment_requests) {
      console.log("payment_requests count:", Object.keys(val.payment_requests).length);
      const reqs = Object.entries(val.payment_requests).map(([id, req]) => ({ id, status: req.status, mac: req.mac }));
      console.log("payment_requests sample:", reqs.slice(0, 5));
    }
    
    if (val.pending_payments) {
      console.log("pending_payments count:", Object.keys(val.pending_payments).length);
      console.log("pending_payments sample:", Object.values(val.pending_payments).slice(0, 5));
    }
  } catch (err) {
    console.error("Error inspecting:", err.message);
  } finally {
    process.exit(0);
  }
}

inspect();
