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
  return entry ? `[Jarvis mode: ${entry.label}] ${entry.hint}. ` : '';
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
  const [contextOpen, setContextOpen] = useState(false);
  const [confirmingProposal, setConfirmingProposal] = useState(null);
  const [conversationReady, setConversationReady] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [proactiveInsight, setProactiveInsight] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const conversation = await getOrCreateConversation(CONVERSATION_ID, 'Jarvis');
        if (cancelled) return;
        setMessages(conversation.messages || []);
        conversationManager.hydrateFromUiMessages(conversation.messages || []);
        setConversationReady(true);
      } catch (err) {
        recordAppError(err, { source: 'jarvis_ui', operation: 'load_conversation' });
        setError('Could not load Jarvis history. New messages can still be started.');
        setConversationReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const persistMessages = async nextMessages => {
    setMessages(nextMessages);
    try {
      await saveConversation({
        id: CONVERSATION_ID,
        title: 'Jarvis',
        createdAt: new Date().toISOString(),
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
      const insight = await generateInsight('Run a focused Life OS review. Identify the highest-signal contradiction, bottleneck, trend change, capacity issue, or experiment decision. Separate observations from hypotheses and give concrete next actions.');
      setProactiveInsight(insight);
    } catch (err) {
      recordAppError(err, { source: 'jarvis_ui', operation: 'run_review' });
      setError(`Review failed: ${err.message}`);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSend = async () => {
    if (!conversationReady || !input.trim() || loading) return;

    const userText = input.trim();
    const llmUserText = `${modeInstruction(mode)}${userText}`;
    setInput('');
    setError(null);
    const optimistic = [...messages, { role: 'user', content: userText, createdAt: new Date().toISOString() }];
    await persistMessages(optimistic);
    setLoading(true);
    setLoadingPhase('Reading your current system...');

    try {
      const history = conversationManager.getHistory();
      setLoadingPhase('Reasoning over evidence...');
      const response = await chatWithJarvis(llmUserText, history, modificationContext);
      setModificationContext(null);

      conversationManager.appendMessage('user', llmUserText);
      conversationManager.appendMessage('assistant', JSON.stringify(response));

      let enrichedProposal = null;
      if (response.proposal) {
        setLoadingPhase('Calculating deterministic impact...');
        const [routineConfig, habits, logs, axisConfigs, quests] = await Promise.all([
          getRoutineConfig(), getAllHabits(), getAllLogs(), getAllAxisConfigs(), getAllQuests(),
        ]);
        const today = new Date().toISOString().split('T')[0];
        const currentState = {
          routine: routineConfig,
          habits,
          stats: computeAllStats(logs, axisConfigs, quests, today, habits),
          axisDetails: computeAxisDetails(logs, axisConfigs, quests, today, habits),
        };
        enrichedProposal = { ...response.proposal, impact: computeImpact(response.proposal, currentState) };
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
      setError(err.message || 'Jarvis request failed.');
      await persistMessages([...optimistic, {
        role: 'assistant',
        isError: true,
        content: 'Jarvis could not complete that request. The failure was recorded in Diagnostics.',
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
      setLoadingPhase('');
    }
  };

  const executeApprovedProposal = async proposal => {
    setError(null);
    setExecuting(true);
    setLoadingPhase('Validating proposal and preconditions...');
    try {
      const result = await executeAction(proposal);
      const actionFactId = result?.actionFactId;
      const next = messages.map(message =>
        message.proposal === proposal
          ? { ...message, proposalStatus: 'executed', actionFactId, executionResult: result }
          : message
      );
      const systemMessage = {
        role: 'system',
        content: result?.idempotent
          ? `Already executed: ${proposal.actionType}${result?.id ? ` (${result.id})` : ''}`
          : `Action executed: ${proposal.actionType}${result?.id ? ` (${result.id})` : ''}`,
        createdAt: new Date().toISOString(),
      };
      await persistMessages([...next, systemMessage]);
      if (onQuestsChanged) onQuestsChanged();
    } catch (err) {
      recordAppError(err, { source: 'jarvis_ui', operation: 'execute_action', metadata: { actionType: proposal.actionType } });
      setError(`Execution failed: ${err.message}`);
      await persistMessages([...messages, {
        role: 'system',
        content: `Execution failed: ${err.message}`,
        isError: true,
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setExecuting(false);
      setLoadingPhase('');
    }
  };

  const handleApproveProposal = proposal => {
    if (destructiveActions.has(proposal.actionType)) {
      setConfirmingProposal(proposal);
      return;
    }
    executeApprovedProposal(proposal);
  };

  const handleUndo = async message => {
    if (!message.actionFactId || executing) return;
    setExecuting(true);
    setError(null);
    try {
      await undoAction(message.actionFactId);
      const next = messages.map(item =>
        item.actionFactId === message.actionFactId
          ? { ...item, proposalStatus: 'undone', undoStatus: 'undone' }
          : item
      );
      await persistMessages([...next, {
        role: 'system',
        content: `Undid ${message.proposal?.actionType || 'the Jarvis action'}.`,
        createdAt: new Date().toISOString(),
      }]);
      if (onQuestsChanged) onQuestsChanged();
    } catch (err) {
      recordAppError(err, { source: 'jarvis_ui', operation: 'undo_action' });
      setError(`Undo failed: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleDeclineProposal = async index => {
    const next = messages.map((message, messageIndex) =>
      messageIndex === index ? { ...message, proposalStatus: 'declined', proposal: null } : message
    );
    await persistMessages([...next, {
      role: 'system',
      content: 'Proposal declined. No data was changed.',
      createdAt: new Date().toISOString(),
    }]);
  };

  const handleModifyProposal = proposal => {
    setError(null);
    setModificationContext(proposal);
    setInput('');
  };

  const handleClearConversation = async () => {
    if (!window.confirm('Clear this Jarvis conversation? This removes only the conversation transcript, not your Life OS data.')) return;
    await clearConversation(CONVERSATION_ID);
    conversationManager.clear();
    setMessages([]);
    setModificationContext(null);
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '80vh', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <div style={{ padding: '0 1rem', marginBottom: '0.7rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Jarvis OS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, lineHeight: 1 }}>Life OS operator</div>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button onClick={handleRunReview} disabled={reviewLoading} style={{...smallButton(t), color: ACCENT}}>{reviewLoading ? 'Reviewing…' : 'Run review'}</button>
            <button onClick={() => setContextOpen(v => !v)} style={smallButton(t)}>{contextOpen ? 'Hide context' : 'Context'}</button>
            <button onClick={handleClearConversation} style={smallButton(t)}>Clear</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingTop: '0.8rem' }}>
          {MODES.map(item => (
            <button key={item.id} onClick={() => setMode(item.id)} title={item.hint} style={{
              ...smallButton(t),
              borderColor: mode === item.id ? ACCENT : t.borderSoft,
              color: mode === item.id ? ACCENT : t.muted,
              fontWeight: mode === item.id ? 700 : 500,
            }}>{item.label}</button>
          ))}
        </div>
      </div>

      {contextOpen && (
        <ContextDrawer t={t} messages={messages} />
      )}

      {proactiveInsight && (
        <div style={{ margin: '0 1rem 0.8rem', padding: '1rem', border: `1px solid ${t.borderSoft}`, borderRadius: '10px', background: t.subtleBg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.62rem', color: ACCENT, letterSpacing: '0.08em' }}>PROACTIVE SYSTEM REVIEW</div>
            <button onClick={() => setProactiveInsight(null)} style={smallButton(t)}>Dismiss</button>
          </div>
          <div style={{ marginTop: '0.6rem', fontWeight: 700 }}>{proactiveInsight.type || 'Review'}</div>
          <div style={{ marginTop: '0.45rem', color: t.muted, fontSize: '0.82rem', lineHeight: 1.5 }}>{proactiveInsight.statement}</div>
          {Array.isArray(proactiveInsight.recommendedActions) && proactiveInsight.recommendedActions.length > 0 && (
            <div style={{ marginTop: '0.65rem', color: t.muted, fontSize: '0.78rem' }}>
              {proactiveInsight.recommendedActions.slice(0, 4).map((item, index) => <div key={index}>· {item}</div>)}
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>What should we work on?</div>
            <div style={{ color: t.muted, fontSize: '0.9rem', lineHeight: 1.5, maxWidth: '470px' }}>
              Jarvis can inspect your evidence, propose reversible changes, and explain the system impact before anything is written.
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1.5rem', maxWidth: '550px' }}>
              {['Review today', 'Add a habit', 'Set a goal', 'Add a quest', 'Capture a learning', 'Find my bottleneck'].map(prompt => (
                <button key={prompt} onClick={() => setInput(`${prompt}: `)} style={chipButton(t)}>{prompt}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: msg.role === 'user' ? '78%' : '100%', width: msg.role === 'assistant' ? '100%' : 'auto' }}>
            {msg.role === 'system' ? (
              <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: msg.isError ? '#c1442c' : t.muted, textAlign: 'center', margin: '0.5rem 0' }}>[{msg.content}]</div>
            ) : msg.role === 'user' ? (
              <div style={{ background: t.subtleBg, color: t.pageText, padding: '0.75rem 1rem', borderRadius: '16px 16px 4px 16px', fontSize: '0.95rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', border: `1px solid ${t.borderSoft}` }}>{msg.content}</div>
            ) : (
              <AssistantMessage
                msg={msg}
                idx={idx}
                t={t}
                executing={executing}
                onApprove={handleApproveProposal}
                onModify={handleModifyProposal}
                onDecline={handleDeclineProposal}
                onUndo={handleUndo}
              />
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '1rem', width: '100%', opacity: 0.8 }}>
            <Avatar />
            <div style={{ color: t.muted, fontSize: '0.85rem', alignSelf: 'center' }}>{loadingPhase || 'Working...'}</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ flexShrink: 0, padding: '0 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {error && <div style={{ color: '#c1442c', fontSize: '0.8rem', marginBottom: '0.5rem', textAlign: 'center' }}>{error}</div>}
        {modificationContext && (
          <div style={{ width: '100%', maxWidth: '750px', fontSize: '0.7rem', fontFamily: 'monospace', color: ACCENT, marginBottom: '0.35rem' }}>
            MODIFYING: {modificationContext.actionType} · describe only the change
          </div>
        )}
        <div style={{ display: 'flex', width: '100%', maxWidth: '750px', background: t.subtleBg, border: `1px solid ${t.borderSoft}`, borderRadius: '24px', padding: '0.5rem 0.5rem 0.5rem 1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={modificationContext ? 'Describe the change you want...' : `Ask Jarvis in ${mode} mode...`}
            style={{ flex: 1, background: 'transparent', color: t.pageText, border: 'none', padding: '0.4rem 0', fontSize: '0.95rem', resize: 'none', fontFamily: 'inherit', minHeight: '24px', maxHeight: '120px', outline: 'none', lineHeight: 1.4 }}
            rows={1}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
          />
          <button onClick={handleSend} disabled={loading || !input.trim() || !conversationReady} style={{
            width: '32px', height: '32px', borderRadius: '50%', background: loading || !input.trim() ? 'transparent' : ACCENT, color: loading || !input.trim() ? t.muted : '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: loading || !input.trim() ? 'default' : 'pointer', marginLeft: '0.5rem', flexShrink: 0,
          }} aria-label="Send message">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </button>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: t.muted, marginTop: '0.6rem', letterSpacing: '0.05em' }}>
          AI proposes. You approve. Every write is validated and reversible where supported.
        </div>
      </div>

      {confirmingProposal && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle(t), maxWidth: '430px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#c1442c', letterSpacing: '0.12em' }}>DESTRUCTIVE ACTION</div>
            <h3 style={{ margin: '0.5rem 0' }}>Archive this habit?</h3>
            <p style={{ color: t.muted, lineHeight: 1.5, fontSize: '0.9rem' }}>The habit will stop being active and will no longer contribute to current tracking. Its history remains preserved.</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmingProposal(null)} style={smallButton(t)}>Cancel</button>
              <button onClick={() => { const p = confirmingProposal; setConfirmingProposal(null); executeApprovedProposal(p); }} style={{ ...smallButton(t), background: '#c1442c', color: '#fff', borderColor: '#c1442c' }}>Archive habit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssistantMessage({ msg, idx, t, executing, onApprove, onModify, onDecline, onUndo }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
      <Avatar />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: msg.isError ? '#c1442c' : t.pageText, fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
        {msg.proposal && (
          <div style={{ marginTop: '1rem', background: t.subtleBg, border: `1px solid ${t.borderSoft}`, borderRadius: '10px', overflow: 'hidden', maxWidth: '680px' }}>
            <div style={{ padding: '0.65rem 1rem', borderBottom: `1px solid ${t.borderSoft}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: msg.proposalStatus === 'executed' ? '#4f8a5f' : ACCENT }} />
              <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{formatAction(msg.proposal.actionType)}</div>
              <div style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: '0.62rem', color: t.muted }}>{msg.proposal.confidence != null ? `${Math.round(msg.proposal.confidence * 100)}% confidence` : ''}</div>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.9rem', marginBottom: '0.9rem', lineHeight: 1.5 }}>{msg.proposal.reasoning}</div>
              <ImpactBlock t={t} impact={msg.proposal.impact} />
              {msg.proposalStatus === 'pending' && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.9rem' }}>
                  <button onClick={() => onApprove(msg.proposal)} disabled={executing} style={{ ...smallButton(t), background: ACCENT, color: '#fff', borderColor: ACCENT, fontWeight: 700 }}>Approve & Execute</button>
                  <button onClick={() => onModify(msg.proposal)} disabled={executing} style={smallButton(t)}>Modify</button>
                  <button onClick={() => onDecline(idx)} disabled={executing} style={{ ...smallButton(t), borderColor: 'transparent', color: t.muted }}>Decline</button>
                </div>
              )}
              {msg.proposalStatus === 'executed' && (
                <div style={{ marginTop: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#4f8a5f' }}>EXECUTED</span>
                  {msg.actionFactId && <button onClick={() => onUndo(msg)} disabled={executing} style={smallButton(t)}>Undo</button>}
                </div>
              )}
              {msg.proposalStatus === 'undone' && <div style={{ marginTop: '0.9rem', fontFamily: 'monospace', fontSize: '0.68rem', color: t.muted }}>UNDONE · state restored</div>}
              {msg.proposalStatus === 'declined' && <div style={{ marginTop: '0.9rem', fontFamily: 'monospace', fontSize: '0.68rem', color: t.muted }}>DECLINED · no write occurred</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ImpactBlock({ t, impact }) {
  if (!impact) return null;
  const lines = [impact.scoringImpact, impact.routineImpact, impact.identityAlignment, impact.disciplineImpact].filter(Boolean);
  return (
    <div style={{ fontSize: '0.78rem', padding: '0.8rem', background: t.pageBg, borderRadius: '7px', border: `1px dashed ${t.borderSoft}` }}>
      <div style={{ fontFamily: 'monospace', fontSize: '0.62rem', color: t.muted, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Projected impact</div>
      {lines.map((line, i) => <div key={i} style={{ color: t.muted, lineHeight: 1.45, marginBottom: '0.25rem' }}>· {line}</div>)}
      {(impact.risks || []).map((risk, i) => <div key={`risk-${i}`} style={{ color: '#c1442c', lineHeight: 1.45 }}>Risk · {risk}</div>)}
      {(impact.dependencies || []).map((dep, i) => <div key={`dep-${i}`} style={{ color: t.muted, lineHeight: 1.45 }}>Dependency · {dep}</div>)}
    </div>
  );
}

function ContextDrawer({ t, messages }) {
  const last = [...messages].reverse().find(message => message.role === 'assistant' && message.contextUsed)?.contextUsed;
  if (!last) return <div style={{ margin: '0 1rem 0.8rem', padding: '0.75rem 1rem', border: `1px solid ${t.borderSoft}`, borderRadius: '8px', color: t.muted, fontSize: '0.78rem' }}>Context provenance will appear after Jarvis answers.</div>;
  return (
    <div style={{ margin: '0 1rem 0.8rem', padding: '0.85rem 1rem', border: `1px solid ${t.borderSoft}`, borderRadius: '8px', background: t.subtleBg, fontSize: '0.76rem' }}>
      <div style={{ fontFamily: 'monospace', fontSize: '0.62rem', color: ACCENT, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>CONTEXT USED · v{last.contextVersion}</div>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: t.muted }}>
        <span>{last.evidenceCount} evidence facts</span><span>{last.memoryCount} memories</span><span>{last.activeHabitCount} active habits</span><span>{last.activeGoalCount} active goals</span>
      </div>
      {last.activeHabits?.length > 0 && <div style={{ marginTop: '0.55rem', color: t.muted }}>Habits: {last.activeHabits.map(h => h.name).join(' · ')}</div>}
      {last.activeGoals?.length > 0 && <div style={{ marginTop: '0.35rem', color: t.muted }}>Goals: {last.activeGoals.join(' · ')}</div>}
      {last.recentEvidence?.length > 0 && <div style={{ marginTop: '0.35rem', color: t.muted }}>Recent evidence: {last.recentEvidence.map(e => e.type).join(' · ')}</div>}
    </div>
  );
}

function Avatar() {
  return <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: ACCENT, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold' }}>J</div>;
}

function formatAction(value) {
  return String(value || '').replaceAll('_', ' ');
}

function smallButton(t) {
  return { background: 'transparent', color: t.pageText, border: `1px solid ${t.borderSoft}`, borderRadius: '6px', padding: '0.45rem 0.65rem', fontSize: '0.68rem', fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' };
}

function chipButton(t) {
  return { background: t.subtleBg, border: `1px solid ${t.borderSoft}`, color: t.pageText, padding: '0.6rem 1rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem' };
}

const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' };
const modalStyle = t => ({ background: t.pageBg, color: t.pageText, border: `1px solid ${t.borderSoft}`, borderRadius: '12px', padding: '1.2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' });
