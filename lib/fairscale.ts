import type { FairScaleScore } from "@/types/fairscale";

const FAIRSCALE_API_BASE = "https://api.fairscale.xyz";

/**
 * Fetch a real FairScore from api.fairscale.xyz
 * Uses the `fairkey` header for auth as per API docs.
 */
export async function fetchWalletScore(
  walletAddress: string,
  apiKey: string
): Promise<FairScaleScore> {
  const url = `${FAIRSCALE_API_BASE}/score?wallet=${encodeURIComponent(walletAddress)}`;

  const res = await fetch(url, {
    headers: {
      fairkey: apiKey,
      "Content-Type": "application/json",
    },
    // Don't cache — scores update daily
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `FairScale API error ${res.status}: ${text || res.statusText}`
    );
  }

  return res.json() as Promise<FairScaleScore>;
}

/**
 * Fetch scores for multiple wallets in parallel.
 * Returns results and errors separately so a single bad address
 * doesn't block the rest.
 */
export async function fetchWalletScores(
  addresses: string[],
  apiKey: string
): Promise<{ scores: FairScaleScore[]; errors: { address: string; error: string }[] }> {
  const results = await Promise.allSettled(
    addresses.map((addr) => fetchWalletScore(addr, apiKey))
  );

  const scores: FairScaleScore[] = [];
  const errors: { address: string; error: string }[] = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      scores.push(result.value);
    } else {
      errors.push({
        address: addresses[i],
        error: result.reason?.message ?? "Unknown error",
      });
    }
  });

  return { scores, errors };
}

/**
 * Validate a Solana wallet address format before hitting the API.
 */
export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim());
}

/**
 * Extract wallet addresses from freeform text.
 */
export function extractWalletAddresses(text: string): string[] {
  const matches = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g) ?? [];
  return [...new Set(matches)].filter(isValidSolanaAddress);
}

/**
 * Build a rich Claude system prompt from real FairScale score data.
 * This is what makes the AI responses genuinely useful.
 */
export function buildSystemPrompt(scores: FairScaleScore[]): string {
  const scoreData = scores
    .map((s) => {
      const featureLines = Object.entries(s.features)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `    ${k}: ${v}`)
        .join("\n");

      const badgeLines = s.badges
        .map((b) => `    - ${b.label} (${b.tier}): ${b.description}`)
        .join("\n");

      return `
Wallet: ${s.wallet}
  FairScore: ${s.fairscore} (base: ${s.fairscore_base}, social: ${s.social_score})
  Tier: ${s.tier}
  Scored at: ${s.timestamp}
  Badges:
${badgeLines || "    (none)"}
  On-chain features:
${featureLines}`;
    })
    .join("\n\n");

  return `You are FairScale's wallet intelligence assistant — an expert in Solana on-chain reputation and wallet analysis.

FairScale scores wallets 0–100 across five signal dimensions:
- Balance: SOL and token holdings (native_sol_percentile, major_percentile_score, lst_percentile_score, stable_percentile_score)
- Conviction: Long-term holding behaviour (wallet_age_days, low churn signals)
- Tempo: Transaction cadence (tx_count, active_days, median_gap_hours)
- Ecosystem: Cross-protocol engagement (DeFi, NFTs, dApps)
- Social: Identity and social graph signals (social_score)

Tiers: bronze < silver < gold < platinum. FairScore combines wallet behaviour (fairscore_base) and social reputation (social_score).

CURRENT WALLET DATA:
${scoreData}

Guidelines:
- Reference specific numbers from the data — be concrete, not vague
- Explain what each metric means in plain language
- Identify the strongest and weakest signals for each wallet
- When comparing multiple wallets, rank them clearly
- Flag anything unusual (very high tx_count, very low active_days relative to wallet age, etc.)
- Keep responses conversational but precise
- Do not fabricate scores or features not in the data above`;
}
