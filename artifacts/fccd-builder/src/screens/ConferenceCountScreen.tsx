import { useEffect, useRef, useState } from 'react';
import { useUniverseStore } from '@/store';
import { useGamepad } from '@/hooks/useGamepad';
import { ControllerBadge } from '@/components/ControllerBadge';

const COUNTS = [6, 8, 10] as const;

export default function ConferenceCountScreen() {
  const store = useUniverseStore();
  const [focusedIndex, setFocusedIndex] = useState(1); // default to 8
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    cardRefs.current[focusedIndex]?.focus();
  }, [focusedIndex]);

  const handleSelect = (count: 6 | 8 | 10) => {
    store.setConferenceCount(count);
    store.setScreen('conference-setup');
  };

  const handleBack = () => store.setScreen('universe-info');

  useGamepad((action) => {
    if (action === 'dpadLeft') {
      setFocusedIndex(i => Math.max(0, i - 1));
    } else if (action === 'dpadRight') {
      setFocusedIndex(i => Math.min(2, i + 1));
    } else if (action === 'A') {
      handleSelect(COUNTS[focusedIndex]);
    } else if (action === 'B') {
      handleBack();
    }
  });

  return (
    <div className="min-h-screen flex flex-col p-8 max-w-6xl mx-auto pt-16 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black text-foreground mb-4 tracking-tight">Conference Structure</h1>
        <p className="text-muted-foreground text-2xl font-medium">How many major conferences will form the foundation of this universe?</p>
      </div>

      <div className="flex-1 flex justify-center items-center gap-8 px-8">
        {COUNTS.map((count, idx) => (
          <button
            key={count}
            ref={el => { cardRefs.current[idx] = el; }}
            onFocus={() => setFocusedIndex(idx)}
            onClick={() => handleSelect(count)}
            className={`relative group flex-1 aspect-[3/4] rounded-[2rem] border-4 transition-all outline-none flex flex-col items-center justify-center gap-6 overflow-hidden ${
              focusedIndex === idx 
                ? 'border-primary bg-primary/10 scale-105 z-10' 
                : 'border-border bg-card hover:border-primary/50 hover:bg-card/80 scale-95 opacity-80'
            }`}
          >
            {/* Glow effect when focused */}
            {focusedIndex === idx && (
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full -z-10 scale-150 pointer-events-none" />
            )}

            <div className={`text-9xl font-black transition-colors ${focusedIndex === idx ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
              {count}
            </div>
            
            <div className={`text-2xl font-black tracking-widest uppercase transition-colors ${focusedIndex === idx ? 'text-foreground' : 'text-muted-foreground'}`}>
              Conferences
            </div>
            
            <div className={`absolute bottom-8 px-6 py-3 rounded-xl border-2 transition-colors font-bold text-lg ${
              focusedIndex === idx 
                ? 'bg-background border-primary text-primary' 
                : 'bg-background/50 border-border text-muted-foreground'
            }`}>
              Up to {count * 10} Teams
            </div>
          </button>
        ))}
      </div>

      {/* Bottom Bar */}
      <div className="mt-16 flex justify-between items-center border-t-2 border-border pt-8 px-4">
        <div className="flex items-center gap-4">
          <ControllerBadge action="B" label="Back" active={true} />
        </div>
        <div className="flex items-center gap-6 bg-card px-6 py-4 rounded-2xl border border-border">
          <ControllerBadge action="dpadLeft" />
          <ControllerBadge action="dpadRight" label="Select" active={true} />
          <div className="w-1 h-1 rounded-full bg-border mx-2"></div>
          <ControllerBadge action="A" label="Choose" active={true} />
        </div>
      </div>
    </div>
  );
}
