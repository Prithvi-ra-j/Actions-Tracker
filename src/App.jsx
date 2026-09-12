import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { THEMES, ACCENT } from './constants.js';
import { localDateStr }   from './helpers/dateHelpers.js';

// ── Database ──────────────────────────────────────────────────────────────────
import { initDB }                from './database/db.js';
import { migrateFromLocalStorage, migrateHardcodedGoalsToLifeObjects } from './database/migration.js';
import { initAxisConfigs, getAllAxisConfigs } from './database/axisConfigRepository.js';
import { getAllLogs, addLog, deleteDailyCheckboxLog } from './database/logsRepository.js';
import { initQuestBoard, getAllQuests, syncQuestProgress } from './database/questBoardRepository.js';
import { initGoals, getAllGoals, updateGoal }    from './database/goalsRepository.js';
import { getAllMilestoneChecks, setMilestoneCheck } from './database/milestonesRepository.js';
import { getSetting, setSetting, getReminders, saveReminders } from './database/settingsRepository.js';
import { checkAndWriteWeeklySnapshot, getLatestSnapshot } from './database/statSnapshotsRepository.js';
import { runAnomalyDetection } from './database/telemetryRepository.js';
import { isOnboardingComplete } from './database/selfModelRepository.js';
import { registerConnector } from './core/sync/syncManager.js';
import { MockHealthConnector } from './core/sync/connectors/MockHealthConnector.js';
import { bootstrapAnalysisScheduler } from './core/ai/analysisScheduler.js';

// ── Helpers ─────────────────────────────────────────────────────────────────────────────
import { computeAllStats, computeAxisDetails, getThresholdTitle } from './helpers/statsEngine.js';

// ── Native ────────────────────────────────────────────────────────────────────
import { scheduleAllReminders } from './native/notifications.js';
import { registerBackHandler, setupStatusBar } from './native/backButton.js';

// ── Components ────────────────────────────────────────────────────────────────
import TodayTab      from './components/TodayTab.jsx';
import GoalsTab      from './components/GoalsTab.jsx';
import MilestonesTab from './components/MilestonesTab.jsx';

import CalendarTab from './components/CalendarTab.jsx';
import ReviewPrompt from './components/ReviewPrompt.jsx';
import SettingsTab   from './components/SettingsTab.jsx';
import NavDrawer     from './components/NavDrawer.jsx';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import OnboardingScreen  from './components/OnboardingScreen.jsx';
import StatsTab          from './components/StatsTab.jsx';
import LevelUpCeremony   from './components/LevelUpCeremony.jsx';
import ProofFearCheckin  from './components/ProofFearCheckin.jsx';
import ProfileTab        from './components/ProfileTab.jsx'; // Phase 15
import LearnTab          from './components/LearnTab.jsx';   // Phase 7
import JarvisTab         from './components/JarvisTab.jsx';  // Phase 11
import AuditsTab         from './components/AuditsTab.jsx';  // Phase 12

// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  // Primary
  { id: 'daily',      label: 'Today'    },
  { id: 'stats',      label: 'Stats'    },
  { id: 'learn',      label: 'Learn'    },
  { id: 'goals',      label: 'Goals'    },
  { id: 'self',       label: 'Profile'  },
  // Secondary
  { id: 'jarvis',     label: 'Jarvis'   },
  { id: 'audits',     label: 'Audits'   },
];

// Total possible goal targets (4 goals × 4 targets each)
const TOTAL_TARGETS = 16;

// ── Phase 4 helpers ───────────────────────────────────────────────────────────

const AXIS_COLORS = {
  strength:   '#c1442c',
  discipline: '#c1442c',
  knowledge:  '#4a7ba6',
  wisdom:     '#4a7ba6',
  creativity: '#d99a2b',
  strategy:   '#4f8a5f',
};

