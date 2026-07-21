// Placeholder — implemented in Task 3 (Rivalries, Bowls & Export)
import { useUniverseStore } from '@/store';
import { ControllerBadge } from '@/components/ControllerBadge';

export default function RivalriesScreen() {
  const setScreen = useUniverseStore(s => s.setScreen);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-8 p-8">
      <div className="text-center space-y-4">
        <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Coming in Task 3</p>
        <h1 className="text-5xl font-black tracking-tighter text-primary">Rivalries, Bowls & Export</h1>
        <p className="text-muted-foreground max-w-md">
          Configure rivalries, assign bowl games, and export your universe file.
        </p>
      </div>
      <button
        onClick={() => setScreen('prestige-review')}
        className="flex items-center gap-3 px-8 py-3 rounded-full border-2 border-border text-muted-foreground hover:border-primary hover:text-primary transition-all font-mono font-bold"
      >
        <span>◀</span> BACK TO PRESTIGE
      </button>
      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <ControllerBadge action="B" label="Back to Prestige" active />
      </div>
    </div>
  );
}
