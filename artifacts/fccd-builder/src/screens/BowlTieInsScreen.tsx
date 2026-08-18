import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useUniverseStore } from '@/store';
import { useGamepad } from '@/hooks/useGamepad';
import { ControllerBadge } from '@/components/ControllerBadge';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { BowlTieIn } from '@/types';

const SLOTS: { key: keyof BowlTieIn; label: string; group: 'SLOT 1' | 'SLOT 2' }[] = [
  { key: 'slot1Primary', label: 'Primary', group: 'SLOT 1' },
  { key: 'slot1Backup',  label: 'Backup',  group: 'SLOT 1' },
  { key: 'slot2Primary', label: 'Primary', group: 'SLOT 2' },
  { key: 'slot2Backup',  label: 'Backup',  group: 'SLOT 2' },
];

function filledCount(tieIn: BowlTieIn): number {
  return [tieIn.slot1Primary, tieIn.slot1Backup, tieIn.slot2Primary, tieIn.slot2Backup]
    .filter(Boolean).length;
}

export default function BowlTieInsScreen() {
  const conferences        = useUniverseStore(s => s.conferences);
  const selectedBowls      = useUniverseStore(s => s.selectedBowls);
  const setBowlTieIn       = useUniverseStore(s => s.setBowlTieIn);
  const setScreen          = useUniverseStore(s => s.setScreen);
  const showControls       = useUniverseStore(s => s.showControls);
  const setControlBindings = useUniverseStore(s => s.setControlBindings);

  const [bowlIdx, setBowlIdx] = useState(0);
  const [slotIdx, setSlotIdx] = useState(0);

  const bowlCount   = selectedBowls.length;
  const focusedBowl = selectedBowls[bowlIdx] ?? null;

  // Teams per conference
  const confTeamCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const conf of conferences) {
      const count = conf.divisions
        .flatMap(d => d.teams)
        .filter((t): t is NonNullable<typeof t> => t != null).length;
      if (conf.name) map.set(conf.name, count);
    }
    return map;
  }, [conferences]);

  const confNames = useMemo(
    () => [...confTeamCounts.keys()].sort(),
    [confTeamCounts],
  );

  // Total tie-in slots used per conference across all bowls
  const confTieInTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const { tieIn } of selectedBowls) {
      for (const v of [tieIn.slot1Primary, tieIn.slot1Backup, tieIn.slot2Primary, tieIn.slot2Backup]) {
        if (v) map.set(v, (map.get(v) ?? 0) + 1);
      }
    }
    return map;
  }, [selectedBowls]);

  // Options for a specific slot — enforces per-bowl uniqueness + per-conf capacity
  const getOptions = useCallback((bIdx: number, slotKey: keyof BowlTieIn): string[] => {
    const entry = selectedBowls[bIdx];
    if (!entry) return [];
    const { tieIn } = entry;
    const current = tieIn[slotKey] ?? '';

    // Conferences already used in other slots of this bowl
    const usedInBowl = new Set<string>();
    for (const { key } of SLOTS) {
      if (key !== slotKey) {
        const v = tieIn[key] ?? '';
        if (v) usedInBowl.add(v);
      }
    }

    return confNames.filter(name => {
      if (usedInBowl.has(name)) return false;
      // Capacity: exclude if already at team-count limit, but don't penalise current value
      const total    = confTieInTotals.get(name) ?? 0;
      const selfUsed = current === name ? 1 : 0;
      const effective = total - selfUsed;
      const capacity  = confTeamCounts.get(name) ?? 0;
      if (effective >= capacity) return false;
      return true;
    });
  }, [selectedBowls, confNames, confTieInTotals, confTeamCounts]);

  useEffect(() => {
    setBowlIdx(i => Math.min(i, Math.max(0, bowlCount - 1)));
  }, [bowlCount]);

  useEffect(() => {
    setControlBindings([
      { action: 'LB',       label: 'Previous bowl' },
      { action: 'RB',       label: 'Next bowl' },
      { action: 'dpadUp',   label: 'Previous slot' },
      { action: 'dpadDown', label: 'Next slot' },
      { action: 'dpadLeft', label: 'Cycle conference' },
      { action: 'dpadRight',label: 'Cycle conference' },
      { action: 'X',        label: 'Clear slot' },
      { action: 'B',        label: 'Back to Bowl Draft' },
      { action: 'Start',    label: 'Continue to Review' },
    ]);
  }, [setControlBindings]);

  useGamepad((action) => {
    if (showControls) return;
    if (action === 'Start') { setScreen('review-export'); return; }
    if (action === 'B')     { setScreen('bowl-draft');    return; }
    if (action === 'LB') { setBowlIdx(i => Math.max(0, i - 1)); setSlotIdx(0); return; }
    if (action === 'RB') { setBowlIdx(i => Math.min(bowlCount - 1, i + 1)); setSlotIdx(0); return; }
    if (action === 'dpadUp')   { setSlotIdx(i => Math.max(0, i - 1)); return; }
    if (action === 'dpadDown') { setSlotIdx(i => Math.min(SLOTS.length - 1, i + 1)); return; }

    if (!focusedBowl) return;
    const slotKey = SLOTS[slotIdx].key;
    const current = focusedBowl.tieIn[slotKey] ?? '';

    if (action === 'X') {
      setBowlTieIn(bowlIdx, { [slotKey]: '' });
      return;
    }

    if (action === 'dpadLeft' || action === 'dpadRight') {
      const opts = getOptions(bowlIdx, slotKey);
      if (opts.length === 0) return;
      const curIdx = current ? opts.indexOf(current) : -1;
      if (action === 'dpadLeft') {
        const next = curIdx <= 0 ? opts.length - 1 : curIdx - 1;
        setBowlTieIn(bowlIdx, { [slotKey]: opts[next] });
      } else {
        const next = curIdx >= opts.length - 1 ? 0 : curIdx + 1;
        setBowlTieIn(bowlIdx, { [slotKey]: opts[next] });
      }
    }
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <ScreenHeader
        step={9}
        totalSteps={10}
        title="Bowl Tie-Ins"
        cta="Assign conference tie-ins to each bowl game"
        onBack={() => setScreen('bowl-draft')}
        onContinue={() => setScreen('review-export')}
      />

      {selectedBowls.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground font-mono text-sm">
          No bowl games selected — go back and add some
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden p-4 gap-4">

          {/* ── Left: Bowl list ── */}
          <div className="w-[30%] flex flex-col border border-border/50 rounded-xl bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-background/50 shrink-0 flex items-center gap-2">
              <ControllerBadge action="LB" active />
              <h2 className="text-xs font-black font-mono text-primary tracking-widest flex-1">BOWL GAMES</h2>
              <ControllerBadge action="RB" active />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {selectedBowls.map(({ bowl, tieIn }, idx) => {
                const filled   = filledCount(tieIn);
                const isActive = idx === bowlIdx;
                return (
                  <button
                    key={bowl.name}
                    onClick={() => { setBowlIdx(idx); setSlotIdx(0); }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                      isActive
                        ? 'border-ring bg-card shadow-sm'
                        : 'border-transparent hover:bg-muted/30'
                    }`}
                  >
                    <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">#{idx + 1}</span>
                    <span className="font-mono font-bold text-xs flex-1 min-w-0 truncate">{bowl.name}</span>
                    <span className={`text-xs font-mono font-black ${
                      filled === 4 ? 'text-green-400' : filled > 0 ? 'text-primary' : 'text-muted-foreground/30'
                    }`}>{filled}/4</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right: Slot editor ── */}
          <div className="flex-1 flex flex-col border border-ring rounded-xl bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-background/50 shrink-0">
              <h2 className="text-lg font-black font-mono text-primary">{focusedBowl?.bowl.name}</h2>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Empty slots = at-large (highest ranked eligible team fills in)
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {(['SLOT 1', 'SLOT 2'] as const).map((group, gi) => (
                <div key={group}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-mono font-black text-muted-foreground tracking-widest">{group}</span>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {SLOTS.filter(s => s.group === group).map((slot, li) => {
                      const realIdx = gi * 2 + li;
                      const isFocused = slotIdx === realIdx;
                      const current   = focusedBowl?.tieIn[slot.key] ?? '';
                      const opts      = focusedBowl ? getOptions(bowlIdx, slot.key) : [];
                      const overCap   = current && !opts.includes(current);
                      return (
                        <div
                          key={slot.key}
                          onClick={() => setSlotIdx(realIdx)}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            isFocused
                              ? 'border-ring bg-card shadow-md'
                              : 'border-border/40 bg-background/30 hover:border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-mono font-bold text-muted-foreground">{slot.label}</span>
                            {current && (
                              <button
                                onClick={e => { e.stopPropagation(); setBowlTieIn(bowlIdx, { [slot.key]: '' }); }}
                                className="text-muted-foreground/50 hover:text-red-400 text-xs transition-colors"
                                title="Clear"
                              >✕</button>
                            )}
                          </div>
                          <select
                            value={current}
                            onChange={e => { setSlotIdx(realIdx); setBowlTieIn(bowlIdx, { [slot.key]: e.target.value }); }}
                            onClick={e => e.stopPropagation()}
                            className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-mono focus:outline-none focus:border-primary"
                          >
                            <option value="">— AT-LARGE —</option>
                            {opts.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                            {overCap && (
                              <option value={current}>{current} ⚠ over cap</option>
                            )}
                          </select>
                          {isFocused && (
                            <div className="mt-1.5 text-xs text-muted-foreground/50 font-mono">
                              ◀ ▶ cycle · X clear
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Conference capacity tracker */}
              {confNames.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-mono font-black text-muted-foreground tracking-widest">CONF CAPACITY</span>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {confNames.map(name => {
                      const used = confTieInTotals.get(name) ?? 0;
                      const cap  = confTeamCounts.get(name) ?? 0;
                      const full = used >= cap;
                      return (
                        <div
                          key={name}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background/50 border border-border/30"
                        >
                          <span className="font-mono text-xs font-bold flex-1 truncate text-foreground/70">{name}</span>
                          <div className="flex items-center gap-1">
                            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${full ? 'bg-red-500' : 'bg-primary'}`}
                                style={{ width: `${cap > 0 ? Math.min(100, (used / cap) * 100) : 0}%` }}
                              />
                            </div>
                            <span className={`font-mono text-xs font-black min-w-[28px] text-right ${
                              full ? 'text-red-400' : used > 0 ? 'text-primary' : 'text-muted-foreground/30'
                            }`}>{used}/{cap}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
