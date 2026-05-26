import crypto from "crypto";

function generateDeterministicDeviceKey(macAddress) {
    const salt = "GoldenPlayer2026SecretSalt";
    const input = macAddress.trim().toUpperCase() + salt;
    const hash = crypto.createHash("sha256").update(input).digest();
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let key = "";
    for (let i = 0; i < 6; i++) {
        const byteVal = hash[i] & 0xFF;
        const index = byteVal % chars.length;
        key += chars[index];
    }
    return key;
}

const mac = "6A:DD:F6:02:6C:A4";
console.log("Deterministic key for MAC:", mac, "is:", generateDeterministicDeviceKey(mac));
