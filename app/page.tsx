"use client";

import WalletIntelligenceChat from "@/components/fairscale/WalletIntelligenceChat";
import ComposableScoreBuilder from "@/components/fairscale/ComposableScoreBuilder";
import type { ScoreConfig } from "@/types/fairscale";

export default function FairScaleTestPage() {
  function handleConfigChange(config: ScoreConfig) {
    // Wire to your API: PUT /v1/protocols/:id/score-config
    console.log("[FairScale] Config updated:", config);
  }

  function handleApply(config: ScoreConfig) {
    // Persist to your DB
    console.log("[FairScale] Config saved:", config);
    alert(`Config "${config.label}" saved! Check console for full config object.`);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div className="min-h-screen bg-[#EEF2F7]" style={{
        backgroundImage: `radial-gradient(circle at 20% 20%, #1B6CA808 0%, transparent 50%), radial-gradient(circle at 80% 80%, #C8A97E08 0%, transparent 50%)`
      }}>
        {/* Top bar */}
        <header className="bg-white border-b border-[#E0E8F0] px-6 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#1B6CA8] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M12 3L4 7v5c0 4.55 3.4 8.74 8 9.93C16.6 20.74 20 16.55 20 12V7l-8-4z"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#1A2733]">FairScale</span>
          <span className="text-xs text-[#8899AA] border border-[#D0DCE8] rounded-full px-2 py-0.5 font-mono ml-1">component test</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] text-[#6B7B8D] font-mono">live · api.fairscale.xyz</span>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-[#1A2733]">Component Testing</h1>
            <p className="text-sm text-[#6B7B8D] mt-1">
              Both components are wired to the live FairScale API and Anthropic. Real data, real AI.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Chat */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono text-[#8899AA] uppercase tracking-wider">Component 1</span>
                <span className="text-[10px] font-mono text-[#1B6CA8] bg-[#1B6CA8]/8 px-2 py-0.5 rounded-full">Wallet Intelligence Chat</span>
              </div>
              <WalletIntelligenceChat
                title="FairScale Intelligence"
                subtitle="Live on-chain wallet analysis"
                height={640}
              />
            </div>

            {/* Score builder */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono text-[#8899AA] uppercase tracking-wider">Component 2</span>
                <span className="text-[10px] font-mono text-[#1B6CA8] bg-[#1B6CA8]/8 px-2 py-0.5 rounded-full">Composable Score Builder</span>
              </div>
              <ComposableScoreBuilder
                showGating={true}
                allowSave={true}
                onConfigChange={handleConfigChange}
                onApply={handleApply}
              />
            </div>
          </div>

          <p className="text-center text-[11px] text-[#AAB8C2] mt-8 font-mono">
            Test environment · Not for public distribution · FairScale © 2026
          </p>
        </main>
      </div>
    </>
  );
}
