function generateDeterministicDeviceKey(macAddress) {
  const salt = "GoldenPlayer2026SecretSalt";
  const input = macAddress.trim().toUpperCase() + salt;
  // FNV-1a 32-bit hash
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  let unsignedHash = hash >>> 0;
  for (let i = 0; i < 6; i++) {
    const index = unsignedHash % chars.length;
    key += chars[index];
    unsignedHash = Math.floor(unsignedHash / chars.length);
  }
  return key;
}

console.log("6A:DD:F6:02:6C:A4 ->", generateDeterministicDeviceKey("6A:DD:F6:02:6C:A4"));
console.log("AA:BB:CC:DD:EE:FF ->", generateDeterministicDeviceKey("AA:BB:CC:DD:EE:FF"));
