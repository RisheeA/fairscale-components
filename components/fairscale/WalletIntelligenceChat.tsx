"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Wallet, Plus, ChevronDown, Loader2, Bot, User, AlertCircle, X } from "lucide-react";
import type { FairScaleScore, ChatMessage } from "@/types/fairscale";
import { isValidSolanaAddress, extractWalletAddresses } from "@/lib/fairscale";

// ─── Score Card ───────────────────────────────────────────────────────────────

const TIER_COLORS = {
  bronze: { primary: "#CD7F32", light: "#FDF3E7", text: "#8B5A1A" },
  silver: { primary: "#8899AA", light: "#F0F4F8", text: "#4A5A6A" },
  gold:   { primary: "#C8A97E", light: "#FDF8F0", text: "#7A5A2A" },
  platinum: { primary: "#1B6CA8", light: "#E8F1F9", text: "#0F4570" },
};

function tierToGrade(tier: FairScaleScore["tier"]): string {
  return { bronze: "C", silver: "B", gold: "A", platinum: "S" }[tier];
}

function ScoreRing({ score, tier }: { score: number; tier: FairScaleScore["tier"] }) {
  const color = TIER_COLORS[tier].primary;
  const r = 20;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#E8EDF3" strokeWidth="4" />
        <circle
          cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${(score / 100) * circ} ${(1 - score / 100) * circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold" style={{ color, fontFamily: "'DM Mono', monospace" }}>
          {Math.round(score)}
        </span>
      </div>
    </div>
  );
}

