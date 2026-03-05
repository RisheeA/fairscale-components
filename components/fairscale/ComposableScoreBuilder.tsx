"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { RotateCcw, Save, ChevronDown, Info, Zap, TrendingUp, Clock, Globe, Users, Loader2 } from "lucide-react";
import type { FairScaleScore, SignalWeights, ScoreConfig } from "@/types/fairscale";

// ─── Signal definitions ───────────────────────────────────────────────────────

const SIGNALS = [
  {
    key: "balance" as const,
    label: "Balance",
    shortDesc: "SOL & token holdings",
    longDesc: "Scores native SOL balance, major token holdings, liquid staking tokens, and stablecoin positions — mapped to percentile ranks across all wallets.",
    icon: Zap,
    color: "#1B6CA8",
    lightColor: "#E8F1F9",
    apiFields: ["native_sol_percentile", "major_percentile_score", "lst_percentile_score", "stable_percentile_score"],
  },
  {
    key: "conviction" as const,
    label: "Conviction",
    shortDesc: "Hold duration & low churn",
    longDesc: "Derived from wallet_age_days and asset retention patterns. High conviction wallets accumulate over time without panic selling.",
    icon: TrendingUp,
    color: "#2E7D32",
    lightColor: "#E8F5E9",
    apiFields: ["wallet_age_days"],
  },
  {
    key: "tempo" as const,
    label: "Tempo",
    shortDesc: "Activity frequency & recency",
    longDesc: "Combines tx_count, active_days, and median_gap_hours. Rewards consistent, measured activity — not bots or dormant wallets.",
    icon: Clock,
    color: "#6A1B9A",
    lightColor: "#F3E5F5",
    apiFields: ["tx_count", "active_days", "median_gap_hours"],
  },
  {
    key: "ecosystem" as const,
    label: "Ecosystem",
    shortDesc: "Cross-protocol engagement",
    longDesc: "Measures breadth across Solana DeFi, NFT platforms, dApps and governance. Ecosystem-native wallets score higher.",
    icon: Globe,
    color: "#E65100",
    lightColor: "#FBE9E7",
    apiFields: [],
  },
  {
    key: "social" as const,
    label: "Social",
    shortDesc: "Social graph & identity",
    longDesc: "The social_score component — linked identity signals, vouches from high-reputation wallets, and community presence.",
    icon: Users,
    color: "#AD1457",
    lightColor: "#FCE4EC",
    apiFields: ["social_score"],
  },
] as const;

const DEFAULT_WEIGHTS: SignalWeights = {
  balance: 20, conviction: 20, tempo: 20, ecosystem: 20, social: 20,
};

