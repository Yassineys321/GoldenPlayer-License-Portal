// MAC Address normalization logic check
const sanitizeMac = (mac) => {
  if (!mac || typeof mac !== "string") return "";
  let clean = mac.trim().toUpperCase().replace(/[-_]/g, ":");
  if (/^[0-9A-Z]{12}$/.test(clean)) {
    clean = clean.match(/.{1,2}/g).join(":");
  }
  return clean.replace(/[.#$\[\]]/g, "");
};

const tests = [
  { input: "6A_DD_F6_02_6C_A4", expected: "6A:DD:F6:02:6C:A4" },
  { input: "6a-dd-f6-02-6c-a4", expected: "6A:DD:F6:02:6C:A4" },
  { input: "6ADDF6026CA4", expected: "6A:DD:F6:02:6C:A4" },
  { input: "6A:DD:F6:02:6C:A4", expected: "6A:DD:F6:02:6C:A4" },
  { input: "  6a_dd_f6_02_6c_a4  ", expected: "6A:DD:F6:02:6C:A4" },
];

let failed = 0;
for (const test of tests) {
  const result = sanitizeMac(test.input);
  if (result === test.expected) {
    console.log(`✅ Passed: "${test.input}" -> "${result}"`);
  } else {
    console.log(`❌ Failed: "${test.input}" -> expected "${test.expected}", got "${result}"`);
    failed++;
  }
}

if (failed === 0) {
  console.log("\n🎉 All normalization tests passed successfully!");
} else {
  console.log(`\n⚠️ ${failed} tests failed.`);
  process.exit(1);
}
