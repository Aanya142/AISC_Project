import React from 'react';
import TrafficSignal from './TrafficSignal';
import { Compass } from 'lucide-react';

export default function DirectionCard({ direction, metrics }) {
  if (!metrics) return null;

  const {
    queue_length,
    vehicle_count,
    avg_waiting_time,
    arrival_rate,
    density,
    signal_state,
    priority_score,
    recommended_green,
  } = metrics;

  return (
    <div className="glass-card rounded-xl p-3.5 border border-slate-700/60 shadow-lg flex flex-col justify-between hover:border-slate-600 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-xs text-white uppercase tracking-wider">{direction}</span>
        </div>
        <TrafficSignal state={signal_state} size="small" orientation="horizontal" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-mono my-1">
        <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-sans">Queue Length</span>
          <span className={`text-base font-bold ${queue_length > 6 ? 'text-rose-400' : 'text-slate-200'}`}>
            {queue_length} <span className="text-[10px] text-slate-500 font-normal">veh</span>
          </span>
        </div>

        <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-sans">Avg Wait Time</span>
          <span className={`text-base font-bold ${avg_waiting_time > 30 ? 'text-amber-400' : 'text-slate-200'}`}>
            {avg_waiting_time} <span className="text-[10px] text-slate-500 font-normal">s</span>
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 mt-1">
        <span>Fuzzy Priority: <strong className="text-cyan-400 font-mono">{priority_score}</strong></span>
        <span>Green Target: <strong className="text-emerald-400 font-mono">{recommended_green}s</strong></span>
      </div>
    </div>
  );
}
