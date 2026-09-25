import React, { useState } from 'react';
import { Card, EntityRow } from './ui/Cards';
import { Button, ContextualJarvisCTA } from './ui/Buttons';
import { MagicWand } from '@phosphor-icons/react';
import { BottomSheet } from './ui/Overlays';

export default function LearnTab({ t, learnings = [], onAddLearning, onOpenJarvis }) {
  const [activeTopics, setActiveTopics] = useState(learnings);
  const [sheet, setSheet] = useState(null);
  const [topic, setTopic] = useState('');
  const [objective, setObjective] = useState('');
  const [axis, setAxis] = useState('Knowledge');

  const axes = ['Knowledge', 'Creativity', 'Strategy'];

  const handleNext = () => {
    // Save learning
    if (!topic.trim()) return;
    onAddLearning({
      concept: topic,
      whyItMatters: objective,
      tags: [axis],
      sourceType: 'other',
    });
    setSheet(null);
    setTopic('');
    setObjective('');
    setAxis('Knowledge');
  };

  return (
    <div className="ph" data-t="Learn" style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg)', color: 'var(--tx)', fontFamily: 'var(--f)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div className="hd" style={{ display: 'flex', alignItems: 'flex-end', padding: '26px 18px 12px' }}>
        <div>
          <h2 style={{ font: '600 26px/1.1 var(--f)', letterSpacing: '-.02em' }}>Learn</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <p style={{ fontSize: '13px', color: 'var(--mu)', margin: 0 }}>{activeTopics.length} active topics</p>
            <ContextualJarvisCTA label="Ask Jarvis" contextIcon={<MagicWand size={16} />} onClick={() => onOpenJarvis?.({ page: 'learn', entityType: 'none' })} />
          </div>
        </div>
      </div>

      <div className="bd" style={{ padding: '0 14px', flex: 1, overflowY: 'auto' }}>
        {activeTopics.length === 0 ? (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>No topics yet</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--mu)', marginTop: '8px' }}>Create a topic to track your learning roadmap and evidence.</p>
            <Button variant="primary" style={{ marginTop: '16px' }} onClick={() => setSheet({ type: 'create' })}>Create topic</Button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '3px', margin: '10px 0' }}>
              <i style={{ flex: 1, height: '8px', background: 'var(--ln)' }}></i>
              <i style={{ flex: 1, height: '8px', background: 'var(--ac)' }}></i>
              <i style={{ flex: 1, height: '8px', background: 'var(--ln)' }}></i>
            </div>
            {activeTopics.map((item, idx) => (
              <Card key={idx} onClick={() => setSheet({ type: 'detail', topic: item })} style={{ marginBottom: '10px' }}>
                <span className="mono" style={{ fontSize: '11.5px', color: 'var(--mu)' }}>{item.tags?.[0] || 'Knowledge'}</span>
                <h3 style={{ fontSize: '17px', margin: '6px 0 2px' }}>{item.concept}</h3>
                <p style={{ fontSize: '13px', color: 'var(--mu)' }}>{item.whyItMatters || 'No objective'}</p>
              </Card>
            ))}
            <Button variant="primary" style={{ marginTop: '14px' }} onClick={() => setSheet({ type: 'create' })}>Add a topic</Button>
          </div>
        )}
      </div>

      {sheet?.type === 'create' && (
        <BottomSheet isOpen={true} onClose={() => setSheet(null)}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#ffffff26', margin: '0 auto 12px' }}></div>
          <h3 style={{ font: '600 22px/1.15 var(--f)', letterSpacing: '-.02em', margin: '4px 0 2px' }}>New topic</h3>
          
          <div style={{ font: '500 13px var(--f)', margin: '14px 0 6px' }}>Topic</div>
          <input 
            value={topic}
            onChange={e => setTopic(e.target.value)}
            style={{ width: '100%', minHeight: '48px', display: 'flex', alignItems: 'center', padding: '0 14px', borderRadius: '12px', background: 'var(--s2)', font: '500 13px "Geist Mono", monospace', boxShadow: 'inset 0 0 0 1px var(--ln)', border: 'none', color: 'var(--tx)', outline: 'none' }}
            placeholder="German B2"
          />

          <div style={{ font: '500 13px var(--f)', margin: '14px 0 6px' }}>Objective</div>
          <input 
            value={objective}
            onChange={e => setObjective(e.target.value)}
            style={{ width: '100%', minHeight: '48px', display: 'flex', alignItems: 'center', padding: '0 14px', borderRadius: '12px', background: 'var(--s2)', font: '500 13px "Geist Mono", monospace', boxShadow: 'inset 0 0 0 1px var(--ln)', border: 'none', color: 'var(--tx)', outline: 'none' }}
            placeholder="Pass the mock exam by March"
          />

          <div style={{ font: '500 13px var(--f)', margin: '14px 0 6px' }}>Axis</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '4px 0 14px' }}>
            {axes.map(a => (
              <div 
                key={a}
                onClick={() => setAxis(a)}
                style={{ 
                  minHeight: '44px', padding: '0 14px', display: 'grid', placeItems: 'center', 
                  borderRadius: '10px', background: axis === a ? 'color-mix(in srgb, var(--ac) 18%, var(--s1))' : 'var(--s1)', 
                  boxShadow: axis === a ? 'inset 0 0 0 1.5px var(--ac)' : 'inset 0 0 0 1px var(--ln)', 
                  font: '500 13.5px var(--f)', cursor: 'pointer' 
                }}>
                {a}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <Button variant="primary" style={{ flex: 1 }} onClick={handleNext}>Next</Button>
          </div>
          <Button variant="secondary" style={{ marginTop: '8px', width: '100%' }}>Let Jarvis draft a plan</Button>
        </BottomSheet>
      )}

      {sheet?.type === 'detail' && (
        <BottomSheet isOpen={true} onClose={() => setSheet(null)}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ font: '600 26px/1.1 var(--f)', letterSpacing: '-.02em' }}>{sheet.topic.concept}</h2>
              <p style={{ fontSize: '13px', color: 'var(--mu)' }}>{sheet.topic.tags?.[0] || 'Knowledge'}</p>
            </div>
            <span style={{ font: '500 11.5px "Geist Mono", monospace', color: 'var(--mu)', padding: '9px 12px', borderRadius: '12px', boxShadow: 'inset 0 0 0 1px var(--ln)' }}>Review in 2 days</span>
          </div>

          <div style={{ font: '500 12.5px var(--f)', color: 'var(--mu)', margin: '16px 4px 8px' }}>Roadmap</div>
          <div className="grp" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--ln)', background: 'var(--s1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', borderBottom: '1px solid var(--ln)', font: '500 14.5px var(--f)' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '8px', display: 'grid', placeItems: 'center', marginRight: '12px', background: 'var(--ac)', color: 'var(--on)' }}>✓</div>
              Foundations
            </div>
            <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', borderBottom: '1px solid var(--ln)', font: '500 14.5px var(--f)' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '8px', display: 'grid', placeItems: 'center', marginRight: '12px', boxShadow: 'inset 0 0 0 2px var(--mu)' }}></div>
              Mock exam
            </div>
          </div>

          <div style={{ font: '500 12.5px var(--f)', color: 'var(--mu)', margin: '16px 4px 8px' }}>Resources</div>
          <div className="grp" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--ln)', background: 'var(--s1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', font: '500 14.5px var(--f)' }}>
              No resources linked
            </div>
          </div>

          <div style={{ font: '500 12.5px var(--f)', color: 'var(--mu)', margin: '16px 4px 8px' }}>Evidence of understanding</div>
          <div className="grp" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--ln)', background: 'var(--s1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', font: '500 14.5px var(--f)' }}>
              Log evidence
              <span style={{ marginLeft: 'auto', font: '500 12px "Geist Mono", monospace', color: 'var(--mu)' }}>Add ›</span>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
