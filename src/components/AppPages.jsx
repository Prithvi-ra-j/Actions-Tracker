import React, { lazy, Suspense, useEffect, useState } from 'react';

const TodayTab = lazy(() => import('./TodayTab.jsx'));
const StatsTab = lazy(() => import('./StatsTab.jsx'));
const GoalsTab = lazy(() => import('./GoalsTab.jsx'));
const LearnTab = lazy(() => import('./LearnTab.jsx'));
const JarvisTab = lazy(() => import('./JarvisTab.jsx'));
const AuditsTab = lazy(() => import('./AuditsTab.jsx'));

const PAGE_LABELS = {
  daily: 'Today',
  stats: 'Stats',
  goals: 'Goals',
  learn: 'Learn',
  jarvis: 'Ved',
  audits: 'Audits',
};

function AppPage({ id, currentTab, visitedTabs, children, style }) {
  if (!visitedTabs.has(id) && currentTab !== id) return null;

  return (
    <div id={`page-${id}`} hidden={currentTab !== id} style={style}>
      <Suspense fallback={<div role="status">Loading {PAGE_LABELS[id]}…</div>}>
        {children}
      </Suspense>
    </div>
  );
}

export default function AppPages({
  currentTab,
  t,
  dark,
  today,
  todayOccurrences,
  habits,
  onUpdateHabit,
  onRestDay,
  books,
  learnings,
  stats,
  axisDetails,
  snapshot,
  allQuests,
  allLogs,
  axisConfigs,
  completionFeedback,
  jarvisContext,
  onAddEvidence,
  onAddHabit,
  onCompleteOccurrence,
  onCorrectCompletion,
  onRefreshScores,
  onExcuseOccurrence,
  onOccurrenceReason,
  onGoToGoals,
  onGoToToday,
  onOpenJarvis,
  vedConfigured,
  onQuestsChanged,
  onClearJarvisContext,
  onUpdatePages,
  onFinishBook,
  onAddLearning,
  onLogLearningPractice,
  onAddBook,
  onStartBook,
}) {
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([currentTab]));

  useEffect(() => {
    setVisitedTabs(previous => new Set([...previous, currentTab]));
  }, [currentTab]);

  return (
    <>
      <AppPage id="daily" currentTab={currentTab} visitedTabs={visitedTabs}>
        <TodayTab
          t={t}
          today={today}
          todayOccurrences={todayOccurrences}
          habits={habits}
          onUpdateHabit={onUpdateHabit}
          onRestDay={onRestDay}
          onAddEvidence={onAddEvidence}
          onAddHabit={onAddHabit}
          allQuests={allQuests}
          onCompleteOccurrence={onCompleteOccurrence}
          onExcuseOccurrence={onExcuseOccurrence}
          onOccurrenceReason={onOccurrenceReason}
          completionFeedback={completionFeedback}
          onGoToGoals={onGoToGoals}
          onOpenJarvis={vedConfigured ? context => onOpenJarvis(context || { page: 'today' }) : undefined}
        />
      </AppPage>
      <AppPage id="stats" currentTab={currentTab} visitedTabs={visitedTabs}>
        <StatsTab
          t={t}
          today={today}
          isActive={currentTab === 'stats'}
          todayOccurrences={todayOccurrences}
          dark={dark}
          stats={stats}
          axisDetails={axisDetails}
          snapshot={snapshot}
          allQuests={allQuests}
          allLogs={allLogs}
          axisConfigs={axisConfigs}
          onGoToToday={onGoToToday}
          onCorrectCompletion={onCorrectCompletion}
          onRefreshScores={onRefreshScores}
          onOpenJarvis={vedConfigured ? context => onOpenJarvis(context || { page: 'stats' }) : undefined}
        />
      </AppPage>
      <AppPage id="goals" currentTab={currentTab} visitedTabs={visitedTabs}>
        <GoalsTab
          t={t}
          dark={dark}
          allQuests={allQuests}
          allLogs={allLogs}
          onOpenJarvis={vedConfigured ? context => onOpenJarvis(context || { page: 'goals' }) : undefined}
        />
      </AppPage>
      <AppPage id="learn" currentTab={currentTab} visitedTabs={visitedTabs}>
        <LearnTab
          t={t}
          books={books}
          learnings={learnings}
          onUpdatePages={onUpdatePages}
          onFinishBook={onFinishBook}
          onAddLearning={onAddLearning}
          onLogLearningPractice={onLogLearningPractice}
          onAddBook={onAddBook}
          onStartBook={onStartBook}
          onOpenJarvis={vedConfigured ? context => onOpenJarvis(context || { page: 'learn' }) : undefined}
        />
      </AppPage>
      <AppPage
        id="jarvis"
        currentTab={currentTab}
        visitedTabs={visitedTabs}
        style={{
          display: currentTab === 'jarvis' ? 'flex' : undefined,
          height: currentTab === 'jarvis' ? '100%' : undefined,
          minHeight: currentTab === 'jarvis' ? 0 : undefined,
          flexDirection: currentTab === 'jarvis' ? 'column' : undefined,
        }}
      >
        <JarvisTab
          t={t}
          isActive={currentTab === 'jarvis'}
          onQuestsChanged={onQuestsChanged}
          jarvisContext={jarvisContext}
          onClearContext={onClearJarvisContext}
        />
      </AppPage>
      <AppPage id="audits" currentTab={currentTab} visitedTabs={visitedTabs}>
        <AuditsTab
          t={t}
          isActive={currentTab === 'audits'}
          onOpenJarvis={context => onOpenJarvis(context || { page: 'audits' })}
        />
      </AppPage>
    </>
  );
}
