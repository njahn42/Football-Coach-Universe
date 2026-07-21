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

  const handleNext = () => store.setScreen('conference-count');

  return (
    <div className="min-h-screen flex flex-col p-8 max-w-4xl mx-auto pt-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-12">
        <h1 className="text-5xl font-black text-foreground mb-3 tracking-tight">Create Universe</h1>
        <p className="text-muted-foreground text-xl font-medium">Define the starting parameters for your new college football dynasty.</p>
      </div>

      <div className="flex-1 flex flex-col gap-10">
        {/* Name */}
        <div className="flex flex-col gap-3 relative">
          <label className="text-sm font-bold text-primary uppercase tracking-widest">Universe Name</label>
          <div className="flex items-center gap-4">
            <input
              ref={el => { inputRefs.current[0] = el; }}
              onFocus={() => setFocusedIndex(0)}
              value={store.universeName}
              onChange={e => store.setUniverseName(e.target.value)}
              className="flex-1 bg-card border-2 border-border rounded-xl p-5 text-3xl font-bold outline-none transition-all focus:border-primary focus:bg-card/50"
            />
            <div className="flex items-center gap-3 px-2">
              <ControllerBadge action="LB" />
              <ControllerBadge action="RB" label="Cycle" active={focusedIndex === 0} />
            </div>
          </div>
        </div>

        {/* Year */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-bold text-primary uppercase tracking-widest">Starting Year</label>
          <div className="flex items-center gap-4">
            <input
              ref={el => { inputRefs.current[1] = el; }}
              onFocus={() => setFocusedIndex(1)}
              type="number"
              value={store.startingYear}
              onChange={e => store.setStartingYear(parseInt(e.target.value) || new Date().getFullYear())}
              className="w-48 bg-card border-2 border-border rounded-xl p-5 text-3xl font-mono font-bold outline-none transition-all focus:border-primary focus:bg-card/50 text-center"
            />
            <div className="flex items-center gap-3 px-2">
              <ControllerBadge action="dpadLeft" />
              <ControllerBadge action="dpadRight" label="Adjust" active={focusedIndex === 1} />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-bold text-primary uppercase tracking-widest">Welcome Message</label>
          <div className="flex items-start gap-4">
            <textarea
              ref={el => { inputRefs.current[2] = el; }}
              onFocus={() => setFocusedIndex(2)}
              value={store.startingMessage}
              onChange={e => store.setStartingMessage(e.target.value)}
              rows={3}
              className="flex-1 bg-card border-2 border-border rounded-xl p-5 text-xl outline-none transition-all focus:border-primary focus:bg-card/50 resize-none font-medium leading-relaxed"
            />
            <div className="flex flex-col items-center gap-3 px-2 py-3">
              <div className="flex gap-3">
                <ControllerBadge action="LB" />
                <ControllerBadge action="RB" />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${focusedIndex === 2 ? 'text-primary' : 'text-muted-foreground'}`}>Cycle Idea</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="mt-12 flex justify-between items-center gap-6 border-t-2 border-border pt-8">
        <ControllerBadge action="B" label="Back (Disabled)" active={false} />
        <button
          ref={el => { inputRefs.current[3] = el; }}
          onFocus={() => setFocusedIndex(3)}
          onClick={handleNext}
          className="flex items-center gap-4 bg-primary text-primary-foreground px-10 py-5 rounded-xl font-black text-xl transition-all hover:scale-105 active:scale-95 outline-none"
        >
          <span>Continue Setup</span>
          <ControllerBadge action="A" active={focusedIndex === 3} />
        </button>
      </div>
    </div>
  );
}