const PRESETS: { label: string; weights: SignalWeights }[] = [
  { label: "Balanced", weights: { balance: 20, conviction: 20, tempo: 20, ecosystem: 20, social: 20 } },
  { label: "DeFi Focus", weights: { balance: 30, conviction: 25, tempo: 20, ecosystem: 40, social: 10 } },
  { label: "Whale Screen", weights: { balance: 50, conviction: 30, tempo: 10, ecosystem: 20, social: 5 } },
  { label: "Community", weights: { balance: 10, conviction: 20, tempo: 25, ecosystem: 15, social: 50 } },
  { label: "Long-term Holder", weights: { balance: 25, conviction: 50, tempo: 5, ecosystem: 10, social: 10 } },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weightsToPercent(weights: SignalWeights): Record<keyof SignalWeights, number> {
  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  if (total === 0) return { balance: 0, conviction: 0, tempo: 0, ecosystem: 0, social: 0 };
  const result = {} as Record<keyof SignalWeights, number>;
  (Object.keys(weights) as (keyof SignalWeights)[]).forEach((k) => {
    result[k] = Math.round((weights[k] / total) * 100);
  });
  return result;
}

/**
 * Apply custom weights to a real FairScale score.
 * Maps signal keys to the actual API fields and re-computes a weighted score.
 * This runs client-side for instant preview — the real API normalises server-side.
 */
function applyWeightsToScore(score: FairScaleScore, weights: SignalWeights): number {
  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  if (total === 0) return 0;

  const f = score.features;

  // Map each signal to its API-derived sub-score (0-100)
  const signalScores: Record<keyof SignalWeights, number> = {
    balance: (((f.native_sol_percentile ?? 0) + (f.major_percentile_score ?? 0) + (f.lst_percentile_score ?? 0) + (f.stable_percentile_score ?? 0)) / 4) * 100,
    conviction: Math.min(((f.wallet_age_days ?? 0) / 365) * 100, 100),
    tempo: Math.min(((f.active_days ?? 0) / 180) * 100, 100),
    ecosystem: score.fairscore_base, // proxy until ecosystem-specific endpoint available
    social: score.social_score,
  };

  const weighted = (Object.keys(weights) as (keyof SignalWeights)[]).reduce((sum, k) => {
    return sum + signalScores[k] * weights[k];
  }, 0);

  return Math.round(weighted / total);
}

function scoreTier(score: number): { tier: string; color: string } {
  if (score >= 80) return { tier: "Platinum", color: "#1B6CA8" };
  if (score >= 65) return { tier: "Gold", color: "#C8A97E" };
  if (score >= 45) return { tier: "Silver", color: "#8899AA" };
  return { tier: "Bronze", color: "#CD7F32" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SignalSlider({ signal, value, onChange }: { signal: typeof SIGNALS[number]; value: number; onChange: (v: number) => void }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const Icon = signal.icon;
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: signal.lightColor }}>
          <Icon className="w-3.5 h-3.5" style={{ color: signal.color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#1A2733]">{signal.label}</span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
                  <Info className="w-3 h-3 text-[#AAB8C2] hover:text-[#6B7B8D] transition-colors" />
                </button>
                {showTooltip && (
                  <div className="absolute right-0 bottom-5 w-52 p-2.5 bg-[#1A2733] text-white text-[11px] rounded-lg shadow-xl z-10 leading-relaxed">
                    {signal.longDesc}
                    <div className="absolute right-1 bottom-[-4px] w-2 h-2 bg-[#1A2733] rotate-45" />
                  </div>
                )}
              </div>
              <span className="text-xs font-mono font-semibold w-8 text-right tabular-nums" style={{ color: value === 0 ? "#AAB8C2" : signal.color }}>
                {value}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[#8899AA]">{signal.shortDesc}</p>
        </div>
      </div>
      <div className="pl-9">
        <input
          type="range" min={0} max={100} step={5} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${signal.color} 0%, ${signal.color} ${value}%, #E8EDF3 ${value}%, #E8EDF3 100%)`,
            accentColor: signal.color,
          }}
        />
        <div className="flex justify-between text-[9px] text-[#C4D0DA] mt-0.5 font-mono">
          <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
        </div>
      </div>
    </div>
  );
}

function ScoreDial({ score, animating }: { score: number; animating: boolean }) {
  const { tier, color } = scoreTier(score);
  const r = 44;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#E8EDF3" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${(score / 100) * circ} ${(1 - score / 100) * circ}`}
          strokeLinecap="round"
          style={{ transition: animating ? "stroke-dasharray 0.5s cubic-bezier(0.34,1.56,0.64,1)" : "none" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums leading-none" style={{ fontFamily: "'DM Mono', monospace", color }}>{score}</span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white mt-1" style={{ backgroundColor: color }}>{tier}</span>
      </div>
    </div>
  );
}

// ─── Live wallet preview ──────────────────────────────────────────────────────

function LiveWalletPreview({
  weights, walletAddress,
}: {
  weights: SignalWeights;
  walletAddress?: string;
}) {
  const [liveScore, setLiveScore] = useState<FairScaleScore | null>(null);
  const [previewInput, setPreviewInput] = useState(walletAddress ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [animating, setAnimating] = useState(false);

  const displayScore = liveScore ? applyWeightsToScore(liveScore, weights) : null;

  useEffect(() => {
    if (displayScore !== null) {
      setAnimating(true);
      const t = setTimeout(() => setAnimating(false), 600);
      return () => clearTimeout(t);
    }
  }, [displayScore]);

  async function fetchPreview() {
    const addr = previewInput.trim();
    if (!addr) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: [addr] }),
      });
      const data = await res.json();
      if (!res.ok || data.scores?.length === 0) throw new Error(data.error ?? "No score returned");
      setLiveScore(data.scores[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold text-[#8899AA] uppercase tracking-wider text-center">
        {liveScore ? "Live Score Preview" : "Preview with real wallet"}
      </p>

      {!liveScore ? (
        <div className="space-y-2">
          <input
            className="w-full text-[11px] font-mono border border-[#D0DCE8] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#1B6CA8] transition-colors placeholder:text-[#C4D0DA] text-[#1A2733]"
            placeholder="Paste wallet address…"
            value={previewInput}
            onChange={(e) => setPreviewInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchPreview()}
          />
          {error && <p className="text-[10px] text-red-500 font-mono">{error}</p>}
          <button
            onClick={fetchPreview}
            disabled={loading || !previewInput.trim()}
            className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium bg-[#1B6CA8] text-white hover:bg-[#155A8F] disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            {loading ? "Fetching…" : "Load live score"}
          </button>
        </div>
      ) : (
        <>
          <ScoreDial score={displayScore!} animating={animating} />
          <p className="text-[10px] text-[#8899AA] text-center font-mono">
            {liveScore.wallet.slice(0, 8)}…{liveScore.wallet.slice(-4)} · {liveScore.tier}
          </p>
          <p className="text-[10px] text-[#AAB8C2] text-center">
            Base: {liveScore.fairscore_base.toFixed(1)} · Social: {liveScore.social_score.toFixed(1)}
          </p>
          <button
            onClick={() => { setLiveScore(null); setPreviewInput(""); }}
            className="w-full text-[10px] text-[#8899AA] hover:text-[#1B6CA8] transition-colors"
          >
            Change wallet
          </button>
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface ComposableScoreBuilderProps {
  initialWeights?: Partial<SignalWeights>;
  walletAddress?: string;
  onConfigChange?: (config: ScoreConfig) => void;
  onApply?: (config: ScoreConfig) => void;
  showGating?: boolean;
  allowSave?: boolean;
}

export default function ComposableScoreBuilder({
  initialWeights,
  walletAddress,
  onConfigChange,
  onApply,
  showGating = true,
  allowSave = true,
}: ComposableScoreBuilderProps) {
  const [weights, setWeights] = useState<SignalWeights>({ ...DEFAULT_WEIGHTS, ...initialWeights });
  const [minScore, setMinScore] = useState(60);
  const [strictMode, setStrictMode] = useState(false);
  const [label, setLabel] = useState("My Config");
  const [saved, setSaved] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const config: ScoreConfig = { weights, minScore, strictMode, label };
  const pct = weightsToPercent(weights);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onConfigChange?.(config), 150);
  }, [weights, minScore, strictMode]);

  const updateWeight = useCallback((key: keyof SignalWeights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  function applyPreset(preset: typeof PRESETS[number]) {
    setWeights(preset.weights); setLabel(preset.label); setShowPresets(false); setSaved(false);
  }

  function handleSave() {
    onApply?.(config); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:currentColor;cursor:pointer;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.2)}
        input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:currentColor;cursor:pointer;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.2)}
      `}</style>

      <div className="rounded-2xl border border-[#D0DCE8] bg-white shadow-xl overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#1B6CA8] to-[#1557A0] text-white">
          <div>
            <h2 className="text-sm font-semibold">Composable Score Builder</h2>
            <p className="text-[11px] text-white/70 mt-0.5">Reweight FairScale signals · live score preview</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowPresets((s) => !s)} className="flex items-center gap-1 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-medium transition-colors">
                Presets <ChevronDown className={`w-3 h-3 transition-transform ${showPresets ? "rotate-180" : ""}`} />
              </button>
              {showPresets && (
                <div className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-[#E8EDF3] overflow-hidden z-20 w-44">
                  {PRESETS.map((p) => (
                    <button key={p.label} onClick={() => applyPreset(p)} className="w-full text-left px-3 py-2 text-xs text-[#1A2733] hover:bg-[#F5F7FA] transition-colors">
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => { setWeights(DEFAULT_WEIGHTS); setMinScore(60); setStrictMode(false); setSaved(false); }} className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition-colors" title="Reset">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Left — Sliders */}
          <div className="flex-1 px-5 py-5 space-y-5 border-b md:border-b-0 md:border-r border-[#E8EDF3]">
            <h3 className="text-xs font-semibold text-[#1A2733] uppercase tracking-wider">Signal Weights</h3>
            {SIGNALS.map((signal) => (
              <SignalSlider key={signal.key} signal={signal} value={weights[signal.key]} onChange={(v) => updateWeight(signal.key, v)} />
            ))}

            {/* Weight breakdown bar */}
            <div className="pt-2">
              <p className="text-[10px] text-[#8899AA] mb-2 uppercase tracking-wider font-mono">Distribution</p>
              <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
                {SIGNALS.map((s) => pct[s.key] > 0 ? (
                  <div key={s.key} className="transition-all duration-500" style={{ width: `${pct[s.key]}%`, backgroundColor: s.color }} title={`${s.label}: ${pct[s.key]}%`} />
                ) : null)}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {SIGNALS.map((s) => (
                  <div key={s.key} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[10px] text-[#6B7B8D] font-mono">{s.label} {pct[s.key]}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Live preview + gating */}
          <div className="w-full md:w-64 px-5 py-5 bg-[#F9FAFC] flex flex-col gap-5">
            <LiveWalletPreview weights={weights} walletAddress={walletAddress} />

            {showGating && (
              <div className="border-t border-[#E8EDF3] pt-4 space-y-3">
                <p className="text-[10px] font-semibold text-[#8899AA] uppercase tracking-wider">Access Gate</p>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-[#1A2733]">Minimum score</label>
                    <span className="text-xs font-mono font-semibold text-[#1B6CA8]">{minScore}</span>
                  </div>
                  <input type="range" min={0} max={100} step={5} value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(to right, #1B6CA8 0%, #1B6CA8 ${minScore}%, #E8EDF3 ${minScore}%, #E8EDF3 100%)`, accentColor: "#1B6CA8" }}
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div onClick={() => setStrictMode((s) => !s)} className={`w-8 h-4 rounded-full relative transition-colors cursor-pointer ${strictMode ? "bg-[#1B6CA8]" : "bg-[#D0DCE8]"}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${strictMode ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-xs text-[#1A2733]">Strict mode</span>
                </label>
                <p className="text-[10px] text-[#8899AA] leading-relaxed">
                  Wallets below <span className="font-mono text-[#1B6CA8]">{minScore}</span> are gated.{strictMode && " All signals must pass individually."}
                </p>
              </div>
            )}

            {allowSave && (
              <div className="border-t border-[#E8EDF3] pt-4 space-y-2">
                <input
                  className="w-full text-xs border border-[#D0DCE8] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#1B6CA8] transition-colors text-[#1A2733] placeholder:text-[#AAB8C2]"
                  placeholder="Config name…"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  style={{ fontFamily: "'DM Mono', monospace" }}
                />
                <button
                  onClick={handleSave}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${saved ? "bg-[#2E7D32] text-white" : "bg-[#1B6CA8] hover:bg-[#155A8F] text-white"}`}
                >
                  <Save className="w-3.5 h-3.5" />
                  {saved ? "Config saved!" : "Apply & Save Config"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
