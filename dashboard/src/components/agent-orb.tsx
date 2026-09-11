"use client";

import React, { useMemo } from "react";

interface AgentOrbProps {
  name: string;
  role?: string;
  active?: boolean;
  status?: "idle" | "running" | "completed" | "error";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

function getAgentColor(name: string): { hue: number; bg: string; border: string; text: string } {
  const hash = djb2Hash(name || "agent");
  const hue = hash % 360;
  return {
    hue,
    bg: `hsl(${hue}, 70%, 45%)`,
    border: `hsl(${hue}, 85%, 65%)`,
    text: `#ffffff`,
  };
}

function getInitials(roleOrName: string): string {
  if (!roleOrName) return "AG";
  const clean = roleOrName.replace(/[-_]/g, " ").trim();
  const words = clean.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

const sizeClasses = {
  xs: "w-5 h-5 text-[9px]",
  sm: "w-7 h-7 text-[11px]",
  md: "w-9 h-9 text-xs",
  lg: "w-12 h-12 text-sm",
  xl: "w-16 h-16 text-base",
};

export function AgentOrb({
  name,
  role,
  active = false,
  status = "idle",
  size = "md",
  className = "",
}: AgentOrbProps) {
  const color = useMemo(() => getAgentColor(name || role || "agent"), [name, role]);
  const initials = useMemo(() => getInitials(role || name || "AG"), [role, name]);
  const isRunning = active || status === "running";

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* Outer Pulse Ring when Active */}
      {isRunning && (
        <div
          className="absolute -inset-1 rounded-full ai-pulse opacity-75 pointer-events-none"
          style={{
            background: `radial-gradient(circle, hsl(${color.hue}, 85%, 60%, 0.3) 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Main Avatar Orb */}
      <div
        className={`relative flex items-center justify-center rounded-full font-semibold font-mono select-none transition-all duration-300 ${sizeClasses[size]}`}
        style={{
          background: `linear-gradient(135deg, hsl(${color.hue}, 75%, 55%) 0%, hsl(${(color.hue + 40) % 360}, 80%, 35%) 100%)`,
          border: `1.5px solid ${isRunning ? `hsl(${color.hue}, 95%, 70%)` : `hsl(${color.hue}, 40%, 40%, 0.5)`}`,
          boxShadow: isRunning
            ? `0 0 16px hsl(${color.hue}, 90%, 60%, 0.6), inset 0 1px 2px rgba(255,255,255,0.4)`
            : `0 2px 6px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.2)`,
          color: color.text,
        }}
        title={`${name}${role ? ` (${role})` : ""}`}
      >
        {initials}

        {/* Small Status Dot Indicator */}
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 ${
            isRunning
              ? "bg-cyan-400 animate-ping"
              : status === "completed"
              ? "bg-emerald-400"
              : status === "error"
              ? "bg-rose-500"
              : "bg-slate-400"
          }`}
        />
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 ${
            isRunning
              ? "bg-cyan-400 shadow-[0_0_6px_#22d3ee]"
              : status === "completed"
              ? "bg-emerald-400"
              : status === "error"
              ? "bg-rose-500"
              : "bg-slate-400"
          }`}
        />
      </div>
    </div>
  );
}
