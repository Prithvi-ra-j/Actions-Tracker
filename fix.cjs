const fs = require('fs');

const files = [
  'src/components/TodayTab.jsx',
  'src/components/StatsTab.jsx',
  'src/components/GoalsTab.jsx',
  'src/components/ui/Cards.jsx',
  'src/components/ui/Headers.jsx',
  'src/components/ui/States.jsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    // Replace \` with `
    let newContent = content.replace(/\\`/g, '`');
    // Replace \$ with $
    newContent = newContent.replace(/\\\$/g, '$');
    
    if (newContent !== content) {
      fs.writeFileSync(f, newContent);
      console.log('Fixed', f);
    }
  }
});
