'use client';
import { useCallback, useRef } from 'react';
import { ModuleCanvas, drawHUDText, drawCounter, drawProgressBar } from './ModuleCanvas';

// Particle pool for funnel animation
interface FunnelParticle { x: number; y: number; vy: number; size: number; alpha: number; classified: boolean; }
// Target dot for density map
interface TargetDot { x: number; y: number; radius: number; pulse: number; }

const MAX_FUNNEL = 800;
const MAX_DENSITY = 2000;

export function TargetPipeline() {
  const funnelParticles = useRef<FunnelParticle[]>([]);
  const gazaDots = useRef<TargetDot[]>([]);
  const iraqDots = useRef<TargetDot[]>([]);
  const targetsGenerated = useRef(0);
  const profilesIngested = useRef(0);
  const dayElapsed = useRef(0);
  const initialized = useRef(false);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    if (!initialized.current) {
      initialized.current = true;
      // Pre-populate Iraq dots (sparse)
      for (let i = 0; i < 120; i++) {
        iraqDots.current.push({
          x: Math.random() * 0.8 + 0.1,
          y: Math.random() * 0.7 + 0.15,
          radius: 2 + Math.random() * 2,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    }

    const panelY = 62;
    const panelH = h - panelY;

    // ─── LEFT HALF: Theater Density Comparison ───────────────────
    const leftW = w * 0.45;
    const mapY = panelY + 20;
    const mapH = panelH * 0.55;
    const halfLeft = leftW * 0.48;

    // Title
    drawHUDText(ctx, 'THEATER DENSITY MAPPING', 16, panelY + 12, '#0096ff', 10);

    // Iraq Map (left sub-panel)
    const iraqX = 16;
    const iraqW = halfLeft - 20;
    ctx.strokeStyle = 'rgba(0, 212, 126, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(iraqX, mapY, iraqW, mapH);

    drawHUDText(ctx, 'IRAQ — 438,000 km²', iraqX + 4, mapY - 4, '#536878', 7);
    drawHUDText(ctx, `TARGETS: ${iraqDots.current.length}`, iraqX + 4, mapY + mapH + 12, '#00d47e', 8);

    // Draw Iraq dots (sparse green)
    for (const dot of iraqDots.current) {
      const dx = iraqX + dot.x * iraqW;
      const dy = mapY + dot.y * mapH;
      ctx.beginPath();
      ctx.arc(dx, dy, dot.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 212, 126, ${0.3 + 0.2 * Math.sin(t * 2 + dot.pulse)})`;
      ctx.fill();
    }

    // Gaza Map (right sub-panel) — saturates with red targets over time
    const gazaX = iraqX + halfLeft + 8;
    const gazaW = halfLeft - 20;
    ctx.strokeStyle = 'rgba(255, 26, 46, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(gazaX, mapY, gazaW, mapH);

    drawHUDText(ctx, 'GAZA — 360 km²', gazaX + 4, mapY - 4, '#536878', 7);

    // Continuously add Gaza dots
    const gazaMaxByTime = Math.min(Math.floor(t * 80), MAX_DENSITY);
    while (gazaDots.current.length < gazaMaxByTime) {
      gazaDots.current.push({
        x: Math.random(),
        y: Math.random(),
        radius: 1.5 + Math.random() * 3,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    drawHUDText(ctx, `TARGETS: ${gazaDots.current.length.toLocaleString()}`, gazaX + 4, mapY + mapH + 12, '#ff1a2e', 8);

    // Draw Gaza dots (dense red — overlapping)
    for (const dot of gazaDots.current) {
      const dx = gazaX + dot.x * gazaW;
      const dy = mapY + dot.y * mapH;
      const a = 0.15 + 0.15 * Math.sin(t * 1.5 + dot.pulse);
      ctx.beginPath();
      ctx.arc(dx, dy, dot.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 26, 46, ${a})`;
      ctx.fill();
    }

    // Scale contrast label
    if (gazaDots.current.length > 500) {
      const blink = Math.sin(t * 3) > 0;
      if (blink) {
        drawHUDText(ctx, '⚠ DENSITY SATURATION — 15,000 TARGETS / 35 DAYS', iraqX, mapY + mapH + 28, '#ff1a2e', 8);
      }
    }

    // ─── LEFT BOTTOM: Timeline ────────────────────────────────────
    const tlY = mapY + mapH + 44;
    dayElapsed.current = Math.min(t * 0.8, 35);
    drawHUDText(ctx, '35-DAY OPERATIONAL WINDOW', 16, tlY, '#536878', 8);
    drawProgressBar(ctx, 16, tlY + 6, leftW - 32, 8, dayElapsed.current / 35, '#ff1a2e');
    drawHUDText(ctx, `DAY ${Math.floor(dayElapsed.current)} / 35`, 16, tlY + 22, '#ffaa00', 8);

    // ─── RIGHT HALF: Ingestion Data Funnel ───────────────────────
    const funnelX = leftW + 16;
    const funnelW = w - funnelX - 16;
    const funnelCX = funnelX + funnelW / 2;

    drawHUDText(ctx, 'POPULATION INGESTION FUNNEL', funnelX, panelY + 12, '#0096ff', 10);
    drawHUDText(ctx, 'TOTAL DATABASE: 2,300,000 PROFILES', funnelX, panelY + 26, '#536878', 8);

    // Draw funnel shape
    const funnelTop = panelY + 40;
    const funnelBot = h - 80;
    const funnelTopW = funnelW * 0.85;
    const funnelBotW = funnelW * 0.12;

    ctx.strokeStyle = 'rgba(0, 150, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(funnelCX - funnelTopW / 2, funnelTop);
    ctx.lineTo(funnelCX - funnelBotW / 2, funnelBot);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(funnelCX + funnelTopW / 2, funnelTop);
    ctx.lineTo(funnelCX + funnelBotW / 2, funnelBot);
    ctx.stroke();

    // Spawn particles
    if (funnelParticles.current.length < MAX_FUNNEL) {
      for (let i = 0; i < 3; i++) {
        funnelParticles.current.push({
          x: funnelCX + (Math.random() - 0.5) * funnelTopW * 0.9,
          y: funnelTop - 10 - Math.random() * 30,
          vy: 40 + Math.random() * 80,
          size: 1.2 + Math.random() * 1.8,
          alpha: 0.4 + Math.random() * 0.4,
          classified: false,
        });
      }
    }

    // Update and draw particles
    profilesIngested.current = Math.min(Math.floor(t * 6500), 2300000);

    for (let i = funnelParticles.current.length - 1; i >= 0; i--) {
      const p = funnelParticles.current[i];
      p.y += p.vy * dt;

      // Narrow toward center as particle falls
      const progress = (p.y - funnelTop) / (funnelBot - funnelTop);
      if (progress > 0 && progress < 1) {
        const currentW = funnelTopW + (funnelBotW - funnelTopW) * progress;
        const targetX = funnelCX + (p.x - funnelCX) * (currentW / funnelTopW);
        p.x += (targetX - p.x) * 0.05;
      }

      // Classify near bottom
      if (progress > 0.75 && !p.classified) {
        p.classified = true;
        targetsGenerated.current++;
      }

      // Recycle
      if (p.y > funnelBot + 20) {
        p.y = funnelTop - 10 - Math.random() * 30;
        p.x = funnelCX + (Math.random() - 0.5) * funnelTopW * 0.9;
        p.classified = false;
      }

      // Draw
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.classified
        ? `rgba(255, 26, 46, ${p.alpha})`
        : `rgba(204, 214, 224, ${p.alpha * 0.6})`;
      ctx.fill();
    }

    // Funnel output counter
    const outY = funnelBot + 16;
    drawHUDText(ctx, 'CLASSIFIED TARGETS EXTRACTED', funnelCX - 100, outY, '#536878', 8);
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ff1a2e';
    const tgt = Math.min(Math.floor(t * 430), 15000);
    ctx.fillText(tgt.toLocaleString().padStart(6, ' '), funnelCX - 60, outY + 26);

    // Velocity meter
    drawHUDText(ctx, `VELOCITY: ${Math.floor(tgt / Math.max(dayElapsed.current, 0.1))} TARGETS/DAY`, funnelCX - 80, outY + 44, '#ffaa00', 8);

    // ─── Bottom HUD stats ─────────────────────────────────────────
    const hudY = h - 32;
    ctx.fillStyle = 'rgba(5, 5, 8, 0.9)';
    ctx.fillRect(0, hudY - 8, w, 40);
    ctx.strokeStyle = 'rgba(26, 37, 53, 0.6)';
    ctx.beginPath(); ctx.moveTo(0, hudY - 8); ctx.lineTo(w, hudY - 8); ctx.stroke();

    drawHUDText(ctx, `PROFILES INGESTED: ${profilesIngested.current.toLocaleString()}`, 16, hudY + 6, '#0096ff', 9);
    drawHUDText(ctx, `TARGETS GENERATED: ${tgt.toLocaleString()}`, w * 0.35, hudY + 6, '#ff1a2e', 9);
    drawHUDText(ctx, `OPERATIONAL DAY: ${Math.floor(dayElapsed.current)}/35`, w * 0.7, hudY + 6, '#ffaa00', 9);
  }, []);

  return (
    <ModuleCanvas
      title="HIGH-VOLUME TARGET GENERATION PIPELINE"
      subtitle="Automated mass surveillance data → target extraction at machine pace"
      moduleId="MODULE 1 // TARGET PIPELINE"
      draw={draw}
    />
  );
}
