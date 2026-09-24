const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Remove USE_REDESIGN
content = content.replace('const USE_REDESIGN = true;\n', '');

const getHeaderSublineMatch = `  const getHeaderSubline = () => {
    if (tab === 'daily') return localDateStr();
    if (tab === 'stats') return 'Last 30 days';
    if (tab === 'goals') return \`\${lifeGoals.length} active\`;
    return '';
  };`;

const needsOnboardingCode = `
  // ── Main render ────────────────────────────────────────────────────────────
  if (needsOnboarding) {
    return (
      <OnboardingFlow 
        t={t} 
        onComplete={async () => {
          setNeedsOnboarding(false);
          setTab('jarvis');

          // Onboarding is high-value user data. Force a recovery snapshot now
          // so a later reinstall/update can restore the completed setup.
          await runAutoBackup({ force: true }).catch(() => {});
          // Seed baseline titles from post-onboarding stats WITHOUT detecting level-ups,
          // so ceremonies only fire for tiers crossed by real activity afterward.
          const freshLogs = await getAllLogs();
          const freshConfigs = await getAllAxisConfigs();
          const freshQuests = await getAllQuests();
          const postOnboardingStats = computeAllStats(freshLogs, freshConfigs, freshQuests, localDateStr());
          
          const seedTitles = {};
          for (const axis of ['body', 'discipline', 'knowledge', 'social', 'creativity', 'strategy']) {
            seedTitles[axis] = getThresholdTitle(axis, Math.round(postOnboardingStats[axis] ?? 0));
          }
          await setSetting('lastStatTitles', JSON.stringify(seedTitles));
          
          // Now safe — will see no diff, won't queue ceremonies
          await recomputeStats();
        }} 
      />
    );
  }`;

const redesignRenderCode = `
  return (
    <>
      {showSettings ? (
        <SettingsTab
          t={t}
          dark={dark}
          setDark={setDark}
          reminders={reminders}
          setReminders={setReminders}
          onSaveReminders={handleSaveReminders}
          todayRecord={todayRecord}
          onClose={() => setShowSettings(false)}
          onRunSync={handleRunSync}
        />
      ) : (
        <AppShell
          currentTab={tab}
          onTabChange={handleTabChange}
          onOpenJarvis={handleOpenJarvis}
          onOpenSettings={() => setShowSettings(true)}
          headerTitle={getHeaderTitle()}
          headerSubline={getHeaderSubline()}
        >
          {renderPages()}
        </AppShell>
      )}
      {levelUpQueue.length > 0 && (
        <LevelUpCeremony levelUp={levelUpQueue[0]} onDismiss={() => setLevelUpQueue(q => q.slice(1))} />
      )}
      <CompletionFeedback feedback={completionFeedback} onDismiss={() => setCompletionFeedback(null)} />
      {showCheckin && (
        <ProofFearCheckin onComplete={async () => { setShowCheckin(false); await recomputeStats(); }} />
      )}
    </>
  );
}
`;

// Slice the file up to getHeaderSublineMatch
const topPart = content.split(getHeaderSublineMatch)[0];

const finalApp = topPart + getHeaderSublineMatch + needsOnboardingCode + redesignRenderCode;

fs.writeFileSync('src/App.jsx', finalApp);
console.log('Done cleaning App.jsx');
