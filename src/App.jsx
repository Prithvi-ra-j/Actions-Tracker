import React, { useEffect, useState, useCallback } from 'react';
import { THEMES, ACCENT } from './constants.js';
import { localDateStr }   from './helpers/dateHelpers.js';

// ── Database ──────────────────────────────────────────────────────────────────
import { initDB }                from './database/db.js';
import { migrateFromLocalStorage } from './database/migration.js';
import { initAxisConfigs, getAllAxisConfigs } from './database/axisConfigRepository.js';
import { getAllLogs }              from './database/logsRepository.js';
import { initQuestBoard, getAllQuests, syncQuestProgress } from './database/questBoardRepository.js';
import { getAllDailyRecords, saveDailyRecord } from './database/dailyRepository.js';
import { getAllGoalChecks,   setGoalCheck }    from './database/goalsRepository.js';
import { getAllMilestoneChecks, setMilestoneCheck } from './database/milestonesRepository.js';
import { getSetting, setSetting, getReminders, saveReminders } from './database/settingsRepository.js';
import { checkAndWriteWeeklySnapshot, getLatestSnapshot } from './database/statSnapshotsRepository.js';

// ── Helpers ─────────────────────────────────────────────────────────────────────────────
import { computeAllStats, computeAxisDetails } from './helpers/statsEngine.js';

// ── Native ────────────────────────────────────────────────────────────────────
import { rescheduleDailyCheck } from './native/notifications.js';
import { registerBackHandler, setupStatusBar } from './native/backButton.js';

// ── Components ────────────────────────────────────────────────────────────────
import TodayTab      from './components/TodayTab.jsx';
import GoalsTab      from './components/GoalsTab.jsx';
import MilestonesTab from './components/MilestonesTab.jsx';
import CalendarTab   from './components/CalendarTab.jsx';
import PersonaTab    from './components/PersonaTab.jsx';
import SettingsTab   from './components/SettingsTab.jsx';
import OnboardingScreen from './components/OnboardingScreen.jsx';
import StatsTab         from './components/StatsTab.jsx';

// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'daily',      label: 'Today'    },
  { id: 'stats',      label: 'Stats'    },
  { id: 'goals',      label: 'Goals'    },
  { id: 'milestones', label: 'Timeline' },
  { id: 'calendar',   label: 'Calendar' },
  { id: 'persona',    label: 'The Man'  },
];

// Total possible goal targets (4 goals × 4 targets each)
const TOTAL_TARGETS = 16;

// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Bootstrap state ────────────────────────────────────────────────────────
  const [dbReady,         setDbReady]         = useState(false);
  const [dbError,         setDbError]         = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [tab,          setTab]          = useState('daily');
  const [dark,         setDark]         = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [expanded,     setExpanded]     = useState(null); // expanded goal index

  // ── Data state (loaded from DB on mount; written back on every change) ─────
  const [allDailyRecords,  setAllDailyRecords]  = useState({});
  const [goalChecks,       setGoalChecks]        = useState({});
  const [milestoneChecks,  setMilestoneChecks]   = useState({});
  const [reminders,        setReminders]         = useState([
    { id: 1, label: 'BODY',        time: '07:00', enabled: true },
    { id: 2, label: 'PHILOSOPHY',  time: '20:30', enabled: true },
    { id: 3, label: 'DAILY CHECK', time: '22:00', enabled: true },
  ]);

  // ── Stat engine state ─────────────────────────────────────────────────────────
  const [stats,            setStats]             = useState({ strength: 0, discipline: 0, knowledge: 0, wisdom: 0, creativity: 0, strategy: 0 });
  const [axisDetails,      setAxisDetails]        = useState({});
  const [allQuests,        setAllQuests]          = useState([]);
  const [latestSnapshot,   setLatestSnapshot]     = useState(null);

  // ── Derived values ─────────────────────────────────────────────────────────
  const t          = dark ? THEMES.dark : THEMES.light;
  const today      = localDateStr();
  const todayRecord = allDailyRecords[today] ?? { body: false, philosophy: false, art: false, history: false };
  const doneTargets = Object.values(goalChecks).filter(Boolean).length;
  const dailyDone   = [todayRecord.body, todayRecord.philosophy, todayRecord.art, todayRecord.history].filter(Boolean).length;

  // ── Initialise DB and load all data ───────────────────────────────────────
  useEffect(() => {
    async function bootstrap() {
      try {
        await initDB();
        await migrateFromLocalStorage();
        await initAxisConfigs();
        await initQuestBoard();

        const [records, goals, milestones, darkPref, savedReminders, allLogs, axisConfigs, quests] =
          await Promise.all([
            getAllDailyRecords(),
            getAllGoalChecks(),
            getAllMilestoneChecks(),
            getSetting('darkMode'),
            getReminders(),
            getAllLogs(),
            getAllAxisConfigs(),
            getAllQuests(),
          ]);

        // Sync quest progress from logs, then re-fetch updated quests
        await syncQuestProgress(allLogs);
        const syncedQuests = await getAllQuests();

        if (allLogs.filter(l => l.type !== 'daily_checkbox').length === 0) {
          // Only show onboarding if there are no meaningful logs yet
          // (daily checkboxes alone don't count as "onboarded")
          setNeedsOnboarding(true);
        }

        setAllDailyRecords(records);
        setGoalChecks(goals);
        setMilestoneChecks(milestones);
        setAllQuests(syncedQuests);
        if (darkPref === 'true') setDark(true);
        if (savedReminders?.length) setReminders(savedReminders);

        // Compute stats + per-axis details
        const today = localDateStr();
        const initialStats = computeAllStats(allLogs, axisConfigs, syncedQuests, today);
        const details = computeAxisDetails(allLogs, axisConfigs, syncedQuests, today);
        setStats(initialStats);
        setAxisDetails(details);

        // Weekly auto-snapshot (spec §10) — write if 7+ days since last
        await checkAndWriteWeeklySnapshot(initialStats, today);
        const snap = await getLatestSnapshot();
        setLatestSnapshot(snap);
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

  // ── Android back-button handler ────────────────────────────────────────────
  // Re-registers whenever the relevant state changes so the handler is current.
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
      const [freshLogs, freshConfigs] = await Promise.all([getAllLogs(), getAllAxisConfigs()]);
      await syncQuestProgress(freshLogs);
      const freshQuests = await getAllQuests();
      const today = localDateStr();
      setAllQuests(freshQuests);
      const newStats   = computeAllStats(freshLogs, freshConfigs, freshQuests, today);
      const newDetails = computeAxisDetails(freshLogs, freshConfigs, freshQuests, today);
      setStats(newStats);
      setAxisDetails(newDetails);
    } catch (err) {
      console.error('[App] recomputeStats failed:', err);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDailyToggle = useCallback(async (id) => {
    const newRecord = { ...todayRecord, [id]: !todayRecord[id] };
    // Optimistic UI update
    setAllDailyRecords(prev => ({ ...prev, [today]: newRecord }));

    try {
      await saveDailyRecord(today, newRecord);
      // Reschedule the Daily Check notification with the fresh score
      const dcReminder = reminders.find(r => r.id === 3);
      if (dcReminder?.enabled) {
        await rescheduleDailyCheck(newRecord, dcReminder.time, true);
      }
      // Recompute stats after any daily checkbox change
      await recomputeStats();
    } catch (err) {
      console.error('[App] saveDailyRecord failed:', err);
    }
  }, [todayRecord, today, reminders, recomputeStats]);

  const handleGoalToggle = useCallback(async (key) => {
    const newValue = !goalChecks[key];
    setGoalChecks(prev => ({ ...prev, [key]: newValue }));
    try {
      await setGoalCheck(key, newValue);
    } catch (err) {
      console.error('[App] setGoalCheck failed:', err);
    }
  }, [goalChecks]);

  const handleMilestoneToggle = useCallback(async (key) => {
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
  }

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (!dbReady) {
    return (
      <div style={{ background: '#1c1916', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.3em', color: ACCENT, textTransform: 'uppercase' }}>
          Loading…
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  if (needsOnboarding) {
    return <OnboardingScreen t={t} onComplete={() => setNeedsOnboarding(false)} />;
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
          <span style={{ fontFamily: 'monospace', fontSize: '0.58rem', letterSpacing: '0.3em', color: t.headerText, textTransform: 'uppercase' }}>
            Prithvi · Year End Goals · 2026
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.58rem', color: ACCENT, letterSpacing: '0.1em' }}>
              {tab === 'daily'
                ? `${dailyDone}/4 today`
                : `${doneTargets}/${TOTAL_TARGETS} targets`}
            </span>

            {/* Settings gear */}
            <button
              id="btn-settings"
              onClick={() => setShowSettings(s => !s)}
              aria-label={showSettings ? 'Close settings' : 'Open settings'}
              style={{
                width: 26, height: 26, borderRadius: '50%',
                border: `1px solid rgba(247,243,236,0.25)`,
                background: showSettings ? ACCENT : 'transparent',
                color: t.headerText,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', padding: 0, lineHeight: 1,
              }}
            >
              ⚙
            </button>
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

      {/* ── TAB BAR ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TABS.length}, 1fr)`, borderBottom: `2px solid ${t.headerBg}` }}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            id={`tab-${id}`}
            onClick={() => handleTabChange(id)}
            style={{
              padding: '0.65rem 0.25rem',
              background: tab === id && !showSettings ? t.headerBg : 'transparent',
              color:      tab === id && !showSettings ? t.headerText : t.tabInactive,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '0.46rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
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
          />
        ) : (
          <>
            {tab === 'daily' && (
              <TodayTab
                t={t}
                allDailyRecords={allDailyRecords}
                onToggle={handleDailyToggle}
                onGoToGoals={() => handleTabChange('stats')}
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
              />
            )}

            {tab === 'calendar' && (
              <CalendarTab
                t={t}
                allDailyRecords={allDailyRecords}
              />
            )}

            {tab === 'persona' && (
              <PersonaTab t={t} stats={stats} allQuests={allQuests} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
