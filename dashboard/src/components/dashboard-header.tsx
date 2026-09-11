"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useWs } from "@/lib/ws-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { NeuralActivityCanvas } from "@/components/neural-activity-canvas";
import { TokenMeter } from "@/components/token-meter";
import { formatUptime } from "@/lib/utils";
import { Download, RotateCcw, Activity, Shield, Cpu, ChevronDown, Radio } from "lucide-react";

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-slate-400 text-[11px] shrink-0">{label}</span>
      <span className="text-slate-100 font-mono text-[11px] text-right truncate">{value}</span>
    </div>
  );
}

interface ConnDisplayValues {
  version: string;
  nodeVersion: string;
  uptimeMs: number;
  llmProviders: [string, string][];
  heap: string | null;
  cpuRam: string | null;
}

interface DashboardHeaderProps {
  version: string;
  onReset: () => void;
  showToast: (msg: string) => void;
  connInfo: Record<string, unknown> | null;
  onConnInfoRequest?: () => void;
}

export function DashboardHeader({
  version,
  onReset,
  showToast,
  connInfo,
  onConnInfoRequest,
}: DashboardHeaderProps) {
  const connected = useWs((s) => s.connected);
  const errors = useWs((s) => s.errors);
  const agentStatuses = useWs((s) => s.agentStatuses);
  const activities = useWs((s) => s.activities);
  const handoffs = useWs((s) => s.handoffs);
  const delegates = useWs((s) => s.delegates);
  const streamingSessionId = useWs((s) => s.streamingSessionId);

  const safeActivities = useMemo(() => activities ?? {}, [activities]);

  // Total tokens used across sessions
  const totalTokens = useMemo(() => {
    let sum = 0;
    for (const a of Object.values(safeActivities)) {
      for (const c of a.completions || []) {
        if (c.usage?.totalTokens) sum += c.usage.totalTokens;
      }
    }
    return sum;
  }, [safeActivities]);

  // Active agents count
  const activeAgentCount = useMemo(() => {
    const list = Object.values(agentStatuses ?? {});
    return list.filter((s) => (s as { status?: string }).status === "running").length;
  }, [agentStatuses]);

  const [showAppInfo, setShowAppInfo] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showConnInfo, setShowConnInfo] = useState(false);
  const appRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const connRef = useRef<HTMLDivElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (appRef.current && !appRef.current.contains(e.target as Node)) setShowAppInfo(false);
      if (connRef.current && !connRef.current.contains(e.target as Node)) setShowConnInfo(false);
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false);
    };
    if (showConnInfo || showAppInfo || showExportMenu) {
      if (onConnInfoRequest && showConnInfo) onConnInfoRequest();
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showConnInfo, showAppInfo, showExportMenu, onConnInfoRequest]);

  const connDisplayValues: ConnDisplayValues | null = useMemo(() => {
    if (!connInfo) return null;
    const c = connInfo as Record<string, unknown>;
    const checks = c.checks as Record<string, unknown> | undefined;
    const llm = checks?.llmProviders as Record<string, string> | undefined;
    const mem = checks?.memory as Record<string, number> | undefined;
    const sys = c.system as Record<string, number> | undefined;
    return {
      version: (c.version as string) || version || "2.0.0",
      nodeVersion: (c.nodeVersion as string) || "—",
      uptimeMs: (c.uptimeMs as number) || 0,
      llmProviders: llm ? Object.entries(llm).filter(([k]) => k !== "status") : [],
      heap: mem ? `${mem.heapUsedMB}/${mem.heapTotalMB} MB` : null,
      cpuRam: sys
        ? `${sys.cpuCount} cores / ${Math.round(sys.freeMemoryMB / 102.4) / 10}/${Math.round(sys.totalMemoryMB / 102.4) / 10} GB`
        : null,
    };
  }, [connInfo, version]);

  const safeReplacer = (_key: string, value: unknown) =>
    typeof value === "bigint" ? String(value) : value;

  const doExport = useCallback(
    (format: string) => {
      try {
        const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
        let blob: Blob;
        let filename: string;

        if (format === "json") {
          const data = {
            timestamp: new Date().toISOString(),
            version: "2.0.0",
            activities: safeActivities,
            agentStatuses,
            handoffs,
            delegates,
            errors,
          };
          blob = new Blob([JSON.stringify(data, safeReplacer, 2)], { type: "application/json" });
          filename = `ryker-nexus-export-${ts}.json`;
        } else if (format === "md") {
          const lines: string[] = [
            `# RYKER MULTI-AGENT TECH — SYSTEM REPORT`,
            ``,
            `**Generated:** ${new Date().toISOString()}`,
            `**Version:** 2.0.0 ELITE-NEXUS`,
            ``,
            `## Agent Statuses`,
            ``,
          ];
          Object.entries(agentStatuses ?? {}).forEach(([name, s]) => {
            const st = s as Record<string, unknown>;
            lines.push(`- **${name}** — \`${String(st.status ?? "idle")}\` (since ${String(st.since ?? "—")})`);
          });
          lines.push(``, `## Recent Activities`, ``);
          Object.entries(safeActivities).forEach(([id, a]) => {
            lines.push(`### Session: ${id} (${a.agentName || "Generalist"})`);
            lines.push(`- Status: \`${a.status}\``);
            lines.push(`- Steps executed: ${a.steps?.length || 0}`);
            if (a.completions?.length) {
              const last = a.completions[a.completions.length - 1];
              lines.push(`- Completion: ${last.content?.slice(0, 200)}...`);
            }
            lines.push(``);
          });
          blob = new Blob([lines.join("\n")], { type: "text/markdown" });
          filename = `ryker-report-${ts}.md`;
        } else {
          return;
        }

        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        showToast(`Exported ${filename}`);
        setShowExportMenu(false);
      } catch {
        showToast("Export failed");
      }
    },
    [safeActivities, agentStatuses, handoffs, delegates, errors, showToast]
  );

  return (
    <header className="sticky top-0 z-50 border-b border-indigo-500/20 bg-slate-950/80 backdrop-blur-2xl transition-all duration-300">
      <div className="max-w-[1680px] mx-auto px-3 sm:px-5 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        {/* Left: RYKER Hex Brand Mark */}
        <div ref={appRef} className="flex items-center gap-3 relative shrink-0">
          <button
            type="button"
            onClick={() => setShowAppInfo(!showAppInfo)}
            className="flex items-center gap-2.5 group cursor-pointer text-left focus:outline-none"
            aria-label="Ryker Mission Control Info"
          >
            {/* Hexagonal Neural Icon SVG */}
            <div className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600/30 to-cyan-500/20 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)] group-hover:scale-105 transition-transform duration-200">
              <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 2 8.5 2 15.5 12 22 22 15.5 22 8.5 12 2" stroke="url(#ryker-hex-grad)" />
                <circle cx="12" cy="12" r="3" fill="#6366f1" />
                <path d="M12 9V3M12 15v6M9 10.5L3.5 7M15 13.5l5.5 3.5M9 13.5L3.5 17M15 10.5l5.5-3.5" stroke="#22d3ee" strokeWidth="1.2" />
                <defs>
                  <linearGradient id="ryker-hex-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366f1" />
                    <stop offset="0.5" stopColor="#22d3ee" />
                    <stop offset="1" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wider font-mono text-base bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-300 to-indigo-300">
                  RYKER
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wide bg-indigo-500/15 border border-indigo-500/30 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                  NEXUS v2
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:block tracking-tight font-medium">
                Autonomous Multi-Agent OS
              </span>
            </div>
          </button>

          {/* App Info Popover */}
          {showAppInfo && (
            <div className="absolute top-full left-0 mt-2 z-50 w-72 rounded-xl bg-slate-950/95 border border-indigo-500/30 p-3.5 shadow-2xl backdrop-blur-xl animate-slide-in">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200">Ryker Architecture</span>
                <span className="text-[10px] font-mono text-cyan-400">v{version || "2.0.0"}</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cognitive Pipeline:</span>
                  <span className="text-indigo-300">ELITE-NEXUS DAG</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Memory Engine:</span>
                  <span className="text-purple-300">4-Tier Persistent</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Streaming:</span>
                  <span className="text-emerald-300">Real-time WebSocket</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Failover Guard:</span>
                  <span className="text-amber-300">Active Circuit Breaker</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center: Live Telemetry & Mission Control Waveform */}
        <div className="hidden md:flex items-center gap-4 bg-slate-900/60 border border-indigo-500/20 px-3 py-1.5 rounded-full backdrop-blur-md">
          {/* Active Agents Badge */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                activeAgentCount > 0
                  ? "bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse"
                  : "bg-slate-500"
              }`}
            />
            <span className="text-xs font-mono text-slate-300">
              <strong className="text-cyan-300">{activeAgentCount}</strong> {activeAgentCount === 1 ? "Agent" : "Agents"} Active
            </span>
          </div>

          <div className="h-4 w-px bg-indigo-500/20" />

          {/* Neural Activity Waveform */}
          <div className="flex items-center gap-1.5" title="Live Neural Waveform (Inference, Tools, Memory)">
            <NeuralActivityCanvas
              width={70}
              height={20}
              inferActive={Boolean(streamingSessionId)}
              toolActive={activeAgentCount > 0}
              memoryActive={true}
            />
          </div>

          <div className="h-4 w-px bg-indigo-500/20" />

          {/* Token Meter Pill */}
          <TokenMeter compact usedTokens={totalTokens} maxTokens={200000} />
        </div>

        {/* Right: Controls & Connection Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Connection Status with Animated Radar Sweep */}
          <div ref={connRef} className="relative">
            <button
              type="button"
              onClick={() => setShowConnInfo(!showConnInfo)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-indigo-500/20 bg-slate-900/60 hover:bg-slate-800/80 hover:border-indigo-500/40 transition-all text-xs focus:outline-none"
              title="System Connectivity & Engine Metrics"
            >
              <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                {connected ? (
                  <>
                    <div className="absolute inset-0 rounded-full border border-emerald-500/40 animate-ping opacity-60" />
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  </>
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_#ef4444]" />
                )}
              </div>
              <span className="hidden sm:inline font-mono text-[11px] text-slate-300">
                {connected ? "LIVE" : "DISCONNECTED"}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Connection Diagnostics Modal */}
            {showConnInfo && (
              <div className="absolute top-full right-0 mt-2 z-50 w-80 rounded-xl bg-slate-950 border border-indigo-500/30 p-3.5 shadow-2xl backdrop-blur-xl animate-slide-in">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Engine Diagnostics</span>
                  </div>
                  <span className={`text-[10px] font-mono font-semibold ${connected ? "text-emerald-400" : "text-rose-400"}`}>
                    {connected ? "CONNECTED" : "OFFLINE"}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  {connDisplayValues ? (
                    <>
                      <InfoRow label="Node Runtime" value={connDisplayValues.nodeVersion} />
                      <InfoRow label="Uptime" value={formatUptime(connDisplayValues.uptimeMs)} />
                      <InfoRow label="Heap Memory" value={connDisplayValues.heap || "—"} />
                      <InfoRow label="System CPU/RAM" value={connDisplayValues.cpuRam || "—"} />
                    </>
                  ) : (
                    <div className="text-slate-400 text-center py-2">Fetching engine stats...</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Export Menu */}
          <div ref={exportRef} className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-indigo-500/20 bg-slate-900/60 hover:bg-slate-800/80 hover:border-indigo-500/40 text-slate-300 transition-all flex items-center gap-1.5 text-xs"
              title="Export Reports & JSON Traces"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline font-medium">Export</span>
            </button>

            {showExportMenu && (
              <div className="absolute top-full right-0 mt-2 z-50 w-44 rounded-xl bg-slate-950 border border-indigo-500/30 p-1.5 shadow-2xl backdrop-blur-xl animate-slide-in">
                <button
                  onClick={() => doExport("json")}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-indigo-500/20 text-xs text-slate-200 flex items-center justify-between"
                >
                  <span>JSON Traces</span>
                  <span className="text-[10px] font-mono text-cyan-400">.json</span>
                </button>
                <button
                  onClick={() => doExport("md")}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-indigo-500/20 text-xs text-slate-200 flex items-center justify-between"
                >
                  <span>Markdown Summary</span>
                  <span className="text-[10px] font-mono text-cyan-400">.md</span>
                </button>
              </div>
            )}
          </div>

          {/* Reset Engine Button */}
          <button
            type="button"
            onClick={onReset}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500/40 text-rose-300 transition-all flex items-center gap-1.5 text-xs"
            title="Reset Workspace & State"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline font-medium">Reset</span>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
