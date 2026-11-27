import React, { lazy, Suspense, useEffect, useState, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { THEMES, ACCENT } from './constants.js';
import { localDateStr, subtractDays } from './helpers/dateHelpers.js';
import { loadEnrichedOccurrences } from './core/appData.js';
import useAppActions from './hooks/useAppActions.js';

// ── Database ──────────────────────────────────────────────────────────────────
import { initDB }                from './database/db.js';
import { migrateFromLocalStorage, migrateAxisVocabulary } from './database/migration.js';
import { initAxisConfigs, getAllAxisConfigs } from './database/axisConfigRepository.js';
import { getAllLogs } from './database/logsRepository.js';
import { initQuestBoard, getAllQuests, syncQuestProgress } from './database/questBoardRepository.js';
import { initGoals, getAllGoals } from './database/goalsRepository.js';
import { getSetting, setSetting, getReminders, saveReminders } from './database/settingsRepository.js';
import { checkAndWriteWeeklySnapshot, getLatestSnapshot } from './database/statSnapshotsRepository.js';
import { runAnomalyDetection, saveTelemetryEvent } from './database/telemetryRepository.js';
import { runAutoBackup, restoreLatestBackupIfDatabaseEmpty } from './database/backupService.js';
import { hasUserData } from './database/bootstrapState.js';
import { hasJarvisApiKey } from './core/ai/jarvisConfig.js';
import { registerConnector } from './core/sync/syncManager.js';
import { HealthConnectConnector } from './core/sync/connectors/HealthConnectConnector.js';
import { bootstrapAnalysisScheduler } from './core/ai/analysisScheduler.js';
import { installGlobalErrorLogging, markErrorLoggerReady } from './core/errorLogger.js';
import { checkForUpdate } from './core/updateChecker.js';

// ── Helpers ─────────────────────────────────────────────────────────────────────────────

// ── Native ────────────────────────────────────────────────────────────────────
import { scheduleAllReminders, requestNotificationPermission } from './native/notifications.js';
import { registerBackHandler, setupStatusBar } from './native/backButton.js';

// ── Components ────────────────────────────────────────────────────────────────
import CompletionFeedback from './components/CompletionFeedback.jsx';
import ProofFearCheckin  from './components/ProofFearCheckin.jsx';
import UpdateBanner      from './components/UpdateBanner.jsx';
import AppShell          from './components/AppShell.jsx';
import AppPages          from './components/AppPages.jsx';

const OnboardingFlow = lazy(() => import('./components/onboarding/OnboardingFlow.jsx'));
const SettingsTab = lazy(() => import('./components/SettingsTab.jsx'));

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
      if (projection.warnings?.some(warning => warning.includes('pipeline_error:'))) {
        throw new Error(projection.warnings.join('; '));
      }
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
      stats[domain] = null;
      details[domain] = { components: [], scoreSource: null, coverage: null, confidence: null, warnings: ['projection_failed'] };
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
  const [vedConfigured, setVedConfigured] = useState(false);
  const settingsWasOpen = useRef(false);
  const [expanded,     setExpanded]     = useState(null); // expanded goal index
  const [jarvisContext, setJarvisContext] = useState(null);

  useLayoutEffect(() => {
    if (showSettings) {
      settingsWasOpen.current = true;
    } else if (settingsWasOpen.current) {
      settingsWasOpen.current = false;
      document.getElementById('settings-btn')?.focus();
    }
  }, [showSettings]);

  // ── Data state (loaded from DB on mount; written back on every change) ─────
  const [allLogs,          setAllLogs]          = useState([]);
  const [lifeGoals,        setLifeGoals]        = useState([]);
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

  // ── Phase 4/5 engagement state ────────────────────────────────────────────────────
  const [completionFeedback, setCompletionFeedback] = useState(null);
  const [habitSummaries, setHabitSummaries] = useState([]);
  const [dailyError, setDailyError] = useState('');
  const [dailyNotice, setDailyNotice] = useState('');
  const [reminderPromptPending, setReminderPromptPending] = useState(false);
  const [reminderError, setReminderError] = useState('');
  const [reminderSaving, setReminderSaving] = useState(false);
  const [showCheckin,      setShowCheckin]        = useState(false);

  // ── Phase 7: Learn tab state ───────────────────────────────────────────────
  const [todayOccurrences, setTodayOccurrences] = useState([]);
  const [today, setToday] = useState(() => localDateStr());
  const [books,            setBooks]            = useState([]);
  const [learnings,        setLearnings]        = useState([]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const t          = dark ? THEMES.dark : THEMES.light;
  useEffect(() => {
    let timer;
    const updateDate = () => {
      const now = new Date();
      setToday(localDateStr(now));
      const next = new Date(now);
      next.setHours(24, 0, 0, 100);
      clearTimeout(timer);
      timer = setTimeout(updateDate, next.getTime() - now.getTime());
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') updateDate();
    };
    updateDate();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const previousToday = useRef(today);
  useEffect(() => {
    if (!dbReady || needsOnboarding || previousToday.current === today) return;
    previousToday.current = today;
    setDailyNotice('');
    let cancelled = false;
    (async () => {
      try {
        const { generateOccurrencesForDate } = await import('./core/occurrenceEngine.js');
        const { loadHabitSummaries } = await import('./core/dailyHabits.js');
        await generateOccurrencesForDate(today);
        const [occurrences, habits] = await Promise.all([
          loadEnrichedOccurrences(subtractDays(today, 2), today, today),
          loadHabitSummaries(),
        ]);
        if (!cancelled) {
          setTodayOccurrences(occurrences);
          setHabitSummaries(habits);
        }
      } catch (error) {
        console.error('[App] Could not refresh the new day:', error);
        if (!cancelled) setDailyError('Could not load today’s habits. Restart the app to try again.');
      }
    })();
    return () => { cancelled = true; };
  }, [dbReady, needsOnboarding, today]);
  const todayRecord = useMemo(() => {
    const rec = { body: false, philosophy: false, art: false, history: false };
    const dayLogs = allLogs.filter(l => l.type === 'daily_checkbox' && l.date === today);
    for (const log of dayLogs) {
      if (log.meta?.task) rec[log.meta.task] = true;
    }
    return rec;
  }, [allLogs, today]);

  // ── Initialise DB and load all data ───────────────────────────────────────
  useEffect(() => {
    async function bootstrap() {
      try {
        await saveTelemetryEvent('app_started', localDateStr(), { type: 'boot' }).catch(() => {});
        await initDB();

        const recovery = await restoreLatestBackupIfDatabaseEmpty();
        if (recovery.reason === 'restore_error') {
          throw recovery.error;
        }
        await markErrorLoggerReady();
        installGlobalErrorLogging();
        await migrateFromLocalStorage();
        await saveTelemetryEvent('db_migration_success', localDateStr(), {}).catch(() => {});
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

        const [goals, darkPref, savedReminders, allLogs, axisConfigs] =
          await Promise.all([
            getAllGoals(),
            getSetting('darkMode'),
            getReminders(),
            getAllLogs(),
            getAllAxisConfigs(),
          ]);

        // Register integrations
        registerConnector(new HealthConnectConnector());

        // Sync quest progress from logs, then re-fetch updated quests
        await syncQuestProgress(allLogs);
        const syncedQuests = await getAllQuests();

        // First-run detection is intentionally data-based:
        // an empty user-data layer means the app has never been set up.
        const userDataExists = await hasUserData();
        setNeedsOnboarding(!userDataExists);
        setVedConfigured(await hasJarvisApiKey());

        setAllLogs(allLogs);
        setAxisConfigs(axisConfigs);
        setLifeGoals(goals);
        setAllQuests(syncedQuests);

        if (!userDataExists) {
          checkForUpdate().then(info => { if (info) setUpdateInfo(info); }).catch(() => {});
          setDbReady(true);
          return;
        }

        setReminderPromptPending(await getSetting('firstHabitReminderPrompt') === 'pending');
        const todayStr = localDateStr();
        const enrichedOccs = await loadEnrichedOccurrences(subtractDays(todayStr, 2), todayStr, todayStr);
        setTodayOccurrences(enrichedOccs);
        const { loadHabitSummaries } = await import('./core/dailyHabits.js');
        setHabitSummaries(await loadHabitSummaries());
        try {
          const { getAllHabits } = await import('./database/habitRepository.js');
          const habitsWithReminders = (await getAllHabits()).filter(habit => habit.reminder?.number);
          if (habitsWithReminders.length) {
            const { scheduleHabitReminder } = await import('./native/habitReminders.js');
            const failed = [];
            for (const habit of habitsWithReminders) {
              try {
                await scheduleHabitReminder(habit);
              } catch (error) {
                console.error('[App] Could not restore reminder for habit:', habit.id, error);
                failed.push(habit.name);
              }
            }
            if (failed.length) setDailyError(`Could not restore reminders for: ${failed.join(', ')}. Check notification settings.`);
          }
        } catch (error) {
          console.error('[App] Could not restore habit reminders:', error);
          setDailyError('Some habit reminders could not be restored. Check notification settings and edit the affected habits.');
        }

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

        // ── Phase 5: Sunday Reflection state ──────────────────────────────────

        // ── Monthly proof/fear check-in (spec §12) ────────────────────────────
        // The first check-in is anchored to the user's FIRST REAL DATA DATE.
        // It must never appear merely because the app was opened/restarted.
        // After the first check-in, subsequent check-ins are 30 days apart.
        const realActivityLogs = allLogs
          .filter(l => !['onboarding_assessment', 'proof_check_in'].includes(l.type))
          .filter(l => typeof l.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(l.date))
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
        if (Object.values(initialStats).every(Number.isFinite)) {
          await checkAndWriteWeeklySnapshot(initialStats, details, today);
        } else {
          setDailyError('Some progress scores could not be calculated. Open Stats for details and try again later.');
        }
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
            loadEnrichedOccurrences(subtractDays(today, 2), today, today),
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
      if (expanded !== null)   { setExpanded(null);        return true; }
      if (tab !== 'daily')     { setTab('daily');          return true; }
      return false; // allow exit
    });
  }, [showSettings, expanded, tab]);

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
      setAllLogs(freshLogs);
      setAxisConfigs(freshConfigs);
      setAllQuests(freshQuests);
      
      const { stats: newStats, details: newDetails } = await getScoresAsync();
      
      setStats(newStats);
      setAxisDetails(newDetails);
      if (Object.values(newStats).some(value => !Number.isFinite(value))) {
        setDailyError('Some progress scores could not be calculated. Open Stats for details and try again later.');
      }

    } catch (err) {
      console.error('[App] recomputeStats failed:', err);
      setDailyError('Some progress data could not be refreshed. Restart the app to try again.');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh the execution view after Ved writes a habit. The original
  // callback only recomputed stats, leaving today's occurrence list stale.
  const refreshAfterJarvisAction = useCallback(async () => {
    try {
      const { generateOccurrencesForDate } = await import('./core/occurrenceEngine.js');
      await generateOccurrencesForDate(today);
      const enriched = await loadEnrichedOccurrences(
        subtractDays(today, 2),
        today,
        today
      );
      setTodayOccurrences(enriched);
      const { loadHabitSummaries } = await import('./core/dailyHabits.js');
      setHabitSummaries(await loadHabitSummaries());
      await recomputeStats();
    } catch (err) {
      console.error('[App] Failed to refresh after Ved action:', err);
      setDailyError('Changes were applied, but Today could not be refreshed. Restart the app to reload it.');
    }
  }, [today, recomputeStats]);

  const {
    handleAddEvidence,
    handleAddHabit,
    handleSaveReminders,
    handleCompleteOccurrence,
    handleUndoCompletion,
    handleCorrectCompletion,
    handleRestDay,
    handleUpdateHabit,
    handleExcuseOccurrence,
    handleOccurrenceReason,
    handleAddLearning,
    handleLogLearningPractice,
    handleAddBook,
    handleStartBook,
    handleUpdatePages,
    handleFinishBook,
  } = useAppActions({
    today,
    setReminders,
    todayOccurrences,
    setTodayOccurrences,
    setCompletionFeedback,
    setLearnings,
    setBooks,
    recomputeStats,
    setHabitSummaries,
    setDailyError,
    setDailyNotice,
  });
  const dismissCompletionFeedback = useCallback(() => setCompletionFeedback(null), []);

  async function handleFirstReminder(enable) {
    setReminderSaving(true);
    setReminderError('');
    try {
      if (enable) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          setReminderError('Notifications are unavailable or permission was not granted. You can continue without them.');
          return;
        }
        const updated = reminders.map(reminder => reminder.id === 4 ? { ...reminder, enabled: true } : reminder);
        if (!updated.some(reminder => reminder.id === 4)) throw new Error('Habit reminder configuration is missing.');
        try {
          await scheduleAllReminders(updated, todayRecord, false, { strict: true });
        } catch (error) {
          await scheduleAllReminders(reminders, todayRecord);
          throw error;
        }
        await saveReminders(updated);
        setReminders(updated);
      }
      await setSetting('firstHabitReminderPrompt', 'done');
      setReminderPromptPending(false);
    } catch (error) {
      console.error('[App] Could not update reminder:', error);
      setReminderError('Could not save your reminder choice. Please try again.');
    } finally {
      setReminderSaving(false);
    }
  }

  function handleTabChange(id) {
    setTab(id);
    setShowSettings(false);
  }

  function handleOpenJarvis(context = { page: tab }) {
    const normalizedContext = typeof context === 'string'
      ? { page: context }
      : context || { page: tab };
    setJarvisContext(normalizedContext);
    handleTabChange('jarvis');
  }

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (!dbReady) {
    return (
      <div role="status" aria-label="Loading Actions app" style={{ background: '#1c1916', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/icon.jpg" alt="App Icon" style={{ width: 64, height: 64, marginBottom: '1rem', opacity: 0.8, borderRadius: '12px' }} />
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.3em', color: ACCENT, textTransform: 'uppercase' }}>
          Actions
        </div>
      </div>
    );
  }

  const getHeaderTitle = () => {
    switch (tab) {
      case 'daily': return 'Today';
      case 'stats': return 'Stats';
      case 'learn': return 'Learn';
      case 'goals': return 'Goals';
      case 'jarvis': return 'Ved';
      case 'audits': return 'Audits';
      default: return 'Actions';
    }
  };

  const getHeaderSubline = () => {
    if (tab === 'daily') return localDateStr();
    if (tab === 'stats') return 'Your growth';
    if (tab === 'goals') return `${lifeGoals.length} active`;
    if (tab === 'learn') return `${learnings.length} active topics`;
    if (tab === 'audits') return '';
    return '';
  };

  // ── Main render ────────────────────────────────────────────────────────────
  if (needsOnboarding) {
    return (
      <Suspense fallback={<div role="status">Loading onboarding…</div>}>
        <OnboardingFlow
          t={t}
          onComplete={async ({ startInToday = false } = {}) => {
            setNeedsOnboarding(false);
            setTab(startInToday ? 'daily' : 'jarvis');

            try {
              const { generateOccurrencesForDate } = await import('./core/occurrenceEngine.js');
              await generateOccurrencesForDate(today);
              setTodayOccurrences(await loadEnrichedOccurrences(subtractDays(today, 2), today, today));
              const { loadHabitSummaries } = await import('./core/dailyHabits.js');
              setHabitSummaries(await loadHabitSummaries());
              setReminders(await getReminders());
              setReminderPromptPending(await getSetting('firstHabitReminderPrompt') === 'pending');
            } catch (error) {
              console.error('[App] Could not load the new plan:', error);
              setDbError('Your plan was saved, but Today could not be refreshed. Restart the app to try again.');
            }
            // Onboarding is high-value user data. Force a recovery snapshot now
            // so a later reinstall/update can restore the completed setup.
            await runAutoBackup({ force: true }).catch(() => {});
            try {
              await recomputeStats();
            } catch (error) {
              console.error('[App] Could not finish post-onboarding setup:', error);
              setDbError('Your plan was saved, but some progress data could not be refreshed.');
            }
          }}
        />
      </Suspense>
    );
  }
  return (
    <>
      {showSettings ? (
        <Suspense fallback={<div role="status">Loading settings…</div>}>
          <SettingsTab
            t={t}
            dark={dark}
            setDark={setDark}
            reminders={reminders}
            setReminders={setReminders}
            onSaveReminders={handleSaveReminders}
            todayRecord={todayRecord}
            onClose={async () => {
              setShowSettings(false);
              try {
                setReminderPromptPending(await getSetting('firstHabitReminderPrompt') === 'pending');
                setVedConfigured(await hasJarvisApiKey());
              } catch (error) {
                console.error('[App] Could not refresh settings:', error);
                setDbError('Could not reload your settings.');
              }
            }}
          />
        </Suspense>
      ) : (
        <AppShell
          currentTab={tab}
          onTabChange={handleTabChange}
          onOpenJarvis={handleOpenJarvis}
          vedConfigured={vedConfigured}
          onOpenSettings={() => setShowSettings(true)}
          headerTitle={getHeaderTitle()}
          headerSubline={getHeaderSubline()}
        >
          {dbError && (
            <div role="alert" style={{ margin: '12px 14px', padding: '12px', borderRadius: 'var(--r-control)', background: 'var(--s2)', color: 'var(--danger)' }}>
              Local data could not be loaded. Some changes may not be saved. Details: {dbError}
            </div>
          )}
          {dailyError && <div role="alert" style={{ margin: '12px 14px', color: 'var(--danger)' }}>
            {dailyError} <button type="button" onClick={() => setDailyError('')}>Dismiss</button>
          </div>}
          {dailyNotice && <div role="status" style={{ margin: '12px 14px' }}>
            {dailyNotice} <button type="button" onClick={() => setDailyNotice('')}>Dismiss</button>
          </div>}
          {reminderPromptPending && todayOccurrences.some(occurrence => occurrence.status === 'completed') && (
            <section aria-label="Habit reminder" style={{ margin: '12px 14px', padding: '14px', background: 'var(--s1)', borderRadius: 'var(--r-control)' }}>
              <p>Nice work. Would you like a daily reminder at {reminders.find(reminder => reminder.id === 4)?.time}?</p>
              {reminderError && <p role="alert">{reminderError}</p>}
              <button type="button" disabled={reminderSaving} onClick={() => handleFirstReminder(true)}>Enable reminder</button>{' '}
              <button type="button" disabled={reminderSaving} onClick={() => handleFirstReminder(false)}>Not now</button>
            </section>
          )}
          <UpdateBanner updateInfo={updateInfo} />
          <AppPages
            currentTab={tab}
            t={t}
            dark={dark}
            today={today}
            todayOccurrences={todayOccurrences}
            habits={habitSummaries}
            onUpdateHabit={handleUpdateHabit}
            onRestDay={handleRestDay}
            books={books}
            learnings={learnings}
            stats={stats}
            axisDetails={axisDetails}
            snapshot={latestSnapshot}
            allQuests={allQuests}
            allLogs={allLogs}
            axisConfigs={axisConfigs}
            completionFeedback={completionFeedback}
            jarvisContext={jarvisContext}
            onAddEvidence={handleAddEvidence}
            onAddHabit={handleAddHabit}
            onCompleteOccurrence={handleCompleteOccurrence}
            onCorrectCompletion={handleCorrectCompletion}
            onRefreshScores={recomputeStats}
            onExcuseOccurrence={handleExcuseOccurrence}
            onOccurrenceReason={handleOccurrenceReason}
            onGoToGoals={() => handleTabChange('goals')}
            onGoToToday={() => handleTabChange('daily')}
            onOpenJarvis={handleOpenJarvis}
            vedConfigured={vedConfigured}
            onQuestsChanged={refreshAfterJarvisAction}
            onClearJarvisContext={() => setJarvisContext(null)}
            onUpdatePages={handleUpdatePages}
            onFinishBook={handleFinishBook}
            onAddLearning={handleAddLearning}
            onLogLearningPractice={handleLogLearningPractice}
            onAddBook={handleAddBook}
            onStartBook={handleStartBook}
          />
        </AppShell>
      )}
      <CompletionFeedback feedback={completionFeedback} onDismiss={dismissCompletionFeedback} onUndo={handleUndoCompletion} />
      {showCheckin && (
        <ProofFearCheckin onComplete={async () => { setShowCheckin(false); await recomputeStats(); }} />
      )}
    </>
  );
}
