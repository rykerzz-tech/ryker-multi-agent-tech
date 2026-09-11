"use client";

import React, { useEffect, useRef } from "react";

interface NeuralActivityCanvasProps {
  width?: number;
  height?: number;
  inferActive?: boolean;
  toolActive?: boolean;
  memoryActive?: boolean;
  className?: string;
}

export function NeuralActivityCanvas({
  width = 64,
  height = 24,
  inferActive = false,
  toolActive = false,
  memoryActive = false,
  className = "",
}: NeuralActivityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const stateRef = useRef({
    phase: 0,
    inferAmp: 0.15,
    toolAmp: 0.1,
    memoryAmp: 0.08,
  });

  useEffect(() => {
    // Target amplitudes
    const targetInfer = inferActive ? 1.0 : 0.18;
    const targetTool = toolActive ? 0.9 : 0.12;
    const targetMemory = memoryActive ? 0.8 : 0.08;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      const state = stateRef.current;
      // Smooth lerp to target amplitudes
      state.inferAmp += (targetInfer - state.inferAmp) * 0.1;
      state.toolAmp += (targetTool - state.toolAmp) * 0.1;
      state.memoryAmp += (targetMemory - state.memoryAmp) * 0.1;
      state.phase += 0.08;

      const w = canvas.width;
      const h = canvas.height;
      const midY = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Channel 3: Memory reads (Purple)
      ctx.beginPath();
      ctx.strokeStyle = "rgba(168, 85, 247, 0.6)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x++) {
        const y = midY + Math.sin(state.phase * 0.8 + x * 0.15) * (h * 0.3 * state.memoryAmp);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Channel 2: Tool calls (Cyan)
      ctx.beginPath();
      ctx.strokeStyle = "rgba(34, 211, 238, 0.75)";
      ctx.lineWidth = 1.2;
      for (let x = 0; x < w; x++) {
        const y = midY + Math.sin(state.phase * 1.2 + x * 0.22) * (h * 0.38 * state.toolAmp);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Channel 1: Inference calls (Indigo)
      ctx.beginPath();
      ctx.strokeStyle = "rgba(99, 102, 241, 0.9)";
      ctx.lineWidth = 1.5;
      for (let x = 0; x < w; x++) {
        const y = midY + Math.sin(state.phase * 1.5 + x * 0.3) * (h * 0.45 * state.inferAmp);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [inferActive, toolActive, memoryActive]);

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded border border-indigo-500/20 bg-slate-950/60 p-0.5 overflow-hidden shadow-inner ${className}`}
      title="Neural Activity Stream (Indigo: Inference, Cyan: Tools, Purple: Memory)"
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
        style={{ width: `${width}px`, height: `${height}px` }}
      />
    </div>
  );
}