function ScoreCard({ wallet }: { wallet: FairScaleScore }) {
  const [expanded, setExpanded] = useState(false);
  const colors = TIER_COLORS[wallet.tier];
  const features = wallet.features;

  const featureLabels: Record<string, string> = {
    lst_percentile_score: "LST Score",
    major_percentile_score: "Major Tokens",
    native_sol_percentile: "Native SOL",
    stable_percentile_score: "Stables",
    tx_count: "Transactions",
    active_days: "Active Days",
    median_gap_hours: "Median Gap (hrs)",
    wallet_age_days: "Wallet Age (days)",
  };

  return (
    <div
      className="rounded-xl border my-2 overflow-hidden shadow-sm"
      style={{ borderColor: colors.primary + "33", backgroundColor: colors.light }}
    >
      <div className="flex items-center gap-3 p-3">
        <ScoreRing score={wallet.fairscore} tier={wallet.tier} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wide"
              style={{ backgroundColor: colors.primary }}
            >
              {wallet.tier} · {tierToGrade(wallet.tier)}
            </span>
            <span className="text-[10px] font-mono text-[#6B7B8D] truncate">
              {wallet.wallet.slice(0, 10)}…{wallet.wallet.slice(-6)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-x-3 gap-y-0.5">
            <div>
              <p className="text-[9px] text-[#8899AA]">Base Score</p>
              <p className="text-xs font-semibold" style={{ color: colors.text, fontFamily: "'DM Mono', monospace" }}>
                {wallet.fairscore_base.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-[#8899AA]">Social</p>
              <p className="text-xs font-semibold" style={{ color: colors.text, fontFamily: "'DM Mono', monospace" }}>
                {wallet.social_score.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-[#8899AA]">Combined</p>
              <p className="text-xs font-bold" style={{ color: colors.primary, fontFamily: "'DM Mono', monospace" }}>
                {wallet.fairscore.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {wallet.badges.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {wallet.badges.map((b) => (
            <span
              key={b.id}
              title={b.description}
              className="text-[9px] px-1.5 py-0.5 rounded-full border font-medium cursor-help"
              style={{ borderColor: colors.primary + "44", color: colors.text }}
            >
              {b.label}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] border-t transition-colors hover:opacity-80"
        style={{ borderColor: colors.primary + "22", color: colors.text }}
      >
        {expanded ? "Hide" : "Show"} feature breakdown
        <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t" style={{ borderColor: colors.primary + "22" }}>
          {Object.entries(features)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([key, value]) => (
              <div key={key}>
                <p className="text-[9px] text-[#8899AA]">{featureLabels[key] ?? key}</p>
                <p className="text-[11px] font-mono font-medium" style={{ color: colors.text }}>
                  {typeof value === "number" && value < 1 && value > 0
                    ? `${(value * 100).toFixed(0)}th %ile`
                    : value}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  // Render **bold** markdown
  function renderContent(text: string) {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className={i > 0 && line === "" ? "mt-2" : ""}>
          {parts.map((part, j) =>
            j % 2 === 1
              ? <strong key={j} className={isUser ? "text-white/90" : "text-[#1B6CA8]"}>{part}</strong>
              : part
          )}
        </p>
      );
    });
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${isUser ? "bg-[#C8A97E]/20" : "bg-[#1B6CA8]/10"}`}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-[#C8A97E]" />
          : <Bot className="w-3.5 h-3.5 text-[#1B6CA8]" />
        }
      </div>
      <div className={`max-w-[82%] flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser
            ? "bg-[#1B6CA8] text-white rounded-tr-sm"
            : "bg-white border border-[#E8EDF3] text-[#1A2733] rounded-tl-sm shadow-sm"
          }`}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {renderContent(message.content)}
        </div>
        {message.scores && message.scores.length > 0 && (
          <div className="w-full">
            {message.scores.map((w) => <ScoreCard key={w.wallet} wallet={w} />)}
          </div>
        )}
        <span className="text-[10px] text-[#AAB8C2]" style={{ fontFamily: "'DM Mono', monospace" }}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#1B6CA8]/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="mx-4 my-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss}><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

// ─── Wallet Input Bar ─────────────────────────────────────────────────────────

function WalletInputBar({ onAddWallets, loading }: { onAddWallets: (addresses: string[]) => void; loading: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    const addresses = value.split(/[\n,\s]+/).map((a) => a.trim()).filter(Boolean);
    const invalid = addresses.filter((a) => !isValidSolanaAddress(a));
    if (invalid.length > 0) {
      setError(`Invalid address${invalid.length > 1 ? "es" : ""}: ${invalid.slice(0, 2).join(", ")}${invalid.length > 2 ? "…" : ""}`);
      return;
    }
    if (addresses.length === 0) { setError("Paste at least one wallet address"); return; }
    if (addresses.length > 10) { setError("Maximum 10 wallets at once"); return; }
    onAddWallets(addresses);
    setValue(""); setError(""); setExpanded(false);
  }

  return (
    <div className="border-b border-[#E8EDF3] bg-[#F5F7FA]">
      <button
        onClick={() => setExpanded((e) => !e)}
        disabled={loading}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-[#5B7A99] hover:text-[#1B6CA8] transition-colors disabled:opacity-50"
        style={{ fontFamily: "'DM Mono', monospace" }}
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add wallets to analyse (up to 10)</span>
        <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="px-4 pb-3">
          <textarea
            className="w-full text-xs font-mono bg-white border border-[#D0DCE8] rounded-lg p-3 h-20 resize-none focus:outline-none focus:border-[#1B6CA8] transition-colors placeholder:text-[#AAB8C2]"
            placeholder={"One or more Solana wallet addresses, separated by newlines or commas\ne.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"}
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(""); }}
          />
          {error && <p className="text-[10px] text-red-500 mt-1 font-mono">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={loading || !value.trim()}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#1B6CA8] text-white text-xs rounded-lg hover:bg-[#155A8F] disabled:opacity-50 transition-colors"
          >
            <Wallet className="w-3 h-3" />
            {loading ? "Fetching scores…" : "Fetch & Analyse"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface WalletIntelligenceChatProps {
  title?: string;
  subtitle?: string;
  height?: number | string;
}

export default function WalletIntelligenceChat({
  title = "FairScale Intelligence",
  subtitle = "Real-time Solana wallet analysis",
  height = 640,
}: WalletIntelligenceChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: "0",
    role: "assistant",
    content: "Hello! I'm FairScale's wallet intelligence assistant.\n\nPaste any Solana wallet address above — I'll pull the live FairScore data and you can ask me anything: risk profiles, on-chain behaviour, conviction signals, badge breakdowns, or how wallets compare.",
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeScores, setActiveScores] = useState<FairScaleScore[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleAddWallets(addresses: string[]) {
    setLoading(true);
    setError("");

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: `Analyse ${addresses.length > 1 ? `these ${addresses.length} wallets` : "this wallet"}:\n${addresses.map((a) => `\`${a}\``).join("\n")}`,
      timestamp: new Date(),
    };
    setMessages((m) => [...m, userMsg]);

    try {
      // 1. Fetch real scores from FairScale API via our server route
      const scoreRes = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses }),
      });

      if (!scoreRes.ok) {
        const err = await scoreRes.json();
        throw new Error(err.error ?? "Failed to fetch scores");
      }

      const { scores, errors: scoreErrors } = await scoreRes.json();

      if (scoreErrors.length > 0) {
        setError(`Couldn't score: ${scoreErrors.map((e: { address: string }) => e.address.slice(0, 8) + "…").join(", ")}`);
      }

      if (scores.length === 0) {
        throw new Error("No valid scores returned. Check the wallet addresses.");
      }

      // Update active scores (merge, don't replace)
      const merged = [...activeScores];
      scores.forEach((s: FairScaleScore) => {
        const idx = merged.findIndex((w) => w.wallet === s.wallet);
        if (idx >= 0) merged[idx] = s; else merged.push(s);
      });
      setActiveScores(merged);

      // 2. Ask Claude to interpret the real scores
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          scores: merged,
          history: messages,
        }),
      });

      if (!chatRes.ok) {
        const err = await chatRes.json();
        throw new Error(err.error ?? "AI response failed");
      }

      const { content } = await chatRes.json();

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content,
        scores,
        timestamp: new Date(),
      };
      setMessages((m) => [...m, aiMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    // Auto-detect inline wallet addresses
    const inlineWallets = extractWalletAddresses(text);
    if (inlineWallets.length > 0) {
      setInput("");
      await handleAddWallets(inlineWallets);
      return;
    }

    setInput("");
    setLoading(true);
    setError("");

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((m) => [...m, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          scores: activeScores,
          history: messages,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "AI response failed");
      }

      const { content } = await res.json();
      setMessages((m) => [...m, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content,
        timestamp: new Date(),
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');`}</style>
      <div className="flex flex-col rounded-2xl overflow-hidden shadow-xl border border-[#D0DCE8] bg-[#F5F7FA]" style={{ height, fontFamily: "'DM Sans', sans-serif" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-white border-b border-[#E8EDF3]">
          <div className="w-9 h-9 rounded-xl bg-[#1B6CA8] flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[#1A2733]">{title}</h2>
            <p className="text-[11px] text-[#6B7B8D]">{subtitle}</p>
          </div>
          {activeScores.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1B6CA8]/8 border border-[#1B6CA8]/20">
              <Wallet className="w-3 h-3 text-[#1B6CA8]" />
              <span className="text-[11px] font-medium text-[#1B6CA8]" style={{ fontFamily: "'DM Mono', monospace" }}>
                {activeScores.length} wallet{activeScores.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        <WalletInputBar onAddWallets={handleAddWallets} loading={loading} />

        {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[#1B6CA8]/10 flex-shrink-0 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-[#1B6CA8]" />
              </div>
              <div className="bg-white border border-[#E8EDF3] rounded-2xl rounded-tl-sm shadow-sm">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 bg-white border-t border-[#E8EDF3]">
          <div className="flex items-end gap-2 bg-[#F5F7FA] rounded-xl border border-[#D0DCE8] px-3 py-2 focus-within:border-[#1B6CA8] transition-colors">
            <textarea
              rows={1}
              className="flex-1 bg-transparent resize-none text-sm text-[#1A2733] placeholder:text-[#AAB8C2] focus:outline-none leading-relaxed"
              placeholder="Ask about wallet behaviour, or paste addresses here…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ maxHeight: 96 }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#1B6CA8] flex items-center justify-center hover:bg-[#155A8F] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
            </button>
          </div>
          <p className="text-[10px] text-[#AAB8C2] mt-1.5 text-center" style={{ fontFamily: "'DM Mono', monospace" }}>
            Powered by FairScale · Live Solana on-chain data
          </p>
        </div>
      </div>
    </>
  );
}
