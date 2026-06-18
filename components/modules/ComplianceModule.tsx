'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ExternalLink, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';

// ── Verified & corrected data ──────────────────────────────────────────────

interface IHLPrinciple {
  id: string; name: string; article: string;
  treaty: string; treatyUrl: string;
  description: string; lawsConflict: string;
  caseNote: string; caseUrl: string;
}

interface RubberStampCase {
  system: string; country: string; reviewTime: string;
  targetsPerDay: number; source: string; sourceUrl: string; detail: string;
}

interface KeyDoc {
  title: string; body: string; url: string; tag: string; tagColor: string;
}

const IHL_PRINCIPLES: IHLPrinciple[] = [
  {
    id: 'distinction',
    name: 'Principle of Distinction',
    article: 'API Art. 48, 51–52 · GCIV Art. 50',
    treaty: 'ICRC Customary IHL Rule 1 — Distinction Between Civilians and Combatants',
    treatyUrl: 'https://ihl-databases.icrc.org/en/customary-ihl/v1/rule1',
    description: 'Parties must at all times distinguish between civilians and combatants. Attacks may only be directed at combatants and military objectives. The civilian population must not be the object of attack.',
    lawsConflict: "Israel's 'Lavender' AI assigned targeting probability scores to 37,000 Palestinian men based on behavioural patterns — phone associations, WhatsApp group membership, movement data. A 72% confidence score means a 28% chance the target is a civilian. Pattern-of-life association is not individualised assessment.",
    caseNote: '+972 Magazine: "Lavender: The AI machine directing Israel\'s bombing spree in Gaza" (Apr 2024)',
    caseUrl: 'https://www.972mag.com/lavender-ai-israeli-army-gaza/',
  },
  {
    id: 'proportionality',
    name: 'Principle of Proportionality',
    article: 'API Art. 51(5)(b), 57(2)(a)(iii)',
    treaty: 'ICRC Customary IHL Rule 14 — Proportionality in Attack',
    treatyUrl: 'https://ihl-databases.icrc.org/en/customary-ihl/v1/rule14',
    description: 'An attack is prohibited if it may be expected to cause incidental civilian casualties excessive in relation to the concrete and direct military advantage anticipated. This assessment must be made individually for each attack.',
    lawsConflict: "The IDF's 'Where's Daddy?' system targeted individuals at home to maximise civilian co-location. Reporters documented that pre-set kill ratios of up to 20 civilian deaths per low-ranking target were programmed into the approval pipeline. Pre-computed ratios cannot substitute for case-by-case proportionality assessment.",
    caseNote: 'Amnesty International: "Damning evidence of war crimes as Israeli attacks wipe out entire families" (Oct 2023)',
    caseUrl: 'https://www.amnesty.org/en/latest/news/2023/10/damning-evidence-of-war-crimes-as-israeli-attacks-wipe-out-entire-families-in-gaza/',
  },
  {
    id: 'precaution',
    name: 'Principle of Precaution in Attack',
    article: 'API Art. 57',
    treaty: 'ICRC Customary IHL Rule 15 — Precautions in Attack',
    treatyUrl: 'https://ihl-databases.icrc.org/en/customary-ihl/v1/rule15',
    description: 'Constant care must be taken to spare civilians. All feasible precautions must be taken in the choice of means and methods of attack. Commanders must verify targets and select means to minimise civilian harm.',
    lawsConflict: "'Habsora' (Gospel) AI generated up to 100 bombing targets per day — far beyond human capacity for genuine verification. Officers spent approximately 20 seconds approving each AI-generated strike on a residential building. This pace is physically incompatible with meaningful precautionary legal review.",
    caseNote: '+972 Magazine: "A mass assassination factory: Inside Israel\'s calculated bombing of Gaza" (Nov 2023)',
    caseUrl: 'https://www.972mag.com/mass-assassination-factory-israel-calculated-bombing-gaza/',
  },
  {
    id: 'humanity',
    name: 'Principle of Humanity / Martens Clause',
    article: 'Hague IV Preamble (1907) · API Art. 1(2)',
    treaty: 'ICRC IHL Treaty Database — Hague Convention IV 1907',
    treatyUrl: 'https://ihl-databases.icrc.org/en/ihl-treaties/hciv-1907',
    description: 'In cases not covered by treaty, civilians and combatants remain under the protection derived from the principles of humanity and the dictates of public conscience. The Martens Clause applies even in legal grey areas.',
    lawsConflict: 'No algorithm can exercise mercy, compassion, or conscience. Delegating life-and-death decisions entirely to machines — even in ambiguous situations — violates the fundamental principle that humanity must govern the conduct of war. This is the moral core of the LAWS ban movement.',
    caseNote: 'ICRC: "Autonomous Weapon Systems: Implications of Increasing Autonomy in the Critical Functions of Weapons" (2016)',
    caseUrl: 'https://www.icrc.org/en/publication/autonomous-weapon-systems-implications-increasing-autonomy-critical-functions-weapons',
  },
  {
    id: 'accountability',
    name: 'Command Responsibility & Accountability',
    article: 'API Art. 86–87 · Rome Statute Art. 28',
    treaty: 'Additional Protocol I Art. 86 — ICRC Treaty Database',
    treatyUrl: 'https://ihl-databases.icrc.org/en/ihl-treaties/api-1977/article-86',
    description: 'Commanders are legally responsible for war crimes by subordinates if they knew or should have known, and failed to prevent or punish. IHL requires an identifiable human decision-maker for every use of lethal force.',
    lawsConflict: "When AI selects and engages targets autonomously, no accountability chain exists. Manufacturers cannot be prosecuted under IHL. No individual commander personally decided. This creates a 'responsibility vacuum' — a fundamental gap in the law for LAWS deployments.",
    caseNote: 'UN CCW GGE Report 2019: "Applicability of International Humanitarian Law to Autonomous Weapon Systems"',
    caseUrl: 'https://documents.unoda.org/wp-content/uploads/2019/09/2019_GGE-LAWS_Session-3_Document3.pdf',
  },
];

