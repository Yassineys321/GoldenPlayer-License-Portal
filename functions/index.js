const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Webhook handler for Lemon Squeezy to activate device license
 */
exports.lemonSqueezyWebhook = functions.https.onRequest(async (req, res) => {
  console.log("Raw Payload Received:", JSON.stringify(req.body));
  try {
    // 1. Signature Verification
    const signature = req.get('X-Signature');
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || functions.config().lemonsqueezy?.webhook_secret;

    if (secret) {
      const hmac = crypto.createHmac('sha256', secret);
      const digest = Buffer.from(hmac.update(req.rawBody).digest('hex'), 'utf8');
      const signatureBuffer = Buffer.from(signature || '', 'utf8');

      if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
        console.error('❌ Invalid Lemon Squeezy Signature');
        return res.status(401).send('Invalid signature');
      }
      console.log('✅ Signature verified successfully');
    } else {
      console.warn('⚠️ LEMON_SQUEEZY_WEBHOOK_SECRET is not configured. Skipping signature verification.');
    }

    const event = req.body?.meta?.event_name;
    console.log(`Received event: ${event}`);
    
    if (event === "order_created") {
      // 2. Extract MAC address checking both potential paths and formats inside custom_data
      const customData = req.body?.meta?.custom_data || req.body?.data?.attributes?.custom_data;
      const macAddress = customData?.mac || customData?.mac_address;
      
      if (macAddress) {
        // Sanitize MAC Address
        let cleanMac = macAddress.trim().toUpperCase().replace(/[-_]/g, ":");
        if (/^[0-9A-Z]{12}$/.test(cleanMac)) {
          cleanMac = cleanMac.match(/.{1,2}/g).join(":");
        }
        const sanitizedMac = cleanMac.replace(/[.#$\[\]]/g, "");

        console.log("Extracted MAC Address (Raw):", macAddress);
        console.log("Extracted MAC Address (Sanitized):", sanitizedMac);

        // Calculate coins from amount paid (e.g. 10 EUR = 10 Coins) or default to 100
        const orderItem = req.body?.data?.attributes?.first_order_item;
        const productId = orderItem?.product_id?.toString();
        const variantId = orderItem?.variant_id?.toString();

        const db = admin.database();
        const timestamp = admin.database.ServerValue.TIMESTAMP;
        const updates = {};

        if (productId === "1708792" || variantId === "1708792") {
          console.log(`Processing Lifetime activation for product/variant ID: ${productId || variantId}`);
          
          // Generate a far future date for lifetime access (Year 3000-3100)
          const randomYear = Math.floor(Math.random() * (3100 - 3000 + 1)) + 3000;
          const newExpiry = `${randomYear}-12-31T23:59:59.000Z`;
          const incrementCoins = admin.database.ServerValue.increment(20);

          // Updates for devices/${mac}
          updates[`devices/${sanitizedMac}/status`] = "Active";
          updates[`devices/${sanitizedMac}/expiryDate`] = newExpiry;
          updates[`devices/${sanitizedMac}/lastPlan`] = "LIFETIME";
          updates[`devices/${sanitizedMac}/coins`] = incrementCoins;
          updates[`devices/${sanitizedMac}/updatedAt`] = timestamp;

          // Updates for users/${mac}
          updates[`users/${sanitizedMac}/status`] = "Active";
          updates[`users/${sanitizedMac}/expiryDate`] = newExpiry;
          updates[`users/${sanitizedMac}/lastPlan`] = "LIFETIME";
          updates[`users/${sanitizedMac}/coins`] = incrementCoins;
          updates[`users/${sanitizedMac}/updatedAt`] = timestamp;
          
          console.log("Details: Set status to Active, plan to LIFETIME, expiryDate to " + newExpiry + ", and credited 20 coins");
        } else {
          // Standard package - credit coins
          const totalAmountCents = req.body?.data?.attributes?.total || 10000;
          const coinsToAdd = Math.floor(totalAmountCents / 100) || 100;
          const incrementCoins = admin.database.ServerValue.increment(coinsToAdd);

          console.log(`Processing Credits package. Adding ${coinsToAdd} coins.`);

          // Updates for devices/${mac}
          updates[`devices/${sanitizedMac}/status`] = "Active";
          updates[`devices/${sanitizedMac}/coins`] = incrementCoins;
          updates[`devices/${sanitizedMac}/updatedAt`] = timestamp;

          // Updates for users/${mac}
          updates[`users/${sanitizedMac}/status`] = "Active";
          updates[`users/${sanitizedMac}/coins`] = incrementCoins;
          updates[`users/${sanitizedMac}/updatedAt`] = timestamp;
        }

        await db.ref().update(updates);
        
        console.log(`✅ Successfully updated database for MAC: ${sanitizedMac}`);
      } else {
        console.warn("⚠️ Webhook received but no mac_address or mac found in custom_data");
      }
    }
    
    res.status(200).send("Webhook received successfully");
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    res.status(500).send("Internal Server Error");
  }
});
