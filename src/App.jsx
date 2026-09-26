import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { THEMES, ACCENT } from './constants.js';
import { localDateStr }   from './helpers/dateHelpers.js';
import { getGraceState } from './core/occurrenceEngine.js';

// ── Database ──────────────────────────────────────────────────────────────────
import { initDB }                from './database/db.js';
import { migrateFromLocalStorage, migrateAxisVocabulary } from './database/migration.js';
import { initAxisConfigs, getAllAxisConfigs } from './database/axisConfigRepository.js';
import { getAllLogs, addLog, deleteLog, deleteDailyCheckboxLog } from './database/logsRepository.js';
import { initQuestBoard, getAllQuests, syncQuestProgress } from './database/questBoardRepository.js';
import { initGoals, getAllGoals, updateGoal }    from './database/goalsRepository.js';
import { getAllMilestoneChecks, setMilestoneCheck } from './database/milestonesRepository.js';
import { getSetting, setSetting, getReminders, saveReminders } from './database/settingsRepository.js';
import { checkAndWriteWeeklySnapshot, getLatestSnapshot } from './database/statSnapshotsRepository.js';
import { runAnomalyDetection, saveTelemetryEvent } from './database/telemetryRepository.js';
import { runAutoBackup, restoreLatestBackupIfDatabaseEmpty } from './database/backupService.js';
import { hasUserData } from './database/bootstrapState.js';
import { hasJarvisApiKey } from './core/ai/jarvisConfig.js';
import { registerConnector } from './core/sync/syncManager.js';
import { HealthConnectConnector } from './core/sync/connectors/HealthConnectConnector.js';
import { NutriLiftConnector } from './core/sync/connectors/NutriLiftConnector.js';
import { bootstrapAnalysisScheduler } from './core/ai/analysisScheduler.js';
import { installGlobalErrorLogging, markErrorLoggerReady } from './core/errorLogger.js';
import { checkForUpdate } from './core/updateChecker.js';
import { applyFreshStartReset } from './core/freshStartReset.js';

// ── Helpers ─────────────────────────────────────────────────────────────────────────────
import { computeAllStats, computeAxisDetails, getThresholdTitle } from './helpers/statsEngine.js';

// ── Native ────────────────────────────────────────────────────────────────────
import { scheduleAllReminders } from './native/notifications.js';
import { registerBackHandler, setupStatusBar } from './native/backButton.js';

// ── Components ────────────────────────────────────────────────────────────────
import TodayTab      from './components/TodayTab.jsx';
import GoalsTab      from './components/GoalsTab.jsx';

import ReviewPrompt from './components/ReviewPrompt.jsx';
import SettingsTab   from './components/SettingsTab.jsx';
import NavDrawer     from './components/NavDrawer.jsx';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import OnboardingFlow from './components/onboarding/OnboardingFlow.jsx';
import StatsTab          from './components/StatsTab.jsx';
import LevelUpCeremony   from './components/LevelUpCeremony.jsx';
import CompletionFeedback from './components/CompletionFeedback.jsx';
import ProofFearCheckin  from './components/ProofFearCheckin.jsx';
import LearnTab          from './components/LearnTab.jsx';   // Phase 7
import JarvisTab         from './components/JarvisTab.jsx';  // Phase 11
import AuditsTab         from './components/AuditsTab.jsx';  // Phase 12
import UpdateBanner      from './components/UpdateBanner.jsx';
import AppShell          from './components/AppShell.jsx';



// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  // Primary
  { id: 'daily',      label: 'Today'    },
  { id: 'stats',      label: 'Stats'    },
  { id: 'learn',      label: 'Learn'    },
  { id: 'goals',      label: 'Goals'    },
  // Secondary
  { id: 'jarvis',     label: 'Jarvis'   },
  { id: 'audits',     label: 'Audits'   },
];

// Total possible goal targets (4 goals × 4 targets each)
const TOTAL_TARGETS = 16;