const RUBBER_STAMP_CASES: RubberStampCase[] = [
  {
    system: 'Habsora ("Gospel") AI',
    country: 'Israel / IDF — Gaza 2023–24',
    reviewTime: '~20 seconds per target',
    targetsPerDay: 100,
    source: '+972 Magazine / Local Call (Nov 2023)',
    sourceUrl: 'https://www.972mag.com/mass-assassination-factory-israel-calculated-bombing-gaza/',
    detail: "AI system generated up to 100 bombing target recommendations per day — a volume no commander could genuinely verify. Officers spent approximately 20 seconds reviewing each AI-generated strike on a residential building before approving. Officers described this as 'a rubber stamp'. One Air Force source: 'We were not targeting people; we were targeting targets.'",
  },
  {
    system: 'Lavender AI',
    country: 'Israel / IDF — Gaza 2023–24',
    reviewTime: '< 1 minute — AI treated as fact',
    targetsPerDay: 37000,
    source: '+972 Magazine / Local Call (Apr 2024)',
    sourceUrl: 'https://www.972mag.com/lavender-ai-israeli-army-gaza/',
    detail: "Lavender assigned 1–10 probability scores to 37,000 Palestinian men marking them as suspected militants. Officers described treating AI output as 'fact', rarely overriding it. Machine confidence scores became de facto operational authority. One officer stated: 'The machine did it coldly. And that had an effect on me — the machine has no problem with that.'",
  },
  {
    system: 'KARGU-2 Loitering Munition',
    country: 'Turkey (export) — Libya 2020',
    reviewTime: 'Autonomous — no operator connection',
    targetsPerDay: 0,
    source: 'UN Panel of Experts Final Report S/2021/229',
    sourceUrl: 'https://documents.un.org/doc/undoc/gen/n21/037/72/pdf/n2103772.pdf',
    detail: "A 2021 UN Panel of Experts report on Libya documented that KARGU-2 loitering munitions 'hunted down and remotely engaged' retreating soldiers without requiring data connectivity — meaning no human issued the engagement command. If confirmed, this is the first documented case of an autonomous weapons system engaging humans without a human decision.",
  },
];

const KEY_DOCUMENTS: KeyDoc[] = [
  {
    title: 'UN Secretary-General: Ban Autonomous Weapons (2023)',
    body: 'UN SG António Guterres called for a legally binding instrument to prohibit LAWS before 2026, warning that "machines with the power and discretion to take lives without human involvement are politically unacceptable, morally repugnant and should be prohibited by international law."',
    url: 'https://www.icrc.org/en/document/joint-appeal-un-secretary-general-and-president-icrc-autonomous-weapon-systems',
    tag: 'UN STATEMENT', tagColor: '#0096ff',
  },
  {
    title: '"Meaningful Human Control" — Stop Killer Robots / Article 36 Standard',
    body: '"Meaningful human control" requires that a person must understand and be able to predict system behaviour, be able to activate/deactivate the weapon, and bear genuine legal and moral responsibility. A 20-second rubber stamp does not meet this standard.',
    url: 'https://article36.org/autonomous-weapons/',
    tag: 'LEGAL STANDARD', tagColor: '#ffaa00',
  },
  {
    title: 'Stop Killer Robots — Campaign Overview',
    body: 'Coalition of 270+ NGOs in 70+ countries calling for new international law to retain human control over the use of force. Endorsed by the ICRC, UNHCR, and UN Secretary-General.',
    url: 'https://www.stopkillerrobots.org/',
    tag: 'ADVOCACY', tagColor: '#ec4899',
  },
  {
    title: 'ICRC Position: New Rules Needed for Autonomous Weapons (2021)',
    body: 'The ICRC calls for a new binding instrument to prohibit unpredictable LAWS and require meaningful human control over all weapons with autonomous targeting. As the foremost IHL authority, this position carries significant legal and moral weight.',
    url: 'https://www.icrc.org/en/document/icrc-position-autonomous-weapon-systems',
    tag: 'ICRC POLICY', tagColor: '#00d47e',
  },
  {
    title: 'UN First Committee — Historic LAWS Vote (Oct 2023)',
    body: 'First-ever UN General Assembly First Committee resolution specifically on autonomous weapons passed with 164 states in favour. The vote demonstrated overwhelming global support for a new legal framework and put LAWS firmly on the disarmament agenda.',
    url: 'https://www.stopkillerrobots.org/',
    tag: 'UN RESOLUTION', tagColor: '#a855f7',
  },
  {
    title: 'HRW: "Making the Case" — The Dangers of Killer Robots (2016)',
    body: 'Foundational Human Rights Watch legal analysis arguing that full autonomy in life-and-death decisions is incompatible with IHL requirements for distinction, proportionality, and precaution. Remains the definitive legal case for preemptive prohibition.',
    url: 'https://www.hrw.org/report/2016/12/19/making-case/dangers-killer-robots-and-need-preemptive-ban',
    tag: 'HRW LEGAL', tagColor: '#ff6b35',
  },
];

// ── Canvas drawing utilities ───────────────────────────────────────────────

function ht(
  ctx: CanvasRenderingContext2D, text: string,
  x: number, y: number, color: string, size: number,
  bold = false, align: CanvasTextAlign = 'left',
) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px "JetBrains Mono", monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

// Subject profiles cycling in the AI panel
const SUBJECTS = [
  { id: 'SUBJ-2847', conf: 72, tag: 'PHONE ASSOC.' },
  { id: 'SUBJ-1193', conf: 85, tag: 'WHATSAPP GRP' },
  { id: 'SUBJ-4421', conf: 63, tag: 'RESIDENTIAL' },
  { id: 'SUBJ-0918', conf: 91, tag: 'MOVEMENT PAT' },
  { id: 'SUBJ-3304', conf: 78, tag: 'SIGINT MATCH' },
  { id: 'SUBJ-2056', conf: 67, tag: 'SOCIAL GRAPH' },
];

