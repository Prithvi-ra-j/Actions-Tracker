import React, { useState, useEffect, useRef } from 'react';
import { ACCENT } from '../constants.js';
import InsightsInbox from './InsightsInbox.jsx';
import { chatWithJarvis } from '../core/ai/jarvisEngine.js';
import { executeAction } from '../core/ai/actionExecutor.js';
import { computeImpact } from '../core/ai/impactEngine.js';
import { conversationManager } from '../core/ai/conversationManager.js';
import { getRoutineConfig } from '../database/routineRepository.js';
import { getAllHabits } from '../database/habitRepository.js';
import { getAllLogs } from '../database/logsRepository.js';
import { getAllAxisConfigs } from '../database/axisConfigRepository.js';
import { getAllQuests } from '../database/questBoardRepository.js';
import { computeAllStats, computeAxisDetails } from '../helpers/statsEngine.js';

export default function JarvisTab({ t, onQuestsChanged }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [executing, setExecuting] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setError(null);
    
    // Optimistic UI
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    
    setLoading(true);

    try {
      const history = conversationManager.getHistory();
      const response = await chatWithJarvis(userText, history);
      
      conversationManager.appendMessage('user', userText);
      conversationManager.appendMessage('assistant', JSON.stringify(response));

      // Compute deterministic impact if there's a proposal
      let enrichedProposal = null;
      if (response.proposal) {
        // Just mock current state for routine
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
        const impact = computeImpact(response.proposal, currentState);
        enrichedProposal = { ...response.proposal, impact };
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.message, 
        proposal: enrichedProposal 
      }]);
      
    } catch (err) {
      setError(err.message);
      // Remove optimistic message on fail, or show error message
      setMessages(prev => [...prev, { role: 'assistant', isError: true, content: 'Failed to communicate with Jarvis.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProposal = async (proposal) => {
    setExecuting(true);
    try {
      await executeAction(proposal);
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: `Action executed: ${proposal.actionType}` 
      }]);
      if (onQuestsChanged) onQuestsChanged();
    } catch (err) {
      setError(`Execution failed: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleDeclineProposal = (index) => {
    setMessages(prev => prev.map((message, messageIndex) => (
      messageIndex === index ? { ...message, proposal: null } : message
    )));
    setMessages(prev => [...prev, { role: 'system', content: 'Proposal declined. No data was changed.' }]);
  };

  const handleModifyProposal = (proposal) => {
    setInput(`Modify the ${proposal.actionType} proposal: `);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '80vh' }}>
      <div style={{ marginBottom: '1rem', flexShrink: 0 }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Jarvis OS
        </div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>
          Auditor & Interpreter
        </div>
        <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: t.muted, fontStyle: 'italic', lineHeight: 1.5 }}>
          No mercy. Only evidence.
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${t.border}`, background: t.subtleBg, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: t.muted, margin: 'auto', fontStyle: 'italic', fontSize: '0.9rem' }}>
            Awaiting input. Ask Jarvis to analyze your habits, build a routine, or review your momentum.
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} style={{ 
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
          }}>
            {msg.role === 'system' ? (
              <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: ACCENT, textAlign: 'center', marginTop: '1rem', marginBottom: '1rem' }}>
                [{msg.content}]
              </div>
            ) : (
              <div style={{
                background: msg.role === 'user' ? ACCENT : (msg.isError ? '#c1442c' : t.pageBg),
                color: msg.role === 'user' ? '#fff' : t.pageText,
                padding: '0.75rem 1rem',
                border: msg.role === 'assistant' ? `1px solid ${t.border}` : 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </div>
            )}
            
            {msg.proposal && (
              <div style={{
                marginTop: '0.5rem',
                borderLeft: `3px solid ${ACCENT}`,
                padding: '1rem',
                background: t.pageBg,
                borderTop: `1px solid ${t.border}`,
                borderRight: `1px solid ${t.border}`,
                borderBottom: `1px solid ${t.border}`,
              }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Action Proposal: {msg.proposal.actionType}
                </div>
                
                <div style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {msg.proposal.reasoning}
                </div>
                
                {msg.proposal.impact && (
                  <div style={{ fontSize: '0.8rem', padding: '0.75rem', background: t.subtleBg, marginBottom: '1rem', border: `1px solid ${t.borderSoft}` }}>
                    <strong>Projected Impact:</strong>
                    <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.2rem', color: t.muted }}>
                      <li>{msg.proposal.impact.scoringImpact}</li>
                      <li>{msg.proposal.impact.routineImpact}</li>
                      {Object.values(msg.proposal.impact.scoringProjections || {}).map(projection => (
                        <li key={projection.domain}>
                          {projection.domain} over {projection.horizonDays} days: {projection.before} to {projection.estimatedRange.low}-{projection.estimatedRange.high}
                          {projection.warnings?.length > 0 ? ` (${projection.warnings[0]})` : ''}
                        </li>
                      ))}
                      {msg.proposal.impact.risks?.map((risk, i) => (
                        <li key={i} style={{ color: '#c1442c' }}>Risk: {risk}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <button 
                  onClick={() => handleApproveProposal(msg.proposal)}
                  disabled={executing}
                  style={{
                    background: ACCENT,
                    color: '#fff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    cursor: executing ? 'default' : 'pointer',
                    opacity: executing ? 0.7 : 1
                  }}
                >
                  {executing ? 'Executing...' : 'Approve & Execute'}
                </button>
                <button
                  onClick={() => handleModifyProposal(msg.proposal)}
                  disabled={executing}
                  style={{ marginLeft: '0.5rem', padding: '0.5rem 1rem', background: 'transparent', color: t.pageText, border: `1px solid ${t.border}`, fontSize: '0.8rem', fontFamily: 'monospace', textTransform: 'uppercase' }}
                >
                  Modify
                </button>
                <button
                  onClick={() => handleDeclineProposal(idx)}
                  disabled={executing}
                  style={{ marginLeft: '0.5rem', padding: '0.5rem 1rem', background: 'transparent', color: t.muted, border: 'none', fontSize: '0.8rem', fontFamily: 'monospace', textTransform: 'uppercase' }}
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', color: t.muted, fontSize: '0.85rem', fontStyle: 'italic' }}>
            Jarvis is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ flexShrink: 0 }}>
        {error && (
          <div style={{ color: '#c1442c', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Jarvis to review your routine or propose a new habit..."
            style={{
              flex: 1,
              background: t.pageBg,
              color: t.pageText,
              border: `1px solid ${t.border}`,
              padding: '0.75rem',
              fontSize: '0.9rem',
              resize: 'none',
              fontFamily: 'inherit',
              height: '60px',
              outline: 'none'
            }}
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? 'transparent' : ACCENT,
              color: loading || !input.trim() ? t.muted : '#fff',
              border: `1px solid ${loading || !input.trim() ? t.border : ACCENT}`,
              padding: '0 1.5rem',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              cursor: loading || !input.trim() ? 'default' : 'pointer'
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
