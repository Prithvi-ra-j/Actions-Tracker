const fs = require('fs');

let content = fs.readFileSync('src/components/JarvisTab.jsx', 'utf8');

// 1. Add imports
if (!content.includes('ProposalUI')) {
  content = content.replace(
    "import { BottomSheet } from './ui/Overlays';",
    "import { BottomSheet } from './ui/Overlays';\nimport { ActionProposalCard, ImpactDetailSheet, EditProposalSheet } from './ui/ProposalUI';"
  );
}

// 2. Add state for impact detail / edit sheets
if (!content.includes('selectedProposalForImpact')) {
  content = content.replace(
    'const [commandQuery, setCommandQuery] = useState(\'\');',
    'const [commandQuery, setCommandQuery] = useState(\'\');\n  const [selectedProposalForImpact, setSelectedProposalForImpact] = useState(null);\n  const [selectedProposalForEdit, setSelectedProposalForEdit] = useState(null);'
  );
}

// 3. Replace the old proposal rendering
const oldProposalRender = `                {msg.proposal && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="mono" style={{ fontSize: '11.5px', color: 'var(--mu)', textTransform: 'uppercase' }}>
                        Proposal
                      </span>
                      {msg.proposalStatus === 'executed' && (
                        <span style={{ fontSize: '12px', color: 'var(--strategy)', fontWeight: 500 }}>Applied</span>
                      )}
                      {msg.proposalStatus === 'failed' && (
                        <span style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 500 }}>Failed</span>
                      )}
                    </div>
                    <div style={{ backgroundColor: 'var(--s2)', padding: '12px', borderRadius: '12px', marginTop: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{msg.proposal.name || msg.proposal.type}</div>
                      {msg.proposalStatus === 'pending' && !executing && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <Button variant="primary" style={{ flex: 1, minHeight: '36px', fontSize: '13px' }} onClick={() => executeApprovedProposal(msg.proposal)}>
                            Apply
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}`;

const newProposalRender = `                {msg.proposal && (
                  <div style={{ marginTop: '12px' }}>
                    <ActionProposalCard 
                      proposal={msg.proposal}
                      status={msg.proposalStatus}
                      onApply={() => setSelectedProposalForImpact({ proposal: msg.proposal, impact: msg.proposal.impact })}
                      onEdit={() => setSelectedProposalForEdit(msg.proposal)}
                    />
                  </div>
                )}`;

content = content.replace(oldProposalRender, newProposalRender);

// 4. Add the sheets at the bottom of the component
const bottomOverlayInsertionPoint = `{commandMenuOpen && (`;
const sheetsCode = `
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
        onSave={() => {
          setSelectedProposalForEdit(null);
          // execute logic
        }}
        onCancel={() => setSelectedProposalForEdit(null)}
        onDismiss={() => setSelectedProposalForEdit(null)}
      />

      {commandMenuOpen && (`

content = content.replace(bottomOverlayInsertionPoint, sheetsCode);

fs.writeFileSync('src/components/JarvisTab.jsx', content);
console.log('Patched JarvisTab for ProposalUI');
