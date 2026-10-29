import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Gauge,
  Sliders,
  FastForward,
  Cpu,
  Layers,
  Settings2,
} from 'lucide-react';

const SCENARIOS = [
  { id: 'BALANCED', label: 'Balanced', desc: 'Equal all sides (15 v/m)' },
  { id: 'HEAVY_NORTH_SOUTH', label: 'Heavy N-S', desc: 'Major arterial corridor (32 v/m)' },
  { id: 'HEAVY_EAST_WEST', label: 'Heavy E-W', desc: 'Cross-street surge (32 v/m)' },
  { id: 'NORTH_SURGE', label: 'North Surge', desc: 'Single-approach bottleneck (45 v/m)' },
  { id: 'EAST_SURGE', label: 'East Surge', desc: 'Eastbound morning rush (45 v/m)' },
  { id: 'HIGH_CONGESTION', label: 'High Congestion', desc: 'Network overload (35 v/m all)' },
  { id: 'UNEVEN', label: 'Uneven', desc: 'Asymmetric real-world flow' },
  { id: 'LOW_TRAFFIC', label: 'Low Traffic', desc: 'Late night / off-peak (5 v/m)' },
];

const MODES = [
  {
    id: 'FIXED_TIME',
    label: 'Fixed-Time',
    badge: 'Baseline',
    desc: 'Static cyclic timer with preset green durations — no adaptation',
  },
  {
    id: 'FUZZY_ADAPTIVE',
    label: 'Fuzzy Adaptive',
    badge: 'Mamdani AI',
    desc: 'Dynamic real-time priority via Mamdani fuzzy inference rules',
  },
];

const SPEED_OPTIONS = [0.5, 1.0, 2.0, 3.0, 5.0];

export default function SimulationControls({
  state,
  onStart,
  onPause,
  onResume,
  onReset,
  onSetScenario,
  onUpdateConfig,
  onSetMode,
}) {
  const isRunning = Boolean(state?.is_running);
  const isPaused = Boolean(state?.is_paused);
  const currentScenario = state?.scenario || 'BALANCED';
  const currentMode = state?.mode || 'FUZZY_ADAPTIVE';
  const directions = state?.directions || {};

  const [fixedNs, setFixedNs] = useState(30);
  const [fixedEw, setFixedEw] = useState(30);
  const [currentSpeed, setCurrentSpeed] = useState(1.0);

  const handleRateChange = (dir, val) => {
    const currentRates = {
      NORTH: directions.NORTH?.arrival_rate ?? 15,
      SOUTH: directions.SOUTH?.arrival_rate ?? 15,
      EAST: directions.EAST?.arrival_rate ?? 15,
      WEST: directions.WEST?.arrival_rate ?? 15,
    };
    currentRates[dir] = Number(val);
    onUpdateConfig?.({ arrival_rates: currentRates });
  };

  const handleSpeedChange = (speed) => {
    setCurrentSpeed(speed);
    onUpdateConfig?.({ sim_speed: speed });
  };

  const handleFixedTimingUpdate = (nsVal, ewVal) => {
    setFixedNs(nsVal);
    setFixedEw(ewVal);
    onUpdateConfig?.({ fixed_green_ns: Number(nsVal), fixed_green_ew: Number(ewVal) });
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-700/60 shadow-xl flex flex-col gap-5 text-slate-100">
      {/* ── Top Header with Controls ── */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-cyan-400">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide text-white uppercase">Control Centre</h3>
            <p className="text-[11px] text-slate-400">Execution · Mode · Scenarios · Kinematics</p>
          </div>
        </div>

        {/* Playback Actions */}
        <div className="flex items-center gap-2">
          {!isRunning || isPaused ? (
            <button
              onClick={isRunning ? onResume : onStart}
              className="flex items-center gap-1.5 py-1.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isRunning ? 'Resume' : 'Start'}
            </button>
          ) : (
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 py-1.5 px-4 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950/40 transition-all active:scale-95"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              Pause
            </button>
          )}

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all active:scale-95"
            title="Reset Simulation State"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* ── Section 1: Control Strategy Mode Selector ── */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          Control Mode Architecture
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MODES.map((m) => {
            const isSelected = currentMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => (onSetMode ? onSetMode(m.id) : onUpdateConfig?.({ mode: m.id }))}
                className={`p-2.5 rounded-xl text-left transition-all border relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-[0_0_14px_rgba(6,182,212,0.2)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold leading-tight">{m.label}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {m.badge}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{m.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Fixed-Time Sliders (Visible when mode is FIXED_TIME) ── */}
      {currentMode === 'FIXED_TIME' && (
        <div className="bg-slate-900/80 border border-amber-500/40 rounded-xl p-3 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Fixed Phase Duration Configuration
            </span>
            <span className="text-[10px] text-amber-400/80 font-mono">Manual Static Cycle</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400 text-[11px] font-sans">N-S Green Time</span>
                <span className="text-amber-300 font-bold">{fixedNs}s</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                step="5"
                value={fixedNs}
                onChange={(e) => handleFixedTimingUpdate(Number(e.target.value), fixedEw)}
                className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400 text-[11px] font-sans">E-W Green Time</span>
                <span className="text-amber-300 font-bold">{fixedEw}s</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                step="5"
                value={fixedEw}
                onChange={(e) => handleFixedTimingUpdate(fixedNs, Number(e.target.value))}
                className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Section 3: Simulation Speed Multiplier ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FastForward className="w-3.5 h-3.5 text-indigo-400" />
            Simulation Speed
          </label>
          <span className="text-xs font-mono text-indigo-300 font-bold">{currentSpeed}x Realtime</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 rounded-xl p-1.5">
          {SPEED_OPTIONS.map((spd) => (
            <button
              key={spd}
              onClick={() => handleSpeedChange(spd)}
              className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                currentSpeed === spd
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 4: Traffic Demand Scenarios Grid ── */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Traffic Demand Scenarios (8 Presets)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SCENARIOS.map((sc) => {
            const isSelected = currentScenario === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => onSetScenario?.(sc.id)}
                title={sc.desc}
                className={`p-2 rounded-xl text-left text-xs font-semibold transition-all border ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500/80 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="truncate font-bold text-[11px]">{sc.label}</div>
                <div className="text-[9px] text-slate-500 truncate mt-0.5">{sc.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 5: Arrival Rate Sliders (Per-Direction) ── */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-emerald-400" />
          Directional Arrival Rates (vehicles / min)
        </label>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-slate-900/50 border border-slate-800 rounded-xl p-3">
          {['NORTH', 'SOUTH', 'EAST', 'WEST'].map((dir) => {
            const rate = directions[dir]?.arrival_rate ?? 15;
            return (
              <div key={dir} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400 text-[11px] font-sans font-medium">{dir}</span>
                  <span className="text-cyan-400 font-bold">{rate} v/m</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="1"
                  value={rate}
                  onChange={(e) => handleRateChange(dir, e.target.value)}
                  className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-500 italic pl-1">
          Dynamically adjusts Poisson stochastic arrival rates for live traffic testing.
        </p>
      </div>
    </div>
  );
}
