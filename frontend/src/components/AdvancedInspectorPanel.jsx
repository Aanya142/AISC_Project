import React, { useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Clock,
  ShieldAlert,
  GitBranch,
  Terminal,
  Activity,
  Layers,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

const PHASE_SEQUENCE = [
  { id: 'NS_GREEN', label: 'NS Green', color: 'border-emerald-500 text-emerald-400 bg-emerald-950/40' },
  { id: 'NS_YELLOW', label: 'NS Yellow', color: 'border-amber-500 text-amber-400 bg-amber-950/40' },
  { id: 'ALL_RED_1', label: 'All-Red Clearance 1', color: 'border-rose-500 text-rose-400 bg-rose-950/40' },
  { id: 'EW_GREEN', label: 'EW Green', color: 'border-emerald-500 text-emerald-400 bg-emerald-950/40' },
  { id: 'EW_YELLOW', label: 'EW Yellow', color: 'border-amber-500 text-amber-400 bg-amber-950/40' },
  { id: 'ALL_RED_2', label: 'All-Red Clearance 2', color: 'border-rose-500 text-rose-400 bg-rose-950/40' },
];

export default function AdvancedInspectorPanel({
  state,
  schedulerState,
  decisionHistory = [],
  onFetchHistory,
  onFetchScheduler,
}) {
  useEffect(() => {
    onFetchHistory?.();
    onFetchScheduler?.();
    const interval = setInterval(() => {
      onFetchHistory?.();
      onFetchScheduler?.();
    }, 1000);
    return () => clearInterval(interval);
  }, [onFetchHistory, onFetchScheduler]);

  const activePhase = schedulerState?.current_phase || state?.current_phase || 'NS_GREEN';

  return (
    <div className="space-y-5 text-slate-100">
      {/* ── Top Header Banner ── */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-700/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 via-sky-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-950/60 flex-shrink-0">
            <Search className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold uppercase tracking-wide text-white">
                Advanced System Inspector
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300">
                Diagnostic Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Deep inspection of low-level signal scheduler registers, decision history audit log, and live telemetry
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            onFetchHistory?.();
            onFetchScheduler?.();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-all active:scale-95 self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Registers
        </button>
      </div>

      {/* ── Section A: Scheduler State & Transition Diagram ── */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-700/60 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Section A: Signal Scheduler State & Safety Invariant
            </h3>
          </div>
          <span className="text-[11px] font-mono text-cyan-400">
            Current Phase: <strong className="text-white">{activePhase}</strong>
          </span>
        </div>

        {/* Transition Diagram Strip */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
            Phase State Machine Flow (Guaranteed Conflict-Free Transitions)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {PHASE_SEQUENCE.map((ph, idx) => {
              const isCurrent = activePhase === ph.id;
              return (
                <div
                  key={ph.id}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? `${ph.color} shadow-[0_0_15px_rgba(56,189,248,0.25)] scale-[1.02] ring-1 ring-cyan-400`
                      : 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60'
                  }`}
                >
                  <div className="text-[10px] font-mono uppercase text-slate-400">Step {idx + 1}</div>
                  <div className={`text-xs font-bold mt-0.5 ${isCurrent ? 'text-white' : 'text-slate-400'}`}>
                    {ph.label}
                  </div>
                  {isCurrent && (
                    <div className="text-[9px] font-mono mt-1 text-cyan-300 font-bold uppercase tracking-widest animate-pulse">
                      ● ACTIVE
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scheduler Registers Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Elapsed In Phase</span>
            <span className="text-lg font-bold font-mono text-white">
              {schedulerState?.phase_time_elapsed ?? state?.phase_time_elapsed ?? 0}s
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Target Green</span>
            <span className="text-lg font-bold font-mono text-cyan-400">
              {schedulerState?.target_green_duration ?? state?.phase_duration ?? 25}s
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Min Green Bound</span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              {schedulerState?.min_green ?? 10}s
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Max Green Bound</span>
            <span className="text-lg font-bold font-mono text-rose-400">
              {schedulerState?.max_green ?? 60}s
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Yellow Interval</span>
            <span className="text-lg font-bold font-mono text-amber-400">
              {schedulerState?.yellow_duration ?? 3}s
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">All-Red Clearance</span>
            <span className="text-lg font-bold font-mono text-rose-500">
              {schedulerState?.all_red_duration ?? 2}s
            </span>
          </div>
        </div>
      </div>

      {/* ── Section B: Fuzzy Decision History (Last 30 cycles) ── */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-700/60 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Section B: Fuzzy Logic Arbitration Audit Log (Last 30 Decisions)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-purple-300">
            {decisionHistory.length} Recorded Snapshots
          </span>
        </div>

        <div className="overflow-x-auto max-h-72 overflow-y-auto border border-slate-800 rounded-xl custom-scroll">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-900 text-slate-400 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-800 z-10">
              <tr>
                <th className="py-2.5 px-3">Sim Time</th>
                <th className="py-2.5 px-3">Selected Phase</th>
                <th className="py-2.5 px-3">NS Priority</th>
                <th className="py-2.5 px-3">EW Priority</th>
                <th className="py-2.5 px-3">Rec. Green</th>
                <th className="py-2.5 px-4">Inference Reason / Dynamic Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-xs">
              {decisionHistory.length > 0 ? (
                decisionHistory.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2 px-3 text-slate-400 font-bold">{item.sim_time}s</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          item.selected_phase === 'NS'
                            ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                        }`}
                      >
                        {item.selected_phase}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-cyan-300">{Number(item.ns_priority ?? 0).toFixed(1)}</td>
                    <td className="py-2 px-3 text-emerald-300">{Number(item.ew_priority ?? 0).toFixed(1)}</td>
                    <td className="py-2 px-3 text-white font-bold">{item.recommended_green}s</td>
                    <td className="py-2 px-4 text-slate-300 font-sans text-[11px] leading-snug">
                      {item.reason}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic font-sans">
                    No fuzzy decision snapshots logged yet. Start or advance the simulation to accumulate decisions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section C: Simulation Telemetry Event Log ── */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-700/60 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Section C: Live Simulation Telemetry & System Status Log
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono text-emerald-400">Stream Connected</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Active Scenario</span>
            <span className="text-sm font-bold font-mono text-amber-300">{state?.scenario || 'BALANCED'}</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Operating Mode</span>
            <span className="text-sm font-bold font-mono text-cyan-300">{state?.mode || 'FUZZY_ADAPTIVE'}</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Clock / Sim Time</span>
            <span className="text-sm font-bold font-mono text-white">{state?.timestamp ?? 0}s</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Cleared Vehicles</span>
            <span className="text-sm font-bold font-mono text-emerald-300">{state?.total_vehicles_processed ?? 0} veh</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Waiting Vehicles</span>
            <span className="text-sm font-bold font-mono text-rose-300">{state?.total_vehicles_waiting ?? 0} veh</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Congestion State</span>
            <span className="text-sm font-bold font-mono text-amber-400">{state?.congestion_level || 'Low'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
