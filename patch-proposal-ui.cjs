const fs = require('fs');
let content = fs.readFileSync('src/components/ui/ProposalUI.jsx', 'utf8');
content = content.replace(
  "import { Card, EntityRow, Button, IconButton, Chip } from './Cards';",
  "import { Card, EntityRow } from './Cards';\nimport { Button, IconButton, Chip } from './Buttons';"
);
fs.writeFileSync('src/components/ui/ProposalUI.jsx', content);
console.log('Fixed ProposalUI');
