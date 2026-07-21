import React from 'react';

const ICON_MAP: Record<string, string> = {
  A: 'A',
  B: 'B',
  X: 'X',
  Y: 'Y',
  LB: 'LB',
  RB: 'RB',
  dpadLeft: '◀',
  dpadRight: '▶',
  dpadUp: '▲',
  dpadDown: '▼',
  Start: '☰',
};

const COLOR_MAP: Record<string, string> = {
  A: 'text-green-400 border-green-500/40 bg-green-500/10 shadow-[0_0_8px_rgba(74,222,128,0.3)]',
  B: 'text-red-400 border-red-500/40 bg-red-500/10 shadow-[0_0_8px_rgba(248,113,113,0.3)]',
  X: 'text-blue-400 border-blue-500/40 bg-blue-500/10 shadow-[0_0_8px_rgba(96,165,250,0.3)]',
  Y: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10 shadow-[0_0_8px_rgba(250,204,21,0.3)]',
};

interface ControllerBadgeProps {
  action: string;
  label?: string;
  active?: boolean;
}

export function ControllerBadge({ action, label, active = false }: ControllerBadgeProps) {
  const icon = ICON_MAP[action] || action;
  
  const isFace = ['A','B','X','Y'].includes(action);
  const activeColor = isFace 
    ? COLOR_MAP[action] 
    : 'text-primary border-primary bg-primary/10 shadow-[0_0_8px_rgba(250,204,21,0.3)]';
  
  return (
    <div className={`inline-flex items-center gap-2 transition-all duration-300 ${active ? 'opacity-100 scale-105' : 'opacity-50 scale-100 grayscale-[0.3]'}`}>
      <div className={`flex items-center justify-center min-w-[28px] h-[28px] rounded-full border-2 ${active ? activeColor : 'border-muted-foreground/30 text-muted-foreground bg-muted/30'} text-[11px] font-mono font-black shadow-sm px-1.5`}>
        {icon}
      </div>
      {label && <span className={`text-sm font-bold uppercase tracking-wider ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>}
    </div>
  );
}
