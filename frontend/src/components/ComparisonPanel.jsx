import React, { useState } from 'react';
import {
  BarChart3,
  Play,
  Award,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Car,
  Layers,
  Gauge,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

const SCENARIOS = [
  { id: 'BALANCED', label: 'Balanced Traffic' },
  { id: 'HEAVY_NORTH_SOUTH', label: 'Heavy North-South Corridor' },
  { id: 'HEAVY_EAST_WEST', label: 'Heavy East-West Cross-Street' },
  { id: 'NORTH_SURGE', label: 'Northbound Surge Demand' },
  { id: 'EAST_SURGE', label: 'Eastbound Surge Demand' },
  { id: 'HIGH_CONGESTION', label: 'High Congestion (All Directions)' },
  { id: 'UNEVEN', label: 'Uneven Demand Flow' },
  { id: 'LOW_TRAFFIC', label: 'Low Traffic (Off-Peak)' },
];

export default function ComparisonPanel({
  comparisonResult,
  isLoading,
  scenario,
  onRun,
}) {
  const [selectedScenario, setSelectedScenario] = useState(scenario || 'HEAVY_NORTH_SOUTH');
  const [duration, setDuration] = useState(120);

  const handleRun = () => {
    onRun?.(selectedScenario, Number(duration));
  };

  const fixed = comparisonResult?.fixed_metrics;
  const fuzzy = comparisonResult?.fuzzy_metrics;
  const fuzzyGa = comparisonResult?.fuzzy_ga_metrics;
  const gaImprove = comparisonResult?.ga_vs_fixed_improvement || {};
  const fuzzyImprove = comparisonResult?.fuzzy_vs_fixed_improvement || {};

  const chartData = comparisonResult
    ? [
        {
          metric: 'Avg Wait (s)',
          Fixed: Number(fixed?.avg_waiting_time ?? 0),
          Fuzzy: Number(fuzzy?.avg_waiting_time ?? 0),
          FuzzyGA: Number(fuzzyGa?.avg_waiting_time ?? 0),
        },
        {
          metric: 'Max Wait (s)',
          Fixed: Number(fixed?.max_waiting_time ?? 0),
          Fuzzy: Number(fuzzy?.max_waiting_time ?? 0),
          FuzzyGA: Number(fuzzyGa?.max_waiting_time ?? 0),
        },
        {
          metric: 'Avg Queue (veh)',
          Fixed: Number(fixed?.avg_queue_length ?? 0),
          Fuzzy: Number(fuzzy?.avg_queue_length ?? 0),
          FuzzyGA: Number(fuzzyGa?.avg_queue_length ?? 0),
        },
        {
          metric: 'Throughput (v/m)',
          Fixed: Number(fixed?.throughput ?? 0),
          Fuzzy: Number(fuzzy?.throughput ?? 0),
          FuzzyGA: Number(fuzzyGa?.throughput ?? 0),
        },
        {
          metric: 'Processed (veh)',
          Fixed: Number(fixed?.total_vehicles_processed ?? 0),
          Fuzzy: Number(fuzzy?.total_vehicles_processed ?? 0),
          FuzzyGA: Number(fuzzyGa?.total_vehicles_processed ?? 0),
        },
      ]
    : [];

  return (
    <div className="space-y-5 text-slate-100">
      {/* ── Top Header Banner ── */}
      <div className="glass-panel rounded-2xl p-5 border border-emerald-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-950/60 flex-shrink-0">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold uppercase tracking-wide text-white">
                Fair Baseline Benchmark
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300">
                Deterministic Seeded Workload
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Head-to-head comparison of Fixed-Time vs Mamdani Fuzzy vs Hybrid Fuzzy+GA under identical vehicle arrival streams
            </p>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-700/80 rounded-xl px-3 py-1.5">
            <span className="text-[11px] text-slate-400">Scenario:</span>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              disabled={isLoading}
              className="bg-transparent text-xs font-semibold text-slate-100 focus:outline-none cursor-pointer"
            >
              {SCENARIOS.map((sc) => (
                <option key={sc.id} value={sc.id} className="bg-slate-900 text-slate-100">
                  {sc.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-700/80 rounded-xl px-3 py-1.5">
            <span className="text-[11px] text-slate-400">Duration:</span>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={isLoading}
              className="bg-transparent text-xs font-semibold text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value={60} className="bg-slate-900 text-slate-100">60s (Quick)</option>
              <option value={120} className="bg-slate-900 text-slate-100">120s (Standard)</option>
              <option value={180} className="bg-slate-900 text-slate-100">180s (Deep)</option>
              <option value={300} className="bg-slate-900 text-slate-100">300s (Extended)</option>
            </select>
          </div>

          <button
            onClick={handleRun}
            disabled={isLoading}
            className={`flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-bold tracking-wide transition-all ${
              isLoading
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-700/50 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 active:scale-95'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                Simulating Benchmark...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Benchmark
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Visual Comparison Bar Chart ── */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-700/60 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Strategy Performance Comparison
            </span>
            {comparisonResult && (
              <span className="text-[11px] font-mono text-emerald-300">
                ({comparisonResult.scenario} · {comparisonResult.duration_seconds}s)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exact identical random vehicle seeds across all 3 engines</span>
          </div>
        </div>

        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="metric" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
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
                <Bar dataKey="Fixed" name="1. Fixed-Time (Baseline)" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Fuzzy" name="2. Fuzzy Adaptive" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="FuzzyGA" name="3. Fuzzy + GA (Hybrid AI)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
              <BarChart3 className="w-10 h-10 opacity-30" />
              <p className="text-xs italic">
                Click "Run Benchmark" above to test all 3 control strategies on identical traffic flow
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Numerical Table with Detailed Metrics & Improvements ── */}
      {comparisonResult && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-700/60 shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              Detailed KPI Breakdown & Relative Improvements
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Evaluated at {comparisonResult.duration_seconds} simulation seconds
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Metric</th>
                  <th className="py-3 px-4">1. Fixed-Time</th>
                  <th className="py-3 px-4 text-cyan-300">2. Fuzzy Adaptive</th>
                  <th className="py-3 px-4 text-emerald-300">3. Fuzzy + GA</th>
                  <th className="py-3 px-4 text-center">Fuzzy vs Fixed</th>
                  <th className="py-3 px-4 text-right">GA vs Fixed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-xs">
                {/* Avg Waiting Time */}
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 text-slate-200 font-sans font-medium flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Average Waiting Time
                  </td>
                  <td className="py-3 px-4 text-slate-400">{fixed?.avg_waiting_time}s</td>
                  <td className="py-3 px-4 text-cyan-300 font-bold">{fuzzy?.avg_waiting_time}s</td>
                  <td className="py-3 px-4 text-emerald-300 font-black">{fuzzyGa?.avg_waiting_time}s</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-950 border border-cyan-800 text-cyan-300">
                      <ArrowDownRight className="w-3 h-3" />
                      {fuzzyImprove.avg_waiting_time > 0 ? '+' : ''}{fuzzyImprove.avg_waiting_time}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 border border-emerald-700 text-emerald-300">
                      <ArrowDownRight className="w-3 h-3" />
                      {gaImprove.avg_waiting_time > 0 ? '+' : ''}{gaImprove.avg_waiting_time}%
                    </span>
                  </td>
                </tr>

                {/* Average Queue Length */}
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 text-slate-200 font-sans font-medium flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-rose-400" />
                    Average Queue Length
                  </td>
                  <td className="py-3 px-4 text-slate-400">{fixed?.avg_queue_length} veh</td>
                  <td className="py-3 px-4 text-cyan-300 font-bold">{fuzzy?.avg_queue_length} veh</td>
                  <td className="py-3 px-4 text-emerald-300 font-black">{fuzzyGa?.avg_queue_length} veh</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-950 border border-cyan-800 text-cyan-300">
                      <ArrowDownRight className="w-3 h-3" />
                      {fuzzyImprove.avg_queue_length > 0 ? '+' : ''}{fuzzyImprove.avg_queue_length}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 border border-emerald-700 text-emerald-300">
                      <ArrowDownRight className="w-3 h-3" />
                      {gaImprove.avg_queue_length > 0 ? '+' : ''}{gaImprove.avg_queue_length}%
                    </span>
                  </td>
                </tr>

                {/* Max Waiting Time */}
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 text-slate-200 font-sans font-medium flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-rose-400" />
                    Maximum Waiting Time
                  </td>
                  <td className="py-3 px-4 text-slate-400">{fixed?.max_waiting_time}s</td>
                  <td className="py-3 px-4 text-cyan-300 font-bold">{fuzzy?.max_waiting_time}s</td>
                  <td className="py-3 px-4 text-emerald-300 font-black">{fuzzyGa?.max_waiting_time}s</td>
                  <td className="py-3 px-4 text-center text-slate-400 font-sans text-[11px]">
                    {Number(fuzzy?.max_waiting_time) < Number(fixed?.max_waiting_time) ? 'Reduced Delay' : 'Controlled'}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400 font-sans text-[11px] font-bold">
                    {Number(fuzzyGa?.max_waiting_time) <= Number(fixed?.max_waiting_time) ? '✓ Minimized Worst-Case' : 'Controlled'}
                  </td>
                </tr>

                {/* Throughput */}
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 text-slate-200 font-sans font-medium flex items-center gap-2">
                    <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                    Throughput (Discharge Rate)
                  </td>
                  <td className="py-3 px-4 text-slate-400">{fixed?.throughput} v/m</td>
                  <td className="py-3 px-4 text-cyan-300 font-bold">{fuzzy?.throughput} v/m</td>
                  <td className="py-3 px-4 text-emerald-300 font-black">{fuzzyGa?.throughput} v/m</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-950 border border-cyan-800 text-cyan-300">
                      <ArrowUpRight className="w-3 h-3" />
                      {fuzzyImprove.throughput > 0 ? '+' : ''}{fuzzyImprove.throughput}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 border border-emerald-700 text-emerald-300">
                      <ArrowUpRight className="w-3 h-3" />
                      {gaImprove.throughput > 0 ? '+' : ''}{gaImprove.throughput}%
                    </span>
                  </td>
                </tr>

                {/* Total Processed */}
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 text-slate-200 font-sans font-medium flex items-center gap-2">
                    <Car className="w-3.5 h-3.5 text-cyan-400" />
                    Total Vehicles Cleared
                  </td>
                  <td className="py-3 px-4 text-slate-400">{fixed?.total_vehicles_processed} veh</td>
                  <td className="py-3 px-4 text-cyan-300 font-bold">{fuzzy?.total_vehicles_processed} veh</td>
                  <td className="py-3 px-4 text-emerald-300 font-black">{fuzzyGa?.total_vehicles_processed} veh</td>
                  <td className="py-3 px-4 text-center text-cyan-400 font-sans text-[11px]">
                    +{(Number(fuzzy?.total_vehicles_processed) - Number(fixed?.total_vehicles_processed))} veh
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400 font-sans text-[11px] font-bold">
                    +{(Number(fuzzyGa?.total_vehicles_processed) - Number(fixed?.total_vehicles_processed))} veh
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
