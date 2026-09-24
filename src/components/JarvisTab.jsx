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
  { id: 'onboarding', label: 'Continue onboarding', description: 'Let Jarvis interview me and configure my system', icon: '✦', prompt: 'Continue my onboarding' },
];

const destructiveActions = new Set(['archive_habit']);

function modeInstruction(mode) {
  const entry = MODES.find(item => item.id === mode);
  return entry ? '[Assistant mode: ' + entry.label + '] ' + entry.hint + '. ' : '';
}

export default function JarvisTab({ t, onQuestsChanged, onboardingMode = false, onOnboardingComplete, jarvisContext, onClearContext }) {
  const conversationId = onboardingMode ? ONBOARDING_CONVERSATION_ID : DEFAULT_CONVERSATION_ID;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('ask');
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [selectedProposalForImpact, setSelectedProposalForImpact] = useState(null);
  const [selectedProposalForEdit, setSelectedProposalForEdit] = useState(null);
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
        const conversation = await getOrCreateConversation(conversationId, 'Jarvis');
        if (cancelled) return;
        setMessages(conversation.messages || []);
        createdAtRef.current = conversation.createdAt || new Date().toISOString();
        conversationManager.hydrateFromUiMessages(conversation.messages || []);
        setConversationReady(true);
        if (onboardingMode && (conversation.messages || []).length === 0) {
          setInput('Start my onboarding. Ask me the first question and build my profile from conversation.');
        }
      } catch (err) {
        recordAppError(err, { source: 'jarvis_ui', operation: 'load_conversation' });
        setError('Could not load conversation history. You can still start a new one.');
        setConversationReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, [conversationId, onboardingMode]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setLoading(true);
    setLoadingPhase('Thinking...');
    setError(null);
    try {
      const response = await chatWithJarvis({
        conversationId,
        message: msg,
        context: jarvisContext,
        modeInstruction: modeInstruction(mode)
      });
      const finalMessages = [...newMessages, { role: 'assistant', ...response }];
      setMessages(finalMessages);
      await saveConversation({
        id: conversationId,
        type: 'Jarvis',
        messages: finalMessages,
        createdAt: createdAtRef.current
      });
      if (onboardingMode && response.action === 'complete_onboarding') {
        onOnboardingComplete && onOnboardingComplete();
      }
    } catch (err) {
      recordAppError(err, { source: 'jarvis_ui', operation: 'send_message' });
      setError('Jarvis encountered an error processing your request.');
    } finally {
      setLoading(false);
      setLoadingPhase('');
    }
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
      if (proposal.type === 'create_quest' || proposal.type === 'edit_quest' || proposal.type === 'archive_quest') {
        onQuestsChanged && onQuestsChanged();
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
    <div className="ph" data-n="1" style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg)', color: 'var(--tx)', fontFamily: 'var(--f)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* Header */}
      <div className="hd" style={{ display: 'flex', alignItems: 'flex-end', padding: '26px 18px 12px' }}>
        <div>
          <h2 style={{ font: '600 26px/1.1 var(--f)', letterSpacing: '-.02em' }}>Jarvis</h2>
          <p style={{ fontSize: '13px', color: 'var(--mu)' }}>{loading ? loadingPhase : 'Ready'}</p>
        </div>
        {!onboardingMode && (
          <span className="pill" style={{ marginLeft: 'auto', font: '500 11.5px "Geist Mono", monospace', color: 'var(--mu)', padding: '9px 12px', borderRadius: '12px', boxShadow: 'inset 0 0 0 1px var(--ln)', cursor: 'pointer' }} onClick={() => setModeMenuOpen(true)}>
            {MODES.find(m => m.id === mode)?.label || 'Ask'}
          </span>
        )}
      </div>
      
      {/* Messages */}
      <div className="bd" style={{ padding: '0 14px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {messages.length === 0 ? (
          <div style={{ marginTop: '20px' }}>
            <div className="fl" style={{ font: '500 13px var(--f)', margin: '14px 0 6px' }}>Search</div>
            <div className="in" style={{ minHeight: '48px', display: 'flex', alignItems: 'center', padding: '0 14px', borderRadius: '12px', background: 'var(--s2)', font: '500 13px "Geist Mono", monospace', boxShadow: 'inset 0 0 0 1px var(--ln)', fontFamily: 'Geist', color: 'var(--mu)' }}>
              Search conversations
            </div>
            
            <div className="lb" style={{ font: '500 12.5px var(--f)', color: 'var(--mu)', margin: '16px 4px 8px' }}>History</div>
            <div className="grp" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--ln)', background: 'var(--s1)' }}>
              <div className="hr" style={{ padding: '12px 14px', borderBottom: '1px solid var(--ln)', cursor: 'pointer' }} onClick={() => setInput('Audit my routine')}>
                <b style={{ display: 'block', font: '500 14.5px var(--f)' }}>Audit my routine</b>
                <span className="k" style={{ font: '500 11.5px "Geist Mono", monospace', color: 'var(--mu)' }}>Audit</span>
                <p style={{ fontSize: '12.5px', color: 'var(--mu)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>3 issues found.</p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ paddingBottom: '120px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'user' ? (
                  <div className="u" style={{ background: 'var(--s2)', padding: '10px 14px', borderRadius: '16px 16px 6px 16px', fontSize: '14.5px', width: 'fit-content', maxWidth: '82%', alignSelf: 'flex-end' }}>
                    {msg.content}
                  </div>
                ) : (
                  <div style={{ width: '100%', maxWidth: '82%' }}>
                    {msg.content && <p className="r" style={{ paddingLeft: '12px', marginBottom: '10px', fontSize: '14.5px', borderLeft: '3px solid var(--tx)' }}>{msg.content}</p>}
                    
                    {msg.proposal && (
                      <ActionProposalCard 
                        proposal={msg.proposal}
                        status={msg.proposalStatus}
                        onApply={() => setSelectedProposalForImpact({ proposal: msg.proposal, impact: msg.proposal.impact })}
                        onEdit={() => setSelectedProposalForEdit(msg.proposal)}
                      />
                    )}
                    
                    {msg.contextUsed && (
                      <div className="btn s" style={{ background: 'var(--s2)', color: 'var(--tx)', width: 'fit-content', minHeight: '36px', padding: '0 12px', fontSize: '12px', marginTop: '8px' }}>
                        Based on {msg.contextUsed.length} sources
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Context Attached */}
      {(jarvisContext || modificationContext) && (
        <div style={{ position: 'absolute', bottom: '86px', left: '14px', right: '14px', zIndex: 10 }}>
          <div className="ctx" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', minHeight: '40px', padding: '0 12px', borderRadius: '10px', background: 'var(--s2)', font: '500 12.5px var(--f)', boxShadow: 'inset 0 0 0 1px var(--ln)' }}>
            {(modificationContext || jarvisContext).entityType === 'axis' && `Context: ${(modificationContext || jarvisContext).payload?.axis || 'Stats'}`}
            {(modificationContext || jarvisContext).entityType === 'habit' && `Context: Habit`}
            {(modificationContext || jarvisContext).entityType !== 'axis' && (modificationContext || jarvisContext).entityType !== 'habit' && `Context attached`}
            <span className="k" style={{ cursor: 'pointer', color: 'var(--ac)' }} onClick={() => { if(onClearContext) onClearContext(); setModificationContext(null); }}>Clear</span>
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="cp" style={{ position: 'absolute', left: '12px', right: '12px', bottom: '14px', height: '60px', borderRadius: '16px', background: 'var(--s2)', boxShadow: 'inset 0 0 0 1px var(--ln)', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 7px', color: 'var(--mu)', fontSize: '14px', zIndex: 11 }}>
        <i style={{ fontStyle: 'normal', width: '46px', height: '46px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: 'var(--s1)', color: 'var(--tx)', cursor: 'pointer' }} onClick={() => { setInput('/'); setCommandMenuOpen(true); }}>+</i>
        <input 
          style={{ flex: 1, paddingLeft: '6px', background: 'transparent', border: 'none', color: 'var(--tx)', outline: 'none', fontSize: '14px' }} 
          placeholder="Ask Jarvis" 
          value={input}
          onChange={e => {
            setInput(e.target.value);
            if (e.target.value.startsWith('/')) {
              setCommandMenuOpen(true);
              setCommandQuery(e.target.value.substring(1));
            } else {
              setCommandMenuOpen(false);
            }
          }}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <i style={{ fontStyle: 'normal', width: '46px', height: '46px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: 'var(--s1)', color: 'var(--tx)', cursor: 'pointer' }} onClick={() => setCommandMenuOpen(true)}>/</i>
        <i className="go" style={{ fontStyle: 'normal', width: '46px', height: '46px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: loading || !input.trim() ? 'var(--s1)' : 'var(--ac)', color: loading || !input.trim() ? 'var(--mu)' : 'var(--bg)', cursor: loading || !input.trim() ? 'default' : 'pointer', transition: 'background 0.2s' }} onClick={handleSend}>↑</i>
      </div>

      {/* Slash Palette */}
      {commandMenuOpen && (
        <div className="kb" style={{ position: 'absolute', left: 0, right: 0, bottom: '80px', height: '250px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', color: 'var(--tx)', zIndex: 15, borderTop: '1px solid var(--ln)', boxShadow: '0 -4px 12px rgba(0,0,0,0.2)', padding: '14px', overflowY: 'auto' }}>
          <h3 className="lb" style={{ marginTop: 0 }}>Commands</h3>
          <div className="grp">
            {COMMANDS.filter(c => c.label.toLowerCase().includes(commandQuery.toLowerCase()) || c.id.includes(commandQuery.toLowerCase())).map(cmd => (
              <div key={cmd.id} className="rw" style={{ cursor: 'pointer' }} onClick={() => { setInput(cmd.prompt + ' '); setCommandMenuOpen(false); }}>
                <div className="sq" style={{ borderRadius: '8px', boxShadow: 'inset 0 0 0 2px var(--mu)', display: 'grid', placeItems: 'center', marginRight: '12px' }}>{cmd.icon}</div>
                {cmd.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overlays */}
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

      <BottomSheet isOpen={modeMenuOpen} onClose={() => setModeMenuOpen(false)}>
        <h3 className="t1">Select mode</h3>
        <div className="chs" style={{ marginTop: '16px' }}>
          {MODES.map(m => (
            <div key={m.id} className={'ch ' + (mode === m.id ? 'on' : '')} onClick={() => { setMode(m.id); setModeMenuOpen(false); }} style={{ cursor: 'pointer' }}>
              {m.label}
            </div>
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
