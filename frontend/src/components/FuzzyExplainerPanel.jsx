import React, { useState } from 'react';
import {
  Brain,
  ChevronRight,
  Zap,
  Target,
  Award,
  GitMerge,
  Info,
  CheckCircle2,
  Lightbulb,
  Gauge,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

// ─── Membership bar mini component ───────────────────────────────────────────
function MemberBar({ label, value, color }) {
  const pct = Math.round((value || 0) * 100);
  const colorClass = {
    low: 'bg-rose-500',
    medium: 'bg-amber-400',
    high: 'bg-emerald-500',
    short: 'bg-sky-500',
    moderate: 'bg-amber-400',
    long: 'bg-rose-500',
  }[color] || 'bg-cyan-400';

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-[10px] text-slate-400 shrink-0 font-mono uppercase">{label}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[11px] font-bold font-mono w-10 text-right ${value > 0.5 ? 'text-white' : 'text-slate-500'}`}>
        {value ? Number(value).toFixed(2) : '0.00'}
      </span>
    </div>
  );
}

// ─── Step card wrapper ────────────────────────────────────────────────────────
function StepCard({ stepNumber, title, subtitle, icon: Icon, accentColor, children }) {
  const accents = {
    cyan: 'border-cyan-500/40 bg-cyan-950/20',
    amber: 'border-amber-500/40 bg-amber-950/20',
    purple: 'border-purple-500/40 bg-purple-950/20',
    emerald: 'border-emerald-500/40 bg-emerald-950/20',
    indigo: 'border-indigo-500/40 bg-indigo-950/20',
  };
  const iconColors = {
    cyan: 'text-cyan-400 bg-cyan-950/60 border-cyan-700/60',
    amber: 'text-amber-400 bg-amber-950/60 border-amber-700/60',
    purple: 'text-purple-400 bg-purple-950/60 border-purple-700/60',
    emerald: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/60',
    indigo: 'text-indigo-400 bg-indigo-950/60 border-indigo-700/60',
  };
  const stepBadge = {
    cyan: 'bg-cyan-500 text-slate-900',
    amber: 'bg-amber-500 text-slate-900',
    purple: 'bg-purple-500 text-white',
    emerald: 'bg-emerald-500 text-slate-900',
    indigo: 'bg-indigo-500 text-white',
  };

  return (
    <div className={`glass-panel rounded-2xl p-4 border ${accents[accentColor] || accents.cyan} shadow-lg flex flex-col gap-3`}>
      <div className="flex items-center gap-2.5 border-b border-slate-700/50 pb-2.5">
        <span className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center flex-shrink-0 ${stepBadge[accentColor] || stepBadge.cyan}`}>
          {stepNumber}
        </span>
        <div className={`p-1.5 rounded-lg border ${iconColors[accentColor] || iconColors.cyan}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-white truncate">{title}</h4>
          <p className="text-[10px] text-slate-400 truncate">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Phase priority gauge ─────────────────────────────────────────────────────
function PriorityGauge({ label, score, isWinner }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  return (
    <div className={`rounded-xl p-2.5 border transition-all ${isWinner
      ? 'bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_14px_rgba(56,189,248,0.2)]'
      : 'bg-slate-900/40 border-slate-800'}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] font-bold text-slate-300">Phase {label}</span>
        <span className={`font-mono text-xs font-black ${isWinner ? 'text-cyan-300' : 'text-slate-500'}`}>
          {(score || 0).toFixed(1)} / 100
        </span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isWinner
            ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
            : 'bg-slate-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isWinner && (
        <span className="text-[9px] text-cyan-400 font-mono uppercase tracking-widest mt-1 block text-right font-bold">
          ✓ HIGHEST URGENCY
        </span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FuzzyExplainerPanel({ fuzzyDecision, currentPhase, directions }) {
  const [activeTab, setActiveTab] = useState('NS'); // NS or EW

  if (!fuzzyDecision) {
    return (
      <div className="glass-panel rounded-2xl p-10 text-center border border-slate-700/50">
        <Brain className="w-10 h-10 mx-auto mb-3 text-cyan-500/40 animate-pulse" />
        <p className="text-slate-400 font-medium">Start the simulation to see Fuzzy Logic in action</p>
        <p className="text-slate-500 text-xs mt-1">
          The Mamdani controller evaluates queue length, waiting time and traffic density every cycle
        </p>
      </div>
    );
  }

  const {
    inputs = {},
    memberships = {},
    active_rules = [],
    phase_priorities = {},
    selected_phase = 'NS',
    recommended_green = 25,
    reason = '',
  } = fuzzyDecision;

  const nsInputs = inputs?.NS || {};
  const ewInputs = inputs?.EW || {};
  const nsMem = memberships?.NS || {};
  const ewMem = memberships?.EW || {};
  const curMem = activeTab === 'NS' ? nsMem : ewMem;
  const curInp = activeTab === 'NS' ? nsInputs : ewInputs;

  return (
    <div className="space-y-4 text-slate-100">
      {/* ── Section header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-950 to-indigo-950 border border-cyan-700/40">
            <Brain className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-white">
              How Fuzzy Logic Decides — Step by Step
            </h2>
            <p className="text-[11px] text-slate-400">
              Mamdani Inference Engine · Min-Max Implication · Centroid Defuzzification · Safety Clamping
            </p>
          </div>
        </div>

        {/* Decision pill */}
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/60 border border-emerald-500/50 shadow-lg">
          <Award className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white">
            Phase <span className="text-emerald-400 font-extrabold">{selected_phase}</span> Selected
          </span>
          <span className="text-xs text-emerald-300 font-mono font-bold">({recommended_green}s green)</span>
        </div>
      </div>

      {/* ── 5 Steps Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 items-stretch">

        {/* ─ STEP 1: Crisp Inputs ─ */}
        <StepCard stepNumber="1" title="Crisp Inputs" subtitle="Live approach sensors" icon={Gauge} accentColor="cyan">
          <div className="space-y-2 flex-1 flex flex-col justify-between">
            <div>
              {/* Direction tab switcher */}
              <div className="flex gap-1 mb-2.5">
                {['NS', 'EW'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeTab === t
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {t === 'NS' ? '↕ N-S Corridor' : '↔ E-W Cross'}
                  </button>
                ))}
              </div>

              <div className="space-y-2 bg-slate-900/60 rounded-xl p-2.5 border border-slate-800 text-xs">
                <Row label="🚗 Queue Length" value={(curInp.queue || 0).toFixed(1)} unit="veh" />
                <Row label="⏱ Avg Wait Time" value={(curInp.wait_time || 0).toFixed(1)} unit="s" />
                <Row label="📊 Density" value={(curInp.density || 0).toFixed(1)} unit="v/app" />
              </div>
            </div>

            <p className="text-[10px] text-slate-500 italic px-1 pt-1">
              Loop detectors & stop-line cameras measure realtime physical flow metrics.
            </p>
          </div>
        </StepCard>

        {/* ─ STEP 2: Fuzzification ─ */}
        <StepCard stepNumber="2" title="Fuzzification" subtitle="Linguistic membership (μ)" icon={GitMerge} accentColor="amber">
          <div className="space-y-2.5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex gap-1 mb-2">
                {['NS', 'EW'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`flex-1 py-0.5 rounded text-[11px] font-bold transition-all ${
                      activeTab === t ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {t === 'NS' ? '↕ N-S' : '↔ E-W'}
                  </button>
                ))}
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 mb-0.5 uppercase">Queue μ</p>
                  <MemberBar label="Short" value={curMem.queue?.short} color="short" />
                  <MemberBar label="Medium" value={curMem.queue?.medium} color="moderate" />
                  <MemberBar label="Long" value={curMem.queue?.long} color="long" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 mb-0.5 uppercase">Wait Time μ</p>
                  <MemberBar label="Short" value={curMem.wait_time?.short} color="short" />
                  <MemberBar label="Moderate" value={curMem.wait_time?.moderate} color="moderate" />
                  <MemberBar label="Long" value={curMem.wait_time?.long} color="long" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 mb-0.5 uppercase">Density μ</p>
                  <MemberBar label="Low" value={curMem.density?.low} color="low" />
                  <MemberBar label="Med" value={curMem.density?.medium} color="medium" />
                  <MemberBar label="High" value={curMem.density?.high} color="high" />
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 italic px-1 pt-1">
              Triangular/trapezoidal membership degrees map numbers into [0.0, 1.0].
            </p>
          </div>
        </StepCard>

        {/* ─ STEP 3: Rule Evaluation ─ */}
        <StepCard stepNumber="3" title="Rule Firing" subtitle="Mamdani IF-THEN implication" icon={Zap} accentColor="purple">
          <div className="space-y-2 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wide">Fired Rules</span>
                <span className="text-[11px] font-bold font-mono text-purple-300">
                  {active_rules?.length || 0} active
                </span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scroll">
                {active_rules && active_rules.length > 0 ? (
                  active_rules.slice(0, 5).map((rule, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/70 border border-slate-800 rounded-lg p-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/60 text-purple-400 font-mono text-[9px] font-black">
                          {rule.rule_id}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-slate-500">strength:</span>
                          <span className="text-[11px] font-black font-mono text-purple-300">
                            {rule.firing_strength}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-300 leading-snug">{rule.condition}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        → Pri: <span className="text-purple-400 font-bold">{rule.consequent_priority}</span>
                        &nbsp;| Grn: <span className="text-purple-400 font-bold">{rule.consequent_green}</span>
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic text-center py-4">
                    No rules fired above activation threshold
                  </p>
                )}
              </div>
            </div>

            <p className="text-[10px] text-slate-500 italic px-1 pt-1">
              Firing strength = min(membership antecedents) via Zadeh t-norm.
            </p>
          </div>
        </StepCard>

        {/* ─ STEP 4: Defuzzification & Calculation ─ */}
        <StepCard stepNumber="4" title="Defuzzification" subtitle="Centroid Center of Gravity" icon={Target} accentColor="emerald">
          <div className="space-y-2.5 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Centroid Integral Formula
                </span>
                <div className="bg-slate-950/60 border border-slate-800 p-2 rounded-lg text-center font-mono text-[11px] text-emerald-300">
                  z* = ∫ z·μ(z) dz / ∫ μ(z) dz
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Aggregates all output fuzzy shapes and calculates geometric balance point.
                </p>
              </div>

              <div className="bg-slate-900/70 border border-emerald-700/40 rounded-xl p-3 text-center">
                <p className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wide">Calculated Green Time</p>
                <span className="text-2xl font-black text-emerald-400 font-mono">{recommended_green}s</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Bounded in [10s, 60s]</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 italic px-1 pt-1">
              Transforms continuous fuzzy priority surface into precise seconds.
            </p>
          </div>
        </StepCard>

        {/* ─ STEP 5: Decision Summary & Why (NEW) ─ */}
        <StepCard stepNumber="5" title="Decision Summary" subtitle="Fair urgency allocation" icon={Award} accentColor="indigo">
          <div className="space-y-2.5 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              {/* Selected Phase Feature Box */}
              <div
                className={`rounded-xl p-3 text-center border shadow-lg ${
                  selected_phase === 'NS'
                    ? 'bg-cyan-950/50 border-cyan-500/80 text-cyan-200'
                    : 'bg-emerald-950/50 border-emerald-500/80 text-emerald-200'
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                  Arbitration Winner
                </span>
                <div className="text-xl font-black font-mono mt-0.5">
                  Phase {selected_phase} ({selected_phase === 'NS' ? '↕ N-S' : '↔ E-W'})
                </div>
                <div className="text-xs font-mono font-bold mt-1 text-white">
                  Allocated: <span className="underline decoration-cyan-400">{recommended_green}s Green</span>
                </div>
              </div>

              {/* Priority Gauge Comparison */}
              <div className="space-y-1.5">
                <PriorityGauge
                  label="NS (↕)"
                  score={phase_priorities?.NS}
                  isWinner={selected_phase === 'NS'}
                />
                <PriorityGauge
                  label="EW (↔)"
                  score={phase_priorities?.EW}
                  isWinner={selected_phase === 'EW'}
                />
              </div>

              {/* Reason Quote */}
              <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-2.5 flex items-start gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-300 leading-snug">
                  {reason || 'Evaluating traffic urgency to balance intersection delay.'}
                </p>
              </div>
            </div>

            {/* Fair Allocation Note */}
            <div className="bg-indigo-950/30 border border-indigo-700/40 rounded-lg p-2 text-[10px] text-indigo-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 text-indigo-400" />
              <span>This decision ensures fair green time allocation by prioritizing the direction with highest fuzzy urgency.</span>
            </div>
          </div>
        </StepCard>

      </div>

      {/* ── Fuzzy Logic concept explainer strip ── */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
            Mamdani Fuzzy Reasoning Architecture — Overview
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-[11px]">
          <ConceptCard step="Step 1" color="cyan" title="Sensing">
            Sensors measure real-world inputs: queue length (veh), delay (sec), and traffic density.
          </ConceptCard>
          <ConceptCard step="Step 2" color="amber" title="Fuzzification">
            Crisp numbers convert to degrees in sets: <em>Short</em>, <em>Medium</em>, <em>Long</em>.
          </ConceptCard>
          <ConceptCard step="Step 3" color="purple" title="Rule Firing">
            Expert rules evaluate parallel conditions. Rule strength = min of all premise degrees.
          </ConceptCard>
          <ConceptCard step="Step 4" color="emerald" title="Defuzzification">
            Centroid Center of Gravity method computes crisp priority and recommended green seconds.
          </ConceptCard>
          <ConceptCard step="Step 5" color="indigo" title="Fair Arbitration">
            Safety controller guarantees non-conflicting green phases with fail-safe bounds.
          </ConceptCard>
        </div>
      </div>
    </div>
  );
}

// ── Helper sub-components ──────────────────────────────────────────────────────
function Row({ label, value, unit }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className="font-mono text-xs font-bold text-white">
        {value} <span className="text-slate-500 font-normal">{unit}</span>
      </span>
    </div>
  );
}

function ConceptCard({ step, color, title, children }) {
  const colors = {
    cyan: 'border-cyan-700/40 bg-cyan-950/20 text-cyan-400',
    amber: 'border-amber-700/40 bg-amber-950/20 text-amber-400',
    purple: 'border-purple-700/40 bg-purple-950/20 text-purple-400',
    emerald: 'border-emerald-700/40 bg-emerald-950/20 text-emerald-400',
    indigo: 'border-indigo-700/40 bg-indigo-950/20 text-indigo-400',
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[color] || colors.cyan}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <ChevronRight className="w-3 h-3" />
        <span className="font-bold text-[10px] uppercase tracking-wide">{step}: {title}</span>
      </div>
      <p className="text-slate-400 leading-relaxed text-[10px]">{children}</p>
    </div>
  );
}
