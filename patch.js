const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const target1 = `  function handleTabChange(id) {
    setTab(id);
    setShowSettings(false);
    setShowNavDrawer(false);
  }`;

const replacement1 = `  function handleTabChange(id) {
    setTab(id);
    setShowSettings(false);
    setShowNavDrawer(false);
  }

  const handleOpenJarvis = useCallback((context) => {
    if (typeof context === 'string') {
      setJarvisContext({ page: context });
    } else {
      setJarvisContext(context);
    }
    setTab('jarvis');
    setShowSettings(false);
    setShowNavDrawer(false);
  }, []);`;

content = content.replace(target1, replacement1);

const target2 = `onOpenJarvis={(current) => handleTabChange('jarvis')}`;
const replacement2 = `onOpenJarvis={handleOpenJarvis}`;

content = content.replace(target2, replacement2);

fs.writeFileSync('src/App.jsx', content);
console.log('Done!');
