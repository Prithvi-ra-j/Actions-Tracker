import React, { useEffect, useRef, useState } from 'react';
import { ACCENT } from '../constants.js';
import { chatWithJarvis, generateInsight } from '../core/ai/jarvisEngine.js';
import { executeAction, undoAction } from '../core/ai/actionExecutor.js';
import { computeImpact } from '../core/ai/impactEngine.js';
import { conversationManager } from '../core/ai/conversationManager.js';
import { getAllConversations, getOrCreateConversation, saveConversation } from '../database/jarvisConversationRepository.js';
import { getRoutineConfig } from '../database/routineRepository.js';
import { getAllHabits } from '../database/habitRepository.js';
import { getAllLogs } from '../database/logsRepository.js';
import { getAllAxisConfigs } from '../database/axisConfigRepository.js';
import { getAllQuests } from '../database/questBoardRepository.js';
import { computeAllStats, computeAxisDetails } from '../helpers/statsEngine.js';
import { recordAppError } from '../core/errorLogger.js';
import { hasJarvisApiKey } from '../core/ai/jarvisConfig.js';
import JarvisApiSetup from './jarvis/JarvisApiSetup.jsx';
import { BottomSheet } from './ui/Overlays.jsx';
import { ActionProposalCard, ImpactDetailSheet, EditProposalSheet } from './ui/ProposalUI.jsx';
import './JarvisTab.css';

const DEFAULT_CONVERSATION_ID = 'jarvis_default';
const ONBOARDING_CONVERSATION_ID = 'jarvis_onboarding';

const MODES = [
  { id: 'ask', label: 'Ask', hint: 'Understand the system', icon: '✦' },
  { id: 'plan', label: 'Plan', hint: 'Turn intent into actions', icon: '◈' },
  { id: 'review', label: 'Review', hint: 'Inspect evidence and gaps', icon: '◌' },
  { id: 'act', label: 'Act', hint: 'Propose a change', icon: '→' },
  { id: 'capture', label: 'Capture', hint: 'Record learning or evidence', icon: '＋' },
  { id: 'audit', label: 'Audit', hint: 'Find contradictions and bottlenecks', icon: '⌁' },
];

const COMMANDS = [
  { id: 'ask', label: 'Ask Jarvis', description: 'Ask a question about your system', icon: '?', prompt: 'Ask Jarvis' },
  { id: 'habit', label: 'Create habit', description: 'Add a recurring habit', icon: '↻', prompt: 'Create a habit' },
  { id: 'quest', label: 'Create quest', description: 'Add a measurable quest or benchmark', icon: '◇', prompt: 'Create a quest' },
  { id: 'goal', label: 'Create goal', description: 'Define or update a goal', icon: '◎', prompt: 'Create a goal' },
  { id: 'routine', label: 'Adjust routine', description: 'Change the daily/weekly routine', icon: '◷', prompt: 'Adjust my routine' },
  { id: 'plan', label: 'Build a plan', description: 'Turn a ready plan into app changes', icon: '▱', prompt: 'Build and apply this plan' },
  { id: 'learn', label: 'Add learning', description: 'Capture a learning item or study plan', icon: '▤', prompt: 'Add learning' },
  { id: 'evidence', label: 'Log evidence', description: 'Record an observation, result, or reflection', icon: '✓', prompt: 'Log this evidence' },
  { id: 'memory', label: 'Save memory', description: 'Ask Jarvis to remember durable context', icon: '⌘', prompt: 'Save this as a memory' },
  { id: 'experiment', label: 'Run experiment', description: 'Create or update a personal experiment', icon: '◇', prompt: 'Create an experiment' },
  { id: 'target', label: 'Revise target', description: 'Change what success means', icon: '⊙', prompt: 'Revise my target' },
  { id: 'review', label: 'Review my system', description: 'Find trends, gaps, and bottlenecks', icon: '◌', prompt: 'Review my system' },
  { id: 'audit', label: 'Audit my system', description: 'Look for contradictions and risks', icon: '⌁', prompt: 'Audit my system' },
];

const destructiveActions = new Set(['archive_habit']);

function modeInstruction(mode) {
  const entry = MODES.find(item => item.id === mode);
  return entry ? '[Assistant mode: ' + entry.label + '] ' + entry.hint + '. ' : '';
}

