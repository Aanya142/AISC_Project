import React from 'react';

export default function TrafficSignal({ state = 'RED', size = 'normal', orientation = 'vertical' }) {
  const isRed = state === 'RED';
  const isYellow = state === 'YELLOW';
  const isGreen = state === 'GREEN';

  const isSmall = size === 'small';
  const bulbSize = isSmall ? 'w-3 h-3' : 'w-4 h-4';
  const containerPad = isSmall ? 'p-1 gap-1' : 'p-1.5 gap-1.5';

  const flexDir = orientation === 'horizontal' ? 'flex-row' : 'flex-col';

  return (
    <div className={`bg-slate-900 border border-slate-700/80 rounded-full flex ${flexDir} ${containerPad} items-center shadow-lg inline-flex`}>
      {/* RED */}
      <div
        className={`${bulbSize} rounded-full transition-all duration-300 ${
          isRed
            ? 'bg-rose-500 shadow-[0_0_12px_#ef4444]'
            : 'bg-rose-950/40 border border-rose-900/40'
        }`}
      />
      {/* YELLOW */}
      <div
        className={`${bulbSize} rounded-full transition-all duration-300 ${
          isYellow
            ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b]'
            : 'bg-amber-950/40 border border-amber-900/40'
        }`}
      />
      {/* GREEN */}
      <div
        className={`${bulbSize} rounded-full transition-all duration-300 ${
          isGreen
            ? 'bg-emerald-400 shadow-[0_0_12px_#10b981]'
            : 'bg-emerald-950/40 border border-emerald-900/40'
        }`}
      />
    </div>
  );
}
