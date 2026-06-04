'use client';
import { useCallback, useRef } from 'react';
import { ModuleCanvas, drawHUDText, drawPersonIcon, drawProgressBar } from './ModuleCanvas';

interface BuildingTarget { x: number; y: number; w: number; h: number; residents: number; cde: number; flagged: boolean; scanProgress: number; }
interface DataFlow { x: number; y: number; vy: number; alpha: number; }

export function HabsoraModule() {
  const buildings = useRef<BuildingTarget[]>([]);
  const dataFlows = useRef<DataFlow[]>([]);
  const scanLine = useRef(0);
  const selectedBuilding = useRef(0);
  const initialized = useRef(false);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    const panelY = 62;

    if (!initialized.current) {
      initialized.current = true;
      // Create building grid
      const cols = 7; const rows = 4;
      const cellW = (w * 0.55 - 32) / cols;
      const cellH = (h - panelY - 120) / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const bw = cellW * 0.55 + Math.random() * cellW * 0.2;
          const bh = cellH * 0.45 + Math.random() * cellH * 0.25;
          buildings.current.push({
            x: 16 + c * cellW + (cellW - bw) / 2,
            y: panelY + 40 + r * cellH + (cellH - bh) / 2,
            w: bw, h: bh,
            residents: 4 + Math.floor(Math.random() * 20),
            cde: Math.random(),
            flagged: Math.random() < 0.3,
            scanProgress: 0,
          });
        }
      }
    }

    // Update selected building cycling
    selectedBuilding.current = Math.floor(t * 0.5) % buildings.current.length;
    scanLine.current = (t * 80) % (buildings.current[selectedBuilding.current]?.h || 60);

    // ─── LEFT: Building Neighborhood Map ─────────────────────────
    const mapW = w * 0.55;
    drawHUDText(ctx, 'STRUCTURAL TARGET MAPPING — HABSORA ALLOCATION', 16, panelY + 14, '#ff1a2e', 10);

    // Data flow lines from top (LAVENDER → HABSORA)
    if (dataFlows.current.length < 30) {
      dataFlows.current.push({ x: 100 + Math.random() * 200, y: panelY + 20, vy: 60 + Math.random() * 80, alpha: 0.7 });
    }
    for (const f of dataFlows.current) {
      f.y += f.vy * dt;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 170, 0, ${Math.max(0, f.alpha - f.y / (h * 2))})`;
      ctx.fill();
      if (f.y > panelY + 40) f.y = panelY + 20;
    }

    // HABSORA block label
    ctx.fillStyle = 'rgba(255, 26, 46, 0.12)';
    ctx.fillRect(mapW / 2 - 55, panelY + 22, 110, 18);
    ctx.strokeStyle = 'rgba(255, 26, 46, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mapW / 2 - 55, panelY + 22, 110, 18);
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff1a2e';
    ctx.fillText('HABSORA ENGINE', mapW / 2, panelY + 34);
    ctx.textAlign = 'left';

    // Draw buildings
    for (let i = 0; i < buildings.current.length; i++) {
      const b = buildings.current[i];
      const isSelected = i === selectedBuilding.current;
      const isFlagged = b.flagged;

      // Building fill
      ctx.fillStyle = isSelected
        ? 'rgba(255, 26, 46, 0.2)'
        : isFlagged
        ? 'rgba(255, 26, 46, 0.08)'
        : 'rgba(13, 21, 32, 0.8)';
      ctx.fillRect(b.x, b.y, b.w, b.h);

      // Building border
      ctx.strokeStyle = isSelected
        ? '#ff1a2e'
        : isFlagged
        ? 'rgba(255, 26, 46, 0.4)'
        : 'rgba(26, 37, 53, 0.6)';
      ctx.lineWidth = isSelected ? 1.5 : 0.5;
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      // Resident count badge
      if (isSelected || isFlagged) {
        ctx.fillStyle = 'rgba(5, 5, 8, 0.9)';
        ctx.fillRect(b.x + b.w - 22, b.y - 10, 22, 10);
        ctx.font = 'bold 7px "JetBrains Mono", monospace';
        ctx.fillStyle = isFlagged ? '#ff1a2e' : '#ffaa00';
        ctx.fillText(`👤${b.residents}`, b.x + b.w - 20, b.y - 2);
      }

      // Floor lines
      const floors = 2 + Math.floor(b.h / 15);
      for (let fl = 1; fl < floors; fl++) {
        const fy = b.y + (b.h / floors) * fl;
        ctx.strokeStyle = 'rgba(26, 37, 53, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(b.x + 2, fy); ctx.lineTo(b.x + b.w - 2, fy); ctx.stroke();
      }
    }

    // ─── Zoning Heat Map Overlay ──────────────────────────────────
    const denseZones = [{ x: 60, y: panelY + 60, w: 130, h: 100 }, { x: 200, y: panelY + 130, w: 100, h: 80 }];
    for (const z of denseZones) {
      const pulseA = 0.04 + 0.03 * Math.sin(t * 2);
      ctx.fillStyle = `rgba(255, 26, 46, ${pulseA})`;
      ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.strokeStyle = `rgba(255, 26, 46, ${0.3 + 0.15 * Math.sin(t * 2)})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(z.x, z.y, z.w, z.h);
      ctx.setLineDash([]);
      ctx.font = 'bold 6px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ff1a2e';
      ctx.fillText('HIGH DENSITY', z.x + 4, z.y + 10);
    }

    // ─── RIGHT: 3D Wireframe Panel + CDE ─────────────────────────
    const rightX = mapW + 8;
    const rightW = w - rightX - 8;
    drawHUDText(ctx, '3D STRUCTURAL ANALYSIS', rightX, panelY + 14, '#0096ff', 10);

    const sel = buildings.current[selectedBuilding.current];
    if (!sel) return;

    // Isometric wireframe building
    const isoX = rightX + rightW / 2;
    const isoY = panelY + 140;
    const isoW = 90; const isoH = 70; const isoD = 30;

    const isoColor = 'rgba(0, 150, 255, 0.7)';
    ctx.strokeStyle = isoColor;
    ctx.lineWidth = 1.5;

    // Front face
    ctx.beginPath();
    ctx.moveTo(isoX - isoW / 2, isoY);
    ctx.lineTo(isoX + isoW / 2, isoY);
    ctx.lineTo(isoX + isoW / 2, isoY - isoH);
    ctx.lineTo(isoX - isoW / 2, isoY - isoH);
    ctx.closePath();
    ctx.strokeStyle = isoColor;
    ctx.fillStyle = 'rgba(0, 150, 255, 0.05)';
    ctx.fill();
    ctx.stroke();

    // Right side
    ctx.beginPath();
    ctx.moveTo(isoX + isoW / 2, isoY);
    ctx.lineTo(isoX + isoW / 2 + isoD, isoY - isoD * 0.5);
    ctx.lineTo(isoX + isoW / 2 + isoD, isoY - isoH - isoD * 0.5);
    ctx.lineTo(isoX + isoW / 2, isoY - isoH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 150, 255, 0.04)';
    ctx.fill();
    ctx.stroke();

    // Top face
    ctx.beginPath();
    ctx.moveTo(isoX - isoW / 2, isoY - isoH);
    ctx.lineTo(isoX + isoW / 2, isoY - isoH);
    ctx.lineTo(isoX + isoW / 2 + isoD, isoY - isoH - isoD * 0.5);
    ctx.lineTo(isoX - isoW / 2 + isoD, isoY - isoH - isoD * 0.5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 150, 255, 0.08)';
    ctx.fill();
    ctx.stroke();

    // Scan line
    const sl = (scanLine.current % isoH);
    ctx.strokeStyle = 'rgba(0, 255, 150, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(isoX - isoW / 2, isoY - sl);
    ctx.lineTo(isoX + isoW / 2, isoY - sl);
    ctx.stroke();

    // Window grid
    for (let fx = 0; fx < 4; fx++) {
      for (let fy = 0; fy < 3; fy++) {
        const wx = isoX - isoW / 2 + 10 + fx * 20;
        const wy = isoY - 15 - fy * 20;
        ctx.fillStyle = 'rgba(0, 150, 255, 0.2)';
        ctx.fillRect(wx, wy, 10, 12);
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.4)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(wx, wy, 10, 12);
      }
    }

    // ─── Data Properties Panel ────────────────────────────────────
    const dpY = isoY + 30;
    const dpData = [
      ['TARGET ID', `APT-${selectedBuilding.current.toString().padStart(3, '0')}`],
      ['FLOORS', `${2 + Math.floor(sel.h / 15)}`],
      ['AREA', `${Math.floor(sel.w * sel.h * 0.8)}m²`],
      ['RESIDENTS', `${sel.residents}`],
      ['CDE SCORE', `${Math.floor(sel.cde * 100)}%`],
      ['STATUS', sel.cde > 0.6 ? 'CDE EXCEEDED' : 'CDE DIMINISHED'],
    ];

    dpData.forEach(([k, v], i) => {
      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      ctx.fillStyle = '#536878';
      ctx.fillText(k + ':', rightX + 4, dpY + i * 14);
      ctx.fillStyle = k === 'STATUS' ? (sel.cde > 0.6 ? '#ff1a2e' : '#00d47e') : '#ccd6e0';
      ctx.fillText(v, rightX + 80, dpY + i * 14);
    });

    // CDE card
    const cardY = dpY + dpData.length * 14 + 8;
    ctx.fillStyle = sel.cde > 0.6 ? 'rgba(255, 26, 46, 0.15)' : 'rgba(0, 212, 126, 0.1)';
    ctx.fillRect(rightX, cardY, rightW - 4, 32);
    ctx.strokeStyle = sel.cde > 0.6 ? '#ff1a2e' : '#00d47e';
    ctx.lineWidth = 1;
    ctx.strokeRect(rightX, cardY, rightW - 4, 32);

    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.fillStyle = sel.cde > 0.6 ? '#ff1a2e' : '#00d47e';
    ctx.fillText(`CDE: ${sel.cde > 0.6 ? 'THRESHOLD EXCEEDED' : 'DIMINISHED'}`, rightX + 6, cardY + 12);
    ctx.font = '7px "JetBrains Mono", monospace';
    ctx.fillStyle = '#536878';
    ctx.fillText(`ID: TARGET_${String.fromCharCode(65 + selectedBuilding.current % 26)}_APT`, rightX + 6, cardY + 26);

    // Resident person icons on card
    for (let ri = 0; ri < Math.min(sel.residents, 10); ri++) {
      drawPersonIcon(ctx, rightX + 10 + ri * 9, cardY - 16, 6, sel.cde > 0.6 ? '#ff1a2e' : '#ffaa00');
    }

    // ─── Bottom HUD ───────────────────────────────────────────────
    const hudY = h - 28;
    ctx.fillStyle = 'rgba(5, 5, 8, 0.9)';
    ctx.fillRect(0, hudY - 4, w, 32);
    ctx.strokeStyle = 'rgba(26, 37, 53, 0.5)';
    ctx.beginPath(); ctx.moveTo(0, hudY - 4); ctx.lineTo(w, hudY - 4); ctx.stroke();
    const total = buildings.current.length;
    const flagged = buildings.current.filter(b => b.flagged).length;
    const totalResidents = buildings.current.reduce((s, b) => s + (b.flagged ? b.residents : 0), 0);
    drawHUDText(ctx, `STRUCTURES MAPPED: ${total}`, 16, hudY + 10, '#0096ff', 9);
    drawHUDText(ctx, `FLAGGED: ${flagged}`, w * 0.3, hudY + 10, '#ff1a2e', 9);
    drawHUDText(ctx, `EST. COLLATERAL: ${totalResidents} RESIDENTS`, w * 0.5, hudY + 10, '#ffaa00', 9);
  }, []);

  return (
    <ModuleCanvas
      title="HAPSORA / THE GOSPEL — STRUCTURAL TARGETING ENGINE"
      subtitle="Personnel profiles → physical structure assignment → collateral damage estimation"
      moduleId="MODULE 3 // HABSORA"
      draw={draw}
    />
  );
}
