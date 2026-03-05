// ─── FairScale API Types ──────────────────────────────────────────────────────
// Matches https://api.fairscale.xyz/score response schema exactly

export interface FairScaleBadge {
  id: string;
  label: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

export interface FairScaleFeatures {
  lst_percentile_score?: number;
  major_percentile_score?: number;
  native_sol_percentile?: number;
  stable_percentile_score?: number;
  tx_count?: number;
  active_days?: number;
  median_gap_hours?: number;
  wallet_age_days?: number;
  [key: string]: number | undefined;
}

export interface FairScaleScore {
  wallet: string;
  fairscore_base: number;
  social_score: number;
  fairscore: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  badges: FairScaleBadge[];
  actions: unknown[];
  timestamp: string;
  features: FairScaleFeatures;
}

export interface FairScaleError {
  error: string;
  status: number;
}

// ─── Chat types ───────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  scores?: FairScaleScore[];
  timestamp: Date;
}

// ─── Composable score config ──────────────────────────────────────────────────

export interface SignalWeights {
  balance: number;
  conviction: number;
  tempo: number;
  ecosystem: number;
  social: number;
}

export interface ScoreConfig {
  weights: SignalWeights;
  minScore: number;
  strictMode: boolean;
  label: string;
}
