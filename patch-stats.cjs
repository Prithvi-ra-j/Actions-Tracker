const fs = require('fs');

let content = fs.readFileSync('src/components/StatsTab.jsx', 'utf8');
content = content.replace(
  'export default function StatsTab({ t, dark, stats, axisDetails, snapshot, allQuests, allLogs, axisConfigs }) {',
  'export default function StatsTab({ t, dark, stats, axisDetails, snapshot, allQuests, allLogs, axisConfigs, onOpenJarvis }) {'
);

content = content.replace(
  `onClick={() => console.log('Jarvis prompt: Why is my score this low for axis', selectedAxis)}`,
  `onClick={() => onOpenJarvis({ page: 'stats', entityType: 'axis', entityId: selectedAxis, payload: { details: axisDetails[selectedAxis] } })}`
);
fs.writeFileSync('src/components/StatsTab.jsx', content);

let today = fs.readFileSync('src/components/TodayTab.jsx', 'utf8');
today = today.replace(
  '  onGoToGoals\n}) {',
  '  onGoToGoals,\n  onOpenJarvis\n}) {'
);
today = today.replace(
  `onClick={() => console.log('Jarvis prompt: Adjust my routine')}`,
  `onClick={() => onOpenJarvis({ page: 'today', payload: 'adjust_routine' })}`
);
fs.writeFileSync('src/components/TodayTab.jsx', today);
console.log('Done patch');
