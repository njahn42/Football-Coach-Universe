import { useEffect, useRef, useState } from 'react';
import { useUniverseStore } from '@/store';
import { useGamepad } from '@/hooks/useGamepad';
import { ControllerBadge } from '@/components/ControllerBadge';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function UniverseInfoScreen() {
  const store = useUniverseStore();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    store.setControlBindings([
      { action: 'dpadUp',    label: 'Navigate up' },
      { action: 'dpadDown',  label: 'Navigate down' },
      { action: 'dpadLeft',  label: 'Adjust year (on year field)' },
      { action: 'dpadRight', label: 'Adjust year (on year field)' },
      { action: 'LB',        label: 'Cycle suggestion' },
      { action: 'RB',        label: 'Cycle suggestion' },
      { action: 'Start',     label: 'Continue' },
    ]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canContinue =
    store.universeName.trim().length > 0 &&
    !!store.startingYear &&
    store.startingMessage.trim().length > 0;

  useEffect(() => {
    inputRefs.current[focusedIndex]?.focus();
  }, [focusedIndex]);

  useGamepad((action) => {
    if (store.showControls) return;
    if (action === 'dpadDown') {
      setFocusedIndex(i => Math.min(2, i + 1));
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
    } else if (action === 'Start') {
      if (canContinue) store.setScreen('conference-count');
    }
  });

  const requiredFields = [
    { label: 'Universe name', done: store.universeName.trim().length > 0 },
    { label: 'Starting year', done: !!store.startingYear },
    { label: 'Welcome message', done: store.startingMessage.trim().length > 0 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <ScreenHeader
        step={1}
        totalSteps={9}
        title="Universe Info"
        cta="Name your universe and set the starting season"
        requiredFields={requiredFields}
        onContinue={() => store.setScreen('conference-count')}
      />

      <div className="flex-1 flex flex-col gap-7 px-8 py-8 max-w-3xl w-full mx-auto">
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

    </div>
  );
}
