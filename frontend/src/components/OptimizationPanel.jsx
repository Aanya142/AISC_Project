import React, { useState } from 'react';
import {
  Dna,
  Play,
  Square,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Info,
  Clock,
  Layers,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export default function OptimizationPanel({
  gaResult,
  scenario,
  onStart,
  onCancel,
  onApply,
}) {
  const [popSize, setPopSize] = useState(30);
  const [generations, setGenerations] = useState(20);
  const [mutationRate, setMutationRate] = useState(0.15);

  const isRunning = Boolean(gaResult?.is_running);
  const progress = gaResult?.progress ?? 0;
  const history = gaResult?.history ?? [];
  const currentGen = history.length > 0
    ? history[history.length - 1].generation
    : Math.round(progress * (gaResult?.total_generations || generations));
  const totalGen = gaResult?.total_generations || generations;

  const handleStart = () => {
    onStart?.({
      population_size: Number(popSize),
      generations: Number(generations),
      mutation_rate: Number(mutationRate),
      crossover_rate: 0.8,
      scenario: scenario || 'BALANCED',
    });
  };

  const bestFitness = gaResult?.best_fitness ?? (history.length > 0 ? history[history.length - 1].best_fitness : 0);
  const optTiming = gaResult?.optimized_timing;

  return (
    <div className="space-y-5 text-slate-100">
      {/* ── Top Header Banner ── */}
      <div className="glass-panel rounded-2xl p-5 border border-purple-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-950/60 flex-shrink-0">
            <Dna className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold uppercase tracking-wide text-white">
                Genetic Algorithm Optimizer
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-300">
                Darwinian Search
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Optimizes signal phase splits and limits to minimize delay and maximize intersection throughput
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {gaResult?.applied && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Active in Scheduler
            </span>
          )}
          <span className="px-3 py-1.5 rounded-xl text-xs font-mono bg-slate-800/80 border border-slate-700 text-slate-300">
            Scenario: <strong className="text-purple-300">{gaResult?.scenario || scenario || 'BALANCED'}</strong>
          </span>
        </div>
      </div>

      {/* ── Hyperparameters & Execution Controls ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Configuration Form & Run Actions (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 border border-slate-700/60 shadow-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-400" />
            Evolution Hyperparameters
          </h3>

          <div className="grid grid-cols-3 gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1 uppercase">Population</label>
              <input
                type="number"
                min="10"
                max="100"
                step="5"
                disabled={isRunning}
                value={popSize}
                onChange={(e) => setPopSize(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1 uppercase">Generations</label>
              <input
                type="number"
                min="5"
                max="50"
                step="5"
                disabled={isRunning}
                value={generations}
                onChange={(e) => setGenerations(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1 uppercase">Mutation</label>
              <input
                type="number"
                min="0.01"
                max="0.5"
                step="0.05"
                disabled={isRunning}
                value={mutationRate}
                onChange={(e) => setMutationRate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-purple-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              {!isRunning ? (
                <button
                  onClick={handleStart}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold tracking-wide transition-all bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-950/50 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Run Genetic Algorithm
                </button>
              ) : (
                <button
                  onClick={onCancel}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold tracking-wide transition-all bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/50 active:scale-95"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Cancel Optimization
                </button>
              )}

              {optTiming && (
                <button
                  onClick={onApply}
                  disabled={isRunning || gaResult?.applied}
                  className={`flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                    gaResult?.applied
                      ? 'bg-slate-800/80 border-slate-700 text-slate-400 cursor-default'
                      : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-950/50 active:scale-95'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  {gaResult?.applied ? 'Applied' : 'Apply Plan'}
                </button>
              )}
            </div>

            {/* Live Progress Bar */}
            {isRunning && (
              <div className="bg-slate-900/80 border border-purple-500/30 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-purple-300 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                    Evolving Generation {currentGen} / {totalGen}
                  </span>
                  <span className="font-mono text-purple-200 font-bold">
                    {Math.round(progress * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 via-fuchsia-400 to-cyan-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* GA Summary Metrics Card */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Best Fitness</span>
              <span className="text-xl font-bold font-mono text-purple-300">
                {bestFitness ? Number(bestFitness).toFixed(3) : '0.000'}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Higher = lower delay</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Generations Run</span>
              <span className="text-xl font-bold font-mono text-cyan-300">
                {currentGen} <span className="text-xs text-slate-500 font-normal">/ {totalGen}</span>
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Evolution cycles</span>
            </div>
          </div>
        </div>

        {/* Right: Convergence Curve & Timing Plan (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Fitness Chart */}
          <div className="glass-panel rounded-2xl p-4 border border-slate-700/60 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Fitness Convergence Curve (Best vs Avg)
              </span>
              {history.length > 0 && (
                <span className="text-[11px] font-mono text-purple-300">
                  Peak: <strong>{Number(bestFitness).toFixed(3)}</strong>
                </span>
              )}
            </div>

            <div className="h-56 w-full">
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="generation" stroke="#64748b" fontSize={11} label={{ value: 'Generation', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: '#64748b' }} />
                    <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0b1120',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line
                      type="monotone"
                      dataKey="best_fitness"
                      name="Best Fitness"
                      stroke="#c084fc"
                      strokeWidth={2.5}
                      dot={{ r: 2, fill: '#c084fc' }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avg_fitness"
                      name="Average Fitness"
                      stroke="#64748b"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                  <TrendingUp className="w-8 h-8 opacity-30" />
                  <p className="text-xs italic">Run Genetic Algorithm to view real-time fitness convergence</p>
                </div>
              )}
            </div>
          </div>

          {/* Optimized Timing Plan Card */}
          {optTiming && (
            <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30 shadow-xl space-y-3 bg-emerald-950/10">
              <div className="flex items-center justify-between border-b border-emerald-800/40 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Evolved Chromosome & Optimized Plan
                </span>
                <span className="text-xs font-mono text-emerald-400">
                  Total Cycle: {optTiming.cycle_length || (optTiming.green_ns + optTiming.green_ew + 10)}s
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 block font-medium">North-South Optimal Green (G_NS)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xs text-slate-500 line-through">30.0s</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-2xl font-black font-mono text-emerald-400">
                      {optTiming.green_ns}s
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 block font-medium">East-West Optimal Green (G_EW)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xs text-slate-500 line-through">30.0s</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-2xl font-black font-mono text-cyan-400">
                      {optTiming.green_ew}s
                    </span>
                  </div>
                </div>
              </div>

              {gaResult?.best_chromosome && gaResult.best_chromosome.length > 0 && (
                <div className="text-[11px] font-mono text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
                  <span>Best Chromosome Vector:</span>
                  <span className="text-purple-300">
                    [{gaResult.best_chromosome.map((v) => Number(v).toFixed(1)).join(', ')}]
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Section: Genetic Algorithm Educational Explainer ── */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-700/60 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
          <Info className="w-4 h-4 text-purple-400" />
          How the Genetic Algorithm Works in AISC
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400 leading-relaxed">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
            <div className="font-bold text-purple-300 uppercase text-[11px] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              1. Chromosome Encoding
            </div>
            <p>
              Each candidate solution is encoded as a real-valued chromosome representing phase splits: <code className="text-purple-300 font-mono">[g_ns, g_ew]</code> constrained between safety bounds.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
            <div className="font-bold text-cyan-300 uppercase text-[11px] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              2. Fitness Objective
            </div>
            <p>
              Fitness evaluates simulated traffic delay and queue accumulation:
              <span className="block font-mono text-[10px] text-cyan-200 mt-1">
                Fitness = 1000 / (1 + w1·AvgWait + w2·MaxQueue)
              </span>
              Lower congestion yields exponentially higher fitness.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
            <div className="font-bold text-emerald-300 uppercase text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              3. Selection & Crossover
            </div>
            <p>
              High-fitness individuals are selected via tournament selection, crossed over with simulated binary crossover (SBX), and mutated with Gaussian perturbations to escape local minima.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
