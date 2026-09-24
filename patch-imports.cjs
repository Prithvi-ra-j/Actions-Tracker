const fs = require('fs');
let content = fs.readFileSync('src/components/JarvisTabLogic.txt', 'utf8');
content = content.replace(
  "import { recordAppError } from '../core/errorLogger.js';",
  "import { recordAppError } from '../core/errorLogger.js';\nimport { BottomSheet } from './ui/Overlays.jsx';\nimport { ActionProposalCard, ImpactDetailSheet, EditProposalSheet } from './ui/ProposalUI.jsx';"
);
fs.writeFileSync('src/components/JarvisTabLogic.txt', content);
console.log('Done');
