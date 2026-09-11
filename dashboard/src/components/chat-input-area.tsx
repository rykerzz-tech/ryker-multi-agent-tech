"use client";

import { Send, X, Sparkles, Loader2, Bot } from "lucide-react";

interface ChatInputAreaProps {
  inputRef: React.RefObject<HTMLTextAreaElement>;
  chatInput: string;
  setChatInput: (v: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleSend: () => void;
  connected: boolean;
  isStreaming?: boolean;
  selectedModel?: string;
  onSelectModel?: (model: string) => void;
}

const AVAILABLE_MODELS = [
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0" },
  { id: "deepseek-chat", label: "DeepSeek" },
];

export function ChatInputArea({
  inputRef,
  chatInput,
  setChatInput,
  handleKeyDown,
  handleSend,
  connected,
  isStreaming = false,
  selectedModel,
  onSelectModel,
}: ChatInputAreaProps) {
  return (
    <div className="border-t border-indigo-500/20 bg-slate-950/90 backdrop-blur-xl p-3 sm:p-4">
      {/* Top Model Selector Pills */}
      <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto pb-1">
        <span className="text-[10px] uppercase font-mono font-semibold text-slate-500 mr-1 shrink-0 flex items-center gap-1">
          <Bot className="w-3 h-3 text-indigo-400" /> Model:
        </span>
        {AVAILABLE_MODELS.map((m) => {
          const isSelected = selectedModel === m.id || (!selectedModel && m.id === "gpt-4o");
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectModel?.(m.id)}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono transition-all shrink-0 ${
                isSelected
                  ? "bg-indigo-600/30 text-cyan-300 border border-cyan-400/40 shadow-[0_0_8px_rgba(34,211,238,0.2)]"
                  : "bg-slate-900/80 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Input Textarea + Send Action */}
      <div className="relative flex items-end gap-2.5 bg-slate-900/70 border border-indigo-500/30 rounded-2xl p-1.5 focus-within:border-indigo-400/60 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-lg">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={chatInput}
            onChange={(e) => {
              setChatInput(e.target.value);
              if (inputRef.current) {
                inputRef.current.style.height = "auto";
                inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Command autonomous agents or describe a complex task..."
            aria-label="Agent instructions input"
            rows={1}
            className="w-full resize-none bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all font-sans leading-relaxed"
            style={{ maxHeight: 160 }}
          />

          {chatInput && (
            <button
              onClick={() => {
                setChatInput("");
                if (inputRef.current) inputRef.current.style.height = "auto";
              }}
              className="absolute right-2 top-2 p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Clear input"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Gradient Send Button */}
        <button
          onClick={handleSend}
          disabled={!chatInput.trim() || !connected || isStreaming}
          className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
            chatInput.trim() && connected && !isStreaming
              ? "bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:scale-105 active:scale-95"
              : "bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed"
          }`}
          aria-label="Dispatch Command"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Footer Hotkeys & Character / Token Estimator */}
      <div className="pt-2 px-1 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px]">Enter</kbd> Dispatch
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px]">Shift+Enter</kbd> Newline
          </span>
        </div>

        <div className="flex items-center gap-2">
          {chatInput.length > 0 && (
            <span>
              ~{Math.ceil(chatInput.length / 4)} tokens ({chatInput.length} chars)
            </span>
          )}
          <span className="flex items-center gap-1 text-cyan-400">
            <Sparkles className="w-3 h-3" /> DAG Auto-Plan
          </span>
        </div>
      </div>
    </div>
  );
}
