"use client";

import { useWs } from "@/lib/ws-context";
import { fetchAgentsList } from "@/lib/agents-cache";
import { useState, useRef, useEffect, useMemo, useCallback, Fragment } from "react";
import type { ChatMessage, InspectedItem, InteractionInspectData, LogInspectData, AgentStatus } from "@/lib/types";
import { useChatMessages } from "@/lib/use-chat-messages";
import { AgentSelect } from "@/components/agent-select";
import { ProviderSelect } from "@/components/provider-select";
import { ChatMessageBubble } from "@/components/chat-message-bubble";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatInputArea } from "@/components/chat-input-area";
import { SessionHeader } from "@/components/session-header";
import { ChatHistoryPanel } from "@/components/chat-history-panel";
import {
  Bot, MessageSquare,
  AlertTriangle, X, ArrowDown,
} from "lucide-react";
import { InteractionInspector } from "@/components/inspector/interaction-inspector";
import { LogInspector } from "@/components/inspector/log-inspector";
import { ActivityInspector } from "@/components/inspector/activity-inspector";
import { AgentInspector } from "@/components/inspector/agent-inspector";
import { ChatDialogs } from "@/components/chat-dialogs";

export function ChatPanel() {
  const connected = useWs(s => s.connected);
  const activities = useWs(s => s.activities);
  const streamingMap = useWs(s => s.streamingMap);
  const agentStatuses = useWs(s => s.agentStatuses);
  const mergedAgentStatuses = useMemo(() => {
    const map: Record<string, AgentStatus> = { ...agentStatuses };
    for (const [id, activity] of Object.entries(activities ?? {})) {
      const name = activity.agentName;
      if (!name) continue;
      if (!map[name] || (activity.completedAt ?? activity.createdAt) > (map[name].since ?? 0)) {
        map[name] = {
          status: activity.status === "idle" ? "idle" : activity.status === "running" ? "running" : activity.status === "error" || activity.status === "max_steps" ? "error" : "completed",
          runId: id,
          since: activity.completedAt ?? activity.createdAt,
        };
      }
    }
    return map;
  }, [agentStatuses, activities]);
  const sendChatCreate = useWs(s => s.sendChatCreate);
  const sendChatSend = useWs(s => s.sendChatSend);
  const sendIntervene = useWs(s => s.sendIntervene);
  const handoffs = useWs(s => s.handoffs);
  const addChatUserMsg = useWs(s => s.addChatUserMsg);
  const clearChatHistory = useWs(s => s.clearChatHistory);
  const deleteChatSession = useWs(s => s.deleteChatSession);

  // Derive chat-specific data from unified activities (single pass)
  const safeActivities = useMemo(() => activities ?? {}, [activities]);
  const { chatSessions, chatSteps, chatCompletions, chatUserMsgs } = useMemo(() => {
    const sessions: Record<string, { sessionId: string; agentName: string; provider: string; model: string }> = {};
    const steps: { sessionId: string; turnId?: string; step: number; thought: string | null; toolCalls: { tool: string; error?: string | null }[] | null; duration_ms: number | null; error: string | null; timestamp: number }[] = [];
    const completions: Record<string, { sessionId: string; turnId?: string; content: string | null; usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null; completedAt: number }[]> = {};
    const userMsgs: { sessionId: string; input: string; timestamp: number; turnKey: string; turnId: string }[] = [];
    for (const [id, activity] of Object.entries(safeActivities)) {
      if (activity.mode !== "chat") continue;
      sessions[id] = { sessionId: id, agentName: activity.agentName, provider: activity.provider, model: activity.model };
      for (const step of activity.steps) {
        steps.push({ sessionId: id, turnId: step.turnId, step: step.step, thought: step.thought, toolCalls: step.toolCalls, duration_ms: step.duration_ms, error: step.error, timestamp: step.timestamp });
      }
      if (activity.completions.length > 0) {
        completions[id] = activity.completions.map(c => ({ sessionId: id, turnId: c.turnId, content: c.content, usage: c.usage, completedAt: c.completedAt }));
      }
      for (const msg of activity.userMessages) {
        userMsgs.push({ sessionId: id, input: msg.input, timestamp: msg.timestamp, turnKey: msg.turnKey, turnId: msg.turnId });
      }
    }
    return { chatSessions: sessions, chatSteps: steps, chatCompletions: completions, chatUserMsgs: userMsgs };
  }, [safeActivities]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("mock");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [interventionText, setInterventionText] = useState("");
  const [showIntervention, setShowIntervention] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [showNewChat, setShowNewChat] = useState(false);
  const [inspectedItem, setInspectedItem] = useState<InspectedItem>(null);
  const handleInspectAgent = useCallback((name: string | null) => {
    setInspectedItem(name ? { type: "agent", name } : null);
  }, []);
  const handleInspectActivity = useCallback((id: string | null) => {
    setInspectedItem(id ? { type: "activity", id } : null);
  }, []);
  const handleInspectInteraction = useCallback((data: InteractionInspectData | null) => {
    setInspectedItem(data ? { type: "interaction", data } : null);
  }, []);
  const handleInspectLog = useCallback((data: LogInspectData | null) => {
    setInspectedItem(data ? { type: "log", data } : null);
  }, []);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [agentInfoData, setAgentInfoData] = useState<{ name: string; description: string; provider: string; model: string } | null>(null);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarPopupRole, setAvatarPopupRole] = useState<"user" | "assistant" | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"chat" | "monitor">("chat");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const toggleSection = useCallback((id: string) => {
    setCollapsedSections(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  function formatAgentSince(since: number): string {
    const diff = Math.max(0, Date.now() - since);
    if (diff < 1000) return `${diff}ms`;
    if (diff < 60000) return `${(diff / 1000).toFixed(1)}s`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`;
    return `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
  }
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const turnCounterRef = useRef(0);
  const pendingMsgRef = useRef<string | null>(null);
  const pendingCreateRef = useRef(false);

  // Fetch available providers from health endpoint
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          const data = await res.json();
          const llm = data?.checks?.llmProviders;
          if (llm && typeof llm === "object") {
            const enabled = Object.entries(llm as Record<string, string>)
              .filter(([, v]) => v === "enabled" || v === "available" || v === "configured" || v === "ok")
              .map(([k]) => k);
            setAvailableProviders(enabled.length > 0 ? enabled : ["mock"]);
          }
        }
      } catch { /* ignore */ }
    };
    fetchProviders();
    const interval = setInterval(fetchProviders, 30000);
    return () => clearInterval(interval);
  }, []);

  const sessions = useMemo(() => Object.values(chatSessions).sort((a, b) => a.sessionId.localeCompare(b.sessionId)), [chatSessions]);

  useEffect(() => {
    if (sessions.length > 0) {
      const latestId = sessions[sessions.length - 1].sessionId;
      if (!activeSessionId || !chatSessions[activeSessionId]) setActiveSessionId(latestId);
    }
  }, [sessions, activeSessionId, chatSessions]);

  // Auto-send pending message when session becomes active after creation
  useEffect(() => {
    if (pendingCreateRef.current) {
      const sessions = Object.values(chatSessions);
      const latest = sessions[sessions.length - 1];
      if (latest && latest.sessionId !== activeSessionId) {
        pendingCreateRef.current = false;
        setActiveSessionId(latest.sessionId);
      }
    }
    if (activeSessionId && pendingMsgRef.current) {
      const msg = pendingMsgRef.current;
      pendingMsgRef.current = null;
      const now = Date.now();
      const turnKey = `${activeSessionId}-turn-${++turnCounterRef.current}-${now}`;
      const turnId = `${activeSessionId}:turn:${turnCounterRef.current}`;
      addChatUserMsg(activeSessionId, { input: msg, timestamp: now, turnKey, turnId });
      sendChatSend(activeSessionId, msg, { turnId });
    }
  }, [activeSessionId, chatSessions, sendChatSend, addChatUserMsg]);

  const activeSession = activeSessionId ? chatSessions[activeSessionId] : null;

  const sessionHandoffs = useMemo(() => {
    if (!activeSession) return [];
    return handoffs.filter(h => h.fromAgent === activeSession.agentName || h.toAgent === activeSession.agentName);
  }, [handoffs, activeSession]);

  const messages = useChatMessages(activeSessionId, chatSteps, chatCompletions, chatUserMsgs, sessionHandoffs);

  // Overlay streaming content from streamingMap onto the last assistant message
  const displayMessages = useMemo(() => {
    const streamingContent = activeSessionId ? streamingMap[activeSessionId] : undefined;
    if (!streamingContent || messages.length === 0) return messages;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant" || !last.isStreaming) return messages;
    return messages.map((m, i) => i === messages.length - 1 ? { ...m, content: streamingContent } : m);
  }, [messages, activeSessionId, streamingMap]);

  const handleCreateSession = useCallback(() => {
    if (!connected) return;
    sendChatCreate({ agentName: selectedAgent || undefined, provider: selectedProvider });
  }, [connected, selectedAgent, selectedProvider, sendChatCreate]);

  const handleSend = useCallback(() => {
    if (!chatInput.trim() || !connected) return;
    if (!activeSessionId) {
      sendChatCreate({ agentName: selectedAgent || undefined, provider: selectedProvider });
      // Queue the message to be sent once session is created
      pendingCreateRef.current = true;
      pendingMsgRef.current = chatInput.trim();
      setChatInput("");
      if (inputRef.current) { inputRef.current.style.height = "auto"; }
      return;
    }
    const now = Date.now();
    const turnKey = `${activeSessionId}-turn-${++turnCounterRef.current}-${now}`;
    const turnId = `${activeSessionId}:turn:${turnCounterRef.current}`;
    addChatUserMsg(activeSessionId!, { input: chatInput.trim(), timestamp: now, turnKey, turnId });
    sendChatSend(activeSessionId, chatInput.trim(), { turnId });
    setChatInput("");
    if (inputRef.current) { inputRef.current.style.height = "auto"; }
  }, [chatInput, activeSessionId, connected, sendChatSend, sendChatCreate, selectedAgent, selectedProvider, addChatUserMsg]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const handleIntervene = useCallback(() => {
    if (!activeSessionId || !interventionText.trim()) return;
    sendIntervene(activeSessionId, interventionText.trim());
    setInterventionText("");
    setShowIntervention(false);
  }, [activeSessionId, interventionText, sendIntervene]);

  const prevMsgCountRef = useRef(0);
  const prevSessionRef = useRef<string | null>(null);

  // Only auto-scroll when NEW messages arrive (not when switching sessions)
  useEffect(() => {
    const sessionChanged = activeSessionId !== prevSessionRef.current;
    prevSessionRef.current = activeSessionId;
    if (sessionChanged) {
      // Session changed — scroll to bottom once after render
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "instant" }));
      prevMsgCountRef.current = displayMessages.length;
      return;
    }
    if (displayMessages.length > prevMsgCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMsgCountRef.current = displayMessages.length;
  }, [displayMessages, activeSessionId]);

  // Detect scroll position for scroll-to-bottom button
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distFromBottom > 120);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [activeSessionId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Session token usage
  const sessionTokenUsage = useMemo(() => {
    if (!activeSessionId) return { total: 0, turns: 0 };
    const completions = chatCompletions[activeSessionId];
    if (!completions || completions.length === 0) return { total: 0, turns: 0 };
    return { total: completions.reduce((sum, c) => sum + (c.usage?.totalTokens ?? 0), 0), turns: completions.length };
  }, [activeSessionId, chatCompletions]);

  // Filtered sessions for sidebar/history search (shared filter logic)
  const filterSessions = useCallback((search: string) => {
    if (!search) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(s => s.agentName.toLowerCase().includes(q) || s.provider.toLowerCase().includes(q) || s.sessionId.toLowerCase().includes(q));
  }, [sessions]);
  const filteredSessions = useMemo(() => filterSessions(sessionSearch), [filterSessions, sessionSearch]);
  const historyFilteredSessions = useMemo(() => filterSessions(historySearch), [filterSessions, historySearch]);

  // Group history sessions by date
  const historyGroups = useMemo(() => {
    const groups: { label: string; sessions: typeof historyFilteredSessions }[] = [];
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    for (const s of historyFilteredSessions) {
      const msgs = chatUserMsgs.filter(m => m.sessionId === s.sessionId);
      const ts = msgs.length > 0 ? msgs[msgs.length - 1].timestamp : Date.now();
      const d = new Date(ts).toDateString();
      const label = d === today ? "Today" : d === yesterday ? "Yesterday" : new Date(ts).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
      let g = groups.find(g => g.label === label);
      if (!g) { g = { label, sessions: [] }; groups.push(g); }
      g.sessions.push(s);
    }
    return groups;
  }, [historyFilteredSessions, chatUserMsgs]);

  // Close any open modal on Escape
  useEffect(() => {
    const anyModalOpen = avatarDialogOpen || editDialogOpen || !!deleteConfirmId || showNewChat || clearAllConfirm;
    if (!anyModalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deleteConfirmId) setDeleteConfirmId(null);
        else if (clearAllConfirm) setClearAllConfirm(false);
        else if (editDialogOpen) setEditDialogOpen(false);
        else if (showNewChat) setShowNewChat(false);
        else if (avatarDialogOpen) setAvatarDialogOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [avatarDialogOpen, editDialogOpen, deleteConfirmId, showNewChat, clearAllConfirm]);

  // Clear expanded steps when switching sessions
  useEffect(() => {
    setExpandedSteps(new Set());
  }, [activeSessionId]);

  const handleAvatarClick = useCallback(async (msg: ChatMessage) => {
    setAvatarPopupRole(msg.role);
    setAvatarDialogOpen(true);
    if (msg.role === "assistant" && activeSession?.agentName) {
      try {
        const list = await fetchAgentsList();
        const found = Array.isArray(list) ? list.find((a: { name: string }) => a.name === activeSession.agentName) : null;
        setAgentInfoData(found || { name: activeSession.agentName, description: "No description available", provider: activeSession.provider || "inherit", model: activeSession.model || "inherit" });
      } catch { /* ignore */ }
    } else {
      setAgentInfoData(null);
    }
  }, [activeSession]);

  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); });
  }, []);

  const handleExport = useCallback((sessionId: string) => {
    const session = chatSessions[sessionId];
    if (!session) return;
    const msgs = chatUserMsgs.filter(m => m.sessionId === sessionId);
    const exportData = { session, messages: msgs, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `chat-${sessionId.slice(0, 8)}.json`; a.click(); URL.revokeObjectURL(url);
  }, [chatSessions, chatUserMsgs]);

  const handleEditSession = useCallback((sessionId: string) => {
    const s = chatSessions[sessionId];
    if (!s) return;
    setEditingSessionId(sessionId);
    setEditDialogOpen(true);
  }, [chatSessions]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    if (activeSessionId === sessionId) setActiveSessionId(null);
    deleteChatSession(sessionId);
  }, [activeSessionId, deleteChatSession]);

  const toggleSteps = useCallback((msgId: string) => {
    setExpandedSteps(prev => { const next = new Set(prev); if (next.has(msgId)) next.delete(msgId); else next.add(msgId); return next; });
  }, []);

  const isStreaming = activeSessionId ? activeSessionId in streamingMap : false;

  return (
    <div className="glass-card flex h-full relative">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="lg:hidden fixed top-20 left-3 z-[9999] h-9 w-9 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-md flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all"
        aria-label="Toggle sidebar"
      >
        {showSidebar ? <X className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
      </button>

      <ChatSidebar
        sidebarTab={sidebarTab}
        setSidebarTab={setSidebarTab}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        sessionSearch={sessionSearch}
        setSessionSearch={setSessionSearch}
        filteredSessions={filteredSessions}
        sessions={sessions}
        chatUserMsgs={chatUserMsgs}
        activeSessionId={activeSessionId}
        setActiveSessionId={setActiveSessionId}
        setInspectedItem={setInspectedItem}
        connected={connected}
        setShowNewChat={setShowNewChat}
        setClearAllConfirm={setClearAllConfirm}
        setDeleteConfirmId={setDeleteConfirmId}
        handleEditSession={handleEditSession}
        handleExport={handleExport}
        handleInspectAgent={handleInspectAgent}
        handleInspectActivity={handleInspectActivity}
        handleInspectInteraction={handleInspectInteraction}
        handleInspectLog={handleInspectLog}
        inspectedItem={inspectedItem}
        collapsedSections={collapsedSections}
        toggleSection={toggleSection}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {inspectedItem?.type === "interaction" && (
          <InteractionInspector data={inspectedItem.data} onClose={() => setInspectedItem(null)} />
        )}
        {inspectedItem?.type === "log" && (
          <LogInspector data={inspectedItem.data} onClose={() => setInspectedItem(null)} />
        )}
        {inspectedItem?.type === "activity" && (() => {
          const activity = activities[inspectedItem.id];
          if (!activity) { setInspectedItem(null); return null; }
          return <ActivityInspector activityId={inspectedItem.id} activity={activity} onClose={() => setInspectedItem(null)} formatAgentSince={formatAgentSince} />;
        })()}
        {inspectedItem?.type === "agent" && (() => {
          const agentName = inspectedItem.name;
          const status = mergedAgentStatuses?.[agentName];
          if (!status) { setInspectedItem(null); return null; }
          return <AgentInspector agentName={agentName} status={status} activities={activities} onClose={() => setInspectedItem(null)} formatAgentSince={formatAgentSince} />;
        })()}
        {inspectedItem ? null : !activeSessionId ? (
          /* New Session Setup with Neural Network Hero */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 overflow-y-auto">
            {/* Animated Neural Network SVG */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full text-indigo-500/50" viewBox="0 0 120 120" fill="none">
                <style>{`
                  @keyframes dashFlow {
                    to { stroke-dashoffset: -40; }
                  }
                  .flow-path {
                    stroke-dasharray: 6 4;
                    animation: dashFlow 2s linear infinite;
                  }
                `}</style>
                <path d="M60 20 L25 50" stroke="rgba(99,102,241,0.5)" strokeWidth="1.5" className="flow-path" />
                <path d="M60 20 L95 50" stroke="rgba(34,211,238,0.5)" strokeWidth="1.5" className="flow-path" />
                <path d="M25 50 L35 95" stroke="rgba(168,85,247,0.5)" strokeWidth="1.5" className="flow-path" />
                <path d="M95 50 L85 95" stroke="rgba(16,185,129,0.5)" strokeWidth="1.5" className="flow-path" />
                <path d="M35 95 L85 95" stroke="rgba(99,102,241,0.4)" strokeWidth="1.5" className="flow-path" />
                <path d="M60 20 L60 65" stroke="rgba(34,211,238,0.6)" strokeWidth="1.5" className="flow-path" />
                <path d="M25 50 L60 65" stroke="rgba(99,102,241,0.5)" strokeWidth="1.5" className="flow-path" />
                <path d="M95 50 L60 65" stroke="rgba(168,85,247,0.5)" strokeWidth="1.5" className="flow-path" />
                <path d="M60 65 L35 95" stroke="rgba(16,185,129,0.5)" strokeWidth="1.5" className="flow-path" />
                <path d="M60 65 L85 95" stroke="rgba(34,211,238,0.5)" strokeWidth="1.5" className="flow-path" />

                <circle cx="60" cy="20" r="7" fill="#6366f1" className="animate-pulse" />
                <circle cx="25" cy="50" r="6" fill="#22d3ee" className="animate-pulse" />
                <circle cx="95" cy="50" r="6" fill="#a855f7" className="animate-pulse" />
                <circle cx="60" cy="65" r="8" fill="#38bdf8" className="animate-pulse" />
                <circle cx="35" cy="95" r="6" fill="#10b981" className="animate-pulse" />
                <circle cx="85" cy="95" r="6" fill="#6366f1" className="animate-pulse" />
              </svg>
            </div>

            <div className="text-center space-y-1.5 max-w-sm">
              <h2 className="text-lg font-bold font-mono tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-300 to-purple-400">
                RYKER ELITE-NEXUS v2 READY
              </h2>
              <p className="text-xs text-slate-400">
                Deploy autonomous multi-agent swarms with DAG decomposition and persistent cognitive memory.
              </p>
            </div>

            {/* System Readiness Row */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono">
              <span className="px-2.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" /> LLM Connected
              </span>
              <span className="px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> 4-Tier Memory
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Tools Ready
              </span>
            </div>

            <div className="flex flex-col items-center gap-3 w-full max-w-xs bg-slate-900/60 p-4 rounded-2xl border border-indigo-500/20 backdrop-blur-md">
              <AgentSelect value={selectedAgent} onChange={setSelectedAgent} />
              <ProviderSelect value={selectedProvider} onChange={(v) => setSelectedProvider(v as string)} availableProviders={availableProviders} />
              <button onClick={handleCreateSession} disabled={!connected} className="btn-primary px-4 py-2.5 text-xs w-full flex items-center justify-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" /> Initialize Session
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Session Header */}
            <SessionHeader
              activeSession={activeSession}
              setAvatarPopupRole={setAvatarPopupRole}
              setAvatarDialogOpen={setAvatarDialogOpen}
              setAgentInfoData={setAgentInfoData}
              selectedAgent={selectedAgent}
              setSelectedAgent={setSelectedAgent}
              selectedProvider={selectedProvider}
              setSelectedProvider={setSelectedProvider}
              availableProviders={availableProviders}
              sessionTokenUsage={sessionTokenUsage}
              isStreaming={isStreaming}
              showHistory={showHistory}
              setShowHistory={setShowHistory}
              showIntervention={showIntervention}
              setShowIntervention={setShowIntervention}
              handleExport={handleExport}
              activeSessionId={activeSessionId}
            />

            {/* Intervention Bar */}
            {showIntervention && (
              <div className="px-4 py-2 border-b border-amber-500/30 bg-amber-950/40 flex items-center gap-2 animate-slide-in">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <input
                  value={interventionText}
                  onChange={e => setInterventionText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleIntervene(); }}
                  placeholder="Inject human intervention directive..."
                  className="flex-1 text-xs bg-transparent text-slate-100 outline-none placeholder:text-amber-400/50 font-mono"
                />
                <button onClick={handleIntervene} disabled={!interventionText.trim()} className="btn-ghost text-[10px] text-amber-400">Dispatch</button>
                <button onClick={() => setShowIntervention(false)} className="btn-ghost p-0.5"><X className="h-3 w-3" /></button>
              </div>
            )}

            {/* Chat History or Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto relative">
              {showHistory ? (
                <ChatHistoryPanel
                  sessions={sessions}
                  chatUserMsgs={chatUserMsgs}
                  chatCompletions={chatCompletions}
                  activeSessionId={activeSessionId}
                  setActiveSessionId={setActiveSessionId}
                  setShowHistory={setShowHistory}
                  setDeleteConfirmId={setDeleteConfirmId}
                  clearChatHistory={clearChatHistory}
                  historySearch={historySearch}
                  setHistorySearch={setHistorySearch}
                  historyGroups={historyGroups}
                  expandedSession={expandedSession}
                  setExpandedSession={setExpandedSession}
                />
              ) : (
              <div className="px-4 py-3 space-y-4">
              {displayMessages.map((msg, idx) => {
                const prevMsg = idx > 0 ? displayMessages[idx - 1] : null;
                const showDateSep = !prevMsg || new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();
                return (
                  <ChatMessageBubble
                    key={msg.id}
                    msg={msg}
                    showDateSep={showDateSep}
                    agentName={activeSession?.agentName || ""}
                    copiedId={copiedId}
                    expandedSteps={expandedSteps}
                    onAvatarClick={handleAvatarClick}
                    onCopy={handleCopy}
                    onToggleSteps={toggleSteps}
                  />
                );
              })}
              {displayMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full text-indigo-500/40" viewBox="0 0 100 100" fill="none">
                      <line x1="20" y1="30" x2="50" y2="20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                      <line x1="50" y1="20" x2="80" y2="35" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                      <line x1="20" y1="30" x2="35" y2="70" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                      <line x1="50" y1="20" x2="65" y2="75" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                      <line x1="80" y1="35" x2="65" y2="75" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                      <line x1="35" y1="70" x2="65" y2="75" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />

                      <circle cx="20" cy="30" r="4" fill="#6366f1" className="animate-pulse" />
                      <circle cx="50" cy="20" r="5" fill="#22d3ee" className="animate-pulse" />
                      <circle cx="80" cy="35" r="4" fill="#a855f7" className="animate-pulse" />
                      <circle cx="35" cy="70" r="4" fill="#10b981" className="animate-pulse" />
                      <circle cx="65" cy="75" r="5" fill="#6366f1" className="animate-pulse" />
                    </svg>
                  </div>
                  <div className="text-center max-w-xs">
                    <p className="text-xs font-mono font-semibold text-slate-200">
                      SESSION READY: {activeSession?.agentName || "Agent"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Enter prompt or task objectives below to start streaming execution.
                    </p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />

              {/* Scroll to bottom button */}
              {showScrollBtn && (
                <button
                  onClick={scrollToBottom}
                  className="absolute bottom-4 right-4 h-8 w-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center transition-all animate-slide-in"
                  title="Scroll to bottom"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              )}
              </div>
              )}
            </div>

            {/* Input */}
            <ChatInputArea
              inputRef={inputRef}
              chatInput={chatInput}
              setChatInput={setChatInput}
              handleKeyDown={handleKeyDown}
              handleSend={handleSend}
              connected={connected}
              isStreaming={isStreaming}
              selectedModel={activeSession?.model}
            />
          </>
        )}
      </div>

      <ChatDialogs
        avatarDialogOpen={avatarDialogOpen}
        avatarPopupRole={avatarPopupRole}
        agentInfoData={agentInfoData}
        activeSession={activeSession}
        activeSessionId={activeSessionId}
        chatUserMsgs={chatUserMsgs}
        setAvatarDialogOpen={setAvatarDialogOpen}
        editDialogOpen={editDialogOpen}
        editingSessionId={editingSessionId}
        chatSessions={chatSessions}
        chatCompletions={chatCompletions}
        setEditDialogOpen={setEditDialogOpen}
        setDeleteConfirmId={setDeleteConfirmId}
        deleteConfirmId={deleteConfirmId}
        handleDeleteSession={handleDeleteSession}
        showNewChat={showNewChat}
        setShowNewChat={setShowNewChat}
        selectedAgent={selectedAgent}
        setSelectedAgent={setSelectedAgent}
        selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider}
        availableProviders={availableProviders}
        connected={connected}
        handleCreateSession={handleCreateSession}
        clearAllConfirm={clearAllConfirm}
        setClearAllConfirm={setClearAllConfirm}
        sessions={sessions}
        clearChatHistory={clearChatHistory}
      />
    </div>
  );
}
