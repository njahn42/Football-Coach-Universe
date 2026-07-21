import { useEffect, useRef, useState } from 'react';
import { useUniverseStore } from '@/store';
import { useGamepad } from '@/hooks/useGamepad';
import { ControllerBadge } from '@/components/ControllerBadge';

export default function UniverseInfoScreen() {
  const store = useUniverseStore();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[focusedIndex]?.focus();
  }, [focusedIndex]);

  useGamepad((action) => {
    if (action === 'dpadDown') {
      setFocusedIndex(i => Math.min(3, i + 1));
    } else if (action === 'dpadUp') {
      setFocusedIndex(i => Math.max(0, i - 1));
    } else if (action === 'dpadRight' && focusedIndex === 1) {
      store.nudgeYear(1);
    } else if (action === 'dpadLeft' && focusedIndex === 1) {
      store.nudgeYear(-1);
    } else if (action === 'RB') {
      if (focusedIndex === 0) store.cycleNameSuggestion('next');
      if (focusedIndex === 2) store.cycleMessageSuggestion('next');
    } else if (action === 'LB') {
      if (focusedIndex === 0) store.cycleNameSuggestion('prev');
      if (focusedIndex === 2) store.cycleMessageSuggestion('prev');
    } else if (action === 'A') {
      if (focusedIndex === 3) store.setScreen('conference-count');
    }
  });

  return (
    <div className="min-h-screen flex flex-col px-8 py-10 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-8 pb-5 border-b border-border">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1.5">Step 1 of 3</p>
        <h1 className="text-2xl font-bold text-foreground">Create Universe</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define the starting parameters for your new college football dynasty.
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-7">
        {/* Universe Name */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Universe Name
          </label>
          <div className="flex items-center gap-4">
            <input
              ref={el => { inputRefs.current[0] = el; }}
              onFocus={() => setFocusedIndex(0)}
              value={store.universeName}
              onChange={e => store.setUniverseName(e.target.value)}
              className="flex-1 bg-card border border-border rounded-lg px-4 py-3 text-lg font-semibold text-foreground outline-none transition-colors focus:border-ring"
            />
            <div className="flex items-center gap-2 shrink-0">
              <ControllerBadge action="LB" active={focusedIndex === 0} />
              <ControllerBadge action="RB" label="Cycle" active={focusedIndex === 0} />
            </div>
          </div>
        </div>

        {/* Starting Year */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Starting Year
          </label>
          <div className="flex items-center gap-4">
            <input
              ref={el => { inputRefs.current[1] = el; }}
              onFocus={() => setFocusedIndex(1)}
              type="number"
              value={store.startingYear}
              onChange={e => store.setStartingYear(parseInt(e.target.value) || new Date().getFullYear())}
              className="w-32 bg-card border border-border rounded-lg px-4 py-3 text-xl font-mono font-bold text-center text-foreground outline-none transition-colors focus:border-ring"
            />
            <div className="flex items-center gap-2 shrink-0">
              <ControllerBadge action="dpadLeft" active={focusedIndex === 1} />
              <ControllerBadge action="dpadRight" label="Adjust" active={focusedIndex === 1} />
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Welcome Message
          </label>
          <div className="flex items-start gap-4">
            <textarea
              ref={el => { inputRefs.current[2] = el; }}
              onFocus={() => setFocusedIndex(2)}
              value={store.startingMessage}
              onChange={e => store.setStartingMessage(e.target.value)}
              rows={3}
              className="flex-1 bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring resize-none leading-relaxed"
            />
            <div className="flex flex-col items-center gap-2 pt-2 shrink-0">
              <div className="flex gap-2">
                <ControllerBadge action="LB" active={focusedIndex === 2} />
                <ControllerBadge action="RB" active={focusedIndex === 2} />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Cycle</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mt-8 flex justify-between items-center pt-5 border-t border-border">
        <ControllerBadge action="B" label="Back" active={false} />
        <button
          ref={el => { inputRefs.current[3] = el; }}
          onFocus={() => setFocusedIndex(3)}
          onClick={() => store.setScreen('conference-count')}
          className="flex items-center gap-3 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110 active:brightness-90 outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        >
          Continue Setup
          <ControllerBadge action="A" active={focusedIndex === 3} />
        </button>
      </div>
    </div>
  );
}
