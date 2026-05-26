import fs from "fs";
import path from "path";

const logcatPath = "c:\\Users\\pc\\AndroidStudioProjects\\Golden_Player 2026\\logcat.txt";

if (!fs.existsSync(logcatPath)) {
  console.error("❌ logcat.txt not found!");
  process.exit(1);
}

console.log("Analyzing logcat.txt (32MB)...");

const lines = fs.readFileSync(logcatPath, "utf8").split("\n");
console.log(`Total lines in logcat: ${lines.length}`);

const keywords = ["DeviceActivation", "DatabaseError", "Firebase", "devices/"];
const matches = [];

// Search from the end of the file backwards to get the most recent logs
for (let i = lines.length - 1; i >= 0; i--) {
  const line = lines[i];
  if (keywords.some(kw => line.includes(kw))) {
    matches.push({ lineNum: i + 1, content: line.trim() });
    if (matches.length >= 100) break; // limit to 100 matches
  }
}

console.log(`\nFound ${matches.length} recent matching log lines (newest first):\n`);
matches.forEach(m => {
  console.log(`[Line ${m.lineNum}] ${m.content}`);
});
