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
  const [modificationContext, setModificationContext] = useState(null);
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
      const response = await chatWithJarvis(userText, history, modificationContext);
      setModificationContext(null);
      
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
        proposal: enrichedProposal,
        proposalStatus: enrichedProposal ? 'pending' : undefined,
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
      const result = await executeAction(proposal);
      setMessages(prev => prev.map(message =>
        message.proposal === proposal
          ? { ...message, proposalStatus: 'executed' }
          : message
      ));
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Action executed: ${proposal.actionType}${result?.id ? ` (${result.id})` : ''}`
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
    setModificationContext(proposal);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '80vh', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      {/* ── Header ── */}
      <div style={{ padding: '0 1rem', marginBottom: '1rem', flexShrink: 0 }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Jarvis OS
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 900, lineHeight: 1 }}>
          Your personal assistant
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 2rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Empty State */}
        {messages.length === 0 && (
          <div style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>What should we work on?</div>
            <div style={{ color: t.muted, fontSize: '0.9rem', lineHeight: 1.5, maxWidth: '400px' }}>
              Tell me what you want to change. I can help shape a habit, goal, quest, routine, or learning capture.
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1.5rem', maxWidth: '500px' }}>
              {['Add a habit', 'Set a goal', 'Add a quest', 'Review today', 'Capture a learning'].map(prompt => (
                <button 
                  key={prompt} 
                  onClick={() => setInput(`${prompt}: `)} 
                  style={{ 
                    background: t.subtleBg, 
                    border: `1px solid ${t.borderSoft}`, 
                    color: t.pageText, 
                    padding: '0.6rem 1rem', 
                    borderRadius: '20px', 
                    cursor: 'pointer', 
                    fontSize: '0.85rem',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseOver={(e) => e.target.style.borderColor = t.border}
                  onMouseOut={(e) => e.target.style.borderColor = t.borderSoft}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Messages Loop */}
        {messages.map((msg, idx) => (
          <div key={idx} style={{ 
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: msg.role === 'user' ? '75%' : '100%',
            width: msg.role === 'assistant' ? '100%' : 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {msg.role === 'system' ? (
              <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: t.muted, textAlign: 'center', margin: '0.5rem 0' }}>
                [{msg.content}]
              </div>
            ) : msg.role === 'user' ? (
              <div style={{
                background: t.subtleBg,
                color: t.pageText,
                padding: '0.75rem 1rem',
                borderRadius: '16px',
                borderBottomRightRadius: '4px',
                fontSize: '0.95rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                border: `1px solid ${t.borderSoft}`
              }}>
                {msg.content}
              </div>
            ) : (
              // Assistant Message (Claude style)
              <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                {/* Avatar */}
                <div style={{ 
                  width: '24px', height: '24px', borderRadius: '4px', background: ACCENT, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold'
                }}>
                  J
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    color: msg.isError ? '#c1442c' : t.pageText,
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.content}
                  </div>
                  
                  {/* Action Proposal (Artifact style) */}
                  {msg.proposal && msg.proposalStatus !== 'executed' && (
                    <div style={{
                      marginTop: '1.25rem',
                      background: t.subtleBg,
                      border: `1px solid ${t.borderSoft}`,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      maxWidth: '600px'
                    }}>
                      <div style={{ 
                        padding: '0.6rem 1rem', 
                        borderBottom: `1px solid ${t.borderSoft}`,
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(0,0,0,0.02)'
                      }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ACCENT }}></div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: t.pageText, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                          Action Proposal: {msg.proposal.actionType}
                        </div>
                      </div>
                      
                      <div style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.9rem', marginBottom: '1.25rem', color: t.pageText, lineHeight: 1.5 }}>
                          {msg.proposal.reasoning}
                        </div>
                        
                        {msg.proposal.impact && (
                          <div style={{ fontSize: '0.8rem', padding: '0.85rem', background: t.pageBg, marginBottom: '1.25rem', borderRadius: '6px', border: `1px dashed ${t.borderSoft}` }}>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: t.muted, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Projected Impact</div>
                            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: t.muted, lineHeight: 1.5 }}>
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
                        
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button 
                            onClick={() => handleApproveProposal(msg.proposal)}
                            disabled={executing}
                            style={{
                              background: ACCENT, color: '#fff', border: 'none', padding: '0.55rem 1rem',
                              fontSize: '0.75rem', fontFamily: 'monospace', textTransform: 'uppercase',
                              borderRadius: '4px', cursor: executing ? 'default' : 'pointer', opacity: executing ? 0.7 : 1,
                              fontWeight: 600
                            }}
                          >
                            {executing ? 'Executing...' : 'Approve & Execute'}
                          </button>
                          <button
                            onClick={() => handleModifyProposal(msg.proposal)}
                            disabled={executing}
                            style={{ 
                              padding: '0.55rem 1rem', background: 'transparent', color: t.pageText, 
                              border: `1px solid ${t.border}`, fontSize: '0.75rem', fontFamily: 'monospace', 
                              textTransform: 'uppercase', borderRadius: '4px', cursor: 'pointer' 
                            }}
                          >
                            Modify
                          </button>
                          <button
                            onClick={() => handleDeclineProposal(idx)}
                            disabled={executing}
                            style={{ 
                              padding: '0.55rem 1rem', background: 'transparent', color: t.muted, 
                              border: 'none', fontSize: '0.75rem', fontFamily: 'monospace', 
                              textTransform: 'uppercase', cursor: 'pointer' 
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: '1rem', width: '100%', opacity: 0.7 }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold' }}>J</div>
            <div style={{ color: t.muted, fontSize: '0.9rem', fontStyle: 'italic', alignSelf: 'center' }}>Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Floating Input Bar ── */}
      <div style={{ flexShrink: 0, padding: '0 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {error && (
          <div style={{ color: '#c1442c', fontSize: '0.8rem', marginBottom: '0.5rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        <div style={{ 
          display: 'flex', 
          width: '100%', 
          maxWidth: '750px',
          background: t.subtleBg,
          border: `1px solid ${t.borderSoft}`,
          borderRadius: '24px',
          padding: '0.5rem 0.5rem 0.5rem 1rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          alignItems: 'flex-end',
          position: 'relative'
        }}>
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell Jarvis what to do..."
            style={{
              flex: 1,
              background: 'transparent',
              color: t.pageText,
              border: 'none',
              padding: '0.4rem 0',
              fontSize: '0.95rem',
              resize: 'none',
              fontFamily: 'inherit',
              minHeight: '24px',
              maxHeight: '120px',
              outline: 'none',
              lineHeight: 1.4
            }}
            rows={1}
            // Auto-resize hack for basic growth (React-friendly inline)
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: loading || !input.trim() ? 'transparent' : ACCENT,
              color: loading || !input.trim() ? t.muted : '#fff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading || !input.trim() ? 'default' : 'pointer',
              marginLeft: '0.5rem',
              flexShrink: 0,
              transition: 'background 0.2s'
            }}
            aria-label="Send message"
          >
            {/* Simple upward arrow SVG for send icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </button>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: t.muted, marginTop: '0.6rem', letterSpacing: '0.05em' }}>
          Jarvis can make mistakes. Review action proposals carefully.
        </div>
      </div>
    </div>
  );
}
