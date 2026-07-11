'use client';
import { useCallback, useRef, useState } from 'react';
import { ModuleCanvas, drawHUDText, drawPersonIcon } from './ModuleCanvas';
import { Users, AlertTriangle, ExternalLink, Moon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// "WHERE'S DADDY?" — PROXIMITY-BASED STRIKE TARGETING
//   Source: +972 Magazine / Local Call — "Lavender: The AI Machine" (Apr 2024)
//
//   The algorithm tracks when a designated target enters their family home.
//   IDF then authorizes a strike on that home — KNOWING family are present.
//   Policy: up to 20 civilian deaths accepted per junior-rank target.
// ─────────────────────────────────────────────────────────────────────────────

type MemberIcon = 'man' | 'woman' | 'child' | 'infant';

interface FamilyMember {
  label: string; age: number | string;
  isTarget: boolean; icon: MemberIcon; col: string;
}
interface ScenarioDef {
  id: number; label: string; tag: string; headerColor: string;
  description: string; family: FamilyMember[];
  cdeNote: string; cdeColor: string;
  cycleDuration: number; nightMode: boolean; alarmText: string;
}

const SCENARIOS: ScenarioDef[] = [
  {
    id: 0, label: "WHERE'S DADDY", tag: 'STANDARD ALGORITHM', headerColor: '#ff1a2e',
    description: 'Target geofenced to family residence. Proximity threshold crossed. Strike window opens. Algorithm requests authorization.',
    family: [{ label: 'TARGET (MALE)', age: 34, isTarget: true, icon: 'man', col: '#ff1a2e' }],
    cdeNote: 'Family presence not verified. Algorithm proceeds on target presence alone. Residence strike authorized.',
    cdeColor: '#ff6600', cycleDuration: 20, nightMode: false,
    alarmText: '⚠  THRESHOLD CROSSED — TARGET AT FAMILY RESIDENCE  ⚠',
  },
  {
    id: 1, label: 'FAMILY HOME', tag: 'COLLATERAL SCENARIO', headerColor: '#ff1a2e',
    description: 'Target returns home. Signal intel detects wife and children also present. CDE assessed: ACCEPTABLE. Strike authorized.',
    family: [
      { label: 'AHMAD (TARGET)', age: 34,    isTarget: true,  icon: 'man',    col: '#ff1a2e' },
      { label: 'FATIMA (WIFE)',  age: 29,    isTarget: false, icon: 'woman',  col: '#ffaa00' },
      { label: 'LAYLA',         age: 8,     isTarget: false, icon: 'child',  col: '#ffaa00' },
      { label: 'OMAR',          age: 5,     isTarget: false, icon: 'child',  col: '#ffaa00' },
      { label: 'SARA',          age: '7mo', isTarget: false, icon: 'infant', col: '#ffaa00' },
    ],
    cdeNote: '4 confirmed civilians (wife + 3 children). IDF CDE threshold for junior-rank target: up to 20 civilians acceptable.',
    cdeColor: '#ff1a2e', cycleDuration: 22, nightMode: false,
    alarmText: '⚠  THRESHOLD CROSSED — TARGET + FAMILY AT RESIDENCE  ⚠',
  },
  {
    id: 2, label: 'PRE-DAWN STRIKE', tag: '03:17 LOCAL TIME', headerColor: 'rgba(80,120,255,0.9)',
    description: "Target visits parents overnight. Strike window: 03:17. Family sleeping. Elderly parents confirmed present by signals intelligence.",
    family: [
      { label: 'MAHMOUD (TARGET)', age: 41, isTarget: true,  icon: 'man',   col: '#ff1a2e' },
      { label: 'FATHER (ELDERLY)', age: 71, isTarget: false, icon: 'man',   col: '#ffaa00' },
      { label: 'MOTHER (ELDERLY)', age: 68, isTarget: false, icon: 'woman', col: '#ffaa00' },
    ],
    cdeNote: 'Strike authorized 03:17 while civilians sleeping. Elderly parents killed as accepted collateral damage.',
    cdeColor: '#ff1a2e', cycleDuration: 20, nightMode: true,
    alarmText: '⚠  03:17 LOCAL — STRIKE WINDOW — FAMILY SLEEPING  ⚠',
  },
];

interface Debris { x:number; y:number; vx:number; vy:number; life:number; sz:number; }
interface Fire   { x:number; y:number; vx:number; vy:number; life:number; }

interface Pedestrian {
  x:number; y:number; tx:number; ty:number;
  speed:number; col:string; sz:number;
  type: 'adult_m'|'adult_f'|'child';
  actTimer:number; paused:boolean; seed:number;
}

interface HitZone { x:number; y:number; r:number; label:string; lines:string[]; col:string; }

export function WheresDaddyModule() {
  const [activeScen,  setActiveScen]  = useState(1);
  const [tooltip, setTooltip] = useState<{x:number;y:number;label:string;lines:string[];col:string}|null>(null);

  const scenRef      = useRef(1);
  const radarAngle   = useRef(0);
  const debris       = useRef<Debris[]>([]);
  const fire         = useRef<Fire[]>([]);
  const alarmOn      = useRef(false);
  const alarmT       = useRef(0);
  const prevScen     = useRef(-1);
  const cycleStart   = useRef(0);
  const pedestrians  = useRef<Pedestrian[]>([]);
  const pedInitDone  = useRef(false);
  const hitZones     = useRef<HitZone[]>([]);

  const handleScenario = useCallback((id: number) => {
    setActiveScen(id);
    scenRef.current    = id;
    pedestrians.current = [];
    pedInitDone.current = false;
  }, []);

  // ── CANVAS DRAW ───────────────────────────────────────────────────────────
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    const panelY = 62;
    const scen   = SCENARIOS[scenRef.current];
    if (!scen) return;

    // ── Scenario change reset ─────────────────────────────────────────────
    if (prevScen.current !== scenRef.current) {
      prevScen.current   = scenRef.current;
      cycleStart.current = t;
      alarmOn.current    = false;
      alarmT.current     = 0;
      debris.current     = [];
      fire.current       = [];
    }

    const ct = (t - cycleStart.current) % scen.cycleDuration;

    // Cycle wrap
    if (ct < 0.08 && alarmOn.current && (t - cycleStart.current) > 1) {
      cycleStart.current = Math.floor((t - cycleStart.current) / scen.cycleDuration) * scen.cycleDuration + cycleStart.current;
      alarmOn.current = false; alarmT.current = 0;
      debris.current  = []; fire.current = [];
    }

    // ── Layout ──────────────────────────────────────────────────────────────
    const radarDiam = Math.min(w * 0.30, h * 0.46, 228);
    const radarR    = radarDiam / 2;
    const radarCX   = 16 + radarR;
    const radarCY   = panelY + 30 + radarR;

    const mapX  = 16 + radarDiam + 24;
    const mapW2 = w - mapX - 14;
    const mapY  = panelY + 30;
    const mapH2 = h - mapY - 88;

    const mapCX   = mapX + mapW2 * 0.5;
    const mapCY   = mapY + mapH2 * 0.5;
    const mapMaxR = Math.min(mapW2, mapH2) * 0.5;

    const toRadar = (mx: number, my: number) => ({
      rx: radarCX + ((mx - mapCX) / mapMaxR) * radarR * 0.88,
      ry: radarCY + ((my - mapCY) / mapMaxR) * radarR * 0.88,
    });

    // ── Street positions ────────────────────────────────────────────────────
    const SPH  = 11;  // street half-width (H streets)
    const SPV  = 11;  // street half-width (V streets)
    const H_Y1 = mapY + mapH2 * 0.30;
    const H_Y2 = mapY + mapH2 * 0.63;
    const V_X1 = mapX + mapW2 * 0.36;
    const V_X2 = mapX + mapW2 * 0.64;

    // ── Target residence (top-right block, clear of streets) ────────────────
    const houseX = mapX + mapW2 * 0.80;
    const houseY = mapY + mapH2 * 0.09;
    const houseW = 48;
    const houseH = 40;

    // ── Pedestrian init (first frame, after layout computed) ────────────────
    if (!pedInitDone.current) {
      pedInitDone.current = true;
      pedestrians.current = [
        // H1 walkers
        { x: mapX+mapW2*0.08, y: H_Y1-2,  tx: V_X1-15,          ty: H_Y1-2,  col:'#4db8ff', type:'adult_m', speed:22, sz:5, actTimer:Math.random()*4, paused:false, seed:1 },
        { x: V_X1+20,         y: H_Y1+2,  tx: mapX+mapW2*0.60,  ty: H_Y1+2,  col:'#ff8a65', type:'adult_f', speed:18, sz:5, actTimer:Math.random()*4, paused:false, seed:2 },
        // H2 walkers
        { x: mapX+mapW2*0.22, y: H_Y2-3,  tx: V_X2+12,          ty: H_Y2-3,  col:'#4db8ff', type:'adult_m', speed:20, sz:5, actTimer:Math.random()*4, paused:false, seed:3 },
        { x: mapX+mapW2*0.73, y: H_Y2+3,  tx: V_X1+10,          ty: H_Y2+3,  col:'#ff8a65', type:'adult_f', speed:16, sz:5, actTimer:Math.random()*4, paused:false, seed:4 },
        { x: mapX+mapW2*0.50, y: H_Y2-2,  tx: mapX+mapW2*0.88,  ty: H_Y2-2,  col:'#ffd54f', type:'child',   speed:25, sz:4, actTimer:Math.random()*4, paused:false, seed:5 },
        // V1 walkers
        { x: V_X1-1, y: mapY+mapH2*0.11, tx: V_X1-1, ty: H_Y1-15, col:'#a5d6a7', type:'adult_f', speed:17, sz:5, actTimer:Math.random()*4, paused:false, seed:6 },
        { x: V_X1+2, y: H_Y1+35,         tx: V_X1+2, ty: H_Y2-15, col:'#4db8ff', type:'adult_m', speed:21, sz:5, actTimer:Math.random()*4, paused:false, seed:7 },
        // V2 walker
        { x: V_X2-1, y: H_Y1+55,         tx: V_X2-1, ty: H_Y2+18, col:'#ff8a65', type:'adult_f', speed:16, sz:5, actTimer:Math.random()*4, paused:false, seed:8 },
      ];
    }

    // ── Target path & timing ────────────────────────────────────────────────
    const walkDur = scen.cycleDuration * 0.45;
    const pathPct = Math.min(ct / walkDur, 1.0);

    const pathPts = [
      { x: mapX + mapW2*0.02,  y: H_Y2              },
      { x: V_X1,               y: H_Y2              },
      { x: V_X1,               y: H_Y1              },
      { x: V_X2,               y: H_Y1              },
      { x: V_X2,               y: houseY+houseH*0.5 },
      { x: houseX-houseW/2,    y: houseY+houseH*0.5 },
    ];

    const totalSegs = pathPts.length - 1;
    const segIdx    = Math.min(Math.floor(pathPct * totalSegs), totalSegs - 1);
    const segPct    = pathPct * totalSegs - segIdx;
    const pfrom     = pathPts[segIdx];
    const pto       = pathPts[Math.min(segIdx + 1, totalSegs)];
    const dotX      = pfrom.x + (pto.x - pfrom.x) * segPct;
    const dotY      = pfrom.y + (pto.y - pfrom.y) * segPct;

    if (pathPct >= 0.97 && !alarmOn.current) { alarmOn.current = true; alarmT.current = ct; }
    const strikeDelay     = 2.2;
    const isStruck        = alarmOn.current && (ct - alarmT.current) > strikeDelay;
    const isAlarmFlash    = alarmOn.current && !isStruck;
    const timeSinceStrike = isStruck ? ct - alarmT.current - strikeDelay : 0;

    // ── Update pedestrians ──────────────────────────────────────────────────
    const fleeR = houseW * 4.2;
    for (const p of pedestrians.current) {
      if (isStruck) {
        // Flee from explosion
        const dx = p.x - houseX, dy = p.y - (houseY + houseH/2);
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < fleeR) {
          const spd = 60 + (fleeR - dist) / fleeR * 85;
          const nx  = dist > 0.01 ? dx/dist : (Math.random()-0.5);
          const ny  = dist > 0.01 ? dy/dist : (Math.random()-0.5);
          p.x = Math.max(mapX+2, Math.min(mapX+mapW2-2, p.x + nx*spd*dt));
          p.y = Math.max(mapY+2, Math.min(mapY+mapH2-2, p.y + ny*spd*dt));
        }
      } else {
        // Normal street walking
        p.actTimer -= dt;
        if (p.paused) {
          if (p.actTimer <= 0) { p.paused = false; p.actTimer = 3 + Math.random()*8; }
        } else {
          const dx = p.tx - p.x, dy = p.ty - p.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 4) {
            p.paused   = Math.random() < 0.3;
            p.actTimer = p.paused ? 1.5 + Math.random()*4 : 0;
            // Pick new waypoint on same street
            const onH = Math.abs(p.y - H_Y1) < 14 || Math.abs(p.y - H_Y2) < 14;
            if (onH) {
              const wxs = [mapX+mapW2*0.04, V_X1-20, V_X1+20, V_X2-20, V_X2+20, mapX+mapW2*0.92];
              p.tx = wxs[Math.floor(Math.random()*wxs.length)];
              p.ty = p.y + (Math.random()-0.5)*5;
            } else {
              const wys = [mapY+mapH2*0.06, H_Y1-18, H_Y1+18, H_Y2-18, H_Y2+18, mapY+mapH2*0.92];
              p.ty = wys[Math.floor(Math.random()*wys.length)];
              p.tx = p.x + (Math.random()-0.5)*5;
            }
          } else {
            p.x += (dx/dist) * p.speed * dt;
            p.y += (dy/dist) * p.speed * dt;
          }
        }
      }
    }

    // Clear hit zones each frame
    hitZones.current = [];

    // ════════════════════════════════════════════════════════════════════════
    // NIGHT MODE OVERLAY
    // ════════════════════════════════════════════════════════════════════════
    if (scen.nightMode) {
      ctx.fillStyle = 'rgba(0,3,14,0.42)'; ctx.fillRect(0, panelY, w, h-panelY);
      for (let s = 0; s < 55; s++) {
        const sx = ((s*137+7)%(w-30))+15, sy = panelY+5+((s*97)%(mapH2*0.52));
        ctx.beginPath(); ctx.arc(sx, sy, 0.6, 0, Math.PI*2);
        ctx.fillStyle = `rgba(200,215,255,${0.15+0.45*Math.sin(t*0.5+s)})`; ctx.fill();
      }
      drawHUDText(ctx, '03:17:42 LOCAL', w-112, panelY+16, 'rgba(80,120,255,0.72)', 8);
    }

    // ════════════════════════════════════════════════════════════════════════
    // ① RADAR
    // ════════════════════════════════════════════════════════════════════════
    drawHUDText(ctx, 'GEOFENCE RADAR — LIVE COORDINATE TRACK', 16, panelY+16, '#00d47e', 8);

    const rbg = ctx.createRadialGradient(radarCX, radarCY, 0, radarCX, radarCY, radarR);
    rbg.addColorStop(0, scen.nightMode ? 'rgba(0,6,22,0.97)' : 'rgba(0,16,8,0.97)');
    rbg.addColorStop(1, scen.nightMode ? 'rgba(0,3,14,0.97)' : 'rgba(0,10,5,0.97)');
    ctx.fillStyle = rbg;
    ctx.beginPath(); ctx.arc(radarCX, radarCY, radarR, 0, Math.PI*2); ctx.fill();

    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath(); ctx.arc(radarCX, radarCY, radarR*ring/4, 0, Math.PI*2);
      ctx.strokeStyle = scen.nightMode ? 'rgba(60,90,200,0.16)' : 'rgba(0,212,126,0.14)';
      ctx.lineWidth = 0.5; ctx.stroke();
      ctx.font = '5.5px "JetBrains Mono",monospace';
      ctx.fillStyle = scen.nightMode ? 'rgba(60,90,200,0.28)' : 'rgba(0,212,126,0.22)';
      ctx.fillText(`${ring*200}m`, radarCX+3, radarCY-radarR*ring/4+4);
    }

    ctx.strokeStyle = scen.nightMode ? 'rgba(60,90,200,0.1)' : 'rgba(0,212,126,0.1)'; ctx.lineWidth=0.4;
    [[radarCX-radarR,radarCY,radarCX+radarR,radarCY],[radarCX,radarCY-radarR,radarCX,radarCY+radarR]].forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });

    radarAngle.current += dt * 1.15;
    for (let i = 28; i >= 0; i--) {
      const ang = radarAngle.current - (i/28)*1.4;
      const a   = (1-i/28)*0.4;
      ctx.fillStyle = scen.nightMode ? `rgba(60,100,255,${a*0.13})` : `rgba(0,212,126,${a*0.13})`;
      ctx.beginPath(); ctx.moveTo(radarCX,radarCY); ctx.arc(radarCX,radarCY,radarR,ang,ang+1.4/28); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = scen.nightMode ? 'rgba(80,130,255,0.85)' : 'rgba(0,212,126,0.85)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(radarCX,radarCY);
    ctx.lineTo(radarCX+Math.cos(radarAngle.current)*radarR, radarCY+Math.sin(radarAngle.current)*radarR); ctx.stroke();

    // Radar blip helper
    const drawBlip = (mx: number, my: number, sz: number, col: string, alwaysOn=false) => {
      const {rx,ry} = toRadar(mx,my);
      if (Math.sqrt((rx-radarCX)**2+(ry-radarCY)**2) > radarR*0.97) return;
      const ang  = Math.atan2(ry-radarCY, rx-radarCX);
      const diff = ((radarAngle.current-ang)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
      const fa   = alwaysOn ? 0.8 : Math.max(0, 0.85*(1-diff/(Math.PI*2)));
      if (fa < 0.04) return;
      const prev = ctx.globalAlpha; ctx.globalAlpha = fa;
      ctx.beginPath(); ctx.arc(rx,ry,sz,0,Math.PI*2); ctx.fillStyle=col; ctx.fill();
      ctx.globalAlpha = prev;
    };

    // Block center blips (represents buildings)
    const bCols = [[mapX+(V_X1-mapX)*0.5,(mapY+H_Y1)*0.5],[((V_X1+V_X2)*0.5),(mapY+H_Y1)*0.5],[V_X2+(mapX+mapW2-V_X2)*0.5,(mapY+H_Y1)*0.5],
                   [mapX+(V_X1-mapX)*0.5,(H_Y1+H_Y2)*0.5],[((V_X1+V_X2)*0.5),(H_Y1+H_Y2)*0.5],[V_X2+(mapX+mapW2-V_X2)*0.5,(H_Y1+H_Y2)*0.5],
                   [mapX+(V_X1-mapX)*0.5,(H_Y2+mapY+mapH2)*0.5],[((V_X1+V_X2)*0.5),(H_Y2+mapY+mapH2)*0.5],[V_X2+(mapX+mapW2-V_X2)*0.5,(H_Y2+mapY+mapH2)*0.5]];
    for (const [bx,by] of bCols) drawBlip(bx,by,2.0,scen.nightMode?'rgb(55,80,185)':'rgb(0,135,75)');

    // Civilian blips — person-type coloured
    for (const p of pedestrians.current) {
      const bc = p.type==='adult_f'?'rgb(255,138,101)':p.type==='child'?'rgb(255,213,50)':'rgb(77,184,255)';
      drawBlip(p.x, p.y, 1.6, isStruck?'rgb(255,120,45)':bc);
    }

    // House blip — always visible
    {
      const {rx,ry} = toRadar(houseX, houseY+houseH/2);
      if (Math.sqrt((rx-radarCX)**2+(ry-radarCY)**2) < radarR) {
        const prev = ctx.globalAlpha;
        ctx.globalAlpha = isStruck ? 0.95 : 0.55+0.3*Math.abs(Math.sin(t*2));
        ctx.beginPath(); ctx.arc(rx,ry,isStruck?5.5:3.5,0,Math.PI*2);
        ctx.fillStyle = isStruck?'#ff1a2e':'#ffaa00'; ctx.fill();
        ctx.beginPath(); ctx.arc(rx,ry,7+3*Math.abs(Math.sin(t*3)),0,Math.PI*2);
        ctx.strokeStyle = isStruck?'rgba(255,26,46,0.55)':'rgba(255,170,0,0.38)'; ctx.lineWidth=0.8; ctx.stroke();
        ctx.globalAlpha = prev;
        ctx.font='5.5px "JetBrains Mono",monospace';
        ctx.fillStyle = isStruck?'rgba(255,26,46,0.75)':'rgba(255,170,0,0.65)';
        ctx.fillText('HOME',rx+6,ry+2);
      }
    }

    // Target blip
    if (!isStruck || timeSinceStrike < 0.8) {
      const {rx,ry} = toRadar(dotX,dotY);
      if (Math.sqrt((rx-radarCX)**2+(ry-radarCY)**2) < radarR) {
        ctx.beginPath(); ctx.arc(rx,ry,4.5,0,Math.PI*2);
        ctx.fillStyle='#ff1a2e'; ctx.shadowColor='#ff1a2e'; ctx.shadowBlur=8; ctx.fill(); ctx.shadowBlur=0;
        ctx.beginPath(); ctx.arc(rx,ry,4.5+5*Math.abs(Math.sin(t*4)),0,Math.PI*2);
        ctx.strokeStyle='rgba(255,26,46,0.4)'; ctx.lineWidth=0.8; ctx.stroke();
        ctx.font='5.5px "JetBrains Mono",monospace'; ctx.fillStyle='rgba(255,26,46,0.85)';
        ctx.fillText('TGT',rx+6,ry+2);
      }
    }

    // Radar border
    ctx.beginPath(); ctx.arc(radarCX,radarCY,radarR,0,Math.PI*2);
    ctx.strokeStyle = scen.nightMode?'rgba(60,90,200,0.45)':'rgba(0,212,126,0.42)'; ctx.lineWidth=1.2; ctx.stroke();

    const radBot = radarCY + radarR + 12;
    drawHUDText(ctx,`SWEEP: ${((radarAngle.current*180/Math.PI)%360).toFixed(0)}°`,16,radBot,'#536878',7);
    drawHUDText(ctx,`STATUS: ${pathPct>=0.97?'AT RESIDENCE':'EN ROUTE'}`,16,radBot+12,pathPct>=0.97?'#ff1a2e':'#00d47e',7);
    if (scen.nightMode) drawHUDText(ctx,'03:17 LOCAL — FAMILY SLEEPING',16,radBot+24,'rgba(80,120,255,0.75)',7);

    // Radar legend
    const legX = 16, legY = radBot + 38;
    ctx.font='5px "JetBrains Mono",monospace';
    [['#4db8ff','CIVILIAN (M)'],['#ff8a65','CIVILIAN (F)'],['#ffd54f','CHILD'],['#ff1a2e','TARGET'],['#ffaa00','RESIDENCE']].forEach(([col,lbl],i)=>{
      ctx.beginPath(); ctx.arc(legX+3, legY+i*10, 2.5, 0, Math.PI*2); ctx.fillStyle=col; ctx.fill();
      ctx.fillStyle='#536878'; ctx.fillText(lbl, legX+9, legY+i*10+2);
    });

    // ════════════════════════════════════════════════════════════════════════
    // ② STREET MAP
    // ════════════════════════════════════════════════════════════════════════
    drawHUDText(ctx,"GEOFENCE TRACK // WHERE'S DADDY",mapX,panelY+16,'#ff1a2e',10);
    drawHUDText(ctx,'— REAL-TIME PROXIMITY ALERT',mapX+202,panelY+16,'#536878',8);

    ctx.fillStyle = scen.nightMode?'rgba(2,4,18,0.93)':'rgba(4,8,14,0.90)';
    ctx.fillRect(mapX, mapY, mapW2, mapH2);

    // Fine grid
    ctx.strokeStyle = scen.nightMode?'rgba(28,46,115,0.07)':'rgba(0,212,126,0.04)'; ctx.lineWidth=0.4;
    for (let gx=mapX; gx<mapX+mapW2; gx+=20) { ctx.beginPath(); ctx.moveTo(gx,mapY); ctx.lineTo(gx,mapY+mapH2); ctx.stroke(); }
    for (let gy=mapY; gy<mapY+mapH2; gy+=20) { ctx.beginPath(); ctx.moveTo(mapX,gy); ctx.lineTo(mapX+mapW2,gy); ctx.stroke(); }

    // ── Streets ───────────────────────────────────────────────────────────
    const stFill  = scen.nightMode?'rgba(14,22,62,0.55)':'rgba(0,175,95,0.045)';
    const stEdge  = scen.nightMode?'rgba(38,62,155,0.20)':'rgba(0,212,126,0.10)';
    const stCl    = scen.nightMode?'rgba(38,62,155,0.09)':'rgba(0,212,126,0.055)';

    for (const hy of [H_Y1, H_Y2]) {
      ctx.fillStyle=stFill; ctx.fillRect(mapX,hy-SPH,mapW2,SPH*2);
      ctx.setLineDash([7,6]); ctx.strokeStyle=stCl; ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.moveTo(mapX,hy); ctx.lineTo(mapX+mapW2,hy); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle=stEdge; ctx.lineWidth=0.6;
      [hy-SPH,hy+SPH].forEach(y=>{ctx.beginPath();ctx.moveTo(mapX,y);ctx.lineTo(mapX+mapW2,y);ctx.stroke();});
    }
    for (const vx of [V_X1, V_X2]) {
      ctx.fillStyle=stFill; ctx.fillRect(vx-SPV,mapY,SPV*2,mapH2);
      ctx.setLineDash([7,6]); ctx.strokeStyle=stCl; ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.moveTo(vx,mapY); ctx.lineTo(vx,mapY+mapH2); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle=stEdge; ctx.lineWidth=0.6;
      [vx-SPV,vx+SPV].forEach(x=>{ctx.beginPath();ctx.moveTo(x,mapY);ctx.lineTo(x,mapY+mapH2);ctx.stroke();});
    }

    // ── Buildings (seeded, within block boundaries — never overlap streets) ─
    // 9 blocks: 3 columns × 3 rows
    const blocks = [
      {x0:mapX+4,       y0:mapY+4,        x1:V_X1-SPV-4, y1:H_Y1-SPH-4},  // 0: top-left
      {x0:V_X1+SPV+4,   y0:mapY+4,        x1:V_X2-SPV-4, y1:H_Y1-SPH-4},  // 1: top-mid
      {x0:V_X2+SPV+4,   y0:mapY+4,        x1:mapX+mapW2-4, y1:H_Y1-SPH-4}, // 2: top-right (RESIDENCE)
      {x0:mapX+4,       y0:H_Y1+SPH+4,    x1:V_X1-SPV-4, y1:H_Y2-SPH-4},  // 3: mid-left
      {x0:V_X1+SPV+4,   y0:H_Y1+SPH+4,    x1:V_X2-SPV-4, y1:H_Y2-SPH-4},  // 4: mid-mid
      {x0:V_X2+SPV+4,   y0:H_Y1+SPH+4,    x1:mapX+mapW2-4, y1:H_Y2-SPH-4}, // 5: mid-right
      {x0:mapX+4,       y0:H_Y2+SPH+4,    x1:V_X1-SPV-4, y1:mapY+mapH2-4}, // 6: bot-left
      {x0:V_X1+SPV+4,   y0:H_Y2+SPH+4,    x1:V_X2-SPV-4, y1:mapY+mapH2-4}, // 7: bot-mid
      {x0:V_X2+SPV+4,   y0:H_Y2+SPH+4,    x1:mapX+mapW2-4, y1:mapY+mapH2-4},// 8: bot-right
    ];

    let bseed = 0x7e57c0de;
    const brnd = () => { bseed=(Math.imul(1664525,bseed)+1013904223)>>>0; return bseed/0xffffffff; };

    for (let bi = 0; bi < blocks.length; bi++) {
      const blk = blocks[bi];
      const bw  = blk.x1-blk.x0, bh = blk.y1-blk.y0;
      if (bw < 18 || bh < 18) continue;
      const n = bi===2 ? 0 : 2+Math.floor(brnd()*3); // residence block = no extra buildings
      for (let i = 0; i < n; i++) {
        const bldW = Math.max(16, bw*(0.22+brnd()*0.28));
        const bldH = Math.max(14, bh*(0.22+brnd()*0.30));
        const bx   = blk.x0 + brnd()*Math.max(0, bw-bldW-4);
        const by   = blk.y0 + brnd()*Math.max(0, bh-bldH-4);

        ctx.fillStyle   = scen.nightMode?'rgba(8,12,40,0.82)':'rgba(9,16,26,0.78)';
        ctx.strokeStyle = scen.nightMode?'rgba(34,50,138,0.42)':'rgba(18,32,52,0.58)';
        ctx.lineWidth=0.6; ctx.fillRect(bx,by,bldW,bldH); ctx.strokeRect(bx,by,bldW,bldH);

        // Day windows
        if (!scen.nightMode && bldW>16) {
          ctx.fillStyle='rgba(0,150,80,0.055)';
          for(let wc=0;wc<Math.floor(bldW/9);wc++) for(let wr=0;wr<Math.floor(bldH/10);wr++)
            ctx.fillRect(bx+3+wc*9, by+4+wr*10, 5, 6);
        }
        // Night lit windows
        if (scen.nightMode && bldW>14) {
          const lit=((bx*7+by*3)%10)>5;
          if(lit){ ctx.fillStyle='rgba(255,200,80,0.36)'; ctx.fillRect(bx+3,by+4,5,5); if(bldW>22)ctx.fillRect(bx+12,by+4,5,5); }
        }
      }
    }

    // ── Register house hit zone ──────────────────────────────────────────────
    hitZones.current.push({
      x:houseX, y:houseY+houseH/2, r:Math.max(houseW,houseH)*1.0,
      label:'🏠 TARGET RESIDENCE',
      lines:[
        scen.id===1?"Ahmad's Family Home — Gaza City":scen.id===2?"Mahmoud's Parents' Home — Gaza":'Target Residence — Gaza',
        `${scen.family.length} known occupant${scen.family.length>1?'s':''}`,
        "Geofenced by IDF \"Where's Daddy?\" algorithm",
        isStruck?'● STRIKE EXECUTED':isAlarmFlash?'⚠ STRIKE AUTHORIZED — TARGET INSIDE':'◌ Under continuous surveillance',
      ],
      col:isStruck?'#ff1a2e':isAlarmFlash?'#ff6600':'#00d47e',
    });

    // ── TARGET HOUSE RENDER ─────────────────────────────────────────────────
    const houseBaseCol = isStruck?'#ff1a2e':isAlarmFlash?'#ff1a2e':'#00d47e';
    const houseFlicker = isAlarmFlash?(0.5+0.4*Math.sin(t*9)):1;

    if (!isStruck) {
      // Geofence circles
      const gfR1 = houseW*(1.6+0.14*Math.sin(t*3));
      const gfR2 = gfR1+13+7*Math.sin(t*2.5);
      const gfInt = pathPct>=0.96 ? 0.76 : 0.22;
      for (const [r,ri] of [[gfR1,0],[gfR2,1]] as [number,number][]) {
        ctx.beginPath(); ctx.arc(houseX, houseY+houseH/2, r, 0, Math.PI*2);
        ctx.strokeStyle=`rgba(255,26,46,${gfInt*houseFlicker*(ri===1?0.34:1)})`;
        ctx.lineWidth=pathPct>=0.96?1.6:0.7; ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);
      }

      ctx.shadowColor = isAlarmFlash?'#ff1a2e':'transparent';
      ctx.shadowBlur  = isAlarmFlash?20:0;

      // Roof
      ctx.fillStyle   = isAlarmFlash?`rgba(255,26,46,${0.12*houseFlicker})`:scen.nightMode?'rgba(13,20,54,0.62)':'rgba(0,175,95,0.07)';
      ctx.strokeStyle = houseBaseCol; ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.moveTo(houseX-houseW/2-5, houseY);
      ctx.lineTo(houseX,             houseY-houseH*0.44);
      ctx.lineTo(houseX+houseW/2+5, houseY);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Body
      ctx.fillStyle   = isAlarmFlash?`rgba(255,26,46,${0.09*houseFlicker})`:scen.nightMode?'rgba(10,16,50,0.64)':'rgba(0,175,95,0.056)';
      ctx.fillRect(houseX-houseW/2, houseY, houseW, houseH);
      ctx.strokeStyle = houseBaseCol; ctx.lineWidth=1.5;
      ctx.strokeRect(houseX-houseW/2, houseY, houseW, houseH);

      // Vertical divider (internal wall hint)
      ctx.strokeStyle='rgba(0,212,126,0.06)'; ctx.lineWidth=0.4;
      ctx.beginPath(); ctx.moveTo(houseX, houseY+4); ctx.lineTo(houseX, houseY+houseH); ctx.stroke();

      // Windows (2 front)
      const winY=houseY+8, winH=11, winW=10;
      for (const wx of [houseX-houseW/2+5, houseX+houseW/2-15]) {
        ctx.fillStyle=scen.nightMode?'rgba(255,200,80,0.50)':isAlarmFlash?`rgba(255,100,0,${0.30*houseFlicker})`:'rgba(0,200,100,0.11)';
        ctx.fillRect(wx,winY,winW,winH); ctx.strokeStyle=houseBaseCol; ctx.lineWidth=0.5; ctx.strokeRect(wx,winY,winW,winH);
        // Window cross
        ctx.strokeStyle=scen.nightMode?'rgba(255,200,80,0.20)':'rgba(0,200,100,0.08)'; ctx.lineWidth=0.4;
        ctx.beginPath();ctx.moveTo(wx+winW/2,winY);ctx.lineTo(wx+winW/2,winY+winH);ctx.stroke();
        ctx.beginPath();ctx.moveTo(wx,winY+winH/2);ctx.lineTo(wx+winW,winY+winH/2);ctx.stroke();
      }

      // Door
      ctx.fillStyle   = isAlarmFlash?`rgba(255,26,46,${0.38*houseFlicker})`:'rgba(0,175,95,0.14)';
      ctx.strokeStyle = houseBaseCol; ctx.lineWidth=0.5;
      ctx.fillRect(houseX-5.5, houseY+houseH-15, 11, 15); ctx.strokeRect(houseX-5.5, houseY+houseH-15, 11, 15);
      // Door knob
      ctx.beginPath(); ctx.arc(houseX+3, houseY+houseH-8, 1, 0, Math.PI*2);
      ctx.fillStyle=houseBaseCol; ctx.fill();

      // Chimney
      ctx.fillStyle   = scen.nightMode?'rgba(13,20,54,0.65)':'rgba(9,16,26,0.65)';
      ctx.strokeStyle = houseBaseCol; ctx.lineWidth=0.5;
      ctx.fillRect(houseX+houseW/2-14, houseY-houseH*0.26, 8, houseH*0.30);
      ctx.strokeRect(houseX+houseW/2-14, houseY-houseH*0.26, 8, houseH*0.30);

      // Smoke puffs (idle, daytime)
      if (!scen.nightMode && !isAlarmFlash) {
        for (let s=0; s<3; s++) {
          const sp = (t*0.38+s*0.72)%1;
          const sr = 2.2+sp*5, sa = 0.18*(1-sp);
          if(sa>0.01){ctx.beginPath();ctx.arc(houseX+houseW/2-10,houseY-houseH*0.26-2-sp*14,sr,0,Math.PI*2);ctx.fillStyle=`rgba(110,135,155,${sa})`;ctx.fill();}
        }
      }

      ctx.shadowBlur = 0;

      // ── FAMILY INSIDE HOUSE (visible from cycle start — scenarios 1 & 2) ──
      if (scen.id===1 || scen.id===2) {
        const civilians = scen.family.filter(m=>!m.isTarget);
        civilians.forEach((m, mi) => {
          const fsx  = houseX - houseW/2 + 8 + mi * 10.5;
          const fsy  = houseY + houseH * 0.58;
          const fsz  = m.icon==='infant' ? 3.5 : m.icon==='child' ? 4.5 : 6.2;
          // Gentle idle sway animation
          const sway = Math.sin(t*0.65+mi*1.15) * 0.9;
          const col  = isAlarmFlash ? `rgba(255,${150+mi*15},0,${0.7+0.25*Math.sin(t*8+mi)})` : m.col;
          drawPersonIcon(ctx, fsx+sway, fsy, fsz, col);
          // Activity dot (day=awake glow, night=sleep indicator)
          if (!isAlarmFlash) {
            ctx.font = '5px monospace';
            ctx.fillStyle = scen.nightMode ? 'rgba(80,120,255,0.30)' : 'rgba(255,170,0,0.22)';
            ctx.fillText(scen.nightMode ? 'z' : '·', fsx+3.5, fsy-fsz-1.5);
          }
        });
        if (!isAlarmFlash) {
          drawHUDText(ctx, `${civilians.length} INSIDE`, houseX-houseW/2+1, houseY+houseH+7, '#ffaa00', 6);
        }
      }

    } else {
      // ── POST-STRIKE RUBBLE ────────────────────────────────────────────────
      ctx.fillStyle='rgba(255,26,46,0.13)'; ctx.strokeStyle='rgba(255,26,46,0.6)'; ctx.lineWidth=0.8;
      ctx.fillRect(houseX-houseW/2, houseY+houseH*0.45, houseW, houseH*0.55);
      ctx.strokeRect(houseX-houseW/2, houseY+houseH*0.45, houseW, houseH*0.55);

      // Scorch mark
      const sc = ctx.createRadialGradient(houseX,houseY+houseH*0.72,2,houseX,houseY+houseH*0.72,houseW*1.65);
      sc.addColorStop(0,'rgba(255,80,0,0.18)'); sc.addColorStop(1,'rgba(255,26,46,0)');
      ctx.fillStyle=sc; ctx.fillRect(houseX-houseW*1.75,houseY-16,houseW*3.5,houseH*3.0);

      // Fire particles
      if (timeSinceStrike<5) {
        for(let i=0;i<3;i++) fire.current.push({x:houseX+(Math.random()-0.5)*houseW*0.65,y:houseY+houseH*0.35,vx:(Math.random()-0.5)*32,vy:-(22+Math.random()*42),life:1});
      }
      for(const fp of fire.current){fp.x+=fp.vx*dt;fp.y+=fp.vy*dt;fp.vy-=10*dt;fp.life-=dt*1.1;
        if(fp.life>0){ctx.beginPath();ctx.arc(fp.x,fp.y,2+fp.life*3.2,0,Math.PI*2);ctx.fillStyle=`rgba(255,${Math.floor(58+fp.life*134)},0,${fp.life*0.9})`;ctx.fill();}}
      fire.current=fire.current.filter(fp=>fp.life>0);

      // Debris particles
      if(debris.current.length<55&&timeSinceStrike<2.0){
        for(let i=0;i<5;i++) debris.current.push({x:houseX+(Math.random()-0.5)*houseW*0.8,y:houseY+houseH*0.38,vx:(Math.random()-0.5)*98,vy:-62-Math.random()*92,life:1,sz:1.5+Math.random()*2.5});
      }
      for(const d of debris.current){d.x+=d.vx*dt;d.y+=d.vy*dt;d.vy+=172*dt;d.life-=dt*0.55;
        if(d.life>0){ctx.beginPath();ctx.arc(d.x,d.y,d.sz,0,Math.PI*2);ctx.fillStyle=`rgba(185,125,35,${d.life*0.85})`;ctx.fill();}}
      debris.current=debris.current.filter(d=>d.life>0);

      drawHUDText(ctx,'STRIKE EXECUTED',houseX-42,houseY+houseH*1.45+14,'#ff1a2e',8);
      if ((scen.id===1||scen.id===2)&&timeSinceStrike>0.5) {
        const cc=scen.family.filter(m=>!m.isTarget).length;
        drawHUDText(ctx,`${cc+1} KILLED — ${cc} CIVILIAN${cc>1?'S':''}`,houseX-56,houseY+houseH*1.45+28,'#ff6600',8);
      }
    }

    // House labels
    const lbY = houseY - houseH*0.44 - 17;
    drawHUDText(ctx,'TARGET RESIDENCE',houseX-houseW/2-2,lbY, pathPct>=0.96?'#ff1a2e':'#ccd6e0',7);
    if(scen.id===1) drawHUDText(ctx,'FAMILY PRESENT — 5 OCCUPANTS',houseX-houseW/2-2,lbY+10,'#ffaa00',6.5);
    if(scen.id===2) drawHUDText(ctx,"PARENTS' HOME — SLEEPING",houseX-houseW/2-2,lbY+10,'#ffaa00',6.5);

    // Family icons above house (alarm phase — everyone visible outside)
    if ((scen.id===1||scen.id===2) && pathPct>=0.88 && !isStruck) {
      scen.family.forEach((m,mi)=>{
        const ix=houseX-houseW/2+4+mi*11, iy=houseY-10;
        const fl=isAlarmFlash?(0.55+0.40*Math.sin(t*8+mi)):1;
        drawPersonIcon(ctx,ix,iy, m.icon==='infant'?4:m.icon==='child'?5.2:6.8, isAlarmFlash?`rgba(255,26,46,${fl})`:m.col);
        if(isAlarmFlash){
          ctx.strokeStyle='rgba(255,26,46,0.55)'; ctx.lineWidth=0.65;
          ctx.beginPath();ctx.moveTo(ix-3.5,iy-10);ctx.lineTo(ix+3.5,iy-3);ctx.stroke();
          ctx.beginPath();ctx.moveTo(ix+3.5,iy-10);ctx.lineTo(ix-3.5,iy-3);ctx.stroke();
        }
      });
    }

    // ── Path trail (dotted, follows streets) ─────────────────────────────────
    for (let pi=0; pi<pathPts.length-1; pi++) {
      ctx.strokeStyle=scen.nightMode?'rgba(55,95,195,0.14)':'rgba(0,212,126,0.14)';
      ctx.lineWidth=1; ctx.setLineDash([2,5]);
      ctx.beginPath(); ctx.moveTo(pathPts[pi].x,pathPts[pi].y); ctx.lineTo(pathPts[pi+1].x,pathPts[pi+1].y);
      ctx.stroke(); ctx.setLineDash([]);
    }

    // ── Civilian pedestrians — person icons ─────────────────────────────────
    for (const p of pedestrians.current) {
      const pedCol = isStruck ? `rgba(255,${110+p.seed*12},45,0.78)` : p.col;
      drawPersonIcon(ctx, p.x, p.y, p.sz, pedCol);

      // Tooltip hit zone per pedestrian
      hitZones.current.push({
        x:p.x, y:p.y, r:14,
        label: isStruck ? '🏃 FLEEING — NO WARNING GIVEN'
             : p.type==='child' ? '👧 CHILD — CIVILIAN'
             : p.type==='adult_f' ? '👤 CIVILIAN (FEMALE)'
             : '👤 CIVILIAN (MALE)',
        lines:[
          isStruck ? 'Running from strike zone — no evacuation warning' : 'Going about daily life',
          'No weapon signature detected by algorithm',
          'Not included in IDF target dataset',
          isStruck
            ? `~${Math.round(Math.sqrt((p.x-houseX)**2+(p.y-houseY-houseH/2)**2))}px from blast epicentre`
            : 'Within algorithmic passive collection zone',
        ],
        col: isStruck ? '#ff6600' : '#4db8ff',
      });
    }

    // ── Target person icon ───────────────────────────────────────────────────
    if (!isStruck || timeSinceStrike < 0.5) {
      // Glow
      ctx.shadowColor='#ff1a2e'; ctx.shadowBlur=14;
      drawPersonIcon(ctx, dotX, dotY, 7.5, '#ff1a2e');
      ctx.shadowBlur=0;
      // Pulse ring
      ctx.beginPath(); ctx.arc(dotX,dotY, 7.5+8*Math.abs(Math.sin(t*3.8)), 0, Math.PI*2);
      ctx.strokeStyle='rgba(255,26,46,0.35)'; ctx.lineWidth=1; ctx.stroke();
      // Labels
      const tName=scen.family[0].label.split(' ')[0].toUpperCase();
      drawHUDText(ctx,tName,dotX+11,dotY+3,'#ff1a2e',7);
      drawHUDText(ctx,'TGT',dotX+11,dotY+13,'rgba(255,26,46,0.52)',6);

      // Target hit zone
      hitZones.current.push({
        x:dotX, y:dotY, r:20,
        label:`⚠ TARGET — ${scen.family[0].label}`,
        lines:[
          `Age ${scen.family[0].age} · IDF junior-rank designation`,
          'Lavender AI classification confidence: 90%+',
          'Signal: phone IMEI geofenced to this residence',
          'Threshold CROSSED → strike window open',
          'Accepted collateral: up to 20 civilian deaths',
        ],
        col:'#ff1a2e',
      });
    }

    // ── Alarm banner ─────────────────────────────────────────────────────────
    if (isAlarmFlash && Math.floor(t*5)%2===0) {
      ctx.fillStyle='rgba(255,26,46,0.94)'; ctx.fillRect(mapX, mapY+mapH2-30, mapW2, 28);
      ctx.font='bold 10px "JetBrains Mono",monospace'; ctx.fillStyle='#ffffff'; ctx.textAlign='center';
      ctx.fillText(scen.alarmText, mapX+mapW2/2, mapY+mapH2-12); ctx.textAlign='left';
    }

    // ════════════════════════════════════════════════════════════════════════
    // ③ BOTTOM HUD
    // ════════════════════════════════════════════════════════════════════════
    const hudY = h - 28;
    ctx.fillStyle='rgba(4,4,8,0.95)'; ctx.fillRect(0,hudY-8,w,36);
    ctx.strokeStyle='rgba(26,37,53,0.5)'; ctx.lineWidth=0.5;
    ctx.beginPath();ctx.moveTo(0,hudY-8);ctx.lineTo(w,hudY-8);ctx.stroke();

    const civCount=scen.family.filter(m=>!m.isTarget).length;
    drawHUDText(ctx,`CT: ${ct.toFixed(1)}s`,                             16,      hudY+8,'#536878',8);
    drawHUDText(ctx,`PATH: ${(pathPct*100).toFixed(0)}%`,                w*0.13,  hudY+8,'#00d47e',8);
    drawHUDText(ctx,`THRESHOLD: ${alarmOn.current?'CROSSED ●':'CLEAR ○'}`,w*0.27, hudY+8,alarmOn.current?'#ff1a2e':'#536878',8);
    drawHUDText(ctx,`CIVILIANS IN RADIUS: ${civCount+pedestrians.current.length}`,w*0.52,hudY+8,'#ffaa00',8);
    drawHUDText(ctx,isStruck?'▶ STRIKE EXECUTED':isAlarmFlash?'▶ STRIKE PENDING':'○ MONITORING',
      w*0.76,hudY+8,isStruck?'#ff1a2e':isAlarmFlash?'#ff6600':'#536878',8);
  }, []);

  // ── Mouse tooltip handler ─────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX-rect.left, my = e.clientY-rect.top;
    let found: HitZone|null = null, minD = Infinity;
    for (const hz of hitZones.current) {
      const d = Math.sqrt((mx-hz.x)**2+(my-hz.y)**2);
      if (d < hz.r && d < minD) { found=hz; minD=d; }
    }
    setTooltip(found ? {x:mx,y:my,label:found.label,lines:found.lines,col:found.col} : null);
  }, []);

  const scen     = SCENARIOS[activeScen];
  const civCount = scen.family.filter(m => !m.isTarget).length;

  return (
    <div className="relative w-full h-full">

      {/* Canvas + mouse handler */}
      <div
        className="absolute inset-0"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <ModuleCanvas
          title="WHERE'S DADDY — REAL-TIME PROXIMITY ALERT SYSTEM"
          subtitle="Geofence tracking → residence threshold crossing → strike trigger  ·  IDF algorithm, Gaza 2023–24"
          moduleId="MODULE 4 // PROXIMITY ALERT"
          draw={draw}
        />
      </div>

      {/* ── Hover Tooltip ──────────────────────────────────────────────────── */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-50 font-mono"
          style={{ left: tooltip.x+16, top: Math.max(80, tooltip.y-78), maxWidth: 240 }}
        >
          <div style={{
            background:    'rgba(4,6,12,0.97)',
            border:        `1px solid ${tooltip.col}48`,
            borderLeft:    `2.5px solid ${tooltip.col}`,
            borderRadius:   5,
            padding:       '8px 11px',
            boxShadow:     `0 10px 38px rgba(0,0,0,0.88), 0 0 14px ${tooltip.col}16`,
          }}>
            <div style={{ color:tooltip.col, fontWeight:800, fontSize:8, letterSpacing:'0.08em', marginBottom:6 }}>
              {tooltip.label}
            </div>
            {tooltip.lines.map((l,i) => (
              <div key={i} style={{ color:'#8892a4', fontSize:7.5, lineHeight:1.65 }}>{l}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── Scenario selector ──────────────────────────────────────────────── */}
      <div
        className="absolute font-mono flex flex-col gap-1 pointer-events-auto"
        style={{ left:14, bottom:36, zIndex:10 }}
      >
        <span className="text-[6px] text-terminal-text-faint tracking-widest uppercase mb-0.5">Scenario</span>
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            onClick={() => handleScenario(s.id)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded border text-left transition-all text-[7.5px] font-bold"
            style={{
              background:  activeScen===s.id ? 'rgba(255,26,46,0.12)' : 'rgba(5,5,8,0.55)',
              borderColor: activeScen===s.id ? 'rgba(255,26,46,0.55)' : 'rgba(26,37,53,0.5)',
              color:       activeScen===s.id ? '#ff1a2e' : '#536878',
            }}
          >
            <span style={{fontSize:10}}>{activeScen===s.id?'▶':'○'}</span>
            <span className="flex-1">{s.label}</span>
            {s.nightMode && <Moon className="w-2.5 h-2.5 shrink-0" style={{color:'rgba(80,120,255,0.7)'}}/>}
            <span className="text-[5.5px] font-normal shrink-0" style={{color:activeScen===s.id?'rgba(255,26,46,0.5)':'#2a3a4a'}}>
              {s.tag}
            </span>
          </button>
        ))}
      </div>

      {/* ── Occupant / CDE Panel ────────────────────────────────────────────── */}
      <div
        className="absolute font-mono pointer-events-auto"
        style={{ right:14, top:66, width:222, zIndex:10 }}
      >
        <div
          className="rounded overflow-hidden text-[7px] leading-relaxed"
          style={{
            background:     'rgba(4,6,10,0.93)',
            border:         `1px solid ${civCount>0?'rgba(255,26,46,0.38)':'rgba(26,37,53,0.45)'}`,
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Header */}
          <div
            className="px-2.5 py-1.5 flex items-center gap-1.5"
            style={{ borderBottom:'1px solid rgba(255,26,46,0.18)', background:civCount>0?'rgba(255,26,46,0.06)':'rgba(0,0,0,0.15)' }}
          >
            <Users className="w-3 h-3 shrink-0" style={{color:civCount>0?'#ff1a2e':'#536878'}}/>
            <span className="font-bold text-[8px] tracking-wider" style={{color:civCount>0?'#ff1a2e':'#536878'}}>
              OCCUPANT PROFILE
            </span>
          </div>

          {/* Members */}
          <div className="px-2.5 py-2 space-y-0.5">
            {scen.family.map((m,i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 px-1.5 py-0.5 rounded text-[7.5px]"
                style={{
                  background: m.isTarget?'rgba(255,26,46,0.10)':'rgba(26,37,53,0.18)',
                  borderLeft: `2px solid ${m.isTarget?'#ff1a2e':'rgba(255,170,0,0.4)'}`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span style={{color:m.isTarget?'#ff1a2e':'#ffaa00',fontSize:10}}>
                    {m.icon==='man'?'♂':m.icon==='woman'?'♀':m.icon==='infant'?'◉':'♦'}
                  </span>
                  <span style={{color:m.isTarget?'#ff1a2e':'#ccd6e0',fontWeight:700}}>{m.label}</span>
                </div>
                <span style={{color:'#536878',flexShrink:0,fontSize:'6.5px'}}>
                  {typeof m.age==='number'?`${m.age}y`:m.age}
                </span>
              </div>
            ))}
          </div>

          {/* CDE */}
          <div className="px-2.5 py-2 space-y-1.5" style={{borderTop:'1px solid rgba(26,37,53,0.4)'}}>
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5 shrink-0" style={{color:scen.cdeColor}}/>
              <span className="font-bold tracking-wider" style={{color:scen.cdeColor,fontSize:'6.5px'}}>CDE ASSESSMENT</span>
            </div>
            <p style={{color:'#536878',lineHeight:1.65}}>{scen.cdeNote}</p>
            <div style={{borderTop:'1px solid rgba(26,37,53,0.3)',paddingTop:6}}>
              <p style={{color:'#536878',fontSize:'6.5px',lineHeight:1.6}}>
                <span style={{color:'#ccd6e0',fontWeight:700}}>AP I Art.&nbsp;51(5)(b): </span>
                Civilian harm must not be excessive relative to military advantage. No algorithm can make this legal determination.
              </p>
            </div>
          </div>

          {/* Source */}
          <div className="px-2.5 py-1.5" style={{borderTop:'1px solid rgba(26,37,53,0.35)'}}>
            <a
              href="https://www.972mag.com/lavender-ai-israeli-army-gaza/"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[6px] transition-colors"
              style={{color:'#2a3a4a'}}
              onMouseEnter={e=>(e.currentTarget.style.color='#0096ff')}
              onMouseLeave={e=>(e.currentTarget.style.color='#2a3a4a')}
            >
              <ExternalLink className="w-2 h-2 shrink-0"/>
              +972 Magazine — "Where's Daddy?" investigation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
