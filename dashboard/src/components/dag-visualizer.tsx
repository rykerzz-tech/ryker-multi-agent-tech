"use client";

import React, { useState, useMemo } from "react";
import { 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  RefreshCw,
  Cpu,
  Layers
} from "lucide-react";

export interface DAGNode {
  taskId: string;
  label: string;
  description?: string;
  dependsOn: string[];
  parallelizable?: boolean;
  estimatedComplexity?: number;
  assignedAgentRole?: string;
  status: "PENDING" | "RUNNING" | "DONE" | "FAILED";
  result?: any;
  error?: string;
  durationMs?: number;
}

export interface DAGVisualizerProps {
  dagId?: string;
  tasks: DAGNode[];
  onSelectTask?: (task: DAGNode) => void;
  className?: string;
}

export function DAGVisualizer({ dagId, tasks = [], onSelectTask, className = "" }: DAGVisualizerProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [filter, setFilter] = useState<"ALL" | "RUNNING" | "FAILED">("ALL");

  // Layout calculation for DAG: assigns x, y coordinates per layer
  const { nodesWithCoords, edges, width, height } = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return { nodesWithCoords: [], edges: [], width: 600, height: 260 };
    }

    // Determine topological layers (rank)
    const taskMap = new Map<string, DAGNode>(tasks.map(t => [t.taskId, t]));
    const ranks = new Map<string, number>();

    const getRank = (id: string, visited = new Set<string>()): number => {
      if (visited.has(id)) return 0;
      if (ranks.has(id)) return ranks.get(id)!;
      visited.add(id);
      const node = taskMap.get(id);
      if (!node || !node.dependsOn || node.dependsOn.length === 0) {
        ranks.set(id, 0);
        return 0;
      }
      const maxDepRank = Math.max(...node.dependsOn.map(dep => getRank(dep, new Set(visited))));
      const rank = maxDepRank + 1;
      ranks.set(id, rank);
      return rank;
    };

    tasks.forEach(t => getRank(t.taskId));

    // Group by rank
    const layers: string[][] = [];
    tasks.forEach(t => {
      const r = ranks.get(t.taskId) || 0;
      if (!layers[r]) layers[r] = [];
      layers[r].push(t.taskId);
    });

    const NODE_WIDTH = 220;
    const NODE_HEIGHT = 80;
    const HORIZONTAL_GAP = 100;
    const VERTICAL_GAP = 30;

    const coords = new Map<string, { x: number; y: number; rank: number }>();
    let maxLayerSize = 0;

    layers.forEach((layer, layerIdx) => {
      maxLayerSize = Math.max(maxLayerSize, layer.length);
      const x = 40 + layerIdx * (NODE_WIDTH + HORIZONTAL_GAP);
      layer.forEach((taskId, nodeIdx) => {
        const y = 30 + nodeIdx * (NODE_HEIGHT + VERTICAL_GAP);
        coords.set(taskId, { x, y, rank: layerIdx });
      });
    });

    const computedWidth = Math.max(650, 80 + layers.length * (NODE_WIDTH + HORIZONTAL_GAP));
    const computedHeight = Math.max(260, 60 + maxLayerSize * (NODE_HEIGHT + VERTICAL_GAP));

    // Calculate edge paths
    const calculatedEdges: Array<{ from: string; to: string; path: string; status: string }> = [];
    tasks.forEach(t => {
      const targetCoord = coords.get(t.taskId);
      if (!targetCoord) return;
      t.dependsOn.forEach(depId => {
        const sourceCoord = coords.get(depId);
        if (!sourceCoord) return;

        const startX = sourceCoord.x + NODE_WIDTH;
        const startY = sourceCoord.y + NODE_HEIGHT / 2;
        const endX = targetCoord.x;
        const endY = targetCoord.y + NODE_HEIGHT / 2;
        const c1X = startX + (endX - startX) / 2;
        const c1Y = startY;
        const c2X = startX + (endX - startX) / 2;
        const c2Y = endY;

        const path = `M ${startX} ${startY} C ${c1X} ${c1Y}, ${c2X} ${c2Y}, ${endX} ${endY}`;
        const sourceNode = taskMap.get(depId);
        const edgeStatus = t.status === "RUNNING" ? "active" : sourceNode?.status === "DONE" ? "done" : "pending";

        calculatedEdges.push({ from: depId, to: t.taskId, path, status: edgeStatus });
      });
    });

    const nodeResults = tasks.map(t => {
      const c = coords.get(t.taskId) || { x: 0, y: 0, rank: 0 };
      return { ...t, x: c.x, y: c.y, width: NODE_WIDTH, height: NODE_HEIGHT };
    });

    return {
      nodesWithCoords: nodeResults,
      edges: calculatedEdges,
      width: computedWidth,
      height: computedHeight,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (filter === "ALL") return tasks;
    return tasks.filter(t => t.status === filter);
  }, [tasks, filter]);

  const selectedTask = useMemo(() => {
    return tasks.find(t => t.taskId === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  const handleNodeClick = (task: DAGNode) => {
    setSelectedTaskId(task.taskId);
    if (onSelectTask) onSelectTask(task);
  };

  const getStatusBadge = (status: DAGNode["status"]) => {
    switch (status) {
      case "DONE":
        return <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Done</span>;
      case "RUNNING":
        return <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/80 px-2 py-0.5 rounded-full animate-pulse"><RefreshCw className="w-3 h-3 animate-spin" /> Running</span>;
      case "FAILED":
        return <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/80 px-2 py-0.5 rounded-full"><AlertCircle className="w-3 h-3" /> Failed</span>;
      default:
        return <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" /> Pending</span>;
    }
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div className={`p-6 rounded-xl border border-white/5 bg-zinc-950/60 text-center ${className}`}>
        <Layers className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-60" />
        <p className="text-sm font-medium text-zinc-400">No active cognitive DAG graph</p>
        <p className="text-xs text-zinc-600 mt-1">Autonomous task decomposition graph will stream here during execution</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col rounded-xl border border-white/10 bg-zinc-950/90 backdrop-blur-md overflow-hidden ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-900/40">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-200">
            Cognitive Task Graph (DAG)
          </h3>
          {dagId && <span className="text-[10px] text-zinc-500 font-mono">#{dagId.slice(-6)}</span>}
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5 text-[11px]">
            {(["ALL", "RUNNING", "FAILED"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded transition-colors ${filter === f ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-white/5 transition-colors"
            title={isExpanded ? "Collapse View" : "Expand View"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className={`relative overflow-auto p-4 transition-all duration-300 ${isExpanded ? "max-h-[500px]" : "max-h-[300px]"}`}>
        <svg
          width={width}
          height={height}
          className="min-w-full block"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="edgeGradActive" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="edgeGradDone" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.6" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render Connection Edges */}
          {edges.map((edge, idx) => {
            const isActive = edge.status === "active";
            const isDone = edge.status === "done";
            return (
              <path
                key={`edge-${idx}`}
                d={edge.path}
                fill="none"
                stroke={isActive ? "url(#edgeGradActive)" : isDone ? "url(#edgeGradDone)" : "rgba(255,255,255,0.15)"}
                strokeWidth={isActive ? 2.5 : 1.5}
                strokeDasharray={isActive ? "6 3" : undefined}
                className={isActive ? "animate-pulse" : ""}
                filter={isActive ? "url(#glow)" : undefined}
              />
            );
          })}

          {/* Render Nodes as foreignObject HTML */}
          {nodesWithCoords.map(node => {
            const isSelected = selectedTaskId === node.taskId;
            const isRunning = node.status === "RUNNING";
            const isFailed = node.status === "FAILED";
            const isDone = node.status === "DONE";

            return (
              <foreignObject
                key={node.taskId}
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
              >
                <div
                  onClick={() => handleNodeClick(node)}
                  className={`w-full h-full p-2.5 rounded-lg border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between select-none ${
                    isSelected
                      ? "bg-cyan-950/80 border-cyan-400 shadow-lg shadow-cyan-500/20"
                      : isRunning
                      ? "bg-zinc-900/90 border-cyan-500/80 shadow-md shadow-cyan-500/10 animate-pulse"
                      : isFailed
                      ? "bg-zinc-900/90 border-rose-500/60"
                      : isDone
                      ? "bg-zinc-900/80 border-emerald-500/40 hover:border-emerald-400/70"
                      : "bg-zinc-950/80 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-zinc-100 truncate">
                        {node.label}
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                        <Cpu className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                        <span>{node.assignedAgentRole || "Specialist"}</span>
                      </p>
                    </div>
                    {getStatusBadge(node.status)}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-white/5">
                    <span className="font-mono">#{node.taskId}</span>
                    {node.estimatedComplexity && (
                      <span className="text-zinc-400 font-medium">
                        C:{node.estimatedComplexity}/10
                      </span>
                    )}
                  </div>
                </div>
              </foreignObject>
            );
          })}
        </svg>
      </div>

      {/* Selected Task Details Drawer */}
      {selectedTask && (
        <div className="px-4 py-3 border-t border-white/10 bg-zinc-900/60 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">{selectedTask.label}</span>
              {getStatusBadge(selectedTask.status)}
            </div>
            <button
              onClick={() => setSelectedTaskId(null)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200"
            >
              Close
            </button>
          </div>

          {selectedTask.description && (
            <p className="text-xs text-zinc-300 leading-relaxed">{selectedTask.description}</p>
          )}

          {selectedTask.error && (
            <div className="p-2 rounded bg-rose-950/50 border border-rose-800/80 text-[11px] text-rose-300 font-mono">
              Error: {selectedTask.error}
            </div>
          )}

          {selectedTask.result && (
            <div className="p-2 rounded bg-black/50 border border-white/5 text-[11px] text-zinc-300 font-mono max-h-32 overflow-auto">
              {typeof selectedTask.result === "string" ? selectedTask.result : JSON.stringify(selectedTask.result, null, 2)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