function drawNeuralNet(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number, w: number, h: number, t: number,
) {
  const layers = [
    [{ x: 0.08, y: 0.2 }, { x: 0.08, y: 0.5 }, { x: 0.08, y: 0.8 }],
    [{ x: 0.5, y: 0.1 }, { x: 0.5, y: 0.37 }, { x: 0.5, y: 0.63 }, { x: 0.5, y: 0.9 }],
    [{ x: 0.92, y: 0.33 }, { x: 0.92, y: 0.67 }],
  ];
  const abs = (n: { x: number; y: number }) => ({ x: ox + n.x * w, y: oy + n.y * h });

  // Connections
  ctx.setLineDash([]);
  for (let l = 0; l < layers.length - 1; l++) {
    for (const a of layers[l]) {
      for (const b of layers[l + 1]) {
        const pulse = Math.sin(t * 2.3 + (a.y + b.x) * 9) * 0.4 + 0.5;
        ctx.strokeStyle = `rgba(0,212,126,${pulse * 0.38})`;
        ctx.lineWidth = pulse * 1.1;
        ctx.beginPath();
        ctx.moveTo(abs(a).x, abs(a).y);
        ctx.lineTo(abs(b).x, abs(b).y);
        ctx.stroke();
      }
    }
  }

  // Nodes
  for (const layer of layers) {
    for (const n of layer) {
      const { x, y } = abs(n);
      const glow = Math.sin(t * 2.8 + n.x * 11 + n.y * 7) * 0.28 + 0.72;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 14);
      g.addColorStop(0, `rgba(0,212,126,${glow * 0.5})`);
      g.addColorStop(1, 'rgba(0,212,126,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(0,212,126,${glow})`;
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawProfileCard(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  subj: typeof SUBJECTS[0], alpha: number,
) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(255,26,46,0.08)';
  ctx.strokeStyle = 'rgba(255,26,46,0.38)';
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);

  // Person silhouette
  const sX = x + 12; const sY = y + 10;
  ctx.fillStyle = 'rgba(255,80,80,0.65)';
  ctx.beginPath(); ctx.arc(sX + 8, sY + 6, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(sX + 2, sY + 13, 12, 11);

  // ID & tag
  ht(ctx, subj.id, x + 32, y + 14, '#ff8080', 8.5, true);
  ht(ctx, subj.tag, x + 32, y + 25, '#536878', 7);

  // Confidence bar
  const bX = x + 7; const bY = y + h - 20; const bW = w - 14;
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(bX, bY, bW, 5);
  const c = subj.conf;
  const cCol = c >= 80 ? '#ff1a2e' : c >= 70 ? '#ff6b35' : '#ffaa00';
  ctx.fillStyle = cCol;
  ctx.fillRect(bX, bY, bW * (c / 100), 5);

  ht(ctx, `CONF: ${c}%`, x + 7, y + h - 6, cCol, 8, true);
  ht(ctx, `ERR: ${100 - c}%`, x + w - 38, y + h - 6, '#2d3748', 7);
  ctx.globalAlpha = 1;
}

function drawPersonAtDesk(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number,
) {
  // Slight "typing" bob
  const bob = Math.sin(t * 4) * 1.2;

  ctx.fillStyle = 'rgba(180,200,220,0.5)';
  // Head
  ctx.beginPath(); ctx.arc(cx, cy - 18 + bob, 9, 0, Math.PI * 2); ctx.fill();
  // Body
  ctx.fillRect(cx - 9, cy - 8 + bob, 18, 16);
  // Arms reaching toward desk
  ctx.fillRect(cx - 20, cy - 2 + bob, 11, 5);
  ctx.fillRect(cx + 9, cy - 2 + bob, 11, 5);

  // Monitor
  const mY = cy + 10;
  ctx.fillStyle = 'rgba(0,150,255,0.08)';
  ctx.strokeStyle = 'rgba(0,150,255,0.22)';
  ctx.lineWidth = 1;
  ctx.fillRect(cx - 24, mY, 48, 32);
  ctx.strokeRect(cx - 24, mY, 48, 32);
  ht(ctx, 'TARGETS', cx, mY + 10, 'rgba(255,26,46,0.6)', 6, false, 'center');
  ht(ctx, '37,000', cx, mY + 20, 'rgba(255,26,46,0.9)', 7.5, true, 'center');
  ht(ctx, 'APPROVE?', cx, mY + 29, 'rgba(255,170,0,0.6)', 6, false, 'center');

  // Desk surface
  ctx.fillStyle = 'rgba(40,50,65,0.6)';
  ctx.fillRect(cx - 30, mY + 34, 60, 5);
}

function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, t: number,
) {
  const pulse = 0.7 + Math.sin(t * 2.8) * 0.3;
  const a = pulse;
  const gap = 7;

  // Outer ring
  ctx.strokeStyle = `rgba(255,26,46,${a * 0.85})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

  // Inner ring
  ctx.strokeStyle = `rgba(255,26,46,${a * 0.4})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.48, 0, Math.PI * 2); ctx.stroke();

  // Cross lines
  ctx.strokeStyle = `rgba(255,26,46,${a * 0.85})`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - r - 9, cy); ctx.lineTo(cx - gap, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + r + 9, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - r - 9); ctx.lineTo(cx, cy - gap); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + r + 9); ctx.stroke();

  // Corner ticks
  const tk = 10;
  const tr = r * 0.7;
  for (let i = 0; i < 4; i++) {
    const ang = (Math.PI / 2) * i + Math.PI / 4;
    const bx = cx + Math.cos(ang) * tr;
    const by = cy + Math.sin(ang) * tr;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(ang) * tk, by + Math.sin(ang) * tk);
    ctx.stroke();
  }

  // Thermal glow
  const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.65);
  gr.addColorStop(0, `rgba(255,80,0,${a * 0.45})`);
  gr.addColorStop(0.5, `rgba(255,26,46,${a * 0.18})`);
  gr.addColorStop(1, 'rgba(255,26,46,0)');
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2); ctx.fill();

  // Centre dot
  ctx.fillStyle = `rgba(255,26,46,${a})`;
  ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
}