export default function JarvisTab({ t, isActive = true, onQuestsChanged, onboardingMode = false, onOnboardingComplete, jarvisContext, onClearContext }) {
  const activeOnboardingMode = onboardingMode;
  const [activeConversationId, setActiveConversationId] = useState(DEFAULT_CONVERSATION_ID);
  const conversationId = activeOnboardingMode ? ONBOARDING_CONVERSATION_ID : activeConversationId;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('ask');
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [selectedProposalForImpact, setSelectedProposalForImpact] = useState(null);
  const [selectedProposalForEdit, setSelectedProposalForEdit] = useState(null);
  const [selectedPlanProposal, setSelectedPlanProposal] = useState(null);
  const [selectedPlanSteps, setSelectedPlanSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [error, setError] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [modificationContext, setModificationContext] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [homeFeedItems, setHomeFeedItems] = useState([]);
  const [reviewStories, setReviewStories] = useState(null);
  const [reviewStoryIndex, setReviewStoryIndex] = useState(0);
  const [conversationReady, setConversationReady] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [proactiveInsight, setProactiveInsight] = useState(null);
  const [apiConfigured, setApiConfigured] = useState(null);
  const [attachPageContext, setAttachPageContext] = useState(true);
  const [onboardingRetryNonce, setOnboardingRetryNonce] = useState(0);
  const messagesEndRef = useRef(null);
  const createdAtRef = useRef(null);
  const onboardingStartedRef = useRef(false);

  // The app keeps Jarvis mounted while switching tabs. Draft text must not
  // leak from a previous visit into the next visible Jarvis session.
  useEffect(() => {
    if (isActive) return;
    setInput('');
    setCommandMenuOpen(false);
    setCommandQuery('');
  }, [isActive]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const configured = await hasJarvisApiKey();
        if (cancelled) return;
        setApiConfigured(configured);
      } catch (err) {
        recordAppError(err, { source: 'jarvis_ui', operation: 'check_api_configuration' });
        if (!cancelled) setApiConfigured(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    import('../database/settingsRepository.js').then(async ({ getSetting }) => {
      const value = await getSetting('jarvisSendPageContext');
      if (!cancelled && value !== null) setAttachPageContext(value === 'true');
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (apiConfigured !== true) return undefined;
    setConversationReady(false);

    (async () => {
      try {
        const conversation = await getOrCreateConversation(conversationId, 'Jarvis');
        if (cancelled) return;

        const existingMessages = conversation.messages || [];
        setMessages(existingMessages);
        createdAtRef.current = conversation.createdAt || new Date().toISOString();
        conversationManager.hydrateFromUiMessages(existingMessages);
        setConversationReady(true);

        if (
          activeOnboardingMode &&
          existingMessages.length === 0 &&
          !onboardingStartedRef.current
        ) {
          onboardingStartedRef.current = true;
          setLoading(true);
          setLoadingPhase('Starting your onboarding…');
          setError(null);

          try {
            const response = await chatWithJarvis(
              'Start the onboarding interview now. Ask the user only the first focused question. Do not ask them to type a command or press send, and do not create or propose any changes yet.',
              [],
              null,
              { onboarding: activeOnboardingMode }
            );

            if (cancelled) return;

            const initialMessages = [{
              role: 'assistant',
              content: response.message || '',
              proposal: response.proposal,
              claims: response.claims,
              contextUsed: response.contextUsed,
            }];

            setMessages(initialMessages);
            await saveConversation({
              id: conversationId,
              type: 'Jarvis',
              messages: initialMessages,
              createdAt: createdAtRef.current,
            });
          } catch (err) {
            if (!cancelled) {
              recordAppError(err, { source: 'jarvis_ui', operation: 'start_onboarding' });
              const detail = err?.message
                ? String(err.message).slice(0, 320)
                : 'Unknown AI connection error.';
              setError(`Jarvis could not start the onboarding interview: ${detail}`);
              onboardingStartedRef.current = false;
            }
          } finally {
            if (!cancelled) {
              setLoading(false);
              setLoadingPhase('');
            }
          }
        }
      } catch (err) {
        recordAppError(err, { source: 'jarvis_ui', operation: 'load_conversation' });
        setError('Could not load conversation history. You can still start a new one.');
        setConversationReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, [conversationId, activeOnboardingMode, apiConfigured, onboardingRetryNonce]);

  useEffect(() => {
    let cancelled = false;
    if (apiConfigured !== true || !conversationReady || activeOnboardingMode) return undefined;

    (async () => {
      try {
        const [logs, quests] = await Promise.all([getAllLogs(), getAllQuests()]);
        if (cancelled) return;
        const evidenceItems = logs
          .filter(log => log.meta?.content || log.meta?.text)
          .map(log => {
            const text = String(log.meta.content || log.meta.text);
            return {
              id: `evidence-${log.id}`,
              kind: 'Evidence',
              title: text,
              detail: [log.axis || log.domain, log.date].filter(Boolean).join(' · '),
              timestamp: String(log.date || log.createdAt || ''),
              prompt: `Review this saved evidence: ${text}`,
            };
          });
        const questItems = quests
          .filter(quest => quest.status === 'active' && quest.title)
          .map(quest => ({
            id: `quest-${quest.id}`,
            kind: 'Active quest',
            title: quest.title,
            detail: quest.axis || quest.domain || '',
            timestamp: String(quest.updatedAt || quest.createdAt || ''),
            prompt: `Help me review this quest: ${quest.title}`,
          }));
        setHomeFeedItems([...evidenceItems, ...questItems]
          .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
          .slice(0, 6));
      } catch (err) {
        recordAppError(err, { source: 'jarvis_ui', operation: 'load_home_feed' });
      }
    })();

    return () => { cancelled = true; };
  }, [apiConfigured, conversationReady, activeOnboardingMode]);

  useEffect(() => {
    if (!messagesEndRef.current?.scrollIntoView) return;
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading, error]);

  if (apiConfigured === null) {
    return (
      <div
        aria-label="Loading Jarvis"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--bg)',
          color: 'var(--mu)',
          fontFamily: "'Geist', sans-serif",
          fontSize: '13px',
        }}
      >
        Loading Jarvis…
      </div>
    );
  }

  if (!apiConfigured) {
    return <JarvisApiSetup onConfigured={() => setApiConfigured(true)} />;
  }

  const handleSend = async () => {
    if (!input.trim() || loading || !conversationReady) return;
    const msg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setLoading(true);
    setLoadingPhase('Thinking...');
    setError(null);
    try {
      const response = await chatWithJarvis(
        msg,
        messages,
        modificationContext,
        { onboarding: activeOnboardingMode, entryContext: attachPageContext ? jarvisContext : null }
      );
      const finalMessages = [
        ...newMessages,
        {
          role: 'assistant',
          content: response.message || '',
          proposal: response.proposal,
          claims: response.claims,
          contextUsed: response.contextUsed,
          proposalStatus: response.proposal ? 'pending' : undefined,
        },
      ];
      setMessages(finalMessages);
      await saveConversation({
        id: conversationId,
        type: 'Jarvis',
        messages: finalMessages,
        createdAt: createdAtRef.current
      });
    } catch (err) {
      recordAppError(err, { source: 'jarvis_ui', operation: 'send_message' });
      const detail = err?.message ? String(err.message).slice(0, 320) : 'Unknown AI connection error.';
      setError(activeOnboardingMode
        ? `Jarvis encountered an error processing your onboarding answer: ${detail}`
        : `Jarvis encountered an error processing your request: ${detail}`);
    } finally {
      setLoading(false);
      setLoadingPhase('');
    }
  };

  const openConversationHistory = async () => {
    try {
      const conversations = await getAllConversations();
      setConversationHistory(conversations.filter(conversation => (
        conversation.id !== ONBOARDING_CONVERSATION_ID && conversation.messages?.some(message => message.role === 'user')
      )));
      setSheet('history');
    } catch (err) {
      setError('Could not load conversation history.');
    }
  };

  const openReviewStories = async () => {
    setReviewLoading(true);
    setReviewStoryIndex(0);
    setSheet('review');
    try {
      const logs = await getAllLogs();
      const now = new Date();
      const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      const dayMs = 24 * 60 * 60 * 1000;
      const firstDay = todayUtc - 27 * dayMs;
      const entries = logs.filter(log => {
        const dateText = String(log.date || '').slice(0, 10);
        const dateMs = Date.parse(`${dateText}T00:00:00Z`);
        return Number.isFinite(dateMs) && dateMs >= firstDay && dateMs <= todayUtc;
      });
      const weeklyCounts = [0, 0, 0, 0];
      const axisCounts = {};
      for (const log of entries) {
        const dateMs = Date.parse(`${String(log.date).slice(0, 10)}T00:00:00Z`);
        const weekIndex = Math.min(3, Math.floor((dateMs - firstDay) / (7 * dayMs)));
        weeklyCounts[weekIndex] += 1;
        const axis = String(log.axis || log.domain || log.meta?.axis || 'Unspecified');
        axisCounts[axis] = (axisCounts[axis] || 0) + 1;
      }
      setReviewStories({
        count: entries.length,
        weeklyCounts,
        axisCounts: Object.entries(axisCounts).sort((left, right) => right[1] - left[1]),
        latestDate: entries.map(log => String(log.date).slice(0, 10)).sort().at(-1) || null,
      });
    } catch (err) {
      recordAppError(err, { source: 'jarvis_ui', operation: 'load_review_stories' });
      setError('Could not load recent evidence for review.');
      setSheet(null);
    } finally {
      setReviewLoading(false);
    }
  };

  const openPlanBoard = proposal => {
    const steps = proposal?.payload?.steps || [];
    setSelectedPlanProposal(proposal);
    setSelectedPlanSteps(steps.map(() => true));
  };

  const reviewSelectedPlan = () => {
    if (!selectedPlanProposal) return;
    const steps = (selectedPlanProposal.payload.steps || [])
      .filter((step, index) => selectedPlanSteps[index]);
    if (steps.length === 0) return;
    const proposal = {
      ...selectedPlanProposal,
      payload: { ...selectedPlanProposal.payload, steps },
    };
    setSelectedPlanProposal(null);
    setSelectedProposalForImpact({ proposal, impact: proposal.impact });
  };

  const startNewConversation = async () => {
    const id = `jarvis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setActiveConversationId(id);
    setMessages([]);
    setInput('');
    setError(null);
    setSheet(null);
    await getOrCreateConversation(id, 'New chat');
  };

  const filteredCommands = COMMANDS.filter(command => (
    !commandQuery || [command.id, command.label, command.description]
      .some(value => value.toLowerCase().includes(commandQuery.toLowerCase()))
  ));
  const commandGroups = [
    { group: 'Think', commands: filteredCommands.filter(command => ['ask', 'review', 'audit'].includes(command.id)) },
    { group: 'Change', commands: filteredCommands.filter(command => ['habit', 'quest', 'goal', 'routine', 'plan', 'experiment', 'target'].includes(command.id)) },
    { group: 'Record', commands: filteredCommands.filter(command => ['evidence', 'memory', 'learn'].includes(command.id)) },
  ];

  const selectCommand = command => {
    setInput(command.prompt + ' ');
    setCommandMenuOpen(false);
    setCommandQuery('');
    setSelectedCommandIndex(0);
  };

  const handleComposerKeyDown = event => {
    if (commandMenuOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setCommandMenuOpen(false);
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (filteredCommands.length > 0) {
          const direction = event.key === 'ArrowDown' ? 1 : -1;
          setSelectedCommandIndex(current => (
            (current + direction + filteredCommands.length) % filteredCommands.length
          ));
        }
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (filteredCommands.length > 0) {
          selectCommand(filteredCommands[selectedCommandIndex] || filteredCommands[0]);
        }
        return;
      }
    }

    if (event.key === 'Enter') handleSend();
  };

  const executeApprovedProposal = async (proposal) => {
    if (executing) return;
    setExecuting(true);
    try {
      const result = await executeAction(proposal);
      const updatedMessages = messages.map(m => m.proposal && m.proposal.id === proposal.id ? { ...m, proposalStatus: 'executed' } : m);
      setMessages(updatedMessages);
      await saveConversation({
        id: conversationId,
        type: 'Jarvis',
        messages: updatedMessages,
        createdAt: createdAtRef.current
      });
      if (proposal.actionType === 'add_quest' || proposal.actionType === 'modify_quest' || proposal.actionType === 'archive_quest') {
        onQuestsChanged && onQuestsChanged();
      }

      if (activeOnboardingMode && proposal.actionType === 'complete_onboarding') {
        onOnboardingComplete && onOnboardingComplete();
      }
    } catch (err) {
      recordAppError(err, { source: 'jarvis_ui', operation: 'execute_proposal' });
      const updatedMessages = messages.map(m => m.proposal && m.proposal.id === proposal.id ? { ...m, proposalStatus: 'failed' } : m);
      setMessages(updatedMessages);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div
      className="jarvis-screen"
      aria-label={activeOnboardingMode ? 'Jarvis onboarding' : 'Jarvis workspace'}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg)',
        color: 'var(--tx)',
        fontFamily: "'Geist', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >

      {/* ✦ Jarvis header — wordmark left, mode pill right */}
      <div
        className="jarvis-screen__header"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: 'calc(14px + env(safe-area-inset-top, 0px)) 16px 10px',
          borderBottom: loading ? undefined : 'none',
          flex: '0 0 auto',
        }}
      >
        {/* loading shimmer line */}
        {loading && (
          <div style={{
            position: 'absolute',
            left: '18px', right: '18px', bottom: 0, height: '2px',
            background: 'linear-gradient(90deg, transparent, var(--ac), transparent) no-repeat',
            backgroundSize: '40% 100%',
            animation: 'jarvis-scan 1.4s linear infinite',
          }} />
        )}
        <b style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.01em' }}>
          ✦ Jarvis
        </b>

        {!activeOnboardingMode && (
          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
            <button type="button" aria-label="Conversation history" title="Conversation history" onClick={openConversationHistory} style={{ minHeight: '36px', padding: '0 10px', border: '1px solid var(--hairline)', borderRadius: 'var(--r-control)', background: 'var(--s1)', color: 'var(--tx)', cursor: 'pointer' }}>History</button>
            <button type="button" aria-label="New chat" title="New chat" onClick={startNewConversation} style={{ minHeight: '36px', padding: '0 10px', border: '1px solid var(--hairline)', borderRadius: 'var(--r-control)', background: 'var(--s1)', color: 'var(--tx)', cursor: 'pointer' }}>New chat</button>
          </div>
        )}

        {/* Mode pill */}
        {!activeOnboardingMode && (
          <button
            onClick={() => setModeMenuOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: '36px',
              padding: '0 12px',
              borderRadius: 'var(--r-control)',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--ac)',
              background: 'color-mix(in srgb, var(--ac) 20%, transparent)',
              border: 'none',
              cursor: 'pointer',
              gap: '4px',
            }}
          >
            {MODES.find(m => m.id === mode)?.label || 'Ask'} ▾
          </button>
        )}

        {/* Status pill right */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 12px', borderRadius: 'var(--r-control)', background: 'var(--s2)', color: 'var(--tx)', fontFamily: "'Geist Mono', monospace", fontSize: '11.5px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ac)', display: 'inline-block' }} />
          {loading ? loadingPhase || 'Working...' : 'Ready'}
        </div>
      </div>

      {/* Jarvis scan keyframe */}
      <style>{`@keyframes jarvis-scan{from{background-position:-40% 0}to{background-position:140% 0}}`}</style>

      {/* Context chip (when context is attached) */}
      {(jarvisContext || modificationContext) && (
        <div style={{ padding: '6px 14px 0' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            height: '34px',
            padding: '0 12px',
            borderRadius: 'var(--r-chip)',
            background: 'color-mix(in srgb, var(--ac) 15%, transparent)',
            border: '1px solid color-mix(in srgb, var(--ac) 40%, transparent)',
            fontSize: '12.5px',
            fontWeight: 500,
            color: 'var(--ac)',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ac)' }} />
            {!attachPageContext ? 'Context withheld by privacy setting' : (() => {
              const ctx = modificationContext || jarvisContext;
              if (ctx.entityType === 'axis') return `Context: ${ctx.payload?.axis || 'Stats'}`;
              if (ctx.entityType === 'habit') return 'Context: Habit';
              if (ctx.entityType === 'goal') return `Context: ${ctx.payload || 'Goal'}`;
              return 'Context attached';
            })()}
            <button
              onClick={() => { if (onClearContext) onClearContext(); setModificationContext(null); }}
              style={{ background: 'none', border: 'none', color: 'var(--ac)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, padding: '0 0 0 4px' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <BottomSheet isOpen={sheet === 'history'} onClose={() => setSheet(null)} title="Conversation history">
        <div style={{ display: 'grid', gap: '8px', maxHeight: '55dvh', overflowY: 'auto' }}>
          {conversationHistory.length === 0 ? (
            <p style={{ color: 'var(--mu)', fontSize: '14px' }}>No saved conversations yet.</p>
          ) : conversationHistory.map(conversation => (
            <button key={conversation.id} type="button" onClick={() => {
              setActiveConversationId(conversation.id);
              setSheet(null);
            }} style={{ padding: '12px 14px', textAlign: 'left', border: '1px solid var(--hairline)', borderRadius: 'var(--r-container)', background: 'var(--s2)', color: 'var(--tx)', cursor: 'pointer' }}>
              <strong style={{ display: 'block', fontSize: '14px' }}>{conversation.title || 'Jarvis conversation'}</strong>
              <span style={{ color: 'var(--mu)', fontSize: '12px' }}>{new Date(conversation.updatedAt).toLocaleString()}</span>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet isOpen={sheet === 'review'} onClose={() => setSheet(null)} title="Recent evidence review">
        {reviewLoading ? (
          <p role="status" style={{ color: 'var(--mu)' }}>Reviewing recent evidence...</p>
        ) : reviewStories?.count ? (
          <div style={{ display: 'grid', gap: '14px' }}>
            <div aria-live="polite">
              <div style={{ color: 'var(--mu)', font: "500 12px 'Geist Mono', monospace" }}>
                Story {reviewStoryIndex + 1} of 3 · Last 28 days
              </div>
              {reviewStoryIndex === 0 && (
                <>
                  <h3 style={{ margin: '8px 0 4px', fontSize: '22px' }}>{reviewStories.count} recorded entries</h3>
                  <p style={{ margin: 0, color: 'var(--mu)', fontSize: '13px' }}>Counts from saved log records; no score or trend is inferred.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '14px' }}>
                    {reviewStories.weeklyCounts.map((count, index) => (
                      <div key={index} style={{ padding: '10px 6px', background: 'var(--s2)', borderRadius: 'var(--r-control)', textAlign: 'center' }}>
                        <strong style={{ display: 'block', fontFamily: "'Geist Mono', monospace" }}>{count}</strong>
                        <span style={{ color: 'var(--mu)', fontSize: '11px' }}>Week {index + 1}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {reviewStoryIndex === 1 && (
                <>
                  <h3 style={{ margin: '8px 0 4px', fontSize: '22px' }}>Recorded by axis</h3>
                  <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                    {reviewStories.axisCounts.map(([axis, count]) => (
                      <div key={axis} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 12px', background: 'var(--s2)', borderRadius: 'var(--r-control)' }}>
                        <span>{axis}</span><strong style={{ fontFamily: "'Geist Mono', monospace" }}>{count}</strong>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {reviewStoryIndex === 2 && (
                <>
                  <h3 style={{ margin: '8px 0 4px', fontSize: '22px' }}>Latest saved entry</h3>
                  <p style={{ margin: 0, color: 'var(--mu)', fontSize: '14px' }}>{reviewStories.latestDate || 'No date recorded'}</p>
                  <p style={{ margin: '10px 0 0', fontSize: '14px' }}>Ask Jarvis to interpret this evidence in context before changing your system.</p>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" aria-label="Previous review story" onClick={() => setReviewStoryIndex(index => Math.max(0, index - 1))} disabled={reviewStoryIndex === 0} style={{ minHeight: '44px', padding: '0 12px', border: 0, borderRadius: 'var(--r-control)', background: 'var(--s2)', color: 'var(--tx)' }}>Previous</button>
              {reviewStoryIndex < 2 ? (
                <button type="button" aria-label="Next review story" onClick={() => setReviewStoryIndex(index => Math.min(2, index + 1))} style={{ flex: 1, minHeight: '44px', border: 0, borderRadius: 'var(--r-control)', background: 'var(--ac)', color: 'var(--on-ac)' }}>Next</button>
              ) : (
                <button type="button" onClick={() => { setInput('Review my recent evidence from the last 28 days.'); setSheet(null); }} style={{ flex: 1, minHeight: '44px', border: 0, borderRadius: 'var(--r-control)', background: 'var(--ac)', color: 'var(--on-ac)' }}>Ask Jarvis</button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p style={{ margin: '0 0 12px', color: 'var(--mu)' }}>No saved log entries in the last 28 days.</p>
            <button type="button" onClick={() => { setInput('Review my recent evidence.'); setSheet(null); }} style={{ minHeight: '44px', padding: '0 14px', border: 0, borderRadius: 'var(--r-control)', background: 'var(--ac)', color: 'var(--on-ac)' }}>Ask Jarvis</button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet isOpen={!!selectedPlanProposal} onClose={() => setSelectedPlanProposal(null)} title="Plan board">
        {selectedPlanProposal && (
          <div style={{ display: 'grid', gap: '12px' }}>
            <p style={{ margin: 0, color: 'var(--mu)', fontSize: '13px' }}>
              Select the steps to include. Only selected steps will reach impact review and approval.
            </p>
            <div style={{ display: 'grid', gap: '8px', maxHeight: '45dvh', overflowY: 'auto' }}>
              {selectedPlanProposal.payload.steps.map((step, index) => {
                const stepTitle = step.payload?.title || step.payload?.label || step.payload?.text || step.actionType.replaceAll('_', ' ');
                return (
                  <button
                    key={`${step.actionType}-${index}`}
                    type="button"
                    role="checkbox"
                    aria-checked={Boolean(selectedPlanSteps[index])}
                    aria-label={`Include step: ${stepTitle}`}
                    onClick={() => setSelectedPlanSteps(current => current.map((included, stepIndex) => stepIndex === index ? !included : included))}
                    style={{ minHeight: '52px', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', border: '1px solid var(--hairline)', borderRadius: 'var(--r-control)', background: 'var(--s2)', color: 'var(--tx)', textAlign: 'left' }}
                  >
                    <span aria-hidden="true" style={{ width: '22px', height: '22px', display: 'grid', placeItems: 'center', borderRadius: 'var(--r-check)', background: selectedPlanSteps[index] ? 'var(--ac)' : 'transparent', boxShadow: selectedPlanSteps[index] ? 'none' : 'inset 0 0 0 1px var(--mu)', color: 'var(--on-ac)', flexShrink: 0 }}>{selectedPlanSteps[index] ? '✓' : ''}</span>
                    <span><strong style={{ display: 'block', textTransform: 'capitalize' }}>{step.actionType.replaceAll('_', ' ')}</strong><span style={{ color: 'var(--mu)', fontSize: '12px' }}>{stepTitle}</span></span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span aria-live="polite" style={{ color: 'var(--mu)', fontSize: '12px' }}>{selectedPlanSteps.filter(Boolean).length} of {selectedPlanSteps.length} selected</span>
              <button type="button" onClick={reviewSelectedPlan} disabled={!selectedPlanSteps.some(Boolean)} style={{ marginLeft: 'auto', minHeight: '44px', padding: '0 14px', border: 0, borderRadius: 'var(--r-control)', background: selectedPlanSteps.some(Boolean) ? 'var(--ac)' : 'var(--s2)', color: selectedPlanSteps.some(Boolean) ? 'var(--on-ac)' : 'var(--mu)' }}>Review selected steps</button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Messages / feed */}
      <div
        className="jarvis-screen__messages"
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px 14px 12px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {!activeOnboardingMode && (
          <button type="button" onClick={openReviewStories} style={{ minHeight: '40px', margin: '0 0 10px', padding: '0 12px', border: '1px solid var(--hairline)', borderRadius: 'var(--r-control)', background: 'var(--s1)', color: 'var(--tx)', fontSize: '12px', cursor: 'pointer' }}>
            Review recent evidence
          </button>
        )}
        {messages.length === 0 ? (
          /* Empty state — 2-col masonry starter pins */
          <div style={{
            minHeight: '100%',
            maxWidth: '680px',
            margin: '0 auto',
            padding: 'clamp(28px, 10vh, 88px) 4px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: activeOnboardingMode ? 'flex-start' : 'center',
            textAlign: activeOnboardingMode ? 'left' : 'center',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              margin: activeOnboardingMode ? '0 0 18px' : '0 auto 18px',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '14px',
              background: 'var(--s1)',
              color: 'var(--ac)',
              boxShadow: 'inset 0 0 0 1px var(--hairline)',
              fontSize: '24px',
            }}>
              ✦
            </div>

            <h2 style={{
              margin: 0,
              fontSize: activeOnboardingMode ? '26px' : '22px',
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
              fontWeight: 650,
              maxWidth: '560px',
            }}>
              {activeOnboardingMode ? "Let's build your system" : "What do you want to work on?"}
            </h2>

            <p style={{
              margin: '10px 0 0',
              maxWidth: '560px',
              color: 'var(--mu)',
              fontSize: '14px',
              lineHeight: 1.6,
            }}>
              {activeOnboardingMode
                ? "I'll ask a few focused questions about who you are, your constraints, priorities and where you want to go."
                : 'Tell Jarvis what you want to understand, plan, change or record.'}
            </p>

              {!activeOnboardingMode && homeFeedItems.length > 0 && (
                <section aria-label="Jarvis home feed" style={{ width: '100%', maxWidth: '520px', margin: '22px auto 0', textAlign: 'left' }}>
                  <h3 style={{ margin: '0 0 8px', fontFamily: "'Geist Mono', monospace", color: 'var(--mu)', fontSize: '12px', fontWeight: 500 }}>Recent activity</h3>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {homeFeedItems.map(item => (
                      <button key={item.id} type="button" onClick={() => setInput(item.prompt)} style={{ minHeight: '58px', display: 'grid', gap: '3px', padding: '10px 12px', border: '1px solid var(--hairline)', borderRadius: 'var(--r-container)', background: 'var(--s1)', color: 'var(--tx)', textAlign: 'left' }}>
                        <span style={{ color: 'var(--ac)', fontFamily: "'Geist Mono', monospace", fontSize: '11px' }}>{item.kind}</span>
                        <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>{item.title}</strong>
                        {item.detail && <span style={{ color: 'var(--mu)', fontSize: '11px' }}>{item.detail}</span>}
                      </button>
                    ))}
                  </div>
                </section>
              )}

            {!activeOnboardingMode && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '10px',
                width: '100%',
                maxWidth: '520px',
                margin: '28px auto 0',
                textAlign: 'left',
              }}>
                {[
                  { label: 'Create a goal', color: 'var(--ac)', prompt: 'Create a goal' },
                  { label: 'Create a habit', color: 'var(--creativity)', prompt: 'Create a habit' },
                  { label: 'Review my system', color: 'var(--body)', prompt: 'Review my system' },
                  { label: 'Log something I did', color: 'var(--social)', prompt: 'Log this evidence' },
                ].map((pin, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(pin.prompt)}
                    style={{
                      background: 'var(--s1)',
                      borderRadius: '14px',
                      padding: '14px',
                      boxShadow: 'inset 0 0 0 1px var(--hairline)',
                      textAlign: 'left',
                      border: 'none',
                      cursor: 'pointer',
                      minHeight: '76px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.12s',
                    }}
                    onPointerDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                    onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: pin.color, display: 'inline-block' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.25, color: 'var(--tx)' }}>{pin.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ paddingBottom: '28px', maxWidth: '760px', margin: '0 auto' }}>
            {messages.map((msg, i) => {
              const assistantContent = msg.content ?? msg.message ?? '';
              return (
              <div key={i} style={{ marginBottom: '16px' }}>
                {msg.role === 'user' ? (
                  /* User bubble — right-aligned */
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      background: 'var(--s2)',
                      padding: '10px 14px',
                      borderRadius: '16px 16px 4px 16px',
                      fontSize: '14.5px',
                      maxWidth: '82%',
                      lineHeight: 1.5,
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  /* Assistant — unbubbled prose with trust rails */
                  <div>
                    {assistantContent && (
                      <p style={{
                        paddingLeft: '12px',
                        marginBottom: '10px',
                        fontSize: '14.5px',
                        lineHeight: 1.6,
                        borderLeft: `3px solid var(--tx)`,
                        color: 'var(--tx)',
                      }}>
                        {assistantContent}
                      </p>
                    )}

                    {/* Trust rail for inferred */}
                    {msg.inferred && (
                      <p style={{
                        paddingLeft: '12px',
                        marginBottom: '10px',
                        fontSize: '14.5px',
                        lineHeight: 1.6,
                        borderLeft: '3px dashed var(--mu)',
                        color: 'var(--tx)',
                      }}>
                        {msg.inferred}
                      </p>
                    )}

                    {/* Trust rail for suggested */}
                    {msg.suggested && (
                      <p style={{
                        paddingLeft: '12px',
                        marginBottom: '10px',
                        fontSize: '14.5px',
                        lineHeight: 1.6,
                        borderLeft: '3px dotted var(--ac)',
                        color: 'var(--tx)',
                      }}>
                        {msg.suggested}
                      </p>
                    )}

                    {/* Provenance row */}
                    {msg.contextUsed && msg.contextUsed.length > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: '11.5px',
                        fontWeight: 500,
                        color: 'var(--mu)',
                        margin: '2px 0 14px',
                      }}>
                        {msg.contextUsed.slice(0, 3).map((_, ci) => (
                          <span key={ci} style={{
                            width: '14px', height: '14px', borderRadius: '50%',
                            marginRight: '-9px',
                            border: '2px solid var(--bg)',
                            background: ['var(--knowledge)', 'var(--body)', 'var(--discipline)'][ci] || 'var(--mu)',
                            display: 'inline-block',
                          }} />
                        ))}
                        <span style={{ marginLeft: '12px' }}>Based on {msg.contextUsed.length} sources</span>
                      </div>
                    )}

                    {/* Proposal card */}
                    {msg.proposal && (
                      <ActionProposalCard
                        proposal={msg.proposal}
                        status={msg.proposalStatus}
                        onApply={() => setSelectedProposalForImpact({ proposal: msg.proposal, impact: msg.proposal.impact })}
                        onEdit={() => setSelectedProposalForEdit(msg.proposal)}
                        onDismiss={async () => {
                          const updatedMessages = messages.map(item =>
                            item === msg ? { ...item, proposalStatus: 'dismissed' } : item
                          );
                          setMessages(updatedMessages);
                          await saveConversation({
                            id: conversationId,
                            type: 'Jarvis',
                            messages: updatedMessages,
                            createdAt: createdAtRef.current
                          });
                        }}
                      />
                    )}
                    {msg.proposal?.actionType === 'create_plan' && msg.proposalStatus === 'pending' && (
                      <button type="button" onClick={() => openPlanBoard(msg.proposal)} style={{ minHeight: '40px', marginTop: '8px', padding: '0 12px', border: '1px solid var(--hairline)', borderRadius: 'var(--r-control)', background: 'var(--s1)', color: 'var(--tx)' }}>
                        Open plan board
                      </button>
                    )}
                  </div>
                )}
              </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Loading skeleton when thinking */}
      {loading && (
        <div className="jarvis-screen__loading" style={{ padding: '0 14px 8px', flex: '0 0 auto' }}>
          <p style={{ fontSize: '14px', color: 'var(--mu)', margin: '0 0 8px' }}>
            {loadingPhase || 'Thinking...'}
          </p>
          <div style={{
            height: '80px',
            borderRadius: 'var(--r-container)',
            background: 'linear-gradient(90deg, var(--s1), var(--s2), var(--s1))',
            backgroundSize: '200% 100%',
            animation: 'jarvis-shimmer 1.4s linear infinite',
          }} />
          <style>{`@keyframes jarvis-shimmer{to{background-position:-200% 0}}`}</style>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          className="jarvis-screen__error"
          style={{
            margin: '0 14px 8px',
            padding: '12px 14px',
            flex: '0 0 auto',
            borderRadius: 'var(--r-container)',
          background: 'var(--s1)',
          boxShadow: 'inset 4px 0 0 var(--danger)',
          fontSize: '13px',
          color: 'var(--tx)',
        }}>
          {activeOnboardingMode ? (
            <>
              <strong>Jarvis couldn't start onboarding.</strong>
              <div style={{ marginTop: '5px', color: 'var(--mu)' }}>{error}</div>
            </>
          ) : (
            <>
              <strong>The change wasn't applied.</strong> Your existing data is unchanged.
            </>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button
              onClick={() => {
                setError(null);
                if (activeOnboardingMode) {
                  onboardingStartedRef.current = false;
                  setOnboardingRetryNonce(value => value + 1);
                }
              }}
              style={{ flex: 1, height: '40px', borderRadius: 'var(--r-control)', background: 'var(--ac)', color: 'var(--on-ac)', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              Retry
            </button>
            <button
              onClick={() => setError(null)}
              style={{ flex: 1, height: '40px', borderRadius: 'var(--r-control)', background: 'var(--s2)', color: 'var(--tx)', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Composer — anchored below the conversation viewport */}
      <div
        className="jarvis-screen__composer"
        style={{
          position: 'relative',
          flex: '0 0 auto',
          margin: '0 10px 10px',
          minHeight: '60px',
          borderRadius: '18px',
          background: 'var(--s2)',
          boxShadow: 'inset 0 0 0 1px var(--hairline)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px',
          color: 'var(--mu)',
          fontSize: '14px',
          zIndex: 20,
        }}
      >
        <button
          aria-label="Attach or add"
          onClick={() => { setInput('/'); setCommandMenuOpen(true); }}
          onClick={() => {
            setInput('/');
            setCommandQuery('');
            setSelectedCommandIndex(0);
            setCommandMenuOpen(true);
          }}
          style={{
            width: '46px', height: '46px',
            borderRadius: '50%',
            border: 'none',
            background: 'var(--s1)',
            color: 'var(--tx)',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          +
        </button>
        <input
          name="jarvis-prompt"
          role="combobox"
          aria-label="Tell Jarvis what you want"
          aria-autocomplete="list"
          aria-expanded={commandMenuOpen}
          aria-controls={commandMenuOpen ? 'jarvis-command-list' : undefined}
          aria-activedescendant={commandMenuOpen && filteredCommands[selectedCommandIndex]
            ? `jarvis-command-${filteredCommands[selectedCommandIndex].id}`
            : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck={true}
          enterKeyHint="send"
          style={{
            flex: 1,
            minWidth: 0,
            height: '42px',
            padding: '0 6px',
            background: 'transparent',
            border: 'none',
            color: 'var(--tx)',
            outline: 'none',
            fontSize: '14px',
            lineHeight: 1.35,
            fontFamily: 'inherit',
          }}
          placeholder="Tell Jarvis what you want"
          value={input}
          onChange={e => {
            setInput(e.target.value);
            setSelectedCommandIndex(0);
            if (e.target.value.startsWith('/')) {
              setCommandMenuOpen(true);
              setCommandQuery(e.target.value.substring(1));
            } else {
              setCommandMenuOpen(false);
            }
          }}
          onKeyDown={handleComposerKeyDown}
        />
        <button
          aria-label="Slash commands"
          aria-expanded={commandMenuOpen}
          onClick={() => {
            setCommandQuery('');
            setSelectedCommandIndex(0);
            setCommandMenuOpen(v => !v);
          }}
          style={{
            width: '46px', height: '46px',
            borderRadius: '50%',
            border: 'none',
            background: 'var(--s1)',
            color: 'var(--tx)',
            fontSize: '18px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          /
        </button>
        <button
          aria-label="Send"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            width: '46px', height: '46px',
            borderRadius: '50%',
            border: 'none',
            background: loading || !input.trim() ? 'var(--s1)' : 'var(--tx)',
            color: loading || !input.trim() ? 'var(--mu)' : 'var(--bg)',
            fontSize: '20px',
            cursor: loading || !input.trim() ? 'default' : 'pointer',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            transition: 'background 0.2s',
          }}
        >
          ↑
        </button>
      </div>

      {/* Slash Palette — bottom sheet style */}
      {commandMenuOpen && (
        <div
          id="jarvis-command-list"
          role="listbox"
          aria-label="Slash commands"
          className="jarvis-screen__commands"
          style={{
            position: 'absolute',
            left: '10px',
            right: '10px',
            bottom: '80px',
            background: 'var(--s1)',
          borderRadius: '24px',
          padding: '8px 14px 14px',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08)',
            zIndex: 30,
            maxHeight: 'min(50dvh, 360px)',
            overflowY: 'auto',
          }}
        >
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)', margin: '0 auto 8px' }} />

          {/* Recent chips */}
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: '12px', color: 'var(--mu)', marginBottom: '6px' }}>Recent</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {['Review', 'Habit', 'Evidence'].map(r => (
              <button
                key={r}
                onClick={() => { setInput(r + ' '); setCommandMenuOpen(false); }}
                style={{
                  padding: '7px 11px',
                  borderRadius: 'var(--r-chip)',
                  background: 'color-mix(in srgb, var(--ac) 22%, transparent)',
                  color: 'var(--ac)',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Command groups */}
          {filteredCommands.length === 0 && (
            <p role="status" style={{ color: 'var(--mu)', fontSize: '13px' }}>No matching commands.</p>
          )}
          {commandGroups.filter(({ commands }) => commands.length > 0).map(({ group, commands }) => (
            <div key={group}>
              <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: '12px', color: 'var(--mu)', margin: '8px 0 4px' }}>{group}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {commands.map(cmd => (
                    <button
                      key={cmd.id}
                      id={`jarvis-command-${cmd.id}`}
                      type="button"
                      role="option"
                      aria-selected={filteredCommands[selectedCommandIndex]?.id === cmd.id}
                      onClick={() => selectCommand(cmd)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        minHeight: '46px',
                        padding: '0 10px',
                        borderRadius: 'var(--r-control)',
                        background: filteredCommands[selectedCommandIndex]?.id === cmd.id ? 'color-mix(in srgb, var(--ac) 18%, var(--s2))' : 'var(--s2)',
                        border: 'none',
                        color: 'var(--tx)',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'transform 0.12s',
                      }}
                      onPointerDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                      onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
                      onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--ac)', flexShrink: 0 }} />
                      {cmd.label}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Impact + Edit proposal overlays */}
      <ImpactDetailSheet
        proposal={selectedProposalForImpact?.proposal}
        impact={selectedProposalForImpact?.impact}
        onApply={() => {
          const prop = selectedProposalForImpact.proposal;
          setSelectedProposalForImpact(null);
          executeApprovedProposal(prop);
        }}
        onEdit={() => {
          const prop = selectedProposalForImpact.proposal;
          setSelectedProposalForImpact(null);
          setSelectedProposalForEdit(prop);
        }}
        onDismiss={() => setSelectedProposalForImpact(null)}
      />

      <EditProposalSheet
        proposal={selectedProposalForEdit}
        onSave={() => setSelectedProposalForEdit(null)}
        onCancel={() => setSelectedProposalForEdit(null)}
        onDismiss={() => setSelectedProposalForEdit(null)}
      />

      {/* Mode selection sheet */}
      <BottomSheet isOpen={modeMenuOpen} onClose={() => setModeMenuOpen(false)} title="Choose mode">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginTop: '12px',
        }}>
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setModeMenuOpen(false); }}
              style={{
                textAlign: 'center',
                padding: '14px 4px',
                borderRadius: 'var(--r-control)',
                background: 'var(--s2)',
                border: 'none',
                cursor: 'pointer',
                boxShadow: mode === m.id ? '0 0 0 2px var(--ac)' : 'none',
                fontSize: '13.5px',
                fontWeight: 500,
                color: 'var(--tx)',
                transition: 'transform 0.12s',
              }}
              onPointerDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ display: 'block', fontSize: '18px', marginBottom: '4px' }}>{m.icon}</span>
              {m.label}
              <span style={{ display: 'block', fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mu)', marginTop: '2px' }}>{m.hint}</span>
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}


function proposalHeading(proposal) {
  const payload = proposal?.payload || {};
  const action = formatAction(proposal?.actionType || 'action');

  const value =
    payload.name ||
    payload.title ||
    payload.label ||
    payload.hypothesis ||
    payload.content ||
    null;

  return value ? action + ' · ' + String(value) : action;
}

function formatAction(value) {
  return String(value || '').replaceAll('_', ' ');
}