function daysAgoDate(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

async function loadEnrichedOccurrences(startDate, endDate, currentDate) {
  const { getOccurrencesByDateRange } = await import('./database/habitOccurrenceRepository.js');
  const { getHabit } = await import('./database/habitRepository.js');
  const occurrences = await getOccurrencesByDateRange(startDate, endDate);
  return Promise.all(occurrences.map(async occurrence => {
    const habit = await getHabit(occurrence.habitId);
    const scheduledDate = occurrence.scheduledFor.split('T')[0];
    return {
      ...occurrence,
      habitTitle: habit?.name || 'Unknown Habit',
      graceState: getGraceState(scheduledDate, currentDate).state,
    };
  }));
}

// ── Phase 4 helpers ───────────────────────────────────────────────────────────

const AXIS_COLORS = {
  body:       '#c1442c',
  discipline: '#c1442c',
  knowledge:  '#4a7ba6',
  social:     '#ff9500',
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
  const AXES = ['body', 'discipline', 'knowledge', 'social', 'creativity', 'strategy'];
  const events = [];
  for (const axis of AXES) {
    const newVal   = Math.round(newStats[axis] ?? 0);
    const newTitle = getThresholdTitle(axis, newVal);
    const oldTitle = oldTitles[axis] ?? getThresholdTitle(axis, 0);
    // Only fire if the title is different AND value increased (not an onboarding artifact)
    if (newTitle !== oldTitle && newVal > 0) {
      events.push({ axis, value: newVal, newTitle, color: AXIS_COLORS[axis] || '#ff9500' });
    }
  }
  return events;
}

// ─────────────────────────────────────────────────────────────────────────────

async function getScoresAsync() {
  const domains = ['body', 'knowledge', 'strategy', 'creativity', 'social', 'discipline'];
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const period = { start: start.toISOString(), end: end.toISOString() };
  
  const stats = {};
  const details = {};
  
  for (const domain of domains) {
    try {
      const { runScoreProjection } = await import('./core/scoring/scoreEngine.js');
      const projection = await runScoreProjection(domain, period);
      stats[domain] = projection.value;
      details[domain] = {
        components: projection.components,
        scoreSource: projection.scoreSource || 'canonical',
        fallbackReason: projection.fallbackReason || null,
        coverage: projection.coverage ?? 0,
        confidence: projection.confidence ?? 0,
        warnings: projection.warnings || [],
      };
    } catch (e) {
      console.warn(`[App] Failed to project ${domain}`, e);
      stats[domain] = 0;
      details[domain] = { components: [], scoreSource: 'canonical', coverage: 0, confidence: 0, warnings: ['projection_failed'] };
    }
  }
  return { stats, details };
}

export default function App() {
  // ── Bootstrap state ────────────────────────────────────────────────
  const [dbReady,         setDbReady]         = useState(false);
  const [dbError,         setDbError]         = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [updateInfo,      setUpdateInfo]       = useState(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [tab,          setTab]          = useState('daily');
  const [dark, setDark] = useState(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showNavDrawer, setShowNavDrawer] = useState(false);
  const [expanded,     setExpanded]     = useState(null); // expanded goal index
  const [jarvisContext, setJarvisContext] = useState(null);

  // ── Data state (loaded from DB on mount; written back on every change) ─────
  const [allLogs,          setAllLogs]          = useState([]);
  const [lifeGoals,        setLifeGoals]        = useState([]);
  const [milestoneChecks,  setMilestoneChecks]   = useState({});
  const [reminders,        setReminders]         = useState([
    { id: 1, label: 'BODY',        time: '07:00', enabled: true },
    { id: 2, label: 'PHILOSOPHY',  time: '20:30', enabled: true },
    { id: 3, label: 'DAILY CHECK', time: '22:00', enabled: true },
  ]);

  // ── Stat engine state ────────────────────────────────────────────────
  const [stats,            setStats]             = useState({ body: 0, discipline: 0, knowledge: 0, social: 0, creativity: 0, strategy: 0 });
  const [axisDetails,      setAxisDetails]        = useState({});
  const [axisConfigs,      setAxisConfigs]        = useState([]);
  const [allQuests,        setAllQuests]          = useState([]);
  const [latestSnapshot,   setLatestSnapshot]     = useState(null);
  const [evaluations,      setEvaluations]        = useState({});

  // ── Phase 4/5 engagement state ────────────────────────────────────────────────────
  // levelUpQueue: array of { axis, value, newTitle, color } — shown one at a time
  const [levelUpQueue,     setLevelUpQueue]       = useState([]);
  const [completionFeedback, setCompletionFeedback] = useState(null);
  const completingOccurrences = useRef(new Set());
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
        await saveTelemetryEvent('app_started', localDateStr(), { type: 'boot' }).catch(() => {});
        await initDB();

        const didFreshStartReset = await applyFreshStartReset();

        if (!didFreshStartReset) {
          // Normal recovery/migration path. The fresh-start release has already
          // removed the old local backup and legacy localStorage dataset.
          await restoreLatestBackupIfDatabaseEmpty();

          await markErrorLoggerReady();
          installGlobalErrorLogging();
          await migrateFromLocalStorage();
          await saveTelemetryEvent('db_migration_success', localDateStr(), {}).catch(() => {});
        } else {
          await markErrorLoggerReady();
          installGlobalErrorLogging();
          await saveTelemetryEvent('fresh_start_reset_complete', localDateStr(), {}).catch(() => {});
        }
        // Hardcoded goal definitions are no longer seeded for new users.
        // Existing legacy state is handled by initGoals() when legacy checkbox data exists.
        await migrateAxisVocabulary();

        await initGoals();
        await initAxisConfigs();
        await initQuestBoard();

        // Phase 16: Habit occurrence auto-generation
        const { generateOccurrencesForDate } = await import('./core/occurrenceEngine.js');
        await generateOccurrencesForDate(localDateStr());

        // Snapshot the fully initialized post-migration state as the newest
        // recovery point.
        await runAutoBackup().catch(() => {});

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
        registerConnector(new HealthConnectConnector());
        registerConnector(new NutriLiftConnector());

        // Build evaluations map from facts where type === 'evaluation'
        const evals = {};
        facts.filter(f => f.type === 'evaluation' && f.meta?.targetRef).forEach(f => {
          evals[f.meta.targetRef] = f;
        });
        setEvaluations(evals);

        // Sync quest progress from logs, then re-fetch updated quests
        await syncQuestProgress(allLogs);
        const syncedQuests = await getAllQuests();

        // First-run detection is intentionally data-based:
        // an empty user-data layer means the app has never been set up.
        const userDataExists = await hasUserData();
        setNeedsOnboarding(!userDataExists);

        setAllLogs(allLogs);
        setAxisConfigs(axisConfigs);
        setLifeGoals(goals);
        setMilestoneChecks(milestones);
        setAllQuests(syncedQuests);

        if (!userDataExists) {
          const startupReminders = savedReminders?.length ? savedReminders : reminders;
          void scheduleAllReminders(startupReminders, todayRecord);
          checkForUpdate().then(info => { if (info) setUpdateInfo(info); }).catch(() => {});
          setDbReady(true);
          return;
        }

        const todayStr = localDateStr();
        const enrichedOccs = await loadEnrichedOccurrences(daysAgoDate(todayStr, 2), todayStr, todayStr);
        setTodayOccurrences(enrichedOccs);

        if (darkPref === 'true') setDark(true);
        if (savedReminders?.length) {
          setReminders(savedReminders);
          await scheduleAllReminders(savedReminders, todayRecord);
        } else {
          await scheduleAllReminders(reminders, todayRecord);
        }

        // Compute stats + per-axis details async via scoreEngine
        const today = localDateStr();
        const { stats: initialStats, details } = await getScoresAsync();
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
        for (const axis of ['body', 'discipline', 'knowledge', 'social', 'creativity', 'strategy']) {
          currentTitles[axis] = getThresholdTitle(axis, Math.round(initialStats[axis] ?? 0));
        }
        await setSetting('lastStatTitles', JSON.stringify(currentTitles));

        // ── Phase 5: Sunday Reflection state ──────────────────────────────────
        setHasSundayReflection(allLogs.some(l => l.type === 'journal_entry' && l.date === today));

        // ── Monthly proof/fear check-in (spec §12) ────────────────────────────
        // The first check-in is anchored to the user's FIRST REAL DATA DATE.
        // It must never appear merely because the app was opened/restarted.
        // After the first check-in, subsequent check-ins are 30 days apart.
        const realActivityLogs = allLogs
          .filter(l => !['onboarding_assessment', 'proof_check_in'].includes(l.type))
          .filter(l => typeof l.date === 'string' && /^d{4}-d{2}-d{2}$/.test(l.date))
          .sort((a, b) => a.date.localeCompare(b.date));

        const firstDataDate = realActivityLogs[0]?.date ?? null;
        const lastCheckin = allLogs
          .filter(l => l.type === 'proof_check_in')
          .sort((a, b) => b.date.localeCompare(a.date))[0];

        // No real user data = no monthly check-in, ever.
        if (!firstDataDate) {
          setShowCheckin(false);
        } else if (!lastCheckin) {
          // First check-in becomes due exactly 30 days after the first
          // meaningful user activity, not 30 days after installation/onboarding.
          const daysSinceFirstData = Math.floor(
            (new Date(today + 'T00:00:00') - new Date(firstDataDate + 'T00:00:00'))
            / (1000 * 60 * 60 * 24)
          );
          setShowCheckin(daysSinceFirstData >= 30);
        } else {
          const daysSinceLastCheckin = Math.floor(
            (new Date(today + 'T00:00:00') - new Date(lastCheckin.date + 'T00:00:00'))
            / (1000 * 60 * 60 * 24)
          );
          setShowCheckin(daysSinceLastCheckin >= 30);
        }

        // Weekly auto-snapshot (spec §10) — write if 7+ days since last
        await checkAndWriteWeeklySnapshot(initialStats, details, today);
        const snap = await getLatestSnapshot();
        setLatestSnapshot(snap);

        const apiConfigured = await hasJarvisApiKey();

        // Do not run analysis, anomaly detection, or AI scheduler until the
        // user has completed onboarding and explicitly configured an API key.
        if (userDataExists && apiConfigured) {
          await runAnomalyDetection(today);
          if ((await getSetting('jarvisProactiveSuggestions')) !== 'false') {
            bootstrapAnalysisScheduler();
          }
        }

        // Check GitHub Releases for a newer APK (non-fatal, session-cached)
        checkForUpdate().then(info => { if (info) setUpdateInfo(info); }).catch(() => {});

        // Phase 3B: Shadow comparison on boot. It is diagnostic work and is
        // deferred until onboarding/API setup is complete.
        if (userDataExists && apiConfigured) {
          setTimeout(() => {
            import('./core/scoring/scoreParityCheck.js')
              .then(m => m.runParityCheck())
              .catch(err => console.warn('[App] Score parity check failed:', err));
          }, 15000);
        }

        // ── Phase 7: Load today's occurrences, books, and learnings ───────────
        try {
          const [occs, booksData, learningsData] = await Promise.all([
            loadEnrichedOccurrences(daysAgoDate(today, 2), today, today),
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
        try {
          await saveTelemetryEvent('db_migration_failed', localDateStr(), { error: String(err?.message ?? err) });
        } catch (e) { /* ignore if DB is entirely broken */ }
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
      
      const { stats: newStats, details: newDetails } = await getScoresAsync();
      
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
      for (const axis of ['body', 'discipline', 'knowledge', 'social', 'creativity', 'strategy']) {
        currentTitles[axis] = getThresholdTitle(axis, Math.round(newStats[axis] ?? 0));
      }
      await setSetting('lastStatTitles', JSON.stringify(currentTitles));

      setHasSundayReflection(freshLogs.some(l => l.type === 'journal_entry' && l.date === today));
    } catch (err) {
      console.error('[App] recomputeStats failed:', err);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh the execution view after Jarvis writes a habit. The original
  // callback only recomputed stats, leaving today's occurrence list stale.
  const refreshAfterJarvisAction = useCallback(async () => {
    try {
      const { generateOccurrencesForDate } = await import('./core/occurrenceEngine.js');
      await generateOccurrencesForDate(today);
      const enriched = await loadEnrichedOccurrences(
        daysAgoDate(today, 2),
        today,
        today
      );
      setTodayOccurrences(enriched);
      await recomputeStats();
    } catch (err) {
      console.error('[App] Failed to refresh after Jarvis action:', err);
    }
  }, [today, recomputeStats]);

  const handleAddEvidence = useCallback(async ({ content, axis, evidenceType }) => {
    await addLog({
      axis,
      type: 'manual_evidence',
      value: 1,
      date: localDateStr(),
      meta: { content, evidenceType, source: 'manual' },
    });
    void recomputeStats();
  }, [recomputeStats]);

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

  function handleOpenJarvis(context = { page: tab }) {
    const normalizedContext = typeof context === 'string'
      ? { page: context }
      : context || { page: tab };
    setJarvisContext(normalizedContext);
    handleTabChange('jarvis');
  }

  // ── Phase 7: Occurrence command handlers ──────────────────────────────────
  const handleCompleteOccurrence = useCallback(async (id) => {
    if (completingOccurrences.current.has(id)) return;
    completingOccurrences.current.add(id);
    try {
      const occurrence = todayOccurrences.find(item => item.id === id);
      const { completeOccurrence } = await import('./database/habitOccurrenceRepository.js');
      await completeOccurrence(id);
      triggerHaptic();
      setCompletionFeedback({ habitTitle: occurrence?.habitTitle || 'Habit completed' });
      // Refresh today's occurrences
      setTodayOccurrences(await loadEnrichedOccurrences(daysAgoDate(today, 2), today, today));
    } catch (err) {
      console.error('[App] handleCompleteOccurrence failed:', err);
    } finally {
      completingOccurrences.current.delete(id);
    }
  }, [today, todayOccurrences]);

  const handleExcuseOccurrence = useCallback(async (id, reason) => {
    try {
      const { excuseOccurrence } = await import('./database/habitOccurrenceRepository.js');
      await excuseOccurrence(id, reason);
      setTodayOccurrences(await loadEnrichedOccurrences(daysAgoDate(today, 2), today, today));
    } catch (err) {
      console.error('[App] handleExcuseOccurrence failed:', err);
    }
  }, [today]);

  const handleOccurrenceReason = useCallback(async (id, reason) => {
    try {
      const { recordOccurrenceReason } = await import('./database/habitOccurrenceRepository.js');
      await recordOccurrenceReason(id, reason);
      setTodayOccurrences(await loadEnrichedOccurrences(daysAgoDate(today, 2), today, today));
    } catch (err) {
      console.error('[App] handleOccurrenceReason failed:', err);
    }
  }, [today]);

  // ── Phase 7: Learn tab handlers ───────────────────────────────────────────
  const handleAddLearning = useCallback(async (fields) => {
    try {
      const { addLearning, getAllLearnings } = await import('./database/learningRepository.js');
      const learningId = await addLearning(fields);
      setLearnings(await getAllLearnings());

      // Phase 7: Auto-create Relation
      if (fields.sourceId) {
        const { addRelation } = await import('./database/relationRepository.js');
        await addRelation(learningId, fields.sourceId, 'derived_from', 1.0);
      }
    } catch (err) {
      console.error('[App] handleAddLearning failed:', err);
      throw err;
    }
  }, []);

  const handleLogLearningPractice = useCallback(async ({ learningId, content, axis }) => {
    const { getLearning, getAllLearnings, updateLearning } = await import('./database/learningRepository.js');
    const learning = await getLearning(learningId);
    if (!learning) throw new Error('This learning topic no longer exists.');

    const logId = await addLog({
      axis,
      type: 'learning_practice',
      value: 1,
      date: localDateStr(),
      meta: { learningId, content, source: 'manual' },
    });
    try {
      await updateLearning(learningId, {
        loopStep: 'Apply',
        lastPracticedAt: new Date().toISOString(),
      });
    } catch (error) {
      await deleteLog(logId).catch(() => {});
      throw error;
    }

    const freshLearnings = await getAllLearnings().catch(() => null);
    if (freshLearnings) setLearnings(freshLearnings);
    void recomputeStats();
  }, [recomputeStats]);

  const handleAddBook = useCallback(async (fields) => {
    try {
      const { addBook, getAllBooks } = await import('./database/booksRepository.js');
      await addBook(fields);
      setBooks(await getAllBooks());
    } catch (err) {
      console.error('[App] handleAddBook failed:', err);
    }
  }, []);

  const handleStartBook = useCallback(async (bookId, dateStr) => {
    try {
      const { updateBookStatus, getAllBooks } = await import('./database/booksRepository.js');
      await updateBookStatus(bookId, 'in_progress', dateStr);
      setBooks(await getAllBooks());
    } catch (err) {
      console.error('[App] handleStartBook failed:', err);
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
        <img src="/icon.jpg" alt="App Icon" style={{ width: 64, height: 64, marginBottom: '1rem', opacity: 0.8, borderRadius: '12px' }} />
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.3em', color: ACCENT, textTransform: 'uppercase' }}>
          Actions
        </div>
      </div>
    );
  }

  const renderPages = () => (
    <>
      <div style={{ display: tab === 'daily' ? 'block' : 'none' }}>
        <TodayTab
          t={t}
          todayOccurrences={todayOccurrences}
          onAddEvidence={handleAddEvidence}
          allQuests={allQuests}
          onCompleteOccurrence={handleCompleteOccurrence}
          onExcuseOccurrence={handleExcuseOccurrence}
          onOccurrenceReason={handleOccurrenceReason}
          completionFeedback={completionFeedback}
          onGoToGoals={() => handleTabChange('goals')}
          onOpenJarvis={context => handleOpenJarvis(context || { page: 'today' })}
        />
      </div>
      <div style={{ display: tab === 'stats' ? 'block' : 'none' }}>
        <StatsTab
          t={t}
          dark={dark}
          stats={stats}
          axisDetails={axisDetails}
          snapshot={latestSnapshot}
          allQuests={allQuests}
          allLogs={allLogs}
          axisConfigs={axisConfigs}
          onOpenJarvis={context => handleOpenJarvis(context || { page: 'stats' })}
        />
      </div>
      <div style={{ display: tab === 'goals' ? 'block' : 'none' }}>
        <GoalsTab
          t={t}
          dark={dark}
          allQuests={allQuests}
          allLogs={allLogs}
          onOpenJarvis={context => handleOpenJarvis(context || { page: 'goals' })}
        />
      </div>
      <div style={{ display: tab === 'learn' ? 'block' : 'none' }}>
        <LearnTab
          t={t}
          books={books}
          learnings={learnings}
          onUpdatePages={handleUpdatePages}
          onFinishBook={handleFinishBook}
          onAddLearning={handleAddLearning}
          onLogLearningPractice={handleLogLearningPractice}
          onAddBook={handleAddBook}
          onStartBook={handleStartBook}
                onOpenJarvis={context => handleOpenJarvis(context || { page: 'learn' })}
        />
      </div>
      <div style={{
        display: tab === 'jarvis' ? 'flex' : 'none',
        height: tab === 'jarvis' ? '100%' : undefined,
        minHeight: tab === 'jarvis' ? 0 : undefined,
        flexDirection: tab === 'jarvis' ? 'column' : undefined,
      }}>
        <JarvisTab
          t={t}
          isActive={tab === 'jarvis'}
          onQuestsChanged={refreshAfterJarvisAction}
          jarvisContext={jarvisContext}
          onClearContext={() => setJarvisContext(null)}
        />
      </div>
      <div style={{ display: tab === 'audits' ? 'block' : 'none' }}>
        <AuditsTab t={t} onOpenJarvis={context => handleOpenJarvis(context || { page: 'audits' })} />
      </div>
    </>
  );

  const getHeaderTitle = () => {
    switch (tab) {
      case 'daily': return 'Today';
      case 'stats': return 'Stats';
      case 'learn': return 'Learn';
      case 'goals': return 'Goals';
      case 'jarvis': return 'Jarvis';
      case 'audits': return 'Audits';
      default: return 'Actions';
    }
  };

  const getHeaderSubline = () => {
    if (tab === 'daily') return localDateStr();
    if (tab === 'stats') return 'Last 30 days';
    if (tab === 'goals') return `${lifeGoals.length} active`;
    if (tab === 'learn') return `${learnings.length} active topics`;
    if (tab === 'audits') return '';
    return '';
  };

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
  }
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
