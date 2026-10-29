import React from 'react';

export default function MetricCard({ title, value, unit = '', icon: Icon, trend, color = 'cyan', subtext }) {
  const colorMap = {
    cyan: 'border-cyan-500/30 text-cyan-400 bg-cyan-950/20',
    emerald: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20',
    amber: 'border-amber-500/30 text-amber-400 bg-amber-950/20',
    rose: 'border-rose-500/30 text-rose-400 bg-rose-950/20',
    indigo: 'border-indigo-500/30 text-indigo-400 bg-indigo-950/20',
    purple: 'border-purple-500/30 text-purple-400 bg-purple-950/20',
  };

  const badgeClass = colorMap[color] || colorMap.cyan;

  return (
    <div className="glass-card rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${badgeClass}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold font-mono tracking-tight text-white">{value}</span>
        {unit && <span className="text-xs text-slate-400 font-medium">{unit}</span>}
      </div>

      {subtext && (
        <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
          <span>{subtext}</span>
          {trend && <span className="text-emerald-400 font-mono text-[10px]">{trend}</span>}
        </div>
      )}
    </div>
  );
}