/**
 * Compares old threshold titles to new ones and returns an array of level-up
 * events. Only fires when the title changed AND the value went up.
 * @param {{ [axis]: string }} oldTitles  — persisted titles from settings
 * @param {{ [axis]: number }} newStats
 */
function detectLevelUps(oldTitles, newStats) {
  const AXES = ['strength', 'discipline', 'knowledge', 'wisdom', 'creativity', 'strategy'];
  const events = [];
  for (const axis of AXES) {
    const newVal   = Math.round(newStats[axis] ?? 0);
    const newTitle = getThresholdTitle(axis, newVal);
    const oldTitle = oldTitles[axis] ?? getThresholdTitle(axis, 0);
    // Only fire if the title is different AND value increased (not an onboarding artifact)
    if (newTitle !== oldTitle && newVal > 0) {
      events.push({ axis, value: newVal, newTitle, color: AXIS_COLORS[axis] });
    }
  }
  return events;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Bootstrap state ────────────────────────────────────────────────        const [dbReady,         setDbReady]         = useState(false);
  const [dbError,         setDbError]         = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [tab,          setTab]          = useState('daily');
  const [dark, setDark] = useState(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showNavDrawer, setShowNavDrawer] = useState(false);
  const [expanded,     setExpanded]     = useState(null); // expanded goal index

  // ── Data state (loaded from DB on mount; written back on every change) ─────
  const [allLogs,          setAllLogs]          = useState([]);
  const [lifeGoals,        setLifeGoals]        = useState([]);
  const [milestoneChecks,  setMilestoneChecks]   = useState({});
  const [reminders,        setReminders]         = useState([
    { id: 1, label: 'BODY',        time: '07:00', enabled: true },
    { id: 2, label: 'PHILOSOPHY',  time: '20:30', enabled: true },
    { id: 3, label: 'DAILY CHECK', time: '22:00', enabled: true },
  ]);

  // ── Stat engine state ────────────────────────────────────────────────         const [stats,            setStats]             = useState({ strength: 0, discipline: 0, knowledge: 0, wisdom: 0, creativity: 0, strategy: 0 });
  const [axisDetails,      setAxisDetails]        = useState({});
  const [axisConfigs,      setAxisConfigs]        = useState([]);
  const [allQuests,        setAllQuests]          = useState([]);
  const [latestSnapshot,   setLatestSnapshot]     = useState(null);
  const [evaluations,      setEvaluations]        = useState({});

  // ── Phase 4/5 engagement state ────────────────────────────────────────────────────
  // levelUpQueue: array of { axis, value, newTitle, color } — shown one at a time
  const [levelUpQueue,     setLevelUpQueue]       = useState([]);
  const [showCheckin,      setShowCheckin]        = useState(false);
  const [hasSundayReflection, setHasSundayReflection] = useState(false);

  // ── Phase 7: Learn tab state ───────────────────────────────────────────────
  const [todayOccurrences, setTodayOccurrences] = useState([]);
  const [books,            setBooks]            = useState([]);
  const [learnings,        setLearnings]        = useState([]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const t          = dark ? THEMES.dark : THEMES.light;
  const today      = localDateStr();
  const todayRecord = useMemo(() => {
    const rec = { body: false, philosophy: false, art: false, history: false };
    const dayLogs = allLogs.filter(l => l.type === 'daily_checkbox' && l.date === today);
    for (const log of dayLogs) {
      if (log.meta?.task) rec[log.meta.task] = true;
    }
    return rec;
  }, [allLogs, today]);

  const doneTargets = lifeGoals.reduce((acc, goal) => acc + (goal.targets?.filter(t => t.completed)?.length ?? 0), 0);
  const dailyDone   = [todayRecord.body, todayRecord.philosophy, todayRecord.art, todayRecord.history].filter(Boolean).length;

  // ── Initialise DB and load all data ───────────────────────────────────────
  useEffect(() => {
    async function bootstrap() {
      try {
        await initDB();
        await migrateFromLocalStorage();
        await initGoals();
        await initAxisConfigs();
        await initQuestBoard();

        const [goals, milestones, darkPref, savedReminders, allLogs, axisConfigs, quests, facts] =
          await Promise.all([
            getAllGoals(),
            getAllMilestoneChecks(),
            getSetting('darkMode'),
            getReminders(),
            getAllLogs(),
            getAllAxisConfigs(),
            getAllQuests(),
            import('./database/factsRepository.js').then(m => m.getAllFacts()),
          ]);

        // Register integrations
        registerConnector(new MockHealthConnector());

        // Build evaluations map from facts where type === 'evaluation'
        const evals = {};
        facts.filter(f => f.type === 'evaluation' && f.meta?.targetRef).forEach(f => {
          evals[f.meta.targetRef] = f;
        });
        setEvaluations(evals);

        // Sync quest progress from logs, then re-fetch updated quests
        await syncQuestProgress(allLogs);
        const syncedQuests = await getAllQuests();

        // Use selfModelRepository to check onboarding completion (v2).
        // Fall back to the old log-count check for users who completed v1 onboarding.
        const onboardingDone = await isOnboardingComplete();
        const hasOldBaseline = allLogs.filter(l => l.type !== 'daily_checkbox').length > 0;
        if (!onboardingDone && !hasOldBaseline) {
          setNeedsOnboarding(true);
        }

        setAllLogs(allLogs);
        setAxisConfigs(axisConfigs);
        setLifeGoals(goals);
        setMilestoneChecks(milestones);
        setAllQuests(syncedQuests);
        if (darkPref === 'true') setDark(true);
        if (savedReminders?.length) {
          setReminders(savedReminders);
          await scheduleAllReminders(savedReminders, todayRecord);
        } else {
          await scheduleAllReminders(reminders, todayRecord);
        }

        // Compute stats + per-axis details
        const today = localDateStr();
        const initialStats = computeAllStats(allLogs, axisConfigs, syncedQuests, today);
        const details = computeAxisDetails(allLogs, axisConfigs, syncedQuests, today);
        setStats(initialStats);
        setAxisDetails(details);

        // ── Level-up detection (spec §11) ─────────────────────────────────────
        const savedTitlesRaw = await getSetting('lastStatTitles');
        const savedTitles = savedTitlesRaw ? JSON.parse(savedTitlesRaw) : {};
        const newLevelUps = detectLevelUps(savedTitles, initialStats);
        if (newLevelUps.length > 0) {
          setLevelUpQueue(newLevelUps);
        }
        // Always persist current titles so next comparison is accurate
        const currentTitles = {};
        for (const axis of ['strength', 'discipline', 'knowledge', 'wisdom', 'creativity', 'strategy']) {
          currentTitles[axis] = getThresholdTitle(axis, Math.round(initialStats[axis] ?? 0));
        }
        await setSetting('lastStatTitles', JSON.stringify(currentTitles));

        // ── Phase 5: Sunday Reflection state ──────────────────────────────────
        setHasSundayReflection(allLogs.some(l => l.type === 'journal_entry' && l.date === today));

        // ── Monthly proof/fear check-in (spec §12) ────────────────────────────
        // Due if no check-in ever, or 30+ days since last one
        const lastCheckin = allLogs
          .filter(l => l.type === 'proof_check_in')
          .sort((a, b) => b.date.localeCompare(a.date))[0];
        if (!lastCheckin) {
          // Never done — schedule it but not on the very first session (user just onboarded)
          const hasRealActivity = allLogs.some(l =>
            l.type !== 'onboarding_assessment' && l.type !== 'proof_check_in'
          );
          if (hasRealActivity) setShowCheckin(true);
        } else {
          const daysSince = Math.round(
            (new Date(today + 'T00:00:00') - new Date(lastCheckin.date + 'T00:00:00'))
            / (1000 * 60 * 60 * 24)
          );
          if (daysSince >= 30) setShowCheckin(true);
        }

        // Weekly auto-snapshot (spec §10) — write if 7+ days since last
        await checkAndWriteWeeklySnapshot(initialStats, details, today);
        const snap = await getLatestSnapshot();
        setLatestSnapshot(snap);

        // Run anomaly detection quietly in the background
        await runAnomalyDetection(today);

        // Phase 13: Boot background analysis scheduler
        bootstrapAnalysisScheduler();

        // ── Phase 7: Load today's occurrences, books, and learnings ───────────
        try {
          const [occs, booksData, learningsData] = await Promise.all([
            import('./database/habitOccurrenceRepository.js').then(m => m.getOccurrencesForDate(today)),
            import('./database/booksRepository.js').then(m => m.getAllBooks()),
            import('./database/learningRepository.js').then(m => m.getAllLearnings()),
          ]);
          setTodayOccurrences(occs);
          setBooks(booksData);
          setLearnings(learningsData);
        } catch (p7err) {
          // Phase 7 data load is non-fatal — app remains fully functional
          console.warn('[App] Phase 7 data load partial:', p7err);
        }
      } catch (err) {
        console.error('[App] Bootstrap error:', err);
        setDbError(String(err?.message ?? err));
        // Fall through — UI still renders, just without persistence
      } finally {
        setDbReady(true);
      }
    }

    bootstrap();
    setupStatusBar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Android back-button handler ────────────────────────────────────────    // Re-registers whenever the relevant state changes so the handler is current.
  useEffect(() => {
    registerBackHandler(() => {
      if (showSettings)        { setShowSettings(false);  return true; }
      if (showNavDrawer)       { setShowNavDrawer(false); return true; }
      if (expanded !== null)   { setExpanded(null);        return true; }
      if (tab !== 'daily')     { setTab('daily');          return true; }
      return false; // allow exit
    });
  }, [showSettings, showNavDrawer, expanded, tab]);

  // ── Persist dark-mode preference ───────────────────────────────────────────
  useEffect(() => {
    if (dbReady) setSetting('darkMode', String(dark));
  }, [dark, dbReady]);

  // ── Stat recompute — called after any write that could affect a stat ──────
  const recomputeStats = useCallback(async () => {
    try {
      const freshLogs = await getAllLogs();
      const freshConfigs = await getAllAxisConfigs();
      await syncQuestProgress(freshLogs);
      const freshQuests = await getAllQuests();
      const today = localDateStr();
      setAllLogs(freshLogs);
      setAxisConfigs(freshConfigs);
      setAllQuests(freshQuests);
      const newStats   = computeAllStats(freshLogs, freshConfigs, freshQuests, today);
      const newDetails = computeAxisDetails(freshLogs, freshConfigs, freshQuests, today);
      setStats(newStats);
      setAxisDetails(newDetails);

      // ── Level-up detection (spec §11) ────────────────────────────────     const savedTitlesRaw = await getSetting('lastStatTitles');
      const savedTitles = savedTitlesRaw ? JSON.parse(savedTitlesRaw) : {};
      const newLevelUps = detectLevelUps(savedTitles, newStats);
      if (newLevelUps.length > 0) {
        setLevelUpQueue(q => [...q, ...newLevelUps]);
      }
      // Always persist current titles
      const currentTitles = {};
      for (const axis of ['strength', 'discipline', 'knowledge', 'wisdom', 'creativity', 'strategy']) {
        currentTitles[axis] = getThresholdTitle(axis, Math.round(newStats[axis] ?? 0));
      }
      await setSetting('lastStatTitles', JSON.stringify(currentTitles));

      setHasSundayReflection(freshLogs.some(l => l.type === 'journal_entry' && l.date === today));
    } catch (err) {
      console.error('[App] recomputeStats failed:', err);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────
  const triggerHaptic = () => {
    try {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } catch (e) {}
  };

  const handleDailyToggle = useCallback(async (id) => {
    triggerHaptic();

    const taskToAxis = {
      body: 'discipline',
      philosophy: 'knowledge',
      art: 'creativity',
      history: 'strategy'
    };
    const axis = taskToAxis[id];

    // Check if it's already done today
    const wasDone = allLogs.some(l => l.type === 'daily_checkbox' && l.date === today && l.meta?.task === id);

    try {
      if (wasDone) {
        await deleteDailyCheckboxLog(today, id);
      } else {
        await addLog({ axis, type: 'daily_checkbox', value: 1, date: today, meta: { task: id } });
      }

      // Optimistically compute new record to update reminders immediately
      const newRecord = { ...todayRecord, [id]: !wasDone };
      await scheduleAllReminders(reminders, newRecord);

      await recomputeStats();
    } catch (err) {
      console.error('[App] handleDailyToggle failed:', err);
    }
  }, [allLogs, today, todayRecord, reminders, recomputeStats]);

  const handleGoalToggle = useCallback(async (goalId, targetIndex) => {
    triggerHaptic();
    const goal = lifeGoals.find(g => g.id === goalId);
    if (!goal) return;

    const newTargets = [...goal.targets];
    newTargets[targetIndex] = { ...newTargets[targetIndex], completed: !newTargets[targetIndex].completed };

    // Optimistic UI update
    setLifeGoals(prev => prev.map(g => g.id === goalId ? { ...g, targets: newTargets } : g));

    try {
      await updateGoal(goalId, { targets: newTargets });
    } catch (err) {
      console.error('[App] handleGoalToggle failed:', err);
      // rollback could be added here
    }
  }, [lifeGoals]);

  const handleMilestoneToggle = useCallback(async (key) => {
    triggerHaptic();
    const newValue = !milestoneChecks[key];
    setMilestoneChecks(prev => ({ ...prev, [key]: newValue }));
    try {
      await setMilestoneCheck(key, newValue);
    } catch (err) {
      console.error('[App] setMilestoneCheck failed:', err);
    }
  }, [milestoneChecks]);

  const handleSaveReminders = useCallback(async (newReminders) => {
    try {
      await saveReminders(newReminders);
      setReminders(newReminders);
    } catch (err) {
      console.error('[App] saveReminders failed:', err);
    }
  }, []);

  function handleTabChange(id) {
    setTab(id);
    setShowSettings(false);
    setShowNavDrawer(false);
  }

  // ── Phase 7: Occurrence command handlers ──────────────────────────────────
  const handleCompleteOccurrence = useCallback(async (id) => {
    try {
      const { completeOccurrence } = await import('./database/habitOccurrenceRepository.js');
      await completeOccurrence(id);
      // Refresh today's occurrences
      const { getOccurrencesForDate } = await import('./database/habitOccurrenceRepository.js');
      setTodayOccurrences(await getOccurrencesForDate(today));
    } catch (err) {
      console.error('[App] handleCompleteOccurrence failed:', err);
    }
  }, [today]);

  const handleExcuseOccurrence = useCallback(async (id, reason) => {
    try {
      const { excuseOccurrence } = await import('./database/habitOccurrenceRepository.js');
      await excuseOccurrence(id, reason);
      const { getOccurrencesForDate } = await import('./database/habitOccurrenceRepository.js');
      setTodayOccurrences(await getOccurrencesForDate(today));
    } catch (err) {
      console.error('[App] handleExcuseOccurrence failed:', err);
    }
  }, [today]);

  // ── Phase 7: Learn tab handlers ───────────────────────────────────────────
  const handleAddLearning = useCallback(async (fields) => {
    try {
      const { addLearning, getAllLearnings } = await import('./database/learningRepository.js');
      await addLearning(fields);
      setLearnings(await getAllLearnings());
    } catch (err) {
      console.error('[App] handleAddLearning failed:', err);
    }
  }, []);

  const handleUpdatePages = useCallback(async (bookId, pagesAdded, dateStr) => {
    try {
      const { updateBookPagesRead, getAllBooks } = await import('./database/booksRepository.js');
      await updateBookPagesRead(bookId, pagesAdded, dateStr);
      setBooks(await getAllBooks());
      await recomputeStats();
    } catch (err) {
      console.error('[App] handleUpdatePages failed:', err);
    }
  }, [recomputeStats]);

  const handleFinishBook = useCallback(async (bookId, dateStr) => {
    try {
      const { updateBookStatus, getAllBooks } = await import('./database/booksRepository.js');
      await updateBookStatus(bookId, 'finished', dateStr);
      setBooks(await getAllBooks());
      await recomputeStats();
    } catch (err) {
      console.error('[App] handleFinishBook failed:', err);
    }
  }, [recomputeStats]);

  const handleRunSync = useCallback(async () => {
    try {
      const { runAllSyncs } = await import('./core/sync/syncManager.js');
      const summary = await runAllSyncs();
      await recomputeStats();
      return summary;
    } catch (err) {
      console.error('[App] handleRunSync failed:', err);
      throw err;
    }
  }, [recomputeStats]);

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (!dbReady) {
    return (
      <div style={{ background: '#1c1916', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/icon.svg" alt="App Icon" style={{ width: 64, height: 64, marginBottom: '1rem', opacity: 0.8 }} />
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.3em', color: ACCENT, textTransform: 'uppercase' }}>
          Actions-Tracker
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  if (needsOnboarding) {
    return (
      <OnboardingScreen 
        t={t} 
        onComplete={async () => {
          setNeedsOnboarding(false);
          // Seed baseline titles from post-onboarding stats WITHOUT detecting level-ups,
          // so ceremonies only fire for tiers crossed by real activity afterward.
          const freshLogs = await getAllLogs();
          const freshConfigs = await getAllAxisConfigs();
          const freshQuests = await getAllQuests();
          const postOnboardingStats = computeAllStats(freshLogs, freshConfigs, freshQuests, localDateStr());
          
          const seedTitles = {};
          for (const axis of ['strength', 'discipline', 'knowledge', 'wisdom', 'creativity', 'strategy']) {
            seedTitles[axis] = getThresholdTitle(axis, Math.round(postOnboardingStats[axis] ?? 0));
          }
          await setSetting('lastStatTitles', JSON.stringify(seedTitles));
          
          // Now safe — will see no diff, won't queue ceremonies
          await recomputeStats();
        }} 
      />
    );
  }

  return (
    <div style={{
      background: t.pageBg,
      minHeight: '100dvh',
      fontFamily: 'Georgia, serif',
      color: t.pageText,
      paddingBottom: 'env(safe-area-inset-bottom)',
      transition: 'background 0.2s, color 0.2s',
    }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: t.headerBg,
        padding: '1rem 1.5rem',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
        transition: 'background 0.2s',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Hamburger menu */}
            <button
              onClick={() => setShowNavDrawer(true)}
              aria-label="Open menu"
              style={{
                background: 'transparent',
                border: 'none',
                color: t.headerText,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0.2rem',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            <span style={{ fontFamily: 'monospace', fontSize: '0.58rem', letterSpacing: '0.3em', color: t.headerText, textTransform: 'uppercase' }}>
              Actions-Tracker
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Radar Stats */}
            <button
              onClick={() => handleTabChange('stats')}
              aria-label="Stats"
              style={{
                background: 'transparent',
                border: 'none',
                color: tab === 'stats' ? ACCENT : t.headerText,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0.2rem',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
                <line x1="12" y1="12" x2="19" y2="5"></line>
              </svg>
            </button>

            <span style={{ fontFamily: 'monospace', fontSize: '0.58rem', color: ACCENT, letterSpacing: '0.1em' }}>
              {tab === 'daily'
                ? `${dailyDone}/4 today`
                : `${doneTargets}/${TOTAL_TARGETS} targets`}
            </span>
          </div>
        </div>

        {/* Overall goal progress bar */}
        <div style={{ marginTop: '0.75rem', height: 2, background: t.trackBg, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(doneTargets / TOTAL_TARGETS) * 100}%`,
            background: ACCENT,
            transition: 'width 0.4s',
            borderRadius: 2,
          }} />
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '1.5rem' }}>

        {/* DB error notice (non-fatal) */}
        {dbError && (
          <div style={{
            padding: '0.75rem', marginBottom: '1rem',
            background: 'rgba(193,68,44,0.1)', border: '1px solid #c1442c',
            fontFamily: 'monospace', fontSize: '0.48rem', color: '#c1442c', lineHeight: 1.5,
          }}>
            ⚠ Storage warning: {dbError}. Changes may not persist across restarts.
          </div>
        )}

        {/* Settings panel (replaces tab content when open) */}
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
          <>
            {tab === 'daily' && (
              <TodayTab
                t={t}
                todayOccurrences={todayOccurrences}
                allQuests={allQuests}
                onCompleteOccurrence={handleCompleteOccurrence}
                onExcuseOccurrence={handleExcuseOccurrence}
                onGoToGoals={() => handleTabChange('goals')}
              />
            )}

            {tab === 'stats' && (
              <StatsTab
                t={t}
                dark={dark}
                stats={stats}
                axisDetails={axisDetails}
                snapshot={latestSnapshot}
                allQuests={allQuests}
                allLogs={allLogs}
                axisConfigs={axisConfigs}
              />
            )}

            {tab === 'goals' && (
              <GoalsTab
                t={t}
                dark={dark}
                goalChecks={goalChecks}
                onToggle={handleGoalToggle}
                expanded={expanded}
                setExpanded={setExpanded}
              />
            )}

            {tab === 'milestones' && (
              <MilestonesTab
                t={t}
                milestoneChecks={milestoneChecks}
                onToggle={handleMilestoneToggle}
                allLogs={allLogs}
              />
            )}

            {tab === 'calendar' && (
              <CalendarTab
                t={t}
                allLogs={allLogs}
              />
            )}

            {tab === 'self' && (
              <SelfTab t={t} dark={dark} />
            )}

            {/* Phase 7: Learn tab */}
            {tab === 'learn' && (
              <LearnTab
                t={t}
                books={books}
                learnings={learnings}
                onUpdatePages={handleUpdatePages}
                onFinishBook={handleFinishBook}
                onAddLearning={handleAddLearning}
              />
            )}

            {tab === 'self' && (
              <ProfileTab
                t={t}
                dark={dark}
              />
            )}

            {/* Phase 11: Jarvis tab */}
            {tab === 'jarvis' && (
              <JarvisTab t={t} onQuestsChanged={recomputeStats} />
            )}

            {/* Phase 12: Audits tab */}
            {tab === 'audits' && (
              <AuditsTab t={t} />
            )}

          </>
        )}

        <ReviewPrompt t={t} currentStats={stats} />
      </div>

      {/* ── Overlays (Phase 4) ──────────────────────────────────────────────── */}
      {levelUpQueue.length > 0 && (
        <LevelUpCeremony
          levelUp={levelUpQueue[0]}
          onDismiss={() => setLevelUpQueue(q => q.slice(1))}
        />
      )}

      {showCheckin && (
        <ProofFearCheckin
          onComplete={async () => {
            setShowCheckin(false);
            await recomputeStats();
          }}
        />
      )}

      {/* Nav Drawer Overlay */}
      <NavDrawer
        t={t}
        isOpen={showNavDrawer}
        onClose={() => setShowNavDrawer(false)}
        tabs={TABS}
        currentTab={tab}
        onSelectTab={handleTabChange}
        onOpenSettings={() => { setShowSettings(true); setTab('daily'); }}
      />
    </div>
  );
}
