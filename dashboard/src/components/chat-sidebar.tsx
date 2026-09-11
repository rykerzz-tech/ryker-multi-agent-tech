"use client";

import React, { useMemo } from "react";
import { MessageSquare, Activity, Search, Plus, Trash2, Sparkles, Download, ChevronRight, Cpu } from "lucide-react";
import { AgentOrb } from "@/components/agent-orb";
import { AgentStatusPanel } from "@/components/agent-status-panel";
import { ExecutionTimeline } from "@/components/execution-timeline";
import { InterventionPanel } from "@/components/intervention-panel";
import { InteractionMap } from "@/components/interaction-map";
import { MemoryViewer } from "@/components/memory-viewer";
import { LogsViewer } from "@/components/logs-viewer";
import { MetricsPanel } from "@/components/metrics-panel";
import type { InspectedItem, InteractionInspectData, LogInspectData } from "@/lib/types";

interface SessionInfo {
  sessionId: string;
  agentName: string;
  provider: string;
  model: string;
}

interface ChatSidebarProps {
  sidebarTab: "chat" | "monitor";
  setSidebarTab: (tab: "chat" | "monitor") => void;
  showSidebar: boolean;
  setShowSidebar: (v: boolean) => void;
  sessionSearch: string;
  setSessionSearch: (v: string) => void;
  filteredSessions: SessionInfo[];
  sessions: SessionInfo[];
  chatUserMsgs: { sessionId: string; input: string; timestamp: number; turnKey: string; turnId: string }[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  setInspectedItem: (item: InspectedItem | null) => void;
  connected: boolean;
  setShowNewChat: (v: boolean) => void;
  setClearAllConfirm: (v: boolean) => void;
  setDeleteConfirmId: (id: string | null) => void;
  handleEditSession: (sessionId: string) => void;
  handleExport: (sessionId: string) => void;
  handleInspectAgent: (name: string | null) => void;
  handleInspectActivity: (id: string | null) => void;
  handleInspectInteraction: (data: InteractionInspectData | null) => void;
  handleInspectLog: (data: LogInspectData | null) => void;
  inspectedItem: InspectedItem | null;
  collapsedSections: Set<string>;
  toggleSection: (id: string) => void;
}

export function ChatSidebar({
  sidebarTab,
  setSidebarTab,
  showSidebar,
  setShowSidebar,
  sessionSearch,
  setSessionSearch,
  filteredSessions,
  sessions,
  chatUserMsgs,
  activeSessionId,
  setActiveSessionId,
  setInspectedItem,
  connected,
  setShowNewChat,
  setClearAllConfirm,
  setDeleteConfirmId,
  handleEditSession,
  handleExport,
  handleInspectAgent,
  handleInspectActivity,
  handleInspectInteraction,
  handleInspectLog,
  inspectedItem,
  collapsedSections,
  toggleSection,
}: ChatSidebarProps) {
  const monitorSections = useMemo(
    () => [
      {
        id: "agents",
        label: "Agent Swarm",
        borderColor: "border-l-indigo-500",
        comp: (
          <AgentStatusPanel
            onAgentSelect={handleInspectAgent}
            activeAgent={inspectedItem?.type === "agent" ? inspectedItem.name : null}
          />
        ),
      },
      {
        id: "metrics",
        label: "Telemetry & Traces",
        borderColor: "border-l-cyan-500",
        comp: <MetricsPanel />,
      },
      {
        id: "memory",
        label: "Cognitive Memory",
        borderColor: "border-l-purple-500",
        comp: <MemoryViewer onInspectInteraction={handleInspectInteraction} />,
      },
      {
        id: "timeline",
        label: "Execution Timeline",
        borderColor: "border-l-emerald-500",
        comp: (
          <ExecutionTimeline
            onInspectActivity={handleInspectActivity}
            activeActivity={inspectedItem?.type === "activity" ? inspectedItem.id : null}
          />
        ),
      },
      {
        id: "intervene",
        label: "Human-In-The-Loop",
        borderColor: "border-l-rose-500",
        comp: <InterventionPanel />,
      },
      {
        id: "interact",
        label: "Topology Map",
        borderColor: "border-l-blue-500",
        comp: (
          <InteractionMap
            onAgentSelect={handleInspectAgent}
            activeAgent={inspectedItem?.type === "agent" ? inspectedItem.name : null}
          />
        ),
      },
      {
        id: "logs",
        label: "Engine Logs",
        borderColor: "border-l-amber-500",
        comp: <LogsViewer onInspectLog={handleInspectLog} />,
      },
    ],
    [handleInspectAgent, handleInspectActivity, handleInspectInteraction, handleInspectLog, inspectedItem]
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {showSidebar && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[998]"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main Sidebar Shell (Desktop & Mobile Slide-up/Drawer) */}
      <aside
        className={`w-[280px] shrink-0 border-r border-indigo-500/20 flex flex-col overflow-hidden transition-all duration-300 ${
          showSidebar ? "translate-y-0 bottom-0 max-h-[85vh] rounded-t-2xl lg:max-h-none lg:rounded-none" : "translate-y-full lg:translate-y-0"
        } fixed lg:relative inset-x-0 bottom-0 lg:inset-y-0 left-0 z-[999] bg-slate-950/95 backdrop-blur-xl lg:z-auto`}
        aria-label="Mission Control Panel"
      >
        {/* Glowing Switch Tabs (SESSIONS | MONITOR) */}
        <div className="p-3 pb-2">
          <div className="flex rounded-lg p-1 bg-slate-900/80 border border-indigo-500/20 shadow-inner">
            <button
              onClick={() => setSidebarTab("chat")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                sidebarTab === "chat"
                  ? "bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)] scale-[1.02]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>SESSIONS</span>
            </button>
            <button
              onClick={() => setSidebarTab("monitor")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                sidebarTab === "monitor"
                  ? "bg-cyan-600 text-white shadow-[0_0_12px_rgba(34,211,238,0.5)] scale-[1.02]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>MONITOR</span>
            </button>
          </div>
        </div>

        {sidebarTab === "chat" ? (
          <>
            {/* Search & Actions Bar */}
            <div className="px-3 py-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  placeholder="Search sessions..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/60 rounded-lg border border-indigo-500/20 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30 text-slate-100 placeholder:text-slate-500 transition-all font-mono"
                />
              </div>
              <button
                onClick={() => setShowNewChat(true)}
                disabled={!connected}
                className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title="Initialize New Multi-Agent Session"
                aria-label="New Session"
              >
                <Plus className="h-4 w-4" />
              </button>
              {sessions.length > 0 && (
                <button
                  onClick={() => setClearAllConfirm(true)}
                  className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all"
                  title="Purge all session traces"
                  aria-label="Clear All Sessions"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
              {filteredSessions.map((s) => {
                const userMsgs = chatUserMsgs.filter((m) => m.sessionId === s.sessionId);
                const lastMsg = userMsgs[userMsgs.length - 1];
                const isActive = s.sessionId === activeSessionId;

                return (
                  <div
                    key={s.sessionId}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setActiveSessionId(s.sessionId);
                        setInspectedItem(null);
                        setShowSidebar(false);
                      }
                    }}
                    className={`group relative flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition-all duration-200 border ${
                      isActive
                        ? "bg-indigo-950/50 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                        : "bg-slate-900/30 border-slate-800/60 hover:bg-slate-900/80 hover:border-indigo-500/30"
                    }`}
                    onClick={() => {
                      setActiveSessionId(s.sessionId);
                      setInspectedItem(null);
                      setShowSidebar(false);
                    }}
                  >
                    {/* Agent Avatar Orb */}
                    <AgentOrb name={s.agentName} size="sm" active={isActive} className="mt-0.5" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-semibold truncate ${isActive ? "text-cyan-300" : "text-slate-200"}`}>
                          {s.agentName}
                        </span>
                        <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-400 shrink-0">
                          {s.provider}
                        </span>
                      </div>

                      {/* Last Message Preview */}
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 font-sans">
                        {lastMsg ? lastMsg.input : "New conversation initialized"}
                      </p>

                      {/* Micro telemetry footer */}
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mt-1.5">
                        <span>{userMsgs.length} turns</span>
                        <span className="truncate max-w-[90px]">{s.model}</span>
                      </div>
                    </div>

                    {/* Hover Actions */}
                    <div className="hidden group-hover:flex items-center gap-0.5 absolute top-1.5 right-1.5 bg-slate-900/90 rounded-md p-0.5 border border-slate-800 shadow-md">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSession(s.sessionId);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-indigo-500/20"
                        title="Session Details"
                      >
                        <Sparkles className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport(s.sessionId);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/20"
                        title="Export Session JSON"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(s.sessionId);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20"
                        title="Delete Session"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Animated Empty State SVG */}
              {sessions.length === 0 && (
                <div className="px-4 py-8 text-center flex flex-col items-center">
                  <div className="w-20 h-20 mb-3 relative flex items-center justify-center">
                    <svg className="w-full h-full text-indigo-500/40" viewBox="0 0 100 100" fill="none">
                      <line x1="20" y1="30" x2="50" y2="20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                      <line x1="50" y1="20" x2="80" y2="35" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                      <line x1="20" y1="30" x2="35" y2="70" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                      <line x1="50" y1="20" x2="65" y2="75" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                      <line x1="80" y1="35" x2="65" y2="75" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                      <line x1="35" y1="70" x2="65" y2="75" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />

                      <circle cx="20" cy="30" r="5" fill="#6366f1" className="animate-pulse" />
                      <circle cx="50" cy="20" r="6" fill="#22d3ee" className="animate-pulse" />
                      <circle cx="80" cy="35" r="5" fill="#a855f7" className="animate-pulse" />
                      <circle cx="35" cy="70" r="5" fill="#10b981" className="animate-pulse" />
                      <circle cx="65" cy="75" r="6" fill="#6366f1" className="animate-pulse" />
                    </svg>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200">No Active Sessions</h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[180px]">
                    Initialize a multi-agent workflow to observe autonomous execution.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Monitor Tab Content with Color-Coded Panel Sections */
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
            {monitorSections.map((sec) => {
              const isCollapsed = collapsedSections.has(sec.id);
              return (
                <div
                  key={sec.id}
                  className={`rounded-xl border border-indigo-500/20 bg-slate-900/40 overflow-hidden ${sec.borderColor} border-l-4 transition-all duration-200`}
                >
                  <button
                    onClick={() => toggleSection(sec.id)}
                    className="w-full flex items-center justify-between p-2.5 text-left hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                      {sec.label}
                    </span>
                    <ChevronRight
                      className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                        isCollapsed ? "" : "rotate-90 text-cyan-400"
                      }`}
                    />
                  </button>

                  {!isCollapsed && (
                    <div className="p-2 pt-0 border-t border-slate-800/60 animate-slide-in">
                      {sec.comp}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </>
  );
}
