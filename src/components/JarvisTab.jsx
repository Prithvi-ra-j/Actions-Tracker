import React, { useEffect, useRef, useState } from 'react';
import { ACCENT } from '../constants.js';
import { chatWithJarvis, generateInsight } from '../core/ai/jarvisEngine.js';
import { executeAction, undoAction } from '../core/ai/actionExecutor.js';
import { computeImpact } from '../core/ai/impactEngine.js';
import { conversationManager } from '../core/ai/conversationManager.js';
import { getOrCreateConversation, saveConversation, clearConversation } from '../database/jarvisConversationRepository.js';
import { getRoutineConfig } from '../database/routineRepository.js';
import { getAllHabits } from '../database/habitRepository.js';
import { getAllLogs } from '../database/logsRepository.js';
import { getAllAxisConfigs } from '../database/axisConfigRepository.js';
import { getAllQuests } from '../database/questBoardRepository.js';
import { computeAllStats, computeAxisDetails } from '../helpers/statsEngine.js';
import { recordAppError } from '../core/errorLogger.js';
import './JarvisTab.css';

const CONVERSATION_ID = 'jarvis_default';

const MODES = [
  { id: 'ask', label: 'Ask', hint: 'Understand the system' },
  { id: 'plan', label: 'Plan', hint: 'Turn intent into actions' },
  { id: 'review', label: 'Review', hint: 'Inspect evidence and gaps' },
  { id: 'act', label: 'Act', hint: 'Propose a change' },
  { id: 'capture', label: 'Capture', hint: 'Record learning or evidence' },
  { id: 'audit', label: 'Audit', hint: 'Find contradictions and bottlenecks' },
];

const destructiveActions = new Set(['archive_habit']);

function modeInstruction(mode) {
  const entry = MODES.find(item => item.id === mode);
  return entry ? '[Assistant mode: ' + entry.label + '] ' + entry.hint + '. ' : '';
}