function drawAnimation(
  ctx: CanvasRenderingContext2D, w: number, h: number, t: number,
) {
  const METRICS_H = 40;
  const cH = h - METRICS_H;
  const PAD = 12;

  const p1W = Math.floor(w * 0.33);
  const p2W = Math.floor(w * 0.34);
  const p3W = w - p1W - p2W;
  const p2X = p1W;
  const p3X = p1W + p2W;

  // ── Backgrounds ──
  ctx.fillStyle = 'rgba(0,212,126,0.022)'; ctx.fillRect(0, 0, p1W, cH);
  ctx.fillStyle = 'rgba(255,26,46,0.028)'; ctx.fillRect(p2X, 0, p2W, cH);
  ctx.fillStyle = 'rgba(255,170,0,0.018)'; ctx.fillRect(p3X, 0, p3W, cH);

  // Panel dividers
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(p2X, 0); ctx.lineTo(p2X, cH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p3X, 0); ctx.lineTo(p3X, cH); ctx.stroke();

  // Flow arrows
  const arY = cH * 0.44;
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 5]);
  ctx.beginPath(); ctx.moveTo(p1W - 2, arY); ctx.lineTo(p2X + 2, arY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p2X + p2W - 2, arY); ctx.lineTo(p3X + 2, arY); ctx.stroke();
  ctx.setLineDash([]);
  // Arrowheads
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.2;
  const ah = (ax: number) => {
    ctx.beginPath(); ctx.moveTo(ax - 6, arY - 4); ctx.lineTo(ax, arY); ctx.lineTo(ax - 6, arY + 4); ctx.stroke();
  };
  ah(p2X); ah(p3X);

  // ────────────────────────────────────────────────────────────────
  // PANEL 1 — AI TARGETING SYSTEM
  // ────────────────────────────────────────────────────────────────
  {
    const cx1 = p1W / 2;
    ht(ctx, 'AI TARGETING SYSTEM', cx1, PAD + 10, '#00d47e', 9, true, 'center');
    ht(ctx, 'PROBABILISTIC MASS TARGET GEN.', cx1, PAD + 22, 'rgba(83,104,120,0.8)', 7, false, 'center');

    // Neural net
    const netH = cH * 0.30;
    const netY = PAD + 28;
    drawNeuralNet(ctx, PAD, netY, p1W - PAD * 2, netH, t);

    // Cycling profile cards
    const CARD_CYCLE = 4;
    const cardTot = t % (CARD_CYCLE * SUBJECTS.length);
    const cardIdx = Math.floor(cardTot / CARD_CYCLE) % SUBJECTS.length;
    const nextIdx = (cardIdx + 1) % SUBJECTS.length;
    const localT = (cardTot % CARD_CYCLE) / CARD_CYCLE;

    const cW = p1W - PAD * 2;
    const cH2 = 62;
    const cX = PAD;
    const cY = netY + netH + 6;

    let alpha = 1;
    if (localT < 0.15) alpha = localT / 0.15;
    else if (localT > 0.78) alpha = 1 - (localT - 0.78) / 0.22;

    if (localT > 0.72) {
      const na = (localT - 0.72) / 0.28;
      drawProfileCard(ctx, cX, cY, cW, cH2, SUBJECTS[nextIdx], na);
    }
    drawProfileCard(ctx, cX, cY, cW, cH2, SUBJECTS[cardIdx], alpha);

    // Data labels under card
    const labY = cY + cH2 + 14;
    ctx.fillStyle = 'rgba(255,26,46,0.08)';
    ctx.strokeStyle = 'rgba(255,26,46,0.2)'; ctx.lineWidth = 1;
    ctx.fillRect(PAD, labY, p1W - PAD * 2, 22);
    ctx.strokeRect(PAD, labY, p1W - PAD * 2, 22);
    const gen = Math.floor(37000 + t * 3.4);
    ht(ctx, `GENERATED: ${gen.toLocaleString()}`, cx1, labY + 14, '#ff1a2e', 9, true, 'center');
  }

  // ────────────────────────────────────────────────────────────────
  // PANEL 2 — HUMAN "REVIEW"
  // ────────────────────────────────────────────────────────────────
  {
    const cx2 = p2X + p2W / 2;
    ht(ctx, "HUMAN 'REVIEW'", cx2, PAD + 10, '#ffaa00', 9, true, 'center');
    ht(ctx, '20 SECONDS PER LIFE', cx2, PAD + 22, 'rgba(83,104,120,0.8)', 7, false, 'center');

    // Timer: cycles over 4 real seconds → "20 simulated seconds"
    const CYCLE = 4;
    const phase = (t % CYCLE) / CYCLE;         // 0→1 per cycle
    const countdown = Math.round(20 * (1 - phase));
    const urgent = countdown <= 5;
    const timerColor = urgent ? '#ff1a2e' : '#ffaa00';

    // Timer box
    const tW = p2W * 0.68; const tH = 44;
    const tX = cx2 - tW / 2; const tY = PAD + 30;
    ctx.fillStyle = urgent ? 'rgba(255,26,46,0.09)' : 'rgba(255,170,0,0.07)';
    ctx.strokeStyle = urgent ? 'rgba(255,26,46,0.45)' : 'rgba(255,170,0,0.3)';
    ctx.lineWidth = 1;
    ctx.fillRect(tX, tY, tW, tH);
    ctx.strokeRect(tX, tY, tW, tH);

    // Countdown digits
    const secStr = `00 : ${countdown.toString().padStart(2, '0')}`;
    ht(ctx, secStr, cx2, tY + tH - 10, timerColor, 24, true, 'center');

    // Person at desk below timer
    drawPersonAtDesk(ctx, cx2, tY + tH + 60, t);

    // ── STAMP ARM MECHANISM ──
    // Stamp arm rests above; comes down in last 18% of cycle
    const armTopY = PAD + 4;
    const armBotY = tY + tH + 5;

    let armY: number;
    let showInk = false;
    if (phase < 0.78) {
      armY = armTopY;
    } else if (phase < 0.88) {
      // Slam down
      armY = armTopY + ((phase - 0.78) / 0.10) * (armBotY - armTopY);
    } else if (phase < 0.94) {
      armY = armBotY;
      showInk = true;
    } else {
      // Bounce back
      armY = armBotY - ((phase - 0.94) / 0.06) * (armBotY - armTopY);
    }

    // Arm rod
    ctx.fillStyle = 'rgba(80,100,120,0.5)';
    ctx.fillRect(cx2 - 4, armTopY, 8, Math.max(0, armY - armTopY));

    // Stamp head
    const sW = 70; const sH = 22;
    ctx.save();
    ctx.translate(cx2, armY);
    ctx.rotate(-0.06);
    ctx.fillStyle = phase > 0.78 ? 'rgba(255,26,46,0.18)' : 'rgba(80,100,120,0.18)';
    ctx.strokeStyle = phase > 0.78 ? 'rgba(255,26,46,0.85)' : 'rgba(80,100,120,0.45)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-sW / 2, 0, sW, sH);
    ctx.strokeRect(-sW / 2, 0, sW, sH);
    ht(ctx, 'APPROVED', 0, sH - 6, phase > 0.78 ? '#ff1a2e' : '#536878', 10, true, 'center');
    ctx.restore();

    // Ink impression on the timer box
    if (showInk) {
      const inkAlpha = Math.min(1, (phase - 0.88) / 0.06) * (1 - Math.max(0, (phase - 0.92) / 0.02));
      ctx.save();
      ctx.globalAlpha = inkAlpha * 0.8;
      ctx.translate(cx2, tY + tH / 2 + 4);
      ctx.rotate(-0.06);
      ctx.strokeStyle = '#ff1a2e';
      ctx.lineWidth = 2;
      ctx.strokeRect(-sW / 2, -sH / 2, sW, sH);
      ht(ctx, 'APPROVED', 0, sH / 2 - 6, '#ff1a2e', 11, true, 'center');
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Panel-wide red flash on stamp impact
    if (phase > 0.84 && phase < 0.92) {
      const fa = Math.sin(((phase - 0.84) / 0.08) * Math.PI) * 0.22;
      ctx.fillStyle = `rgba(255,26,46,${fa})`;
      ctx.fillRect(p2X, 0, p2W, cH);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // PANEL 3 — OUTCOME
  // ────────────────────────────────────────────────────────────────
  {
    const cx3 = p3X + p3W / 2;
    ht(ctx, 'OUTCOME', cx3, PAD + 10, '#ff6b35', 9, true, 'center');
    ht(ctx, 'STRIKE AUTHORISED', cx3, PAD + 22, 'rgba(255,26,46,0.7)', 7, true, 'center');

    const rR = Math.min(p3W * 0.26, 48);
    const rCY = PAD + 38 + rR;
    drawCrosshair(ctx, cx3, rCY, rR, t);

    // Stamp-flash in outcome panel too
    const CYCLE = 4;
    const fl = (t % CYCLE) / CYCLE;
    if (fl > 0.87 && fl < 0.95) {
      const fa = Math.sin(((fl - 0.87) / 0.08) * Math.PI) * 0.28;
      ctx.fillStyle = `rgba(255,100,0,${fa})`;
      ctx.fillRect(p3X, 0, p3W, cH);
    }

    // Coordinates
    ht(ctx, '31.527°N  34.742°E', cx3, rCY + rR + 14, 'rgba(180,200,220,0.5)', 7, false, 'center');

    // Status boxes
    const bX = p3X + PAD; const bW = p3W - PAD * 2;
    const boxes = [
      { label: 'ACCOUNTABILITY', value: '⛔ LEGAL VACUUM', color: '#ff1a2e' },
      { label: 'HUMAN CONTROL', value: '⛔ BYPASSED', color: '#ff6b35' },
      { label: 'RESPONSIBILITY', value: '?  UNRESOLVED', color: '#a855f7' },
    ];
    const firstBY = rCY + rR + 22;
    boxes.forEach((b, i) => {
      const bY = firstBY + i * 36;
      ctx.fillStyle = `${b.color}12`;
      ctx.strokeStyle = `${b.color}30`;
      ctx.lineWidth = 1;
      ctx.fillRect(bX, bY, bW, 28);
      ctx.strokeRect(bX, bY, bW, 28);
      ht(ctx, b.label, cx3, bY + 10, '#536878', 6.5, false, 'center');
      ht(ctx, b.value, cx3, bY + 21, b.color, 8, true, 'center');
    });
  }

  // ────────────────────────────────────────────────────────────────
  // METRICS STRIP
  // ────────────────────────────────────────────────────────────────
  {
    const mY = cH;
    ctx.fillStyle = 'rgba(2,4,10,0.85)'; ctx.fillRect(0, mY, w, METRICS_H);
    ctx.strokeStyle = 'rgba(255,26,46,0.22)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, mY); ctx.lineTo(w, mY); ctx.stroke();

    const processed = Math.floor(37000 + t * 3.4);
    const cols = [
      { label: 'AI PROCESSED', val: processed.toLocaleString(), color: '#ff1a2e' },
      { label: 'INDIVIDUALLY REVIEWED', val: '000,000', color: '#00d47e' },
      { label: 'MHC STATUS', val: '⛔ BYPASSED', color: '#ff1a2e' },
    ];

    cols.forEach((c, i) => {
      const cx = w * (0.18 + i * 0.32);
      ht(ctx, c.label, cx, mY + 13, '#2d3748', 7, false, 'center');
      ht(ctx, c.val, cx, mY + 28, c.color, 10, true, 'center');
      if (i < 2) {
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w * (0.34 + i * 0.32), mY + 6);
        ctx.lineTo(w * (0.34 + i * 0.32), mY + METRICS_H - 6);
        ctx.stroke();
      }
    });
  }
}

// ── Main Component ─────────────────────────────────────────────────────────
export function ComplianceModule() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const roRef = useRef<ResizeObserver | null>(null);

  const [activeTab, setActiveTab] = useState<'principles' | 'rubber-stamp' | 'documents'>('principles');
  const [expandedP, setExpandedP] = useState<string | null>('distinction');
  const [expandedC, setExpandedC] = useState<number | null>(null);

  const principlesRef = useRef<HTMLDivElement>(null);
  const rubberStampRef = useRef<HTMLDivElement>(null);
  const documentsRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Synchronize active tab with scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const options = {
      root: container,
      rootMargin: '-40px 0px -60% 0px', // check intersection in the upper area of the viewport
      threshold: 0,
    };

    const callback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (entry.target === principlesRef.current) {
            setActiveTab('principles');
          } else if (entry.target === rubberStampRef.current) {
            setActiveTab('rubber-stamp');
          } else if (entry.target === documentsRef.current) {
            setActiveTab('documents');
          }
        }
      });
    };

    const observer = new IntersectionObserver(callback, options);
    if (principlesRef.current) observer.observe(principlesRef.current);
    if (rubberStampRef.current) observer.observe(rubberStampRef.current);
    if (documentsRef.current) observer.observe(documentsRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const scrollToSection = (id: 'principles' | 'rubber-stamp' | 'documents') => {
    setActiveTab(id);
    const targetRef = id === 'principles' ? principlesRef : id === 'rubber-stamp' ? rubberStampRef : documentsRef;
    if (targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const resize = () => {
      const r = container.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) return;
      canvas.width = r.width;
      canvas.height = r.height;
    };
    resize();

    roRef.current = new ResizeObserver(resize);
    roRef.current.observe(container);

    const render = (ts: number) => {
      if (!running) return;
      if (!startRef.current) startRef.current = ts;
      const t = (ts - startRef.current) / 1000;

      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle grid
      ctx.strokeStyle = 'rgba(26,37,53,0.18)'; ctx.lineWidth = 0.5;
      ctx.setLineDash([]);
      const gS = 38;
      for (let gx = 0; gx < canvas.width; gx += gS) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.stroke();
      }
      for (let gy = 0; gy < canvas.height; gy += gS) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke();
      }

      if (canvas.width > 100 && canvas.height > 60) {
        drawAnimation(ctx, canvas.width, canvas.height, t);
      }
      animRef.current = requestAnimationFrame(render);
    };
    animRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
      roRef.current?.disconnect();
    };
  }, []);

  const mono = "'JetBrains Mono', monospace";

  const tabBtn = (id: typeof activeTab, label: string) => {
    const active = activeTab === id;
    return (
      <button key={id} onClick={() => scrollToSection(id)} style={{
        padding: '5px 11px', borderRadius: '5px 5px 0 0', fontSize: '7.5px',
        fontWeight: 700, letterSpacing: '0.4px', cursor: 'pointer', fontFamily: mono,
        transition: 'all 0.15s', outline: 'none',
        background: active ? 'rgba(255,26,46,0.1)' : 'transparent',
        color: active ? '#ff8080' : '#536878',
        border: active ? '1px solid rgba(255,26,46,0.22)' : '1px solid transparent',
        borderBottom: '1px solid transparent',
      }}>{label}</button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#060a12', fontFamily: mono }}>

      {/* ── Canvas animation ── */}
      <div ref={containerRef} style={{ flexShrink: 0, height: '268px', position: 'relative' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        {/* Corner HUD labels */}
        <div style={{ position: 'absolute', top: 6, left: 8, fontSize: '7px', color: 'rgba(0,212,126,0.5)', fontWeight: 700, letterSpacing: '0.5px', pointerEvents: 'none' }}>ACT I</div>
        <div style={{ position: 'absolute', top: 6, left: '33%', transform: 'translateX(-50%)', fontSize: '7px', color: 'rgba(255,170,0,0.5)', fontWeight: 700, letterSpacing: '0.5px', pointerEvents: 'none' }}>ACT II</div>
        <div style={{ position: 'absolute', top: 6, right: 8, fontSize: '7px', color: 'rgba(255,107,53,0.5)', fontWeight: 700, letterSpacing: '0.5px', pointerEvents: 'none', textAlign: 'right' }}>ACT III</div>
      </div>

      {/* ── Scrollable data section ── */}
      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', scrollBehavior: 'smooth' }} className="compliance-scroll">

        {/* Header */}
        <div style={{ padding: '9px 16px 8px', borderBottom: '1px solid rgba(255,26,46,0.18)', background: 'rgba(255,26,46,0.03)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '7.5px', color: '#ff1a2e', fontWeight: 700, letterSpacing: '0.15em' }}>MODULE 6 // IHL COMPLIANCE &amp; ACCOUNTABILITY</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', marginTop: '1px' }}>HUMANITARIAN COMPLIANCE ASSESSMENT</div>
            </div>
            <span style={{ fontSize: '7px', fontWeight: 800, padding: '3px 7px', borderRadius: '3px', background: 'rgba(255,26,46,0.14)', border: '1px solid rgba(255,26,46,0.38)', color: '#ff1a2e' }}>NO BINDING TREATY</span>
          </div>
          <div style={{ marginTop: '7px', padding: '6px 10px', borderRadius: '5px', background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.22)', display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
            <AlertTriangle size={10} style={{ color: '#ffaa00', marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '8px', color: '#c8a63a', lineHeight: '1.55' }}>
              <strong style={{ color: '#ffaa00' }}>MEANINGFUL HUMAN CONTROL (MHC)</strong> requires: (1) understanding and predicting system behaviour, (2) ability to intervene and abort, (3) genuine traceable legal responsibility. A 20-second rubber stamp on an AI-generated kill list meets none of these criteria.
              {' '}<a href="https://article36.org/autonomous-weapons/" target="_blank" rel="noopener noreferrer" style={{ color: '#ffaa00', textDecoration: 'underline' }}>Full definition ↗</a>
            </div>
          </div>
        </div>

        {/* Tab nav - Sticky for quick navigation */}
        <div style={{ display: 'flex', gap: '2px', padding: '6px 16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, background: 'rgba(5, 8, 14, 0.95)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(8px)' }}>
          {tabBtn('principles', '⚖️ IHL PRINCIPLES')}
          {tabBtn('rubber-stamp', '📋 RUBBER STAMP CASES')}
          {tabBtn('documents', '📑 KEY DOCUMENTS')}
        </div>

        {/* Unified scrolling content */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '28px', flex: 1 }}>

          {/* ── IHL PRINCIPLES ── */}
          <div ref={principlesRef} style={{ display: 'flex', flexDirection: 'column', gap: '6px', scrollMarginTop: '36px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#ff8080', letterSpacing: '0.8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px', marginBottom: '6px' }}>⚖️ IHL PRINCIPLES &amp; VIOLATIONS</div>
            <div style={{ fontSize: '7.5px', color: '#536878', marginBottom: '6px' }}>
              Five binding IHL principles applicable to all weapons systems. Each is routinely bypassed by documented LAWS deployments. Click any row to expand.
            </div>
            {IHL_PRINCIPLES.map((p) => {
              const exp = expandedP === p.id;
              return (
                <div key={p.id} style={{ border: exp ? '1px solid rgba(255,26,46,0.28)' : '1px solid rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden', background: exp ? 'rgba(255,26,46,0.02)' : 'rgba(255,255,255,0.01)' }}>
                  <div
                    onClick={() => setExpandedP(exp ? null : p.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', cursor: 'pointer', gap: '10px', background: exp ? 'rgba(255,26,46,0.04)' : 'transparent' }}
                    onMouseEnter={(e) => { if (!exp) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={(e) => { if (!exp) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      <XCircle size={11} style={{ color: '#ff1a2e', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '9.5px', fontWeight: 700, color: exp ? '#fff' : '#ccd6e0' }}>{p.name}</div>
                        <div style={{ fontSize: '7px', color: '#536878', marginTop: '1px' }}>{p.article}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{ fontSize: '7px', fontWeight: 800, padding: '2px 5px', borderRadius: '3px', background: 'rgba(255,26,46,0.14)', border: '1px solid rgba(255,26,46,0.33)', color: '#ff1a2e' }}>VIOLATED</span>
                      {exp ? <ChevronDown size={10} color="#536878" /> : <ChevronRight size={10} color="#536878" />}
                    </div>
                  </div>
                  {exp && (
                    <div style={{ padding: '9px 12px 11px 32px', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.18)' }}>
                      <a href={p.treatyUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '7.5px', color: '#0096ff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', marginBottom: '7px' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#0096ff')}
                      ><ExternalLink size={8} /> {p.treaty} ↗</a>
                      <div style={{ padding: '6px 10px', borderRadius: '4px', marginBottom: '6px', background: 'rgba(0,150,255,0.06)', border: '1px solid rgba(0,150,255,0.12)', fontSize: '8px', color: '#8892a4', lineHeight: '1.55' }}>
                        <span style={{ color: '#38bdf8', fontWeight: 700 }}>THE RULE: </span>{p.description}
                      </div>
                      <div style={{ padding: '6px 10px', borderRadius: '4px', marginBottom: '6px', background: 'rgba(255,26,46,0.05)', border: '1px solid rgba(255,26,46,0.12)', fontSize: '8px', color: '#8892a4', lineHeight: '1.55' }}>
                        <span style={{ color: '#ff1a2e', fontWeight: 700 }}>LAWS CONFLICT: </span>{p.lawsConflict}
                      </div>
                      <a href={p.caseUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '7.5px', color: '#ffaa00', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ffd166')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#ffaa00')}
                      ><ExternalLink size={8} /> {p.caseNote} ↗</a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

          {/* ── RUBBER STAMP CASES ── */}
          <div ref={rubberStampRef} style={{ display: 'flex', flexDirection: 'column', gap: '8px', scrollMarginTop: '36px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#ffaa00', letterSpacing: '0.8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px', marginBottom: '6px' }}>📋 DOCUMENTED RUBBER STAMP CASES</div>
            <div style={{ padding: '7px 10px', borderRadius: '5px', background: 'rgba(255,26,46,0.05)', border: '1px solid rgba(255,26,46,0.16)', fontSize: '8px', color: '#8892a4', lineHeight: '1.6', marginBottom: '4px' }}>
              <span style={{ color: '#ff8080', fontWeight: 700 }}>THE RUBBER STAMP PROBLEM: </span>
              When humans approve AI kill lists at machine speed, oversight becomes legal fiction. Cases below are documented from investigative journalism and UN expert reports.
            </div>
            {RUBBER_STAMP_CASES.map((c, i) => {
              const exp = expandedC === i;
              return (
                <div key={i} style={{ border: exp ? '1px solid rgba(255,170,0,0.28)' : '1px solid rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden', background: exp ? 'rgba(255,170,0,0.02)' : 'rgba(255,255,255,0.01)' }}>
                  <div
                    onClick={() => setExpandedC(exp ? null : i)}
                    style={{ padding: '9px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', background: exp ? 'rgba(255,170,0,0.04)' : 'transparent' }}
                    onMouseEnter={(e) => { if (!exp) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={(e) => { if (!exp) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#fff' }}>{c.system}</div>
                      <div style={{ fontSize: '7px', color: '#536878', marginTop: '2px' }}>{c.country}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 6px', borderRadius: '3px', fontSize: '7.5px', fontWeight: 700, background: 'rgba(255,26,46,0.1)', border: '1px solid rgba(255,26,46,0.24)', color: '#ff8080' }}>⏱ {c.reviewTime}</span>
                      {c.targetsPerDay > 0 && <span style={{ padding: '2px 6px', borderRadius: '3px', fontSize: '7.5px', fontWeight: 700, background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.2)', color: '#ffaa00' }}>{c.targetsPerDay.toLocaleString()}/DAY</span>}
                    </div>
                    {exp ? <ChevronDown size={11} color="#536878" /> : <ChevronRight size={11} color="#536878" />}
                  </div>
                  {exp && (
                    <div style={{ padding: '8px 12px 11px', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.22)' }}>
                      <p style={{ fontSize: '8.5px', color: '#8892a4', lineHeight: '1.65', margin: '0 0 7px' }}>{c.detail}</p>
                      <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '7.5px', color: '#0096ff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#0096ff')}
                      ><ExternalLink size={9} /> {c.source} ↗</a>
                    </div>
                  )}
                </div>
              );
            })}

            {/* MHC vs Rubber Stamp comparison panel */}
            <div style={{ padding: '11px', borderRadius: '6px', background: 'rgba(255,255,255,0.012)', border: '1px solid rgba(255,255,255,0.06)', marginTop: '8px' }}>
              <div style={{ fontSize: '7.5px', color: '#536878', fontWeight: 700, marginBottom: '9px', letterSpacing: '0.4px' }}>MHC vs. RUBBER STAMP — DECISION CHAIN COMPARISON</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
                {[
                  { title: '✓ MEANINGFUL HUMAN CONTROL', color: '#00d47e', items: ['Commander reviews intelligence', 'Independent target verification', 'Proportionality assessed per-case', 'Precautionary alternatives weighed', 'Deliberate, accountable authorisation', 'Legal responsibility is traceable'] },
                  { title: '✗ RUBBER STAMP (LAWS)', color: '#ff1a2e', items: ['AI generates target list', '20-second "review" per life', 'No independent verification', 'Proportionality pre-computed', 'Click to approve at machine pace', 'Accountability gap — who decides?'] },
                ].map((col) => (
                  <div key={col.title} style={{ padding: '8px', borderRadius: '5px', background: `${col.color}09`, border: `1px solid ${col.color}20` }}>
                    <div style={{ fontSize: '7.5px', fontWeight: 800, color: col.color, marginBottom: '7px' }}>{col.title}</div>
                    {col.items.map((s, ii) => (
                      <div key={ii} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px', fontSize: '7.5px', color: '#8892a4' }}>
                        {col.color === '#00d47e'
                          ? <CheckCircle size={8} style={{ color: '#00d47e', flexShrink: 0 }} />
                          : <XCircle size={8} style={{ color: '#ff1a2e', flexShrink: 0 }} />}
                        {s}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

          {/* ── KEY DOCUMENTS ── */}
          <div ref={documentsRef} style={{ display: 'flex', flexDirection: 'column', gap: '7px', scrollMarginTop: '36px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#0096ff', letterSpacing: '0.8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px', marginBottom: '6px' }}>📑 KEY DOCUMENTS &amp; PRIMARY SOURCES</div>
            <div style={{ fontSize: '7.5px', color: '#536878', marginBottom: '4px' }}>Primary sources, international law references, and advocacy documents. All links open in a new tab.</div>
            {KEY_DOCUMENTS.map((doc, i) => (
              <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', padding: '9px 12px', borderRadius: '6px', textDecoration: 'none', background: 'rgba(255,255,255,0.012)', border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,150,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(0,150,255,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.012)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '6.5px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', background: `${doc.tagColor}18`, border: `1px solid ${doc.tagColor}40`, color: doc.tagColor, letterSpacing: '0.4px', display: 'inline-block', marginBottom: '4px' }}>{doc.tag}</span>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#ccd6e0', marginBottom: '3px', lineHeight: '1.35' }}>{doc.title}</div>
                    <div style={{ fontSize: '7.5px', color: '#536878', lineHeight: '1.5' }}>{doc.body}</div>
                  </div>
                  <ExternalLink size={10} style={{ color: '#0096ff', flexShrink: 0, marginTop: '2px' }} />
                </div>
              </a>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '6px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(2,4,10,0.7)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '6.5px', color: '#2d3748', flexShrink: 0 }}>
          <span>SOURCES: ICRC · +972 MAGAZINE · HRW · AMNESTY · UNODA · STOP KILLER ROBOTS · UN PANEL OF EXPERTS</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a href="https://www.stopkillerrobots.org" target="_blank" rel="noopener noreferrer" style={{ color: '#ec4899', textDecoration: 'none', fontWeight: 700 }} onMouseEnter={(e) => (e.currentTarget.style.color = '#f472b6')} onMouseLeave={(e) => (e.currentTarget.style.color = '#ec4899')}>STOP KILLER ROBOTS ↗</a>
            <a href="https://ihl-databases.icrc.org" target="_blank" rel="noopener noreferrer" style={{ color: '#00d47e', textDecoration: 'none', fontWeight: 700 }} onMouseEnter={(e) => (e.currentTarget.style.color = '#4ade80')} onMouseLeave={(e) => (e.currentTarget.style.color = '#00d47e')}>ICRC IHL DATABASE ↗</a>
          </div>
        </div>
      </div>

      <style>{`
        .compliance-scroll::-webkit-scrollbar { width: 4px; }
        .compliance-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .compliance-scroll::-webkit-scrollbar-thumb { background: rgba(255,26,46,0.22); border-radius: 3px; }
        .compliance-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,26,46,0.4); }
      `}</style>
    </div>
  );
}
