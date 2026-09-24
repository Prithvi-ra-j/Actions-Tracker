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
          onKeyDown={handleKeyDown}
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