export default function JarvisTab({ t, onQuestsChanged }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('ask');
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [error, setError] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [modificationContext, setModificationContext] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [conversationReady, setConversationReady] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [proactiveInsight, setProactiveInsight] = useState(null);
  const messagesEndRef = useRef(null);
  const createdAtRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const conversation = await getOrCreateConversation(CONVERSATION_ID, 'Jarvis');
        if (cancelled) return;
        setMessages(conversation.messages || []);
        createdAtRef.current = conversation.createdAt || new Date().toISOString();
        conversationManager.hydrateFromUiMessages(conversation.messages || []);
        setConversationReady(true);
      } catch (err) {
        recordAppError(err, { source: 'jarvis_ui', operation: 'load_conversation' });
        setError('Could not load conversation history. You can still start a new one.');
        setConversationReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const onEscape = event => {
      if (event.key === 'Escape') setSheet(null);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  const persistMessages = async nextMessages => {
    setMessages(nextMessages);
    try {
      await saveConversation({
        id: CONVERSATION_ID,
        title: 'Jarvis',
        createdAt: createdAtRef.current || new Date().toISOString(),
        messages: nextMessages,
      });
    } catch (err) {
      recordAppError(err, { source: 'jarvis_ui', operation: 'persist_conversation' });
    }
  };

  const handleRunReview = async () => {
    if (reviewLoading) return;
    setReviewLoading(true);
    setError(null);

    try {
      const insight = await generateInsight(
        'Run a focused system review. Identify the highest-signal contradiction, bottleneck, trend change, capacity issue, or experiment decision. Separate observations from hypotheses and give concrete next actions.'
      );
      setProactiveInsight(insight);
    } catch (err) {
      recordAppError(err, { source: 'jarvis_ui', operation: 'run_review' });
      setError('Review failed: ' + (err.message || 'unknown error'));
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSend = async () => {
    if (!conversationReady || !input.trim() || loading) return;

    const userText = input.trim();
    const llmUserText = modeInstruction(mode) + userText;
    const optimistic = [
      ...messages,
      { role: 'user', content: userText, createdAt: new Date().toISOString() },
    ];

    setInput('');
    setError(null);
    await persistMessages(optimistic);
    setLoading(true);
    setLoadingPhase('Reading current data…');

    try {
      const history = conversationManager.getHistory();
      setLoadingPhase('Reasoning over evidence…');
      const response = await chatWithJarvis(llmUserText, history, modificationContext);
      setModificationContext(null);

      conversationManager.appendMessage('user', llmUserText);
      conversationManager.appendMessage('assistant', JSON.stringify(response));

      let enrichedProposal = null;
      if (response.proposal) {
        setLoadingPhase('Calculating impact…');
        const [routineConfig, habits, logs, axisConfigs, quests] = await Promise.all([
          getRoutineConfig(),
          getAllHabits(),
          getAllLogs(),
          getAllAxisConfigs(),
          getAllQuests(),
        ]);

        const today = new Date().toISOString().split('T')[0];
        const currentState = {
          routine: routineConfig,
          habits,
          stats: computeAllStats(logs, axisConfigs, quests, today, habits),
          axisDetails: computeAxisDetails(logs, axisConfigs, quests, today, habits),
        };

        enrichedProposal = {
          ...response.proposal,
          impact: computeImpact(response.proposal, currentState),
        };
      }

      const assistantMessage = {
        role: 'assistant',
        content: response.message,
        llmContent: JSON.stringify(response),
        proposal: enrichedProposal,
        proposalStatus: enrichedProposal ? 'pending' : undefined,
        contextUsed: response.contextUsed || null,
        createdAt: new Date().toISOString(),
      };

      await persistMessages([...optimistic, assistantMessage]);
    } catch (err) {
      recordAppError(err, { source: 'jarvis_ui', operation: 'chat' });
      setError(err.message || 'Request failed.');
      await persistMessages([
        ...optimistic,
        {
          role: 'assistant',
          isError: true,
          content: 'The request could not be completed. The failure was recorded in Diagnostics.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      setLoadingPhase('');
    }
  };

  const executeApprovedProposal = async proposal => {
    setError(null);
    setExecuting(true);
    setLoadingPhase('Validating and applying…');

    try {
      const result = await executeAction(proposal);
      const actionFactId = result?.actionFactId;
      const next = messages.map(message =>
        message.proposal === proposal
          ? { ...message, proposalStatus: 'executed', actionFactId, executionResult: result }
          : message
      );

      await persistMessages([
        ...next,
        {
          role: 'system',
          content: result?.idempotent
            ? 'Already applied: ' + formatAction(proposal.actionType)
            : 'Applied: ' + formatAction(proposal.actionType),
          createdAt: new Date().toISOString(),
        },
      ]);

      setSheet(null);
      if (onQuestsChanged) onQuestsChanged();
    } catch (err) {
      recordAppError(err, {
        source: 'jarvis_ui',
        operation: 'execute_action',
        metadata: { actionType: proposal.actionType },
      });
      setError('Action failed: ' + (err.message || 'unknown error'));
      await persistMessages([
        ...messages,
        {
          role: 'system',
          isError: true,
          content: 'Action failed: ' + (err.message || 'unknown error'),
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setExecuting(false);
      setLoadingPhase('');
    }
  };

  const handleApproveProposal = proposal => {
    if (destructiveActions.has(proposal.actionType)) {
      setSheet({ type: 'destructive', proposal });
      return;
    }
    executeApprovedProposal(proposal);
  };

  const handleUndo = async message => {
    if (!message.actionFactId || executing) return;
    setExecuting(true);
    setError(null);
    setLoadingPhase('Restoring previous state…');

    try {
      await undoAction(message.actionFactId);
      const next = messages.map(item =>
        item.actionFactId === message.actionFactId
          ? { ...item, proposalStatus: 'undone', undoStatus: 'undone' }
          : item
      );

      await persistMessages([
        ...next,
        {
          role: 'system',
          content: 'Undid ' + formatAction(message.proposal?.actionType || 'the action') + '.',
          createdAt: new Date().toISOString(),
        },
      ]);

      if (onQuestsChanged) onQuestsChanged();
    } catch (err) {
      recordAppError(err, { source: 'jarvis_ui', operation: 'undo_action' });
      setError('Undo failed: ' + (err.message || 'unknown error'));
    } finally {
      setExecuting(false);
      setLoadingPhase('');
    }
  };

  const handleDeclineProposal = async index => {
    const next = messages.map((message, messageIndex) =>
      messageIndex === index
        ? { ...message, proposalStatus: 'declined', proposal: null }
        : message
    );

    await persistMessages([
      ...next,
      {
        role: 'system',
        content: 'Proposal declined. No data was changed.',
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleModifyProposal = proposal => {
    setError(null);
    setModificationContext(proposal);
    setInput('');
  };

  const handleClearConversation = async () => {
    await clearConversation(CONVERSATION_ID);
    conversationManager.clear();
    setMessages([]);
    setModificationContext(null);
    setProactiveInsight(null);
    setError(null);
    setSheet(null);
    createdAtRef.current = new Date().toISOString();
  };

  const handleKeyDown = event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const visualVars = {
    '--j-bg': t.pageBg,
    '--j-text': t.pageText,
    '--j-muted': t.muted,
    '--j-border': t.borderSoft,
    '--j-subtle': t.subtleBg,
    '--j-accent': ACCENT,
  };

  return (
    <div className="jarvis-shell" style={visualVars}>
      <header className="jarvis-header">
        <div className="jarvis-topbar">
          <div className="jarvis-brand">
            <div className="jarvis-logo" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M7 5.5V18.5M7 5.5H13.5C16 5.5 17.5 7 17.5 9.2C17.5 11.4 16 12.8 13.5 12.8H7M13 12.8L18 18.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="jarvis-brand-copy">
              <div className="jarvis-kicker">Assistant</div>
              <div className="jarvis-title">Jarvis</div>
              <div className="jarvis-status">{loading ? loadingPhase : 'Ready'}</div>
            </div>
          </div>

          <div className="jarvis-header-actions">
            <button
              className="jarvis-action-btn"
              onClick={handleRunReview}
              disabled={reviewLoading || loading}
              aria-label="Run system review"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 8V3.5M20 8h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 16M4 16v4.5M4 16h4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{reviewLoading ? 'Reviewing' : 'Review'}</span>
            </button>

            <button
              className="jarvis-icon-btn"
              onClick={() => setSheet({ type: 'context' })}
              aria-label="Open context"
              title="Context"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 10.5V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="7.2" r="1" fill="currentColor"/>
              </svg>
            </button>
            <button
              className="jarvis-icon-btn"
              onClick={() => setSheet({ type: 'more' })}
              aria-label="More options"
              title="More options"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="jarvis-mode-strip" role="tablist" aria-label="Assistant mode">
          {MODES.map(item => (
            <button
              key={item.id}
              role="tab"
              aria-selected={mode === item.id}
              className={'jarvis-mode' + (mode === item.id ? ' jarvis-mode-active' : '')}
              onClick={() => setMode(item.id)}
              title={item.hint}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {proactiveInsight && (
        <section className="jarvis-review-card" aria-label="System review">
          <div className="jarvis-review-head">
            <div>
              <div className="jarvis-eyebrow">System review</div>
              <div className="jarvis-review-type">{proactiveInsight.type || 'Review'}</div>
            </div>
            <button className="jarvis-inline-button" onClick={() => setProactiveInsight(null)}>
              Dismiss
            </button>
          </div>

          <div className="jarvis-review-statement">{proactiveInsight.statement}</div>

          {Array.isArray(proactiveInsight.recommendedActions) && proactiveInsight.recommendedActions.length > 0 && (
            <div className="jarvis-review-actions">
              {proactiveInsight.recommendedActions.slice(0, 4).map((item, index) => (
                <div key={index}>{index + 1}. {item}</div>
              ))}
            </div>
          )}
        </section>
      )}

      <main className="jarvis-scroll" aria-live="polite">
        {messages.length === 0 && (
          <div className="jarvis-empty">
            <div className="jarvis-empty-mark" aria-hidden="true">
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
                <path d="M6.5 5.5V18.5M6.5 5.5H13C15.6 5.5 17.2 7 17.2 9.2C17.2 11.4 15.6 12.9 13 12.9H6.5M12.5 12.9L17.5 18.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="jarvis-empty-title">What are we working on?</div>
            <div className="jarvis-empty-copy">
              Your direction is set. Jarvis will help you turn it into a personal system through conversation.
              It will ask what matters, what is realistic, and what evidence should count before proposing changes.
            </div>

            <div className="jarvis-chip-grid">
              {['Start setup interview', 'Review today', 'Add a habit', 'Set a goal', 'Add a quest', 'Capture learning'].map(prompt => (
                <button
                  key={prompt}
                  className="jarvis-chip"
                  onClick={() => {
                    setInput(prompt + ': ');
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          msg.role === 'system'
            ? (
              <div key={idx} className={'jarvis-system-message' + (msg.isError ? ' jarvis-system-message-error' : '')}>
                {msg.content}
              </div>
            )
            : msg.role === 'user'
              ? (
                <div key={idx} className="jarvis-message jarvis-message-user">
                  <div className="jarvis-user-bubble">{msg.content}</div>
                </div>
              )
              : (
                <AssistantMessage
                  key={idx}
                  msg={msg}
                  idx={idx}
                  t={t}
                  executing={executing}
                  onApprove={handleApproveProposal}
                  onModify={handleModifyProposal}
                  onDecline={handleDeclineProposal}
                  onUndo={handleUndo}
                />
              )
        ))}

        {loading && (
          <div className="jarvis-thinking">
            <Avatar />
            <div className="jarvis-thinking-dots" aria-hidden="true">
              <span className="jarvis-thinking-dot" />
              <span className="jarvis-thinking-dot" />
              <span className="jarvis-thinking-dot" />
            </div>
            <div className="jarvis-thinking-label">{loadingPhase || 'Working…'}</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <div className="jarvis-composer-wrap">
        {error && <div className="jarvis-system-message jarvis-system-message-error">{error}</div>}

        {modificationContext && (
          <div className="jarvis-modifying">
            <div className="jarvis-modifying-label">
              Modifying {formatAction(modificationContext.actionType)} · describe the change
            </div>
            <button
              className="jarvis-cancel-modifying"
              onClick={() => setModificationContext(null)}
              aria-label="Cancel modification"
            >
              ×
            </button>
          </div>
        )}

        <div className="jarvis-composer">
          <textarea
            className="jarvis-textarea"
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={modificationContext ? 'Describe the change…' : 'Ask Jarvis…'}
            rows={1}
            aria-label="Message Jarvis"
            onInput={event => {
              event.currentTarget.style.height = 'auto';
              event.currentTarget.style.height = Math.min(event.currentTarget.scrollHeight, 132) + 'px';
            }}
          />

          <button
            className={'jarvis-send' + (loading || !input.trim() || !conversationReady ? ' jarvis-send-disabled' : '')}
            onClick={handleSend}
            disabled={loading || !input.trim() || !conversationReady}
            aria-label="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 18.5V5.5M6.5 12L12 6.5 17.5 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="jarvis-footer-note">
          Propose · review · approve · undo
        </div>
      </div>

      {sheet?.type === 'context' && (
        <ContextSheet t={t} messages={messages} onClose={() => setSheet(null)} />
      )}

      {sheet?.type === 'destructive' && (
        <ActionConfirmSheet
          t={t}
          proposal={sheet.proposal}
          onCancel={() => setSheet(null)}
          onConfirm={() => executeApprovedProposal(sheet.proposal)}
        />
      )}

      {sheet?.type === 'more' && (
        <MoreSheet
          onClose={() => setSheet(null)}
          onClear={() => setSheet({ type: 'clear' })}
        />
      )}

      {sheet?.type === 'clear' && (
        <ClearConversationSheet
          onCancel={() => setSheet({ type: 'more' })}
          onConfirm={async () => {
            await handleClearConversation();
            setSheet(null);
          }}
        />
      )}
    </div>
  );
}

function AssistantMessage({ msg, idx, t, executing, onApprove, onModify, onDecline, onUndo }) {
  return (
    <div className="jarvis-message jarvis-message-assistant">
      <Avatar />
      <div className="jarvis-assistant-body">
        <div className={'jarvis-assistant-text' + (msg.isError ? ' jarvis-assistant-text-error' : '')}>
          {msg.content}
        </div>

        {msg.proposal && (
          <div className="jarvis-proposal">
            <div className="jarvis-proposal-head">
              <div className={'jarvis-proposal-dot' + (msg.proposalStatus === 'executed' ? ' jarvis-proposal-dot-executed' : '')} />
              <div className="jarvis-proposal-kind">{formatAction(msg.proposal.actionType)}</div>
              {msg.proposal.confidence != null && (
                <div className="jarvis-confidence">
                  {Math.round(msg.proposal.confidence * 100)}%
                </div>
              )}
            </div>

            <div className="jarvis-proposal-body">
              <div className="jarvis-proposal-reasoning">
                {proposalHeading(msg.proposal)}
              </div>

              <div className="jarvis-proposal-reasoning" style={{ marginTop: '0.38rem', color: 'var(--j-muted)' }}>
                {msg.proposal.reasoning}
              </div>

              <ImpactBlock impact={msg.proposal.impact} />

              {msg.proposalStatus === 'pending' && (
                <div className="jarvis-proposal-actions">
                  <button
                    className="jarvis-proposal-primary"
                    onClick={() => onApprove(msg.proposal)}
                    disabled={executing}
                  >
                    Approve & execute
                  </button>
                  <button
                    className="jarvis-proposal-secondary"
                    onClick={() => onModify(msg.proposal)}
                    disabled={executing}
                  >
                    Modify
                  </button>
                  <button
                    className="jarvis-proposal-tertiary"
                    onClick={() => onDecline(idx)}
                    disabled={executing}
                  >
                    Decline
                  </button>
                </div>
              )}

              {msg.proposalStatus === 'executed' && (
                <div className="jarvis-execution-row">
                  <span className="jarvis-state-label jarvis-state-executed">Applied</span>
                  {msg.actionFactId && (
                    <button
                      className="jarvis-inline-button"
                      onClick={() => onUndo(msg)}
                      disabled={executing}
                    >
                      Undo
                    </button>
                  )}
                </div>
              )}

              {msg.proposalStatus === 'undone' && (
                <div className="jarvis-execution-row">
                  <span className="jarvis-state-label jarvis-state-muted">Undone · state restored</span>
                </div>
              )}

              {msg.proposalStatus === 'declined' && (
                <div className="jarvis-execution-row">
                  <span className="jarvis-state-label jarvis-state-muted">Declined · no write</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ImpactBlock({ impact }) {
  if (!impact) return null;

  const lines = [
    impact.scoringImpact,
    impact.routineImpact,
    impact.identityAlignment,
    impact.disciplineImpact,
  ].filter(Boolean);

  return (
    <div className="jarvis-impact">
      <div className="jarvis-impact-title">Projected impact</div>
      {lines.map((line, index) => (
        <div key={index} className="jarvis-impact-line">· {line}</div>
      ))}
      {(impact.risks || []).map((risk, index) => (
        <div key={'risk-' + index} className="jarvis-impact-line jarvis-risk">Risk · {risk}</div>
      ))}
      {(impact.dependencies || []).map((dependency, index) => (
        <div key={'dependency-' + index} className="jarvis-impact-line jarvis-dependency">
          Dependency · {dependency}
        </div>
      ))}
    </div>
  );
}

function ContextSheet({ t, messages, onClose }) {
  const last = [...messages]
    .reverse()
    .find(message => message.role === 'assistant' && message.contextUsed)?.contextUsed;

  return (
    <Sheet title="Context used" onClose={onClose}>
      {!last ? (
        <div className="jarvis-sheet-section">
          <div className="jarvis-sheet-copy">
            Context provenance will appear after the assistant answers.
          </div>
        </div>
      ) : (
        <>
          <div className="jarvis-sheet-section">
            <div className="jarvis-eyebrow">Snapshot v{last.contextVersion}</div>
            <div className="jarvis-sheet-stats">
              <SheetStat value={last.evidenceCount} label="Evidence" />
              <SheetStat value={last.memoryCount} label="Memories" />
              <SheetStat value={last.activeHabitCount} label="Active habits" />
              <SheetStat value={last.activeGoalCount} label="Active goals" />
            </div>
          </div>

          {last.activeHabits?.length > 0 && (
            <div className="jarvis-sheet-section">
              <div className="jarvis-eyebrow">Habits</div>
              <ul className="jarvis-sheet-list">
                {last.activeHabits.slice(0, 8).map(habit => <li key={habit.id}>{habit.name}</li>)}
              </ul>
            </div>
          )}

          {last.activeGoals?.length > 0 && (
            <div className="jarvis-sheet-section">
              <div className="jarvis-eyebrow">Goals</div>
              <ul className="jarvis-sheet-list">
                {last.activeGoals.slice(0, 8).map((goal, index) => <li key={index}>{goal}</li>)}
              </ul>
            </div>
          )}

          {last.recentEvidence?.length > 0 && (
            <div className="jarvis-sheet-section">
              <div className="jarvis-eyebrow">Recent evidence</div>
              <ul className="jarvis-sheet-list">
                {last.recentEvidence.slice(-8).map(item => (
                  <li key={item.id}>{item.type}{item.date ? ' · ' + item.date : ''}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <div className="jarvis-sheet-actions">
        <button className="jarvis-sheet-secondary" onClick={onClose}>Done</button>
      </div>
    </Sheet>
  );
}

function ActionConfirmSheet({ t, proposal, onCancel, onConfirm }) {
  return (
    <Sheet title="Confirm action" onClose={onCancel}>
      <div className="jarvis-sheet-section">
        <div className="jarvis-eyebrow">This action changes saved data</div>
        <div className="jarvis-review-type">{proposalHeading(proposal)}</div>
        <div className="jarvis-sheet-copy">
          This is reversible where supported. Review the target before confirming.
        </div>
      </div>
      <div className="jarvis-sheet-actions">
        <button className="jarvis-sheet-danger" onClick={onConfirm}>Confirm</button>
        <button className="jarvis-sheet-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </Sheet>
  );
}

function MoreSheet({ onClose, onClear }) {
  return (
    <Sheet title="More" onClose={onClose}>
      <div className="jarvis-sheet-actions">
        <button className="jarvis-sheet-secondary" onClick={onClose}>Close</button>
        <button className="jarvis-sheet-danger" onClick={onClear}>Clear conversation</button>
      </div>
    </Sheet>
  );
}

function ClearConversationSheet({ onCancel, onConfirm }) {
  return (
    <Sheet title="Clear conversation" onClose={onCancel}>
      <div className="jarvis-sheet-section">
        <div className="jarvis-sheet-copy">
          This removes only the saved conversation transcript. Your other saved data stays untouched.
        </div>
      </div>
      <div className="jarvis-sheet-actions">
        <button className="jarvis-sheet-danger" onClick={onConfirm}>Clear conversation</button>
        <button className="jarvis-sheet-secondary" onClick={onCancel}>Keep conversation</button>
      </div>
    </Sheet>
  );
}

function Sheet({ title, onClose, children }) {
  return (
    <div className="jarvis-sheet-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="jarvis-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="jarvis-sheet-handle" />
        <h2 className="jarvis-sheet-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}

function SheetStat({ value, label }) {
  return (
    <div className="jarvis-sheet-stat">
      <div className="jarvis-sheet-stat-value">{value}</div>
      <div className="jarvis-sheet-stat-label">{label}</div>
    </div>
  );
}

function Avatar() {
  return (
    <div className="jarvis-avatar" aria-hidden="true">
      J
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
