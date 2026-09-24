import React, { useState } from 'react';
import { Button, IconButton, ContextualJarvisCTA } from '../ui/Buttons.jsx';
import { Card, Pin, StatCard, EntityRow } from '../ui/Cards.jsx';
import { Chip, ModePill, SegmentedBar, ProgressRing, TrustRail } from '../ui/Indicators.jsx';
import { Checkbox } from '../ui/Inputs.jsx';
import { AppHeader, SectionHeader } from '../ui/Headers.jsx';
import { EmptyState, ErrorState, LoadingSkeleton } from '../ui/States.jsx';
import { BottomSheet, ConfirmDialog } from '../ui/Overlays.jsx';
import { useToast } from '../ui/ToastContext.jsx';
import { showBanner } from '../ui/Banners.jsx';
import { Gear, MagicWand, Plus, Star, Info } from '@phosphor-icons/react';

export default function PrimitivesDevPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const { addToast } = useToast();

  return (
    <div className="min-h-100dvh safe-pt safe-pb safe-pl safe-pr" style={{ paddingBottom: '100px' }}>
      <AppHeader 
        title="Primitives" 
        subline="Shared UI components" 
        rightElement={<IconButton icon={<Gear size={24} />} aria-label="Settings" />}
      />

      <div style={{ padding: '0 16px' }}>
        <SectionHeader title="Buttons" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button variant="primary">Primary</Button>
            <Button variant="primary" loading>Primary</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button variant="secondary">Secondary</Button>
            <Button variant="secondary" loading>Secondary</Button>
            <Button variant="secondary" disabled>Disabled</Button>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button variant="destructive">Destructive</Button>
            <Button variant="destructive" disabled>Disabled</Button>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <IconButton icon={<Plus size={24} />} label="Add" />
            <IconButton icon={<Plus size={24} />} label="Add" disabled />
            <ContextualJarvisCTA icon={<MagicWand size={18} />} label="Ask Jarvis" />
          </div>
        </div>

        <SectionHeader title="Cards & Containers" />
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
          <Card>Basic Card with some content.</Card>
          <Pin title="Level" value="7" icon={<Star size={16} />} bar={<SegmentedBar value={5} />} />
          <StatCard label="Body" value="45" delta="+5" />
          <StatCard label="Discipline" value="32" delta="-2" />
        </div>
        
        <div style={{ marginTop: '16px' }}>
          <EntityRow title="Run 5k" label="Body • +10 xp" rightElement={<Checkbox checked={checked} onChange={setChecked} />} />
          <EntityRow title="Disabled Row" label="Can't click this" rightElement={<Checkbox disabled />} />
        </div>

        <SectionHeader title="Indicators & Inputs" />
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <Chip label="Unselected" />
          <Chip label="Selected" active icon={<Star size={14} />} />
          <ModePill mode="Ask" />
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', marginBottom: '8px' }}>Segmented Bar</div>
          <SegmentedBar value={4} projected={2} segments={10} />
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '16px' }}>
          <ProgressRing progress={75} />
          <Checkbox checked={checked} onChange={setChecked} />
          <Checkbox checked disabled />
        </div>
        
        <TrustRail type="observed">Observed fact</TrustRail>
        <TrustRail type="inferred">Inferred suggestion</TrustRail>
        <TrustRail type="suggested">Suggested action</TrustRail>

        <SectionHeader title="States" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <EmptyState 
            title="No active goals yet." 
            description="Tell Jarvis what you want to change." 
            actionLabel="Add item" 
            onAction={() => {}} 
          />
          <ErrorState 
            message="The change wasn't applied. Your existing data is unchanged." 
            onRetry={() => {}} 
          />
          <div>
            <div style={{ fontSize: '13px', marginBottom: '8px' }}>Reviewing recent evidence...</div>
            <LoadingSkeleton rows={2} />
          </div>
        </div>

        <SectionHeader title="Overlays & Banners" />
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>Open Sheet</Button>
          <Button variant="secondary" onClick={() => setConfirmOpen(true)}>Open Confirm</Button>
          <Button variant="secondary" onClick={() => addToast({ message: 'Habit created.', onUndo: () => console.log('undone') })}>Show Toast (Undo)</Button>
          <Button variant="secondary" onClick={() => addToast({ message: 'Created the 3-day habit and scheduled occurrences.', duration: 3000 })}>Show Toast</Button>
          <Button variant="secondary" onClick={() => showBanner('ai-unavailable-banner')}>Trigger AI Banner</Button>
        </div>
      </div>

      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Sheet Title">
        <p style={{ marginTop: 0 }}>This is a bottom sheet containing some useful context or forms.</p>
        <Button variant="primary" onClick={() => setSheetOpen(false)} style={{ width: '100%' }}>Done</Button>
      </BottomSheet>

      <ConfirmDialog 
        isOpen={confirmOpen} 
        onClose={() => setConfirmOpen(false)} 
        onConfirm={() => setConfirmOpen(false)}
        title="Delete 4 habits?"
        description="This action cannot be undone."
      />

    </div>
  );
}
