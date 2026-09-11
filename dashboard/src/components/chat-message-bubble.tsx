"use client";

import { Fragment } from "react";
import { User, Copy, Check, Zap, Wrench, AlertTriangle, ArrowRight, ChevronRight } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { AgentOrb } from "@/components/agent-orb";
import type { ChatMessage } from "@/lib/types";

interface ChatMessageBubbleProps {
  msg: ChatMessage;
  showDateSep: boolean;
  agentName: string;
  copiedId: string | null;
  expandedSteps: Set<string>;
  onAvatarClick: (msg: ChatMessage) => void;
  onCopy: (id: string, text: string) => void;
  onToggleSteps: (msgId: string) => void;
}

export function ChatMessageBubble({
  msg,
  showDateSep,
  agentName,
  copiedId,
  expandedSteps,
  onAvatarClick,
  onCopy,
  onToggleSteps,
}: ChatMessageBubbleProps) {
  const isUser = msg.role === "user";

  return (
    <Fragment>
      {showDateSep && (
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
          <span className="text-[10px] text-slate-400 font-mono font-medium px-2 py-0.5 rounded-full bg-slate-900/60 border border-indigo-500/10">
            {new Date(msg.timestamp).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
        </div>
      )}

      <div
        id={`msg-${msg.id}`}
        className={`flex gap-3.5 group mb-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      >
        {/* Avatar */}
        {isUser ? (
          <div
            onClick={() => onAvatarClick(msg)}
            className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center cursor-pointer bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] hover:scale-105 transition-all"
            title="User"
          >
            <User className="h-4 w-4" />
          </div>
        ) : (
          <div onClick={() => onAvatarClick(msg)} className="cursor-pointer">
            <AgentOrb
              name={agentName || "Agent"}
              size="sm"
              active={Boolean(msg.isStreaming)}
            />
          </div>
        )}

        <div className={`max-w-[85%] sm:max-w-[78%] ${isUser ? "ml-auto text-right" : ""}`}>
          {/* Header row: Sender + Timestamp */}
          <div className={`flex items-center gap-2 mb-1.5 ${isUser ? "justify-end" : "justify-start"}`}>
            <span className={`text-xs font-semibold ${isUser ? "text-indigo-300" : "text-cyan-300"}`}>
              {isUser ? "Operator" : (agentName || "Specialist Agent")}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          {/* Message Content Bubble */}
          <div
            className={`relative rounded-2xl px-4 py-3.5 text-sm leading-relaxed transition-all ${
              isUser
                ? "bg-gradient-to-br from-indigo-600 via-indigo-500 to-cyan-600 text-white rounded-tr-sm shadow-[0_4px_20px_rgba(99,102,241,0.25)] border border-indigo-400/30"
                : "glass-neural text-slate-100 rounded-tl-sm border border-indigo-500/25 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
            }`}
          >
            {/* Typing / Reasoning Indicator */}
            {!isUser && msg.isStreaming && !msg.content ? (
              <div className="flex items-center gap-3 py-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs font-mono text-cyan-300/90 animate-pulse">
                  {agentName ? `${agentName} synthesizing cognitive plan...` : "Cognitive engine running..."}
                </span>
              </div>
            ) : !isUser ? (
              <div className="relative group/msg">
                <div className="markdown-body">
                  <MarkdownRenderer content={msg.content || ""} />
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-0.5 bg-cyan-400 animate-pulse align-middle" />
                  )}
                </div>

                {/* Copy Button */}
                <button
                  onClick={() => onCopy(msg.id, msg.content)}
                  className="absolute -top-2 -right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-indigo-500/30 shadow-lg backdrop-blur-md"
                  title="Copy Message"
                  aria-label="Copy"
                >
                  {copiedId === msg.id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words font-sans">{msg.content}</div>
            )}
          </div>

          {/* Handoff Trace */}
          {msg.handoff && (
            <div className="mt-2 flex items-center gap-2 text-xs text-purple-300 bg-purple-950/40 rounded-lg px-3 py-1.5 border border-purple-500/30 shadow-inner">
              <ArrowRight className="h-3.5 w-3.5 text-purple-400" />
              <span>
                Handoff Protocol: <strong className="text-purple-200">{msg.handoff.from}</strong> ➔ <strong className="text-cyan-300">{msg.handoff.to}</strong>
              </span>
            </div>
          )}

          {/* Collapsible Execution Steps / Tool Calls */}
          {!isUser && msg.steps && msg.steps.length > 0 && (
            <div className="mt-2 text-left">
              <button
                onClick={() => onToggleSteps(msg.id)}
                className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 hover:text-cyan-300 transition-colors bg-slate-900/80 rounded-md px-2.5 py-1 border border-indigo-500/20"
              >
                <ChevronRight
                  className={`h-3 w-3 transition-transform duration-200 ${
                    expandedSteps.has(msg.id) ? "rotate-90 text-cyan-400" : ""
                  }`}
                />
                <span>{msg.steps.length} cognitive {msg.steps.length === 1 ? "step" : "steps"} resolved</span>
              </button>

              {expandedSteps.has(msg.id) && (
                <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-indigo-500/40 animate-slide-in">
                  {msg.steps.map((step, i) => (
                    <div key={i} className="text-[11px] font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      {step.error ? (
                        <div className="flex items-center gap-2 text-rose-400">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>Step {i + 1} Error: {step.error}</span>
                        </div>
                      ) : step.toolCalls && step.toolCalls.length > 0 ? (
                        <div className="flex items-center gap-2 text-cyan-300">
                          <Wrench className="h-3 w-3 text-cyan-400 shrink-0" />
                          <span className="font-semibold">{step.toolCalls.map((tc) => tc.tool).join(", ")}</span>
                          {step.duration_ms != null && (
                            <span className="text-slate-500 text-[10px] ml-auto">{step.duration_ms}ms</span>
                          )}
                        </div>
                      ) : step.thought ? (
                        <div className="flex items-start gap-2 text-slate-300">
                          <Zap className="h-3 w-3 text-indigo-400 mt-0.5 shrink-0" />
                          <span className="text-[11px] text-slate-400 line-clamp-2">{step.thought}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">Step {i + 1} executed</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Usage Telemetry Footer */}
          {!isUser && msg.usage && (
            <div className="mt-1.5 flex items-center gap-3 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-400" />
                <span>{msg.usage.totalTokens.toLocaleString()} tokens</span>
              </span>
              <span className="text-slate-600">•</span>
              <span>Prompt: {msg.usage.promptTokens.toLocaleString()}</span>
              <span>Comp: {msg.usage.completionTokens.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </Fragment>
  );
}
