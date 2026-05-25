import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getStorage } from "firebase-admin/storage";
import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import puppeteer from "puppeteer-core";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

dotenv.config();

// ==========================================
// FIREBASE ADMIN INITIALIZATION
// ==========================================
const firebaseAdminConfig = {
  databaseURL: "https://golden-player-d064c-default-rtdb.europe-west1.firebasedatabase.app",
  storageBucket: "golden-player-d064c.firebasestorage.app",
};

// Check for local service account JSON
const serviceAccountPath = path.resolve("./firebase-service-account.json");
const altServiceAccountPath = path.resolve("./serviceAccountKey.json");

let serviceAccount = null;
let hasServiceAccount = false;

if (fs.existsSync(serviceAccountPath)) {
  try {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    hasServiceAccount = true;
  } catch (err) {
    console.error("❌ Failed to parse firebase-service-account.json:", err.message);
  }
} else if (fs.existsSync(altServiceAccountPath)) {
  try {
    serviceAccount = JSON.parse(fs.readFileSync(altServiceAccountPath, "utf8"));
    hasServiceAccount = true;
  } catch (err) {
    console.error("❌ Failed to parse serviceAccountKey.json:", err.message);
  }
}

let adminApp;
if (serviceAccount) {
  console.log(`🔑 Firebase Admin: Using Service Account Key [${serviceAccount.project_id}]`);
  try {
    adminApp = initializeApp({
      ...firebaseAdminConfig,
      credential: cert(serviceAccount),
    });
  } catch (e) {
    adminApp = getApps()[0];
  }
} else {
  console.warn("⚠️ Firebase Admin: No service account key found! Database calls may hang locally.");
  console.warn("💡 Save your Firebase Service Account JSON file as 'firebase-service-account.json' in this directory.");
  try {
    adminApp = initializeApp(firebaseAdminConfig);
  } catch (e) {
    adminApp = getApps()[0];
  }
}

const rtdb = getDatabase(adminApp);
const storageBucket = getStorage(adminApp).bucket();

// ==========================================
// CONFIGURATION
// ==========================================
const TRON_API_KEY = "6b092603-47e5-4fdd-83cd-bfda97c6dd65";
const WALLET_ADDRESS = process.env.TRON_WALLET_ADDRESS || "TS1oHcXCVo1s4bhLzknv2WoDs83rbv5jeK";
const USDT_CONTRACT = "TR7NHqJEH7161iLpX8X";
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const LEMON_SQUEEZY_WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";

// ==========================================
// SMTP / NODEMAILER TRANSPORT (Brevo)
// ==========================================
const smtpTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const SMTP_FROM = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@goldenplayer.app";

// ==========================================
// TELEGRAM BOT
// ==========================================
const bot = TELEGRAM_TOKEN ? new TelegramBot(TELEGRAM_TOKEN, { polling: false }) : null;

const sendTelegramMsg = async (msg) => {
  if (!bot || !TELEGRAM_CHAT_ID) {
    console.log("[Telegram] Would send:", msg.substring(0, 80));
    return;
  }
  try {
    await bot.sendMessage(TELEGRAM_CHAT_ID, msg, { parse_mode: "HTML" });
  } catch (e) {
    console.error("Telegram Error:", e.message);
  }
};

