"use client";

import React, { useState } from "react";
import { Zap } from "lucide-react";

interface TokenMeterProps {
  usedTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  maxTokens?: number;
  estimatedCostUsd?: number;
  showBreakdown?: boolean;
  compact?: boolean;
  className?: string;
}

export function TokenMeter({
  usedTokens = 0,
  promptTokens = 0,
  completionTokens = 0,
  maxTokens = 128000,
  estimatedCostUsd,
  showBreakdown = true,
  compact = false,
  className = "",
}: TokenMeterProps) {
  const [hovered, setHovered] = useState(false);

  const total = usedTokens || (promptTokens + completionTokens);
  const percentage = Math.min(100, Math.max(0, (total / (maxTokens || 1)) * 100));

  // Determine color zone
  let barGradient = "from-emerald-500 to-emerald-400";
  let barGlow = "shadow-[0_0_10px_rgba(16,185,129,0.5)]";
  let textColor = "text-emerald-400";

  if (percentage >= 90) {
    barGradient = "from-rose-500 to-red-600";
    barGlow = "shadow-[0_0_12px_rgba(239,68,68,0.7)]";
    textColor = "text-rose-400";
  } else if (percentage >= 70) {
    barGradient = "from-amber-500 to-yellow-400";
    barGlow = "shadow-[0_0_10px_rgba(245,158,11,0.5)]";
    textColor = "text-amber-400";
  }

  const cost = estimatedCostUsd ?? (total * 0.0000015);

  if (compact) {
    return (
      <div
        className={`relative inline-flex items-center gap-1.5 cursor-help ${className}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Zap className="w-3 h-3 text-indigo-400 shrink-0" />
        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-indigo-500/20">
          <div
            className={`h-full bg-gradient-to-r ${barGradient} ${barGlow} transition-all duration-500 ease-out`}
            style={{ width: `${Math.max(percentage, 4)}%` }}
          />
        </div>
        <span className={`text-[10px] font-mono font-medium ${textColor}`}>
          {total > 1000 ? `${(total / 1000).toFixed(1)}k` : total}
        </span>

        {hovered && showBreakdown && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-48 p-2.5 rounded-lg bg-slate-950 border border-indigo-500/30 text-xs text-slate-200 shadow-2xl backdrop-blur-md animate-slide-in">
            <div className="flex justify-between items-center pb-1 mb-1.5 border-b border-slate-800">
              <span className="text-[10px] uppercase font-bold text-indigo-400">Context Window</span>
              <span className="font-mono text-[10px] text-slate-400">{percentage.toFixed(1)}%</span>
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Used:</span>
                <span className="text-slate-100">{total.toLocaleString()} tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Limit:</span>
                <span className="text-slate-400">{maxTokens.toLocaleString()} tokens</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Est. Cost:</span>
                <span className="text-emerald-400">${cost.toFixed(5)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative w-full rounded-lg bg-slate-900/60 border border-indigo-500/20 p-2.5 backdrop-blur-sm ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-medium text-slate-300">Context Budget</span>
        </div>
        <span className={`text-xs font-mono font-semibold ${textColor}`}>
          {total.toLocaleString()} / {maxTokens.toLocaleString()} ({percentage.toFixed(1)}%)
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
        <div
          className={`h-full bg-gradient-to-r ${barGradient} ${barGlow} transition-all duration-500 ease-out`}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>

      {/* Breakdown Details */}
      {showBreakdown && (
        <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex justify-between items-center text-[10px] font-mono text-slate-400">
          <span>Prompt: <strong className="text-slate-200">{promptTokens.toLocaleString()}</strong></span>
          <span>Completion: <strong className="text-slate-200">{completionTokens.toLocaleString()}</strong></span>
          <span>Est. Cost: <strong className="text-emerald-400">${cost.toFixed(5)}</strong></span>
        </div>
      )}
    </div>
  );
}
