'use client';
import { useState, useRef, useEffect } from 'react';
import { ExternalLink, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { drawHUDText, drawPersonIcon } from './ModuleCanvas';

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
    caseUrl: 'https://undocs.org/CCW/GGE.1/2019/3',
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
    sourceUrl: 'https://undocs.org/S/2021/229',
    detail: "A 2021 UN Panel of Experts report on Libya documented that KARGU-2 loitering munitions 'hunted down and remotely engaged' retreating soldiers without requiring data connectivity — meaning no human issued the engagement command. If confirmed, this is the first documented case of an autonomous weapons system engaging humans without a human decision.",
  },
];

const KEY_DOCUMENTS: KeyDoc[] = [
  {
    title: 'UN Secretary-General: Joint Appeal on AWS (2023)',
    body: 'UN SG António Guterres called for a legally binding instrument to prohibit LAWS before 2026, warning that "machines with the power and discretion to take lives without human involvement are politically unacceptable, morally repugnant and should be prohibited by international law."',
    url: 'https://www.icrc.org/en/document/joint-appeal-un-secretary-general-and-president-icrc-autonomous-weapon-systems',
    tag: 'UN STATEMENT', tagColor: '#0096ff',
  },
  {
    title: '"Meaningful Human Control" — Stop Killer Robots / Article 36 Standard',
    body: '"Meaningful human control" requires that a person must understand and be able to predict system behaviour, be able to activate/deactivate the weapon, and bear genuine legal and moral responsibility. A 20-second rubber stamp does not meet this standard.',
    url: 'https://www.article36.org/weapons/autonomous-weapons/',
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
    title: 'UN General Assembly — Historic LAWS Resolution 78/241 (Dec 2023)',
    body: 'First-ever UN General Assembly resolution specifically on lethal autonomous weapons systems passed with an overwhelming majority of 152 votes in favour. The resolution requests a substantive report from the Secretary-General on the challenges posed by LAWS.',
    url: 'https://undocs.org/A/RES/78/241',
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

  // Conveyor Animation state refs
  const conveyorFiles = useRef<{ x: number; stamped: boolean; stampT: number; }[]>([]);
  const bellCurveProgress = useRef<number>(0);
  const persons = useRef<{ x: number; y: number; }[]>([]);
  const reticleRadius = useRef<number>(0);
  const stampOffset = useRef<number>(0);
  const animInitialized = useRef<boolean>(false);

  // Synchronize active tab with scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const options = {
      root: container,
      rootMargin: '-40px 0px -60% 0px',
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

  const drawComplianceAnimation = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number,
    dt: number,
  ) => {
    const panelY = 24;

    if (!animInitialized.current) {
      animInitialized.current = true;
      conveyorFiles.current = [];
      for (let i = 0; i < 20; i++) {
        conveyorFiles.current.push({ x: i * 70, stamped: false, stampT: -99 });
      }
      // Person crowd grid
      persons.current = [];
      const cols = 14; const rows = 5;
      const crowdW = w * 0.45; const crowdH = 130;
      const crowdX = w * 0.52; const crowdY = h - 200;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          persons.current.push({
            x: crowdX + c * (crowdW / cols) + Math.random() * 8,
            y: crowdY + r * (crowdH / rows) + Math.random() * 6,
          });
        }
      }
    }

    bellCurveProgress.current = Math.min(bellCurveProgress.current + dt * 0.08, 1);
    stampOffset.current += dt * 55;
    reticleRadius.current = 20 + (t % 4) * 40;

    // ─── TOP: System vs Geneva Law Split UI ─────────────────────────────
    const splitH = h * 0.38;
    const midX = w / 2;

    // Section titles
    drawHUDText(ctx, 'LAVENDER SYSTEM', 16, panelY + 14, '#ff1a2e', 10);
    drawHUDText(ctx, 'GENEVA CONVENTIONS', midX + 16, panelY + 14, '#0096ff', 10);
    drawHUDText(ctx, 'PROBABILISTIC BATCH TARGETING', 16, panelY + 26, '#536878', 8);
    drawHUDText(ctx, 'ART. 50 — INDIVIDUALIZED ASSESSMENT', midX + 16, panelY + 26, '#536878', 8);

    // Divider
    ctx.strokeStyle = 'rgba(26, 37, 53, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(midX, panelY + 20); ctx.lineTo(midX, panelY + splitH + 10); ctx.stroke();
    ctx.setLineDash([]);

    // ─── LEFT: Bell Curve with error margin fill ─────────────────────────
    const curveX = 16;
    const curveY = panelY + splitH - 10;
    const curveW = midX - 48;
    const curveH = splitH - 70;

    // Draw bell curve
    ctx.beginPath();
    for (let px = 0; px <= curveW; px++) {
      const nx = (px / curveW - 0.5) * 6;
      const ny = Math.exp(-nx * nx / 2) / Math.sqrt(2 * Math.PI) * 2.5;
      if (px === 0) ctx.moveTo(curveX + px, curveY - ny * curveH);
      else ctx.lineTo(curveX + px, curveY - ny * curveH);
    }
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Error margin fill (right 10%)
    const errorStartX = curveX + curveW * 0.82;
    ctx.save();
    ctx.beginPath();
    for (let px = curveW * 0.82; px <= curveW; px++) {
      const nx = (px / curveW - 0.5) * 6;
      const ny = Math.exp(-nx * nx / 2) / Math.sqrt(2 * Math.PI) * 2.5;
      if (px === curveW * 0.82) ctx.moveTo(curveX + px, curveY);
      ctx.lineTo(curveX + px, curveY - ny * curveH);
    }
    ctx.lineTo(curveX + curveW, curveY);
    ctx.closePath();
    ctx.fillStyle = `rgba(255, 26, 46, ${bellCurveProgress.current * 0.6})`;
    ctx.fill();
    ctx.restore();

    // 10% label
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ff1a2e';
    ctx.fillText('10% ERROR', errorStartX + 2, curveY - 30);
    ctx.font = '7px "JetBrains Mono", monospace';
    ctx.fillStyle = '#536878';
    ctx.fillText('NON-COMBATANTS', errorStartX - 5, curveY - 18);

    // Baseline
    ctx.strokeStyle = 'rgba(83, 104, 120, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(curveX, curveY); ctx.lineTo(curveX + curveW, curveY); ctx.stroke();

    // Threshold line
    ctx.strokeStyle = 'rgba(255, 26, 46, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(errorStartX, curveY - curveH * 0.2); ctx.lineTo(errorStartX, curveY); ctx.stroke();
    ctx.setLineDash([]);

    // ─── RIGHT: Geneva Conventions Folder ────────────────────────────────
    const folderX = midX + 16;
    const folderY = panelY + 40;
    const folderW = w - folderX - 16;
    const folderH = splitH - 50;

    ctx.fillStyle = 'rgba(0, 150, 255, 0.05)';
    ctx.fillRect(folderX, folderY, folderW, folderH);
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(folderX, folderY, folderW, folderH);

    // Folder tab
    ctx.fillStyle = 'rgba(0, 150, 255, 0.15)';
    ctx.fillRect(folderX, folderY - 12, 140, 12);
    ctx.font = 'bold 7px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0096ff';
    ctx.fillText('GENEVA CONVENTION IV', folderX + 4, folderY - 2);

    // Law text lines
    const laws = [
      { text: '• Art. 50: Individualized Assessment', strikeout: false },
      { text: '• Presumption of Civilian Status', strikeout: false },
      { text: '• Positive Identification Required', strikeout: false },
      { text: '• Distinction: Combatant vs Civilian', strikeout: false },
    ];

    laws.forEach((law, i) => {
      const ly = folderY + 18 + i * 22;
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillStyle = law.strikeout ? '#2a3a4a' : '#ccd6e0';
      ctx.fillText(law.text, folderX + 8, ly);
    });

    // Red strikeout line (animated, grows over time)
    const strikeProgress = Math.min(t * 0.12, 1);
    if (strikeProgress > 0) {
      ctx.strokeStyle = '#ff1a2e';
      ctx.lineWidth = 2;
      const strikeY = folderY + 18 - 3;
      ctx.beginPath();
      ctx.moveTo(folderX + 8, strikeY);
      ctx.lineTo(folderX + 8 + (folderW - 16) * strikeProgress, strikeY);
      ctx.stroke();
      if (strikeProgress > 0.6) {
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ff1a2e';
        ctx.fillText('— SYSTEM OVERRIDE — COMPLIANCE BYPASSED', folderX + 8, folderY + 18 + 4 * 22);
      }
    }

    // ─── MIDDLE: Industrial Batch Stamping ───────────────────────────────
    const conveyorY = panelY + splitH + 20;
    const conveyorH = h * 0.22;
    const conveyorW = w - 32;

    drawHUDText(ctx, 'INDUSTRIAL BATCH APPROVAL — BATCH SIZE: UNLIMITED', 16, conveyorY - 8, '#ff1a2e', 9);

    // Conveyor belt
    ctx.fillStyle = 'rgba(13, 21, 32, 0.9)';
    ctx.fillRect(16, conveyorY, conveyorW, conveyorH);
    ctx.strokeStyle = 'rgba(26, 37, 53, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, conveyorY, conveyorW, conveyorH);

    // Belt segments
    const beltSpeed = stampOffset.current % 40;
    for (let bx = -40 + beltSpeed; bx < conveyorW + 40; bx += 40) {
      ctx.strokeStyle = 'rgba(26, 37, 53, 0.4)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(16 + bx, conveyorY + conveyorH - 8); ctx.lineTo(16 + bx, conveyorY + conveyorH); ctx.stroke();
    }

    // Moving files on conveyor
    const fileW = 55; const fileH = conveyorH * 0.5;
    const fileGap = 80;
    for (let fi = 0; fi < 8; fi++) {
      const fx = 30 + (fi * fileGap - stampOffset.current % (fileGap * 8));
      if (fx < -fileW || fx > conveyorW + 32) continue;
      const fy = conveyorY + (conveyorH - fileH) / 2;

      ctx.fillStyle = 'rgba(255, 26, 46, 0.1)';
      ctx.fillRect(fx, fy, fileW, fileH);
      ctx.strokeStyle = 'rgba(255, 26, 46, 0.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(fx, fy, fileW, fileH);

      // Stamp overlay
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255, 26, 46, 0.8)';
      ctx.save();
      ctx.translate(fx + fileW / 2, fy + fileH / 2);
      ctx.rotate(-0.2);
      ctx.strokeStyle = '#ff1a2e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-18, -8, 36, 16);
      ctx.fillText('APPROVED', -18, 4);
      ctx.restore();
    }

    // Stamp arms (mechanical)
    const stampArms = [0.2, 0.5, 0.8];
    for (const pos of stampArms) {
      const sx = 16 + conveyorW * pos;
      const armCycle = (t * 2.5 + pos * 3) % 1;
      const armY = conveyorY + 8 + (armCycle < 0.4 ? armCycle * 0.5 * conveyorH : (1 - armCycle) * 0.8 * conveyorH * 0.6);
      ctx.fillStyle = 'rgba(83, 104, 120, 0.4)';
      ctx.fillRect(sx - 8, conveyorY - 2, 16, armY - conveyorY + 2);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(sx - 12, armY, 24, 10);
      ctx.font = 'bold 5px "JetBrains Mono", monospace';
      ctx.fillStyle = '#050508';
      ctx.textAlign = 'center';
      ctx.fillText('STAMP', sx, armY + 8);
      ctx.textAlign = 'left';
    }

    // Batch counter
    const batchCount = Math.floor(t * 18);
    drawHUDText(ctx, `BATCH PROCESSED: ${batchCount.toLocaleString().padStart(6, '0')}`, 16, conveyorY + conveyorH + 14, '#ff1a2e', 9);
    drawHUDText(ctx, `INDIVIDUALLY REVIEWED: 000000`, w * 0.5, conveyorY + conveyorH + 14, '#0096ff', 9);

    // ─── BOTTOM: Area-Wide Reticle ───────────────────────────────────────
    const crowdBaseY = conveyorY + conveyorH + 32;
    drawHUDText(ctx, 'AREA-WIDE TARGETING — DISTINCTION PRINCIPLE VIOLATION', 16, crowdBaseY, '#ff1a2e', 9);

    // Crowd of person icons
    if (persons.current.length > 0) {
      const firstY = persons.current[0].y;
      for (const p of persons.current) {
        const pY = crowdBaseY + 14 + (p.y - firstY);
        // Thermal color based on reticle proximity
        const isInReticle = Math.hypot(p.x - w * 0.74, pY - (crowdBaseY + 65)) < reticleRadius.current;
        const color = isInReticle ? '#ff1a2e' : 'rgba(204, 214, 224, 0.4)';
        drawPersonIcon(ctx, p.x, pY, 7, color);
      }
    }

    // Growing reticle crosshair
    const rCX = w * 0.74;
    const rCY = crowdBaseY + 65;
    const rR = Math.min(reticleRadius.current, 130);

    ctx.strokeStyle = `rgba(255, 26, 46, ${0.5 + 0.3 * Math.sin(t * 3)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(rCX, rCY, rR, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair lines
    ctx.beginPath(); ctx.moveTo(rCX - rR, rCY); ctx.lineTo(rCX + rR, rCY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rCX, rCY - rR); ctx.lineTo(rCX, rCY + rR); ctx.stroke();

    // Thermal overlay
    const thermalR = rR * 0.85;
    const grad = ctx.createRadialGradient(rCX, rCY, 0, rCX, rCY, thermalR);
    grad.addColorStop(0, 'rgba(255, 80, 0, 0.35)');
    grad.addColorStop(0.5, 'rgba(255, 26, 46, 0.15)');
    grad.addColorStop(1, 'rgba(255, 26, 46, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(rCX, rCY, thermalR, 0, Math.PI * 2);
    ctx.fill();

    // Label
    const blink = Math.floor(t * 2) % 2 === 0;
    if (blink) {
      drawHUDText(ctx, `AREA WEAPON // DISTINCTION PRINCIPLE VIOLATED`, rCX - rR * 0.8, rCY + rR + 10, '#ff1a2e', 8);
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
      const dpr = window.devicePixelRatio || 1;
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    roRef.current = new ResizeObserver(resize);
    roRef.current.observe(container);

    let prevTime = performance.now();
    const render = (ts: number) => {
      if (!running) return;
      if (!startRef.current) startRef.current = ts;
      const t = (ts - startRef.current) / 1000;
      const dt = (ts - prevTime) / 1000;
      prevTime = ts;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, w, h);

      // Subtle grid
      ctx.strokeStyle = 'rgba(26,37,53,0.18)'; ctx.lineWidth = 0.5;
      ctx.setLineDash([]);
      const gS = 38;
      for (let gx = 0; gx < w; gx += gS) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += gS) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      }

      if (w > 100 && h > 60) {
        drawComplianceAnimation(ctx, w, h, t, dt);
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
      <div ref={containerRef} style={{ flexShrink: 0, height: '450px', position: 'relative' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
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
              {' '}<a href="https://www.article36.org/weapons/autonomous-weapons/" target="_blank" rel="noopener noreferrer" style={{ color: '#ffaa00', textDecoration: 'underline' }}>Full definition ↗</a>
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