// ==========================================
// HELPERS
// ==========================================
const sanitizeMac = (mac) => mac ? mac.replace(/[.#$\[\]]/g, "_").toUpperCase() : "";
const isValidMac = (mac) => {
  if (!mac || typeof mac !== "string") return false;
  return /^[0-9A-Z:\-_]{3,30}$/i.test(mac.trim());
};

const generateInvoiceNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${date}-${rand}`;
};

// ==========================================
// PUPPETEER: FIND BROWSER EXECUTABLE
// ==========================================
const findBrowserExecutable = () => {
  const candidates = [
    // Microsoft Edge (Windows)
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    // Google Chrome (Windows)
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    // Brave
    "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe",
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }
  return null;
};

// ==========================================
// PDF INVOICE GENERATOR (Puppeteer-Core)
// ==========================================
const generateInvoicePDF = async (invoiceData) => {
  const {
    invoiceNumber,
    fullName,
    email,
    mac,
    planName,
    amount,
    currency,
    paymentMethod,
    date,
    deviceKey,
  } = invoiceData;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
      background: #ffffff; 
      color: #0f172a; 
      padding: 50px; 
      -webkit-font-smoothing: antialiased; 
    }
    .page { max-width: 700px; margin: 0 auto; }
    
    /* Top Header Section */
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      margin-bottom: 40px; 
    }
    
    .brand-section { 
      display: flex; 
      flex-direction: column; 
      gap: 12px; 
    }
    
    .logo-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .logo-svg {
      width: 32px;
      height: 32px;
      color: #2563eb;
    }
    
    .company-name { 
      font-size: 1.25rem; 
      font-weight: 800; 
      letter-spacing: -0.03em;
      color: #0f172a; 
    }
    
    .sender-details { 
      font-size: 0.78rem; 
      color: #475569; 
      line-height: 1.5; 
      margin-top: 4px;
    }
    
    .invoice-meta-section { 
      text-align: right; 
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }
    
    .doc-type { 
      font-size: 1.8rem; 
      font-weight: 800; 
      letter-spacing: -0.04em; 
      color: #0f172a; 
      text-transform: uppercase;
    }
    
    .status-badge { 
      display: inline-flex; 
      align-items: center; 
      padding: 5px 12px; 
      background: #f0fdf4; 
      color: #16a34a; 
      border: 1px solid #bbf7d0; 
      border-radius: 9999px; 
      font-size: 0.75rem; 
      font-weight: 700; 
      text-transform: uppercase; 
      letter-spacing: 0.05em; 
    }

    /* Billing info / invoice summary info in columns */
    .details-grid { 
      display: grid; 
      grid-template-columns: 1.2fr 0.8fr; 
      gap: 40px; 
      margin-bottom: 35px; 
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
    }
    
    .details-col { 
      display: flex; 
      flex-direction: column; 
      gap: 12px; 
    }
    
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .meta-label { 
      font-size: 0.68rem; 
      font-weight: 800; 
      color: #64748b; 
      text-transform: uppercase; 
      letter-spacing: 0.06em; 
    }
    
    .meta-value { 
      font-size: 0.85rem; 
      color: #0f172a; 
      font-weight: 600; 
    }
    
    .meta-value.mac-addr {
      font-family: 'JetBrains Mono', monospace;
      color: #2563eb;
      font-size: 0.82rem;
    }

    /* Invoice Table */
    .items-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 24px; 
      margin-top: 10px;
    }
    
    .items-table th { 
      padding: 12px; 
      text-align: left; 
      font-size: 0.68rem; 
      font-weight: 800; 
      color: #64748b; 
      text-transform: uppercase; 
      letter-spacing: 0.06em; 
      border-bottom: 2px solid #0f172a;
    }
    
    .items-table td { 
      padding: 16px 12px; 
      border-bottom: 1px solid #e2e8f0; 
      font-size: 0.85rem; 
      color: #334155; 
      vertical-align: top;
    }
    
    .item-title { 
      font-weight: 700; 
      color: #0f172a; 
      margin-bottom: 4px;
    }
    
    .item-subtitle { 
      font-size: 0.75rem; 
      color: #64748b; 
    }

    /* Summary Table styling */
    .summary-wrapper { 
      display: flex; 
      justify-content: flex-end; 
      margin-bottom: 40px; 
    }
    
    .summary-table { 
      width: 280px; 
      border-collapse: collapse; 
    }
    
    .summary-table td { 
      padding: 8px 12px; 
      font-size: 0.85rem; 
      color: #475569; 
    }
    
    .summary-table td.amount-col {
      text-align: right;
      font-weight: 600;
      color: #0f172a;
    }
    
    .summary-table tr.total-row td { 
      border-top: 1px solid #e2e8f0;
      padding-top: 14px; 
      font-weight: 800; 
      font-size: 1.05rem; 
      color: #0f172a; 
    }
    
    .summary-table tr.total-row td.amount-col { 
      color: #2563eb;
      font-size: 1.15rem;
    }

    /* Secure Key Box */
    .credential-box { 
      background: #f8fafc; 
      border: 1px solid #e2e8f0; 
      border-radius: 12px; 
      padding: 20px; 
      margin-bottom: 40px; 
    }
    
    .cred-title { 
      font-size: 0.72rem; 
      font-weight: 800; 
      color: #0f172a; 
      margin-bottom: 10px; 
      text-transform: uppercase; 
      letter-spacing: 0.05em; 
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .cred-title svg {
      width: 14px;
      height: 14px;
      color: #16a34a;
      flex-shrink: 0;
    }
    
    .cred-value { 
      font-family: 'JetBrains Mono', monospace; 
      font-size: 0.95rem; 
      color: #0f172a; 
      font-weight: 700; 
      letter-spacing: 0.02em; 
      background: #ffffff; 
      padding: 10px 16px; 
      border-radius: 8px; 
      border: 1px solid #e2e8f0; 
      display: block; 
      text-align: center;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }
    
    /* Footer information */
    .footer { 
      text-align: center; 
      padding-top: 30px; 
      border-top: 1px solid #e2e8f0; 
      font-size: 0.72rem; 
      color: #64748b; 
      line-height: 1.6; 
    }
    
    .footer-bold { 
      color: #334155; 
      font-weight: 600;
    }
  </style>
</head>
<body>
<div class="page">
  <!-- HEADER -->
  <div class="header">
    <div class="brand-section">
      <div class="logo-container">
        <!-- Modern SVG Abstract Geometric Tech Logo -->
        <svg class="logo-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" fill="rgba(37, 99, 235, 0.08)"/>
          <line x1="12" y1="22" x2="12" y2="12.5"/>
          <line x1="2" y1="8.5" x2="12" y2="12.5"/>
          <line x1="22" y1="8.5" x2="12" y2="12.5"/>
          <polyline points="22 8.5 12 2 2 8.5"/>
        </svg>
        <span class="company-name">Golden Player</span>
      </div>
      <div class="sender-details">
        <strong>Golden Player Enterprise Ltd.</strong><br/>
        128 City Road, London, EC1V 2NX<br/>
        United Kingdom • billing@goldenplayer.app
      </div>
    </div>
    <div class="invoice-meta-section">
      <div class="doc-type">Invoice</div>
      <span class="status-badge">Paid</span>
    </div>
  </div>

  <!-- DETAILS GRID -->
  <div class="details-grid">
    <div class="details-col">
      <div class="meta-item">
        <span class="meta-label">Billed To</span>
        <span class="meta-value" style="font-size: 0.95rem; font-weight: 700;">${fullName}</span>
        <span class="meta-value" style="font-size: 0.8rem; font-weight: 500; color: #475569; margin-top: 1px;">${email}</span>
      </div>
      <div class="meta-item" style="margin-top: 6px;">
        <span class="meta-label">Assigned Node MAC</span>
        <span class="meta-value mac-addr">${mac}</span>
      </div>
    </div>
    <div class="details-col">
      <div class="meta-item">
        <span class="meta-label">Invoice Number</span>
        <span class="meta-value" style="font-family: 'JetBrains Mono', monospace; font-size: 0.82rem;">${invoiceNumber}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Date Issued</span>
        <span class="meta-value">${date}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Payment Method</span>
        <span class="meta-value">${paymentMethod}</span>
      </div>
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 55%;">Item Description</th>
        <th style="width: 25%; text-align: right;">Unit Price</th>
        <th style="width: 20%; text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div class="item-title">${planName}</div>
          <div class="item-subtitle">Software Node License Pair bound to MAC ${mac}</div>
        </td>
        <td style="text-align: right; font-weight: 500;">${amount} ${currency}</td>
        <td style="text-align: right; font-weight: 700; color: #0f172a;">${amount} ${currency}</td>
      </tr>
    </tbody>
  </table>

  <!-- TOTAL SUMMARY -->
  <div class="summary-wrapper">
    <table class="summary-table">
      <tbody>
        <tr>
          <td>Subtotal</td>
          <td class="amount-col">${amount} ${currency}</td>
        </tr>
        <tr>
          <td>VAT / Sales Tax (0%)</td>
          <td class="amount-col" style="color: #64748b;">0.00 ${currency}</td>
        </tr>
        <tr class="total-row">
          <td>Total Paid</td>
          <td class="amount-col">${amount} ${currency}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ACTIVATION CREDENTIAL -->
  ${deviceKey ? `
  <div class="credential-box">
    <div class="cred-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      Node Activation License Key
    </div>
    <div class="cred-value">${deviceKey}</div>
  </div>
  ` : ""}

  <!-- FOOTER -->
  <div class="footer">
    <span class="footer-bold">Golden Player Enterprise Ltd.</span> Registered in England & Wales. Company No. 13829102.<br/>
    This document serves as an official receipt of transaction payment. Credit balance auto-allocated directly to Node MAC.<br/>
    Need support? Contact <span class="footer-bold">billing@goldenplayer.app</span> or your network administrator.
  </div>
</div>
</body>
</html>`;

  const execPath = findBrowserExecutable();
  if (!execPath) {
    console.warn("⚠️ No browser found for Puppeteer-Core. PDF generation skipped.");
    return null;
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: execPath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return pdfBuffer;
  } catch (err) {
    console.error("Puppeteer PDF Error:", err.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
};

// ==========================================
// UPLOAD PDF TO FIREBASE STORAGE
// ==========================================
const uploadInvoicePDF = async (pdfBuffer, invoiceNumber) => {
  if (!pdfBuffer) return null;
  try {
    const filename = `invoices/${invoiceNumber}.pdf`;
    const file = storageBucket.file(filename);
    await file.save(pdfBuffer, {
      metadata: { contentType: "application/pdf" },
    });
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${storageBucket.name}/${filename}`;
    return publicUrl;
  } catch (err) {
    console.error("Storage Upload Error:", err.message);
    return null;
  }
};

// ==========================================
// SEND INVOICE EMAIL (Nodemailer + Brevo)
// ==========================================
const sendInvoiceEmail = async ({ email, fullName, mac, planName, amount, currency, invoiceNumber, invoiceUrl, deviceKey, pdfBuffer }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("⚠️ SMTP not configured — skipping email dispatch.");
    return;
  }

  const htmlBody = `
  <div style="font-family:'Segoe UI',Arial,sans-serif;background:#0b1120;color:#e2e8f0;padding:40px;max-width:600px;margin:0 auto;border-radius:20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:2.5rem;margin-bottom:8px;">⚡</div>
      <h1 style="color:#f8fafc;font-size:1.5rem;font-weight:900;margin:0;">Your License is Active!</h1>
      <p style="color:#64748b;font-size:0.9rem;margin-top:8px;">Invoice ${invoiceNumber} — Payment Confirmed</p>
    </div>
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:24px;margin-bottom:20px;">
      <p style="color:#94a3b8;font-size:0.85rem;margin-bottom:4px;">Hello,</p>
      <p style="color:#e2e8f0;font-size:0.95rem;"><strong>${fullName}</strong>, your payment for <strong style="color:#38bdf8;">${planName}</strong> has been received and confirmed.</p>
    </div>
    ${deviceKey ? `
    <div style="background:rgba(16,185,129,0.1);border:1.5px solid rgba(16,185,129,0.3);border-radius:14px;padding:24px;margin-bottom:20px;">
      <p style="color:#10b981;font-size:0.7rem;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">🔑 Your Node Activation Key</p>
      <p style="font-family:'Courier New',monospace;font-size:1.1rem;color:#f8fafc;font-weight:700;letter-spacing:0.05em;background:rgba(0,0,0,0.3);padding:12px 16px;border-radius:10px;">${deviceKey}</p>
      <p style="color:#64748b;font-size:0.75rem;margin-top:10px;">Node MAC Address: <code style="color:#94a3b8;">${mac}</code></p>
    </div>` : ""}
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:0.8rem;">Plan</td><td style="padding:6px 0;color:#f1f5f9;font-weight:700;text-align:right;">${planName}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:0.8rem;">Amount Paid</td><td style="padding:6px 0;color:#10b981;font-weight:900;text-align:right;">${amount} ${currency}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:0.8rem;">Invoice #</td><td style="padding:6px 0;color:#38bdf8;font-weight:700;text-align:right;">${invoiceNumber}</td></tr>
      </table>
    </div>
    ${invoiceUrl ? `<div style="text-align:center;margin-bottom:24px;"><a href="${invoiceUrl}" style="background:linear-gradient(135deg,#38bdf8,#818cf8);color:#0b1120;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:900;font-size:0.9rem;">📄 Download Invoice PDF</a></div>` : ""}
    <p style="color:#475569;font-size:0.75rem;text-align:center;">Golden Player Enterprise • Please keep this email for your records.</p>
  </div>`;

  const mailOptions = {
    from: `"Golden Player" <${SMTP_FROM}>`,
    to: email,
    subject: `✅ License Activated — Invoice ${invoiceNumber}`,
    html: htmlBody,
    attachments: pdfBuffer ? [{
      filename: `${invoiceNumber}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    }] : [],
  };

  try {
    await smtpTransport.sendMail(mailOptions);
    console.log(`📧 Invoice email sent to ${email}`);
  } catch (err) {
    console.error("Email dispatch error:", err.message);
  }
};

// ==========================================
// CORE: PROCESS APPROVED PAYMENT → INVOICE → EMAIL
// ==========================================
const processApprovedPayment = async (req) => {
  try {
    const mac = sanitizeMac(req.mac || "");
    const invoiceNumber = generateInvoiceNumber();
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });

    // Determine plan name from coins amount
    const planNames = { 1: "Evaluation License (24h)", 10: "Standard Annual License (1 Year)", 20: "Perpetual Enterprise License (Lifetime)" };
    const planName = planNames[req.coins] || `${req.coins}-Credit License Package`;
    const currency = req.method?.includes("Crypto") ? "USDT" : "EUR";

    // Fetch device key
    let deviceKey = null;
    try {
      const devSnap = await rtdb.ref(`devices/${mac}`).get();
      if (devSnap.exists()) deviceKey = devSnap.val().deviceKey || null;
    } catch {}

    // Generate PDF
    const invoiceData = {
      invoiceNumber,
      fullName: req.fullName || "Customer",
      email: req.email || "",
      mac,
      planName,
      amount: req.amount || 0,
      currency,
      paymentMethod: req.method || "Bank Transfer",
      date: dateStr,
      deviceKey,
    };

    const pdfBuffer = await generateInvoicePDF(invoiceData);
    const invoiceUrl = await uploadInvoicePDF(pdfBuffer, invoiceNumber);

    // Save invoice metadata to RTDB
    await rtdb.ref("invoices").push({
      invoiceNumber,
      mac,
      fullName: req.fullName || "Customer",
      email: req.email || "",
      planName,
      amount: req.amount || 0,
      currency,
      paymentMethod: req.method || "Bank Transfer",
      date: now.toISOString(),
      invoiceUrl: invoiceUrl || null,
      status: "Paid",
    });

    // If a database path was provided, associate the invoice details directly with the order/request record too
    if (req.dbPath) {
      try {
        await rtdb.ref(req.dbPath).update({
          invoiceUrl: invoiceUrl || null,
          invoiceNumber: invoiceNumber
        });
        console.log(`💾 Associated invoice ${invoiceNumber} directly with payment request at ${req.dbPath}`);
      } catch (dbErr) {
        console.error(`❌ Failed to update request record with invoiceUrl:`, dbErr.message);
      }
    }

    // Send email
    if (req.email) {
      await sendInvoiceEmail({
        email: req.email,
        fullName: req.fullName || "Customer",
        mac,
        planName,
        amount: req.amount || 0,
        currency,
        invoiceNumber,
        invoiceUrl,
        deviceKey,
        pdfBuffer,
      });
    }

    console.log(`✅ Invoice processed: ${invoiceNumber} for MAC: ${mac}`);
  } catch (err) {
    console.error("processApprovedPayment error:", err.message);
  }
};

