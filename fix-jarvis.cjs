const fs = require('fs');
let content = fs.readFileSync('src/components/JarvisTab.jsx', 'utf8');

// The original line is: const match = value.match(/^/([^s]*)$/);
content = content.replace(
  'const match = value.match(/^/([^s]*)$/);',
  'const match = value.match(/^\\/([^\\s]*)$/);'
);

// The next line is: if (value.startsWith('/') && !value.includes('n')) {
content = content.replace(
  "if (value.startsWith('/') && !value.includes('n')) {",
  "if (value.startsWith('/') && !value.includes('\\n')) {"
);

fs.writeFileSync('src/components/JarvisTab.jsx', content);
console.log('Fixed JarvisTab regex');
