'use client';
import { useEffect, useRef, useCallback } from 'react';

interface ModuleCanvasProps {
  className?: string;
  title: string;
  subtitle: string;
  moduleId: string;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => void;
}

export function ModuleCanvas({ className, title, subtitle, moduleId, draw }: ModuleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    let prevTime = Date.now();
    const render = () => {
      const now = Date.now();
      const t = (now - startTime.current) / 1000;
      const dt = (now - prevTime) / 1000;
      prevTime = now;

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, w, h);

      // Draw grid background
      ctx.strokeStyle = 'rgba(26, 37, 53, 0.3)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Call module-specific draw
      draw(ctx, w, h, t, dt);

      // Module header overlay
      ctx.save();
      ctx.fillStyle = 'rgba(5, 5, 8, 0.85)';
      ctx.fillRect(0, 0, w, 52);
      ctx.strokeStyle = 'rgba(26, 37, 53, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 52); ctx.lineTo(w, 52); ctx.stroke();

      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ccd6e0';
      ctx.fillText(title, 16, 22);

      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#536878';
      ctx.fillText(subtitle, 16, 40);

      // Module ID badge
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#0096ff';
      const badgeText = moduleId.toUpperCase();
      const tw = ctx.measureText(badgeText).width;
      ctx.fillStyle = 'rgba(0, 150, 255, 0.1)';
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.4)';
      ctx.lineWidth = 1;
      const bx = w - tw - 32;
      ctx.fillRect(bx, 10, tw + 16, 20);
      ctx.strokeRect(bx, 10, tw + 16, 20);
      ctx.fillStyle = '#0096ff';
      ctx.fillText(badgeText, bx + 8, 24);

      ctx.restore();

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [draw, title, subtitle, moduleId]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className ?? ''}`}
      style={{ imageRendering: 'auto' }}
    />
  );
}

// Shared drawing utilities
export function drawHUDText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size: number = 9) {
  ctx.font = `bold ${size}px "JetBrains Mono", monospace`;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function drawCounter(ctx: CanvasRenderingContext2D, label: string, value: number, x: number, y: number, color: string) {
  ctx.font = 'bold 8px "JetBrains Mono", monospace';
  ctx.fillStyle = '#536878';
  ctx.fillText(label, x, y);
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.fillStyle = color;
  ctx.fillText(value.toLocaleString().padStart(6, '0'), x, y + 18);
}

export function drawProgressBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number, color: string) {
  ctx.fillStyle = 'rgba(26, 37, 53, 0.5)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.min(progress, 1), h);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, w, h);
}

export function drawPersonIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  // Head
  ctx.beginPath();
  ctx.arc(x, y - size * 0.6, size * 0.28, 0, Math.PI * 2);
  ctx.fill();
  // Body
  ctx.beginPath();
  ctx.moveTo(x - size * 0.3, y + size * 0.4);
  ctx.lineTo(x, y - size * 0.25);
  ctx.lineTo(x + size * 0.3, y + size * 0.4);
  ctx.closePath();
  ctx.fill();
}