// ==========================================
// EXPRESS SERVER SETUP
// ==========================================
const server = express();
server.use(cors());

// Rate Limiter for Activation Endpoint
const activateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many activation attempts. Please try again later." }
});

// ─── Lemon Squeezy Webhook ───────────────────────────────────────────────────
server.post("/webhook/lemonsqueezy", bodyParser.raw({ type: "application/json" }), async (req, res) => {
  res.status(200).send("OK");
  try {
    const signature = req.get("X-Signature");
    const hmac = crypto.createHmac("sha256", LEMON_SQUEEZY_WEBHOOK_SECRET);
    const digest = Buffer.from(hmac.update(req.body).digest("hex"), "utf8");
    const signatureBuffer = Buffer.from(signature || "", "utf8");
    if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
      console.error("❌ Invalid Lemon Squeezy Signature");
      return;
    }
    const payload = JSON.parse(req.body.toString());
    if (payload.meta.event_name === "order_created") {
      const mac = payload.meta.custom_data?.mac;
      if (!mac || !isValidMac(mac)) return;
      const sanitizedMac = sanitizeMac(mac);
      const amountPaidCents = payload.data.attributes.total;
      const coinsToAdd = Math.floor(amountPaidCents / 100);
      const devRef = rtdb.ref(`devices/${sanitizedMac}`);
      const devSnap = await devRef.get();
      await devRef.update({ coins: (devSnap.exists() ? devSnap.val().coins || 0 : 0) + coinsToAdd });
      await processApprovedPayment({
        mac: sanitizedMac,
        fullName: payload.data.attributes.user_name || "Customer",
        email: payload.data.attributes.user_email || "",
        coins: coinsToAdd,
        amount: (amountPaidCents / 100).toFixed(2),
        method: "Credit Card (Lemon Squeezy)",
      });
      await sendTelegramMsg(`🍋 <b>Lemon Squeezy Payment</b>\n<b>MAC:</b> <code>${mac}</code>\n<b>Amount:</b> ${(amountPaidCents/100).toFixed(2)} EUR\n<b>Coins:</b> ${coinsToAdd}`);
    }
  } catch (err) {
    console.error("LS Webhook error:", err.message);
  }
});

