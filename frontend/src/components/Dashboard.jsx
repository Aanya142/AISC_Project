/* AISC — Fuzzy Logic Adaptive Traffic Signal Dashboard */
import React, { useState } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import IntersectionSimulation from './IntersectionSimulation';
import MetricCard from './MetricCard';
import DirectionCard from './DirectionCard';
import FuzzyExplainerPanel from './FuzzyExplainerPanel';
import SimulationControls from './SimulationControls';
import ComparisonPanel from './ComparisonPanel';
import {
  Car, Clock, Gauge, Activity, Layers, AlertTriangle,
  Brain, BarChart3, Radio,
} from 'lucide-react';

// ── Tab config (3 tabs — GA Optimizer removed) ────────────────────────────────
const TABS = [
  { id: 'live',      label: 'Live Traffic',   icon: Radio    },
  { id: 'fuzzy',     label: 'Fuzzy Logic',    icon: Brain    },
  { id: 'benchmark', label: 'Benchmark',      icon: BarChart3 },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('live');

  const {
    state,
    isConnected,
    error,
    comparisonResult,
    comparisonLoading,
    actions,
  } = useSimulation();

  const congestionColorMap = {
    Low: 'emerald', Moderate: 'amber', High: 'rose', Critical: 'rose',
  };
  const currentCongestion = state?.congestion_level || 'Low';
  const congestionColor   = congestionColorMap[currentCongestion] || 'cyan';

  const modeBadge = {
    FIXED_TIME:     'bg-slate-700/80 text-slate-200 border-slate-600',
    FUZZY_ADAPTIVE: 'bg-cyan-950/80 text-cyan-200 border-cyan-600',
  };
  const modeClass = modeBadge[state?.mode] || modeBadge.FUZZY_ADAPTIVE;

  const modeLabel = {
    FIXED_TIME:     'Fixed-Time',
    FUZZY_ADAPTIVE: 'Fuzzy Adaptive',
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans">

      {/* ── Header ── */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-4 py-3">

            {/* Brand */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <span className="text-lg">🚦</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-extrabold tracking-tight text-white leading-tight">
                  AI Traffic Signal Optimization
                </h1>
                <p className="text-[10px] text-slate-400">
                  Fuzzy Logic Adaptive Controller · Academic Prototype
                </p>
              </div>
            </div>

            {/* Tabs */}
            <nav className="flex items-center gap-1 flex-1 justify-center">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === id
                      ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </nav>

            {/* Status pills */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px]">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-slate-300 font-medium hidden md:inline">
                  {isConnected ? 'Connected' : 'Offline'}
                </span>
              </div>
              <div className={`px-2.5 py-1 rounded-full border text-[11px] font-mono hidden lg:flex ${modeClass}`}>
                {modeLabel[state?.mode] || 'Fuzzy Adaptive'}
              </div>
              <div className="px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-600/40 text-amber-200 text-[11px] font-mono hidden xl:flex">
                {state?.scenario || 'BALANCED'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full p-4 md:p-5 space-y-5">

        {/* Error banner */}
        {error && (
          <div className="bg-rose-950/50 border border-rose-500/40 rounded-xl p-3 flex items-center gap-2.5 text-rose-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── TAB: LIVE TRAFFIC ── */}
        {activeTab === 'live' && (
          <div className="space-y-5">
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard title="Processed"  value={state?.total_vehicles_processed ?? 0} unit="veh"   icon={Car}      color="cyan"    subtext="Completed trips" />
              <MetricCard title="Queued"     value={state?.total_vehicles_waiting   ?? 0} unit="veh"   icon={Layers}   color="rose"    subtext="Currently stopped" />
              <MetricCard title="Avg Wait"   value={state?.avg_waiting_time         ?? 0} unit="s"     icon={Clock}    color="amber"   subtext="Per vehicle" />
              <MetricCard title="Max Wait"   value={state?.max_waiting_time         ?? 0} unit="s"     icon={Clock}    color="rose"    subtext="Longest delay" />
              <MetricCard title="Throughput" value={state?.throughput               ?? 0} unit="v/min" icon={Gauge}    color="emerald" subtext="Discharge rate" />
              <MetricCard title="Congestion" value={currentCongestion}                                 icon={Activity} color={congestionColor} subtext={`Avg Q: ${state?.avg_queue_length ?? 0}`} />
            </div>

            {/* Intersection + Controls */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

              {/* Left: canvas + direction cards */}
              <div className="xl:col-span-7 space-y-4">
                <div className="glass-panel rounded-2xl p-4 border border-slate-700/50 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      Live 4-Way Intersection
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      Phase: <span className="text-cyan-400 font-bold">{state?.current_phase || 'NS_GREEN'}</span>
                      <span className="text-slate-500 ml-1">({state?.countdown ?? 0}s left)</span>
                    </div>
                  </div>
                  <IntersectionSimulation state={state} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['NORTH','SOUTH','EAST','WEST'].map(dir => (
                    <DirectionCard key={dir} direction={dir} metrics={state?.directions?.[dir]} />
                  ))}
                </div>
              </div>

              {/* Right: controls */}
              <div className="xl:col-span-5">
                <SimulationControls
                  state={state}
                  onStart={actions.start}
                  onPause={actions.pause}
                  onResume={actions.resume}
                  onReset={actions.reset}
                  onSetScenario={actions.setScenario}
                  onUpdateConfig={actions.updateConfig}
                  onSetMode={actions.setMode}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: FUZZY LOGIC ── */}
        {activeTab === 'fuzzy' && (
          <FuzzyExplainerPanel
            fuzzyDecision={state?.active_fuzzy_decision}
            currentPhase={state?.current_phase}
            directions={state?.directions}
          />
        )}

        {/* ── TAB: BENCHMARK ── */}
        {activeTab === 'benchmark' && (
          <ComparisonPanel
            comparisonResult={comparisonResult}
            isLoading={comparisonLoading}
            scenario={state?.scenario}
            onRun={actions.runComparison}
          />
        )}

      </main>

      <footer className="border-t border-slate-800/60 bg-slate-900/40 py-3 px-6 text-center text-[11px] text-slate-500 font-mono">
        AI Traffic Signal Optimization · Mamdani Fuzzy Logic · Academic Prototype · AISC
      </footer>
    </div>
  );
}
