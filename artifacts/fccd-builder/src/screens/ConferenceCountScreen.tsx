import { useEffect, useRef, useState } from 'react';
import { useUniverseStore } from '@/store';
import { useGamepad } from '@/hooks/useGamepad';
import { ControllerBadge } from '@/components/ControllerBadge';

const COUNTS = [6, 8, 10] as const;
const DESCRIPTIONS: Record<number, string> = {
  6:  'Focused universe — up to 60 teams. Tight competition, fast season.',
  8:  'Balanced — up to 80 teams. The sweet spot for most dynasties.',
  10: 'Full-scale universe — up to 100 teams. Maximum realism.',
};

export default function ConferenceCountScreen() {
  const store = useUniverseStore();
  const [focusedIndex, setFocusedIndex] = useState(1);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    cardRefs.current[focusedIndex]?.focus();
  }, [focusedIndex]);

  const handleSelect = (count: 6 | 8 | 10) => {
    store.setConferenceCount(count);
    store.setScreen('conference-setup');
  };

  useGamepad((action) => {
    if (action === 'dpadLeft')  setFocusedIndex(i => Math.max(0, i - 1));
    else if (action === 'dpadRight') setFocusedIndex(i => Math.min(2, i + 1));
    else if (action === 'A')    handleSelect(COUNTS[focusedIndex]);
    else if (action === 'B')    store.setScreen('universe-info');
  });

  return (
    <div className="min-h-screen flex flex-col px-8 py-10 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-10 pb-5 border-b border-border">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1.5">Step 2 of 3</p>
        <h1 className="text-2xl font-bold text-foreground">Conference Structure</h1>
        <p className="text-sm text-muted-foreground mt-1">
          How many major conferences will form the foundation of this universe?
        </p>
      </div>

      <div className="flex-1 flex gap-5 items-center">
        {COUNTS.map((count, idx) => {
          const isFocused = focusedIndex === idx;
          return (
            <button
              key={count}
              ref={el => { cardRefs.current[idx] = el; }}
              onFocus={() => setFocusedIndex(idx)}
              onClick={() => handleSelect(count)}
              className={`relative flex-1 rounded-xl border-2 p-8 flex flex-col items-center gap-5 transition-all duration-200 outline-none text-left ${
                isFocused
                  ? 'border-ring bg-card shadow-lg scale-[1.03]'
                  : 'border-border bg-card/50 hover:bg-card hover:border-border/80 scale-100 opacity-75 hover:opacity-100'
              }`}
            >
              {/* Conference count — big but not extreme */}
              <div className={`text-7xl font-black font-mono leading-none transition-colors ${isFocused ? 'text-primary' : 'text-muted-foreground/70'}`}>
                {count}
              </div>

              <div className="flex flex-col items-center gap-1 text-center">
                <span className={`text-sm font-semibold uppercase tracking-widest ${isFocused ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Conferences
                </span>
                <span className={`text-xs font-mono ${isFocused ? 'text-ring' : 'text-muted-foreground/60'}`}>
                  Up to {count * 10} Teams
                </span>
              </div>

              {/* Description — only visible when focused */}
              <p className={`text-xs text-center leading-relaxed transition-all duration-300 ${isFocused ? 'text-muted-foreground opacity-100' : 'opacity-0'}`}>
                {DESCRIPTIONS[count]}
              </p>

              {/* Selected indicator */}
              {store.conferenceCount === count && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div className="mt-10 flex justify-between items-center pt-5 border-t border-border">
        <ControllerBadge action="B" label="Back" active />
        <div className="flex items-center gap-4 bg-card px-5 py-2.5 rounded-lg border border-border">
          <ControllerBadge action="dpadLeft" active />
          <ControllerBadge action="dpadRight" label="Select" active />
          <div className="w-px h-4 bg-border mx-1" />
          <ControllerBadge action="A" label="Choose" active />
        </div>
      </div>
    </div>
  );
}
