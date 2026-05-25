const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, '..', 'src', 'pages');

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Replace inline styles: fontWeight: 800 -> fontWeight: 600, fontWeight: 900 -> fontWeight: 600
      const regex = /fontWeight:\s*(800|900|'800'|'900'|"800"|"900")/g;
      if (regex.test(content)) {
        content = content.replace(regex, (match, p1) => {
          const quote = p1.startsWith("'") ? "'" : p1.startsWith('"') ? '"' : '';
          return `fontWeight: ${quote}600${quote}`;
        });
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated typography weights in ${path.relative(path.join(__dirname, '..'), fullPath)}`);
      }
    }
  }
}

processDirectory(directory);
console.log('Typography softening complete!');
