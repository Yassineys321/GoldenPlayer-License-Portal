# Golden Player Platform - Centralized License & Activation Management Portal

A secure, enterprise-grade web dashboard and automated license provisioning system designed for the **Golden Player** software ecosystem. This platform serves as the central administrative hub to manage software licenses, hardware node bindings, and automated transaction invoicing.

This project is built with security, scalability, and transparency in mind, ensuring a seamless compliance flow for both users and payment processors.

---

## 🚀 Key Features

- **Uninstall-Proof Hardware Binding:** Tries a secure 1:1 hardware relationship by binding unique device IDs (MAC Addresses) with persistent backend-generated `Device Keys`.
- **Real-Time Status Polling:** Fully integrated with a high-performance background polling system (5-second intervals) enabling instant, over-the-air (OTA) application unlocking upon activation.
- **Automated Invoicing System:** Generates comprehensive transaction records containing user credentials, purchased software tiers, and cryptographic transaction keys for 100% financial clarity.
- **Content-Neutral Architecture:** A pure utility platform. The system does not host, stream, bundle, or distribute any media content or playlists. It strictly manages software licenses.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, Tailwind CSS (Premium Dark/Gold UI Concept)
- **Backend / Database:** Firebase Firestore (Real-time NoSQL Database)
- **Network Architecture:** High-throughput lightweight HTTP REST API endpoints optimized for low-latency synchronization.

---

## 📦 System Architecture & Workflow

1. **Hardware Handshake:** The client application transmits the device's MAC Address upon initialization.
2. **Database Lookup (Upsert Logic):** - If the device exists, the portal retrieves the persistent `Device Key` and licensing state (`active`/`inactive`).
   - If the device is new, the system generates a unique key, registers it as `inactive`, and initializes a secure document entry.
3. **Instant Provisioning:** Once a license is purchased via our payment gateway, the backend toggles the database state, instantly triggering the client app to unlock via real-time listeners.

---

## 📜 Compliance & Transparency

We strictly adhere to global digital compliance regulations:
- **No Content Hosting:** This repository contains zero media streaming code, M3U parsers, or content indexers.
- **Financial Clarity:** Every subscription tier triggers a transparent webhook mapping the transaction seamlessly to our ledger and automated invoicing modules.

---

## 🔧 Installation & Staging Setup

To run the dashboard environment locally for evaluation:

```bash
# Clone the repository
git clone [https://github.com/Yassineqarbal/Golden_Player_Platform.git](https://github.com/Yassineqarbal/Golden_Player_Platform.git)

# Navigate to the directory
cd Golden_Player_Platform

# Install dependencies
npm install

# Start the local development server
npm run start