// Regular JSON middleware
server.use(express.json({ limit: "10mb" }));

// ─── Admin: Approve Manual Payment Request ───────────────────────────────────
server.post("/api/admin/approve-request", async (req, res) => {
  const { requestId, db: dbType } = req.body;
  if (!requestId) return res.status(400).json({ success: false, message: "requestId required" });

  if (!hasServiceAccount && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.K_SERVICE) {
    return res.status(500).json({
      success: false,
      message: "Firebase Service Account Key is missing on the server. Please download 'firebase-service-account.json' from your Firebase Console (Project Settings -> Service accounts), place it in the backend root directory, and restart the backend."
    });
  }

  try {
    const dbPath = dbType === "rtdb_manual" ? `payment_requests/${requestId}` : `pending_payments/${requestId}`;
    const snap = await rtdb.ref(dbPath).get();
    if (!snap.exists()) return res.status(404).json({ success: false, message: "Request not found" });

    const reqData = snap.val();
    const mac = sanitizeMac(reqData.mac || "");
    const coinsToAdd = reqData.coins || 10;

    // Credit coins
    const balSnap = await rtdb.ref(`users_balance/${mac}`).get();
    await rtdb.ref(`users_balance/${mac}`).update({
      coins: (balSnap.exists() ? balSnap.val().coins || 0 : 0) + coinsToAdd
    });

    // Update request status
    await rtdb.ref(dbPath).update({ status: "Approved" });

    // Generate invoice + send email - passing requestId and dbPath so it saves there
    await processApprovedPayment({ ...reqData, mac, requestId, dbPath });

    // Telegram alert
    await sendTelegramMsg(
      `✅ <b>Admin Approved Payment</b>\n<b>MAC:</b> <code>${reqData.mac}</code>\n<b>Coins:</b> +${coinsToAdd}\n<b>Customer:</b> ${reqData.fullName || "N/A"}`
    );

    return res.json({ success: true, message: `Approved +${coinsToAdd} coins to ${mac}` });
  } catch (err) {
    console.error("Approve error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Admin: Decline Manual Payment Request ───────────────────────────────────
server.post("/api/admin/decline-request", async (req, res) => {
  const { requestId, db: dbType } = req.body;
  if (!requestId) return res.status(400).json({ success: false, message: "requestId required" });

  if (!hasServiceAccount && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.K_SERVICE) {
    return res.status(500).json({
      success: false,
      message: "Firebase Service Account Key is missing on the server. Please download 'firebase-service-account.json' from your Firebase Console (Project Settings -> Service accounts), place it in the backend root directory, and restart the backend."
    });
  }

  try {
    const dbPath = dbType === "rtdb_manual" ? `payment_requests/${requestId}` : `pending_payments/${requestId}`;
    await rtdb.ref(dbPath).update({ status: "Declined" });

    const snap = await rtdb.ref(dbPath).get();
    const reqData = snap.val() || {};

    await sendTelegramMsg(
      `❌ <b>Admin Declined Payment</b>\n<b>MAC:</b> <code>${reqData.mac || "??"}</code>\n<b>Customer:</b> ${reqData.fullName || "N/A"}`
    );

    return res.json({ success: true, message: "Request declined." });
  } catch (err) {
    console.error("Decline error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Admin: Generate Invoice PDF On-Demand ──────────────────────────────
server.post("/api/admin/generate-invoice-pdf-on-demand", async (req, res) => {
  const { invoiceId, requestId, db: dbType } = req.body;
  if (!invoiceId && !requestId) {
    return res.status(400).json({ success: false, message: "invoiceId or requestId required" });
  }

  if (!hasServiceAccount && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.K_SERVICE) {
    return res.status(500).json({
      success: false,
      message: "Firebase Service Account Key is missing on the server."
    });
  }

  try {
    let invData = null;
    let invRef = null;
    let targetInvoiceId = invoiceId;

    if (invoiceId) {
      invRef = rtdb.ref(`invoices/${invoiceId}`);
      const invSnap = await invRef.get();
      if (!invSnap.exists()) return res.status(404).json({ success: false, message: "Invoice not found" });
      invData = invSnap.val();
    } else {
      // Find if we already have an invoice for this payment request
      const dbPath = dbType === "rtdb_manual" ? `payment_requests/${requestId}` : `pending_payments/${requestId}`;
      const reqSnap = await rtdb.ref(dbPath).get();
      if (!reqSnap.exists()) return res.status(404).json({ success: false, message: "Payment request not found" });
      const reqData = reqSnap.val();
      
      const mac = sanitizeMac(reqData.mac || "");
      
      // Look if an invoice already exists for this MAC and amount/date
      const invsSnap = await rtdb.ref("invoices").get();
      let matchedInvId = null;
      if (invsSnap.exists()) {
        const invoices = invsSnap.val();
        for (const [id, inv] of Object.entries(invoices)) {
          if (
            sanitizeMac(inv.mac) === mac &&
            Math.abs(Number(inv.amount) - Number(reqData.amount)) < 0.01 &&
            Math.abs(new Date(inv.date) - new Date(reqData.timestamp)) < 24 * 60 * 60 * 1000
          ) {
            matchedInvId = id;
            invData = inv;
            break;
          }
        }
      }

      if (matchedInvId) {
        targetInvoiceId = matchedInvId;
        invRef = rtdb.ref(`invoices/${matchedInvId}`);
      } else {
        // Create new invoice record in database
        const invoiceNumber = generateInvoiceNumber();
        const planNames = { 1: "Evaluation License (24h)", 10: "Standard Annual License (1 Year)", 20: "Perpetual Enterprise License (Lifetime)" };
        const planName = planNames[reqData.coins] || `${reqData.coins}-Credit License Package`;
        const currency = reqData.method?.includes("Crypto") ? "USDT" : "EUR";
        
        const newInvRef = rtdb.ref("invoices").push();
        targetInvoiceId = newInvRef.key;
        invRef = newInvRef;
        
        invData = {
          invoiceNumber,
          mac,
          fullName: reqData.fullName || "Customer",
          email: reqData.email || "",
          planName,
          amount: reqData.amount || 0,
          currency,
          paymentMethod: reqData.method || "Bank Transfer",
          date: new Date(reqData.timestamp || Date.now()).toISOString(),
          status: "Paid",
        };
        await invRef.set(invData);
      }
    }

    // Now we have invData and invRef. If it already has an invoiceUrl, return it
    if (invData.invoiceUrl) {
      return res.json({ success: true, invoiceUrl: invData.invoiceUrl });
    }

    const mac = sanitizeMac(invData.mac || "");
    
    // Fetch device key if available
    let deviceKey = null;
    try {
      const devSnap = await rtdb.ref(`devices/${mac}`).get();
      if (devSnap.exists()) deviceKey = devSnap.val().deviceKey || null;
    } catch {}

    // Prepare date
    const dateStr = invData.date 
      ? new Date(invData.date).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
      : new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });

    const pdfBuffer = await generateInvoicePDF({
      invoiceNumber: invData.invoiceNumber,
      fullName: invData.fullName,
      email: invData.email,
      mac,
      planName: invData.planName,
      amount: invData.amount,
      currency: invData.currency,
      paymentMethod: invData.paymentMethod,
      date: dateStr,
      deviceKey,
    });

    if (!pdfBuffer) {
      return res.status(500).json({ success: false, message: "Failed to generate PDF buffer" });
    }

    const invoiceUrl = await uploadInvoicePDF(pdfBuffer, invData.invoiceNumber);
    if (!invoiceUrl) {
      return res.status(500).json({ success: false, message: "Failed to upload PDF to storage" });
    }

    // Save back to invoice record
    await invRef.update({ invoiceUrl });

    // Also update the source payment request / pending payment if applicable
    if (requestId && dbType) {
      const dbPath = dbType === "rtdb_manual" ? `payment_requests/${requestId}` : `pending_payments/${requestId}`;
      await rtdb.ref(dbPath).update({
        invoiceUrl,
        invoiceNumber: invData.invoiceNumber
      });
    } else {
      // Find matching payment request / pending payment to link retroactively
      try {
        const reqsSnap = await rtdb.ref("payment_requests").get();
        if (reqsSnap.exists()) {
          const reqs = reqsSnap.val();
          for (const [key, val] of Object.entries(reqs)) {
            if (
              sanitizeMac(val.mac) === mac &&
              Math.abs(Number(val.amount) - Number(invData.amount)) < 0.01 &&
              val.status === "Approved"
            ) {
              await rtdb.ref(`payment_requests/${key}`).update({
                invoiceUrl,
                invoiceNumber: invData.invoiceNumber
              });
              break;
            }
          }
        }
      } catch (err) {}
    }

    return res.json({ success: true, invoiceUrl });
  } catch (err) {
    console.error("Generate on-demand error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});


// ─── Create Checkout (Lemon Squeezy) ─────────────────────────────────────────
server.post("/api/create-checkout", async (req, res) => {
  const { mac, coins } = req.body;
  if (!mac || !isValidMac(mac)) return res.status(400).json({ success: false, message: "Invalid MAC Address Format" });
  const variants = {
    1: process.env.LEMON_SQUEEZY_VARIANT_1 || "12345",
    10: process.env.LEMON_SQUEEZY_VARIANT_10 || "67890",
    20: process.env.LEMON_SQUEEZY_VARIANT_20 || "54321",
  };
  const variantId = variants[coins];
  if (!variantId) return res.status(400).json({ success: false, message: "Invalid Package Selected" });
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  if (!storeId || !apiKey) return res.status(500).json({ success: false, message: "Payment system not fully configured." });
  try {
    const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: { checkout_data: { custom: { mac } } },
          relationships: {
            store: { data: { type: "stores", id: storeId } },
            variant: { data: { type: "variants", id: variantId.toString() } },
          },
        },
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.data) return res.status(500).json({ success: false, message: "Failed to generate checkout link." });
    return res.json({ success: true, url: data.data.attributes.url });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// ─── Activation Endpoint ──────────────────────────────────────────────────────
server.post("/api/activate", activateLimiter, async (req, res) => {
  const { mac } = req.body;
  if (!mac || !isValidMac(mac)) return res.status(400).json({ success: false, message: "Invalid MAC Address Format" });

  if (!hasServiceAccount && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.K_SERVICE) {
    return res.status(500).json({
      success: false,
      message: "Firebase Service Account Key is missing on the server. Please download 'firebase-service-account.json' from your Firebase Console, place it in the backend root directory, and restart the backend."
    });
  }

  const sanitizedMac = sanitizeMac(mac);
  try {
    const devRef = rtdb.ref(`devices/${sanitizedMac}`);
    const devSnap = await devRef.get();
    if (!devSnap.exists() || (devSnap.val().coins || 0) < 10) {
      return res.status(400).json({ success: false, message: "Insufficient Credits or Device Not Found" });
    }
    const randomSegment = () => crypto.randomBytes(2).toString("hex").toUpperCase();
    const generatedLicense = `GP-${randomSegment()}-${randomSegment()}-${randomSegment()}`;
    const now = Date.now();
    const oneYearFromNow = now + 365 * 24 * 60 * 60 * 1000;
    await devRef.update({
      coins: devSnap.val().coins - 10,
      status: "Active",
      activationDate: now,
      expiryDate: new Date(oneYearFromNow).toISOString(),
      lastPlan: "1YEAR",
      licenseKey: generatedLicense,
    });
    await sendTelegramMsg(`✅ <b>License Activated</b>\n<b>MAC:</b> <code>${mac}</code>\n<b>License:</b> <code>${generatedLicense}</code>`);
    return res.json({ success: true, license: generatedLicense, message: "License Activated Successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// ==========================================
// FIREBASE RTDB LISTENERS (Crypto auto-detection)
// ==========================================
const processedCryptoTxIds = new Set();

const checkTronTransaction = async (reqId, req) => {
  if (!req.amount) return;
  try {
    const url = `https://api.trongrid.io/v1/accounts/${WALLET_ADDRESS}/transactions/trc20?contract_address=${USDT_CONTRACT}&only_confirmed=true&limit=20`;
    const response = await fetch(url, { headers: { "TRON-PRO-API-KEY": TRON_API_KEY } });
    if (!response.ok) return;
    const data = await response.json();
    if (!data.data) return;
    const expectedValue = Math.floor(req.amount * 1000000).toString();
    const match = data.data.find(tx =>
      tx.to === WALLET_ADDRESS &&
      tx.value === expectedValue &&
      tx.token_info?.symbol === "USDT" &&
      new Date(tx.block_timestamp).getTime() > new Date(req.timestamp).getTime() - 3600000 &&
      !processedCryptoTxIds.has(tx.transaction_id)
    );
    if (match) {
      processedCryptoTxIds.add(match.transaction_id);
      const mac = sanitizeMac(req.mac || "");
      const coinsToAdd = req.coins || 10;
      const balSnap = await rtdb.ref(`users_balance/${mac}`).get();
      await rtdb.ref(`users_balance/${mac}`).update({ coins: (balSnap.exists() ? balSnap.val().coins || 0 : 0) + coinsToAdd });
      await rtdb.ref(`payment_requests/${reqId}`).update({ status: "Approved (Auto)" });
      await processApprovedPayment({ ...req, mac, requestId: reqId, dbPath: `payment_requests/${reqId}` });
      await sendTelegramMsg(
        `✅ <b>Crypto Payment Auto-Approved</b>\n<b>MAC:</b> <code>${req.mac}</code>\n<b>Amount:</b> ${req.amount} USDT\n<b>TxID:</b> <code>${match.transaction_id.substring(0, 16)}...</code>`
      );
    }
  } catch (err) {
    console.error("TronGrid Error:", err.message);
  }
};

// Poll pending crypto payments every 30s
setInterval(async () => {
  if (!hasServiceAccount && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.K_SERVICE) {
    return;
  }
  try {
    const snap = await rtdb.ref("payment_requests").get();
    if (!snap.exists()) return;
    const requests = snap.val();
    for (const [id, req] of Object.entries(requests)) {
      if (req.status === "Pending_Crypto") checkTronTransaction(id, req);
    }
  } catch {}
}, 30000);

// Notify Telegram on new bank transfer requests
const notifiedRequests = new Set();
if (hasServiceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE) {
  rtdb.ref("payment_requests").on("value", async (snapshot) => {
    if (!snapshot.exists()) return;
    const requests = snapshot.val();
    for (const [id, req] of Object.entries(requests)) {
      if (req.status === "Pending" && req.method?.includes("Bank") && !notifiedRequests.has(id)) {
        notifiedRequests.add(id);
        await sendTelegramMsg(
          `🏦 <b>New Bank Transfer Request</b>\n<b>MAC:</b> <code>${req.mac}</code>\n<b>Customer:</b> ${req.fullName || "N/A"}\n<b>Email:</b> ${req.email || "N/A"}\n<b>Amount:</b> ${req.amount || "?"} EUR\n<a href="${req.imageUrl}">View Receipt</a>`
        );
      }
    }
  });
}

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Backend Server running on http://localhost:${PORT}`);
  console.log("📄 Invoice Engine: Puppeteer-Core (system Edge/Chrome)");
  console.log("📧 Email Engine: Nodemailer →", process.env.SMTP_HOST || "smtp-relay.brevo.com");
  console.log("📡 Endpoints: /api/admin/approve-request | /api/admin/decline-request | /api/activate");
});
