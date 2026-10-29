import React from 'react';
import { Brain, Cpu, Zap, Activity } from 'lucide-react';

export default function AIControllerPanel({ fuzzyDecision, currentMode }) {
  if (!fuzzyDecision) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center text-slate-400">
        <Brain className="w-8 h-8 mx-auto mb-2 opacity-40 animate-pulse" />
        <p className="text-sm">Awaiting Fuzzy Controller Telemetry...</p>
      </div>
    );
  }

  const { inputs, memberships, active_rules, phase_priorities, selected_phase, recommended_green, reason } = fuzzyDecision;

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-700/60 shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide text-white uppercase">Mamdani Fuzzy Logic Inference</h3>
            <p className="text-xs text-slate-400">Real-time Linguistic Rule Firing & Priority Arbitration</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-cyan-900/30 border border-cyan-500/30 text-cyan-300">
            Phase Selected: <strong className="text-white">{selected_phase}</strong>
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-emerald-900/30 border border-emerald-500/30 text-emerald-300">
            Rec. Green: <strong className="text-white">{recommended_green}s</strong>
          </span>
        </div>
      </div>

      {/* Decision Summary Pill */}
      <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-3 flex items-start gap-2.5">
        <Zap className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-300 leading-relaxed font-sans">{reason}</p>
      </div>

      {/* Priority Gauge Comparison */}
      <div className="grid grid-cols-2 gap-3">
        {['NS', 'EW'].map((phaseKey) => {
          const score = phase_priorities[phaseKey] || 0;
          const isWinner = selected_phase === phaseKey;
          return (
            <div
              key={phaseKey}
              className={`rounded-xl p-3 border transition-all ${
                isWinner
                  ? 'bg-cyan-950/20 border-cyan-500/50 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
                  : 'bg-slate-900/40 border-slate-800'
              }`}
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-slate-300">Phase {phaseKey} Demand</span>
                <span className={`font-mono text-sm font-bold ${isWinner ? 'text-cyan-400' : 'text-slate-400'}`}>
                  {score.toFixed(1)} / 100
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isWinner ? 'bg-gradient-to-r from-cyan-500 to-emerald-400' : 'bg-slate-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Fuzzified Membership Values */}
      <div className="grid grid-cols-2 gap-3">
        {['NS', 'EW'].map((phaseKey) => {
          const m = memberships[phaseKey] || {};
          const inp = inputs[phaseKey] || {};
          return (
            <div key={phaseKey} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-xs">
              <div className="font-semibold text-slate-200 mb-2 border-b border-slate-800 pb-1 flex justify-between">
                <span>Phase {phaseKey} Membership Degrees</span>
                <span className="text-slate-400 font-mono text-[10px]">
                  Q:{inp.queue || 0} | W:{inp.wait_time || 0}s | D:{inp.density || 0}
                </span>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Density:</span>
                  <span className="text-slate-300">
                    L:{(m.density?.low || 0).toFixed(2)} M:{(m.density?.medium || 0).toFixed(2)} H:{(m.density?.high || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Queue:</span>
                  <span className="text-slate-300">
                    S:{(m.queue?.short || 0).toFixed(2)} M:{(m.queue?.medium || 0).toFixed(2)} L:{(m.queue?.long || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Wait Time:</span>
                  <span className="text-slate-300">
                    S:{(m.wait_time?.short || 0).toFixed(2)} M:{(m.wait_time?.moderate || 0).toFixed(2)} L:{(m.wait_time?.long || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Rules List */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Fired Fuzzy Rules ({active_rules?.length || 0})
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Mamdani Min-Max Implication</span>
        </div>

        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {active_rules && active_rules.length > 0 ? (
            active_rules.map((rule, idx) => (
              <div
                key={idx}
                className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2 text-xs flex items-center justify-between hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 font-mono text-[10px] font-bold">
                    {rule.rule_id}
                  </span>
                  <span className="text-slate-300 text-[11px] font-medium">{rule.condition}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-[10px]">
                    Strength: <strong className="text-emerald-400 font-mono">{rule.firing_strength}</strong>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    P: {rule.consequent_priority} | G: {rule.consequent_green}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 italic text-center py-2">No rules fired above threshold</p>
          )}
        </div>
      </div>
    </div>
  );
}
