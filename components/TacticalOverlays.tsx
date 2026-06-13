'use client';
import { useEffect, useRef } from 'react';
import { useSimulationStore } from '@/store/simulation';
import { useMapLayerStore } from '@/store/mapLayers';
import { getTacticalData, offsetLatLng } from '@/lib/tacticalData';
import type { TacticalOverlayData, LatLng } from '@/lib/types';

// Renders all Palantir-style tactical overlays on a Leaflet map instance
export function TacticalOverlays({ mapInstance }: { mapInstance: any }) {
  const { activeScenario, phase, confidenceScore } = useSimulationStore();
  const { layers, subLayers } = useMapLayerStore();
  const layerGroupsRef = useRef<any[]>([]);

  // Check map is still alive before operating on it
  const isMapValid = (map: any) => {
    try {
      return map && map._container && map.getPane && map.getPane('overlayPane');
    } catch (_) {
      return false;
    }
  };

  // Clean up all overlay layers
  const clearAll = (map: any) => {
    layerGroupsRef.current.forEach((lg) => {
      try { if (isMapValid(map)) map.removeLayer(lg); } catch (_) {}
    });
    layerGroupsRef.current = [];
  };

  useEffect(() => {
    if (!mapInstance || !isMapValid(mapInstance) || !activeScenario) return;

    const L = (window as any).L;
    if (!L) return;

    const data = getTacticalData(activeScenario.id);
    if (!data) return;

    clearAll(mapInstance);

    const allLayers: any[] = [];

    // ── THREAT RANGE RADIALS ──────────────────────────────────────────
    if (layers.threatAnalysis && subLayers['threat.rangeRadials']) {
      data.threatZones.forEach((tz) => {
        // Caution ring (outermost)
        const cautionRing = L.circle([tz.center.lat, tz.center.lng], {
          radius: tz.cautionRadius,
          color: '#ffaa0088',
          weight: 1,
          dashArray: '8 4',
          fillColor: '#ffaa00',
          fillOpacity: 0.04,
          interactive: false,
        });

        // Danger ring
        const dangerRing = L.circle([tz.center.lat, tz.center.lng], {
          radius: tz.dangerRadius,
          color: '#ff660088',
          weight: 1.5,
          dashArray: '5 3',
          fillColor: '#ff6600',
          fillOpacity: 0.07,
          interactive: false,
        });

        // Lethal ring (innermost - solid fill)
        const lethalRing = L.circle([tz.center.lat, tz.center.lng], {
          radius: tz.lethalRadius,
          color: '#ff1a2e',
          weight: 2,
          fillColor: '#ff1a2e',
          fillOpacity: 0.16,
          interactive: false,
        });

        // Ring labels at intercardinal points
        const labelOffset = offsetLatLng(tz.center.lat, tz.center.lng, tz.dangerRadius, 0);
        const dangerLabel = L.marker([labelOffset.lat, labelOffset.lng], {
          icon: L.divIcon({
            className: '',
            html: `<span style="font-family:monospace;font-size:6px;font-weight:700;color:#ff6600;letter-spacing:1px;white-space:nowrap;text-shadow:0 0 4px #ff660088;">${tz.dangerRadius}m DANGER</span>`,
            iconSize: [80, 10],
            iconAnchor: [40, 5],
          }),
          interactive: false,
        });

        const lethalLabelOffset = offsetLatLng(tz.center.lat, tz.center.lng, tz.lethalRadius, 45);
        const lethalLabel = L.marker([lethalLabelOffset.lat, lethalLabelOffset.lng], {
          icon: L.divIcon({
            className: '',
            html: `<span style="font-family:monospace;font-size:6px;font-weight:700;color:#ff1a2e;letter-spacing:1px;white-space:nowrap;text-shadow:0 0 4px #ff1a2e88;">${tz.lethalRadius}m LETHAL</span>`,
            iconSize: [80, 10],
            iconAnchor: [0, 5],
          }),
          interactive: false,
        });

        allLayers.push(cautionRing, dangerRing, lethalRing, dangerLabel, lethalLabel);
      });
    }

    // ── ENGAGEMENT ZONE ──────────────────────────────────────────────
    if (layers.battlefield && subLayers['battle.engagementZone'] && data.engagementZone.length > 0) {
      const ezPoly = L.polygon(
        data.engagementZone.map((p: LatLng) => [p.lat, p.lng]),
        {
          color: '#ff1a2e',
          weight: 2,
          dashArray: '10 5',
          fillColor: '#ff1a2e',
          fillOpacity: 0.05,
          interactive: false,
        }
      );
      allLayers.push(ezPoly);

      const center = {
        lat: data.engagementZone.reduce((s: number, p: LatLng) => s + p.lat, 0) / data.engagementZone.length,
        lng: data.engagementZone.reduce((s: number, p: LatLng) => s + p.lng, 0) / data.engagementZone.length,
      };
      const ezLabel = L.marker([center.lat, center.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="font-family:monospace;font-size:8px;font-weight:700;letter-spacing:2px;color:#ff1a2e;background:rgba(255,26,46,0.12);border:1px solid rgba(255,26,46,0.3);padding:2px 6px;border-radius:2px;white-space:nowrap;">ENGAGEMENT ZONE</div>`,
          iconSize: [130, 18],
          iconAnchor: [65, 9],
        }),
        interactive: false,
      });
      allLayers.push(ezLabel);
    }

    // ── SENSOR FAN ARCS (ISR COVERAGE) ───────────────────────────────
    // These are the blue/green fan sectors visible in the Palantir Maven demo
    if (layers.battlefield && subLayers['battle.sensorFans']) {
      data.sensorArcs.forEach((arc) => {
        const points: [number, number][] = [[arc.center.lat, arc.center.lng]];
        const steps = 32;
        for (let i = 0; i <= steps; i++) {
          const bearing = arc.startBearing + (arc.endBearing - arc.startBearing) * (i / steps);
          const pt = offsetLatLng(arc.center.lat, arc.center.lng, arc.radius, bearing);
          points.push([pt.lat, pt.lng]);
        }
        points.push([arc.center.lat, arc.center.lng]);

        // Filled fan polygon
        const fanPoly = L.polygon(points, {
          color: arc.color.replace(/[\d.]+\)$/, '0.5)'),
          weight: 1.5,
          fillColor: arc.color,
          fillOpacity: 0.22,
          interactive: true,
        });
        fanPoly.bindTooltip(
          `<div class="tactical-tooltip"><span class="tt-header tt-friendly">◉ ${arc.sensorType}</span><span class="tt-row">RADIUS: ${(arc.radius / 1000).toFixed(1)}km</span><span class="tt-row">ARC: ${arc.startBearing}°–${arc.endBearing}°</span><span class="tt-row">STATUS: ACTIVE ISR</span></div>`,
          { className: 'tactical-tooltip-container', direction: 'top' }
        );
        allLayers.push(fanPoly);

        // Sensor type label inside arc
        const midBearing = (arc.startBearing + arc.endBearing) / 2;
        const labelPos = offsetLatLng(arc.center.lat, arc.center.lng, arc.radius * 0.55, midBearing);
        const sensorLabel = L.marker([labelPos.lat, labelPos.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="font-family:monospace;font-size:6px;font-weight:700;color:rgba(0,150,255,0.75);letter-spacing:1px;white-space:nowrap;text-shadow:0 0 4px rgba(0,150,255,0.5);">${arc.sensorType}</div>`,
            iconSize: [110, 12],
            iconAnchor: [55, 6],
          }),
          interactive: false,
        });
        allLayers.push(sensorLabel);
      });
    }

    // ── COA APPROACH VECTORS (Maven blue triangles) ──────────────────
    // These are the prominent blue triangular wedges from the Maven demo,
    // showing planned approach corridors for each asset.
    if (layers.battlefield && subLayers['battle.approachVectors']) {
      data.coaVectors.forEach((coa) => {
        const halfAngle = coa.spreadAngle / 2;
        const points: [number, number][] = [[coa.origin.lat, coa.origin.lng]];
        const steps = 24;
        for (let i = 0; i <= steps; i++) {
          const bearing = (coa.bearing - halfAngle) + coa.spreadAngle * (i / steps);
          const pt = offsetLatLng(coa.origin.lat, coa.origin.lng, coa.range, bearing);
          points.push([pt.lat, pt.lng]);
        }
        points.push([coa.origin.lat, coa.origin.lng]);

        // Main COA polygon — higher opacity to match Maven style
        const coaPoly = L.polygon(points, {
          color: coa.color.replace(/[\d.]+\)$/, '0.65)'),
          weight: 1.5,
          fillColor: coa.color,
          fillOpacity: 0.28,
          interactive: true,
        });
        coaPoly.bindTooltip(
          `<div class="tactical-tooltip"><span class="tt-header tt-friendly">▶ ${coa.label}</span><span class="tt-row">BEARING: ${coa.bearing}°</span><span class="tt-row">RANGE: ${(coa.range / 1000).toFixed(1)}km</span><span class="tt-row">SPREAD: ±${coa.spreadAngle / 2}°</span></div>`,
          { className: 'tactical-tooltip-container', direction: 'top' }
        );
        allLayers.push(coaPoly);

        // Left and right edge lines for the fan
        const leftPt = offsetLatLng(coa.origin.lat, coa.origin.lng, coa.range, coa.bearing - halfAngle);
        const rightPt = offsetLatLng(coa.origin.lat, coa.origin.lng, coa.range, coa.bearing + halfAngle);
        const leftEdge = L.polyline([[coa.origin.lat, coa.origin.lng], [leftPt.lat, leftPt.lng]], {
          color: coa.color.replace(/[\d.]+\)$/, '0.7)'),
          weight: 1.5,
          dashArray: '6 3',
          interactive: false,
        });
        const rightEdge = L.polyline([[coa.origin.lat, coa.origin.lng], [rightPt.lat, rightPt.lng]], {
          color: coa.color.replace(/[\d.]+\)$/, '0.7)'),
          weight: 1.5,
          dashArray: '6 3',
          interactive: false,
        });
        allLayers.push(leftEdge, rightEdge);

        // COA label at tip
        const labelPt = offsetLatLng(coa.origin.lat, coa.origin.lng, coa.range * 0.7, coa.bearing);
        const coaLabel = L.marker([labelPt.lat, labelPt.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="font-family:monospace;font-size:7px;font-weight:700;color:rgba(0,120,255,0.85);letter-spacing:0.5px;white-space:nowrap;text-shadow:0 0 5px rgba(0,120,255,0.5);">${coa.label}</div>`,
            iconSize: [150, 12],
            iconAnchor: [75, 6],
          }),
          interactive: false,
        });
        allLayers.push(coaLabel);
      });
    }

    // ── DRONE FLIGHT PATHS ───────────────────────────────────────────
    if (layers.isrAssets && subLayers['isr.droneTracks']) {
      data.droneRoutes.forEach((route) => {
        const latlngs = route.waypoints.map((w: LatLng) => [w.lat, w.lng] as [number, number]);

        // Main path — dashed
        const pathLine = L.polyline(latlngs, {
          color: route.color,
          weight: 2,
          dashArray: '8 6',
          opacity: 0.65,
          interactive: false,
        });
        allLayers.push(pathLine);

        // Waypoint dots with tooltips
        route.waypoints.forEach((wp: LatLng, idx: number) => {
          const isFirst = idx === 0;
          const isLast = idx === route.waypoints.length - 1;
          const wpMarker = L.circleMarker([wp.lat, wp.lng], {
            radius: isFirst || isLast ? 5 : 3,
            color: route.color,
            fillColor: isLast ? '#ff1a2e' : route.color,
            fillOpacity: 0.85,
            weight: 1.5,
            interactive: true,
          });
          wpMarker.bindTooltip(
            `<div class="tactical-tooltip"><span class="tt-header" style="color:${route.color}">▶ ${route.label}</span><span class="tt-row">WP-${String(idx + 1).padStart(2,'0')} / ${route.waypoints.length}</span><span class="tt-row">TYPE: ${route.type.toUpperCase()}</span><span class="tt-row">LAT: ${wp.lat.toFixed(4)}° LNG: ${wp.lng.toFixed(4)}°</span></div>`,
            { className: 'tactical-tooltip-container', direction: 'top', offset: [0, -8] }
          );
          allLayers.push(wpMarker);
        });

        // Direction arrows
        for (let i = 0; i < latlngs.length - 1; i++) {
          const midLat = (latlngs[i][0] + latlngs[i + 1][0]) / 2;
          const midLng = (latlngs[i][1] + latlngs[i + 1][1]) / 2;
          const angleDeg = Math.atan2(latlngs[i + 1][1] - latlngs[i][1], latlngs[i + 1][0] - latlngs[i][0]) * (180 / Math.PI);
          const arrow = L.marker([midLat, midLng], {
            icon: L.divIcon({
              className: '',
              html: `<div style="color:${route.color};font-size:9px;opacity:0.65;transform:rotate(${90 - angleDeg}deg);text-shadow:0 0 4px ${route.color};">▶</div>`,
              iconSize: [12, 12],
              iconAnchor: [6, 6],
            }),
            interactive: false,
          });
          allLayers.push(arrow);
        }
      });
    }

    // ── FRIENDLY ASSET MARKERS (static ISR positions) ────────────────
    if (layers.isrAssets) {
      data.friendlyAssets.forEach((asset) => {
        const statusColor = asset.status === 'active' || asset.status === 'orbiting'
          ? '#0096ff' : asset.status === 'inbound' ? '#ffaa00' : '#536878';
        const typeIcon = asset.type === 'drone' ? '✈' : asset.type === 'fob' ? '⌂'
          : asset.type === 'sigint' ? '◎' : asset.type === 'relay' ? '⊕' : '◈';

        const marker = L.marker([asset.position.lat, asset.position.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
              <div style="width:22px;height:22px;border:2px solid ${statusColor};border-radius:3px;background:rgba(5,5,8,0.88);display:flex;align-items:center;justify-content:center;font-size:10px;color:${statusColor};box-shadow:0 0 8px ${statusColor}55;">
                ${typeIcon}
              </div>
              <div style="font-family:monospace;font-size:6px;font-weight:700;color:${statusColor};white-space:nowrap;margin-top:1px;letter-spacing:0.3px;text-shadow:0 0 5px ${statusColor}88;">${asset.designator}</div>
            </div>`,
            iconSize: [70, 30],
            iconAnchor: [35, 11],
          }),
          interactive: true,
        });

        marker.bindTooltip(
          `<div class="tactical-tooltip"><span class="tt-header tt-friendly">■ ${asset.designator}</span><span class="tt-row">TYPE: ${asset.type.toUpperCase()}</span><span class="tt-row">STATUS: ${asset.status.toUpperCase()}</span>${asset.altitude ? `<span class="tt-row">ALT: ${asset.altitude.toLocaleString()}m MSL</span>` : ''}<span class="tt-row">LAT: ${asset.position.lat.toFixed(5)}°</span><span class="tt-row">LNG: ${asset.position.lng.toFixed(5)}°</span></div>`,
          { className: 'tactical-tooltip-container', direction: 'top', offset: [0, -18] }
        );
        allLayers.push(marker);
      });
    }

    // ── PRIMARY TARGET MARKER ────────────────────────────────────────
    if (layers.targeting && subLayers['target.primaryMarker'] && activeScenario) {
      const target = activeScenario.targets[0];
      if (target) {
        const threatColors: Record<string, string> = {
          low: '#ffaa00', medium: '#ff6600', high: '#ff1a2e', critical: '#ff0044',
        };
        const tColor = threatColors[target.threatLevel] ?? '#ff1a2e';

        // Pulsing outer ring for target
        const targetPing = L.circle([target.position.lat, target.position.lng], {
          radius: 120,
          color: tColor,
          weight: 1,
          fillColor: tColor,
          fillOpacity: 0.08,
          className: 'cde-pulse-ring',
          interactive: false,
        });
        allLayers.push(targetPing);

        const targetMarker = L.marker([target.position.lat, target.position.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
              <div style="
                width: 24px; height: 24px;
                border: 2.5px solid ${tColor};
                border-radius: 2px;
                background: rgba(5,5,8,0.9);
                display: flex; align-items: center; justify-content: center;
                font-size: 12px; color: ${tColor};
                box-shadow: 0 0 14px ${tColor}88, inset 0 0 6px ${tColor}22;
                transform: rotate(45deg);
              ">
                <span style="transform:rotate(-45deg);font-size:9px;">◆</span>
              </div>
              <div style="font-family:monospace;font-size:7px;font-weight:700;color:${tColor};white-space:nowrap;margin-top:3px;letter-spacing:0.5px;text-shadow:0 0 6px ${tColor};">${target.designator}</div>
            </div>`,
            iconSize: [100, 36],
            iconAnchor: [50, 12],
          }),
          interactive: true,
          zIndexOffset: 1000,
        });

        targetMarker.bindTooltip(
          `<div class="tactical-tooltip">
            <span class="tt-header tt-hostile">◆ ${target.designator} <span class="tt-badge tt-badge-${target.threatLevel}">${target.threatLevel.toUpperCase()}</span></span>
            <span class="tt-divider"></span>
            <span class="tt-row">TYPE: ${target.type.toUpperCase()}</span>
            <span class="tt-row">CONF: ${confidenceScore.toFixed(1)}%</span>
            <span class="tt-row">LAT: ${target.position.lat.toFixed(5)}°N</span>
            <span class="tt-row">LNG: ${target.position.lng.toFixed(5)}°E</span>
            <span class="tt-row">STATUS: <span style="color:#ff1a2e">${phase === 'idle' ? 'UNCONFIRMED' : 'TRACKED'}</span></span>
            ${target.metadata.patternDays ? `<span class="tt-row">PATTERN: ${target.metadata.patternDays}d observed</span>` : ''}
            ${target.metadata.phoneMetadata ? '<span class="tt-row">SIM: <span style="color:#ff6600">FLAGGED ●</span></span>' : ''}
            ${target.metadata.notes ? `<span class="tt-row" style="max-width:180px;line-height:1.5;margin-top:2px;border-top:1px solid #1a2535;padding-top:2px;">${target.metadata.notes.substring(0, 90)}...</span>` : ''}
          </div>`,
          { className: 'tactical-tooltip-container', direction: 'top', offset: [0, -24], sticky: true }
        );
        allLayers.push(targetMarker);
      }
    }

    // ── CDE BLAST RADIUS RINGS ───────────────────────────────────────
    if (layers.threatAnalysis && subLayers['threat.cdeRings'] && activeScenario) {
      const target = activeScenario.targets[0];
      if (target) {
        const isActive = phase === 'engagement' || phase === 'impact';
        const cdeRing = L.circle([target.position.lat, target.position.lng], {
          radius: 180,
          color: '#ff1a2e',
          weight: 1.5,
          dashArray: '4 4',
          fillColor: '#ff1a2e',
          fillOpacity: isActive ? 0.22 : 0.05,
          className: 'cde-pulse-ring',
          interactive: true,
        });
        cdeRing.bindTooltip(
          `<div class="tactical-tooltip"><span class="tt-header tt-hostile">CDE ZONE — 180m RADIUS</span><span class="tt-row">Collateral Damage Estimate</span><span class="tt-row tt-warn" style="color:#ff6600">Population within zone at risk</span></div>`,
          { className: 'tactical-tooltip-container', direction: 'top' }
        );
        allLayers.push(cdeRing);
      }
    }

    // ── NO-STRIKE ZONES ──────────────────────────────────────────────
    if (layers.reference && subLayers['ref.noStrikeZones']) {
      data.noStrikeZones.forEach((nsz) => {
        const nszPoly = L.polygon(
          nsz.polygon.map((p: LatLng) => [p.lat, p.lng]),
          {
            color: '#00d47e',
            weight: 2.5,
            dashArray: '6 3',
            fillColor: '#00d47e',
            fillOpacity: 0.10,
            interactive: true,
          }
        );
        nszPoly.bindTooltip(
          `<div class="tactical-tooltip"><span class="tt-header tt-neutral">✚ NO-STRIKE: ${nsz.label}</span><span class="tt-row">TYPE: ${nsz.type.toUpperCase()}</span><span class="tt-row tt-warn">PROTECTED UNDER IHL ART.57</span></div>`,
          { className: 'tactical-tooltip-container', direction: 'top' }
        );

        // NSZ icon at center
        const nszCenter = {
          lat: nsz.polygon.reduce((s, p) => s + p.lat, 0) / nsz.polygon.length,
          lng: nsz.polygon.reduce((s, p) => s + p.lng, 0) / nsz.polygon.length,
        };
        const nszLabel = L.marker([nszCenter.lat, nszCenter.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="font-family:monospace;font-size:6px;font-weight:700;color:#00d47e;background:rgba(0,212,126,0.1);border:1px solid rgba(0,212,126,0.3);padding:1px 4px;border-radius:2px;white-space:nowrap;">✚ ${nsz.label}</div>`,
            iconSize: [120, 14],
            iconAnchor: [60, 7],
          }),
          interactive: false,
        });
        allLayers.push(nszPoly, nszLabel);
      });
    }

    // ── CIVILIAN INFRASTRUCTURE MARKERS ──────────────────────────────
    if (layers.reference && subLayers['ref.civilianInfra']) {
      const infraSymbols: Record<string, string> = {
        school: 'S', hospital: 'H', mosque: 'M', market: 'Mkt', residence: 'R', infrastructure: 'I',
      };
      data.civilianInfra.forEach((ci) => {
        const ciMarker = L.marker([ci.position.lat, ci.position.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="display:flex;flex-direction:column;align-items:center;">
              <div style="width:18px;height:18px;border:2px solid #00d47e;border-radius:0;background:rgba(5,5,8,0.88);display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:7px;font-weight:700;color:#00d47e;box-shadow:0 0 6px #00d47e44;">${infraSymbols[ci.type] || '■'}</div>
              <div style="font-family:monospace;font-size:6px;color:#00d47e;white-space:nowrap;margin-top:1px;letter-spacing:0.3px;max-width:70px;overflow:hidden;text-overflow:ellipsis;">${ci.label.substring(0, 16)}</div>
            </div>`,
            iconSize: [80, 26],
            iconAnchor: [40, 9],
          }),
          interactive: true,
        });
        ciMarker.bindTooltip(
          `<div class="tactical-tooltip"><span class="tt-header tt-neutral">■ ${ci.label}</span><span class="tt-row">CLASS: CIVILIAN ${ci.type.toUpperCase()}</span><span class="tt-row tt-warn">PROTECTED — DO NOT STRIKE</span></div>`,
          { className: 'tactical-tooltip-container', direction: 'top', offset: [0, -14] }
        );
        allLayers.push(ciMarker);
      });
    }

    // ── PATTERN-OF-LIFE TRACKS ───────────────────────────────────────
    if (layers.targeting && subLayers['target.patternTracks']) {
      data.patternTracks.forEach((track) => {
        if (track.positions.length < 2) return;
        const latlngs = track.positions.map((p) => [p.lat, p.lng] as [number, number]);

        const trackLine = L.polyline(latlngs, {
          color: '#ffaa00',
          weight: 1.5,
          dashArray: '3 6',
          opacity: 0.55,
          interactive: false,
        });
        allLayers.push(trackLine);

        // Timestamp dots
        track.positions.forEach((pos, idx) => {
          const isLatest = idx === track.positions.length - 1;
          const dot = L.circleMarker([pos.lat, pos.lng], {
            radius: isLatest ? 5 : 3,
            color: isLatest ? '#ff1a2e' : '#ffaa00',
            fillColor: isLatest ? '#ff1a2e' : '#ffaa00',
            fillOpacity: 0.85,
            weight: 1.5,
            interactive: true,
          });
          dot.bindTooltip(
            `<div class="tactical-tooltip"><span class="tt-header" style="color:#ffaa00">${track.label}</span><span class="tt-row">OBSERVED: ${pos.timestamp ?? `POS-${idx + 1}`}</span><span class="tt-row">LAT: ${pos.lat.toFixed(5)}°</span><span class="tt-row">LNG: ${pos.lng.toFixed(5)}°</span>${isLatest ? '<span class="tt-row" style="color:#ff1a2e">⬤ LAST KNOWN POSITION</span>' : ''}</div>`,
            { className: 'tactical-tooltip-container', direction: 'top', offset: [0, -6] }
          );
          allLayers.push(dot);
        });
      });
    }

    // ── ADD ALL LAYERS TO MAP (with validity check) ──────────────────
    try {
      if (isMapValid(mapInstance)) {
        const group = L.layerGroup(allLayers);
        group.addTo(mapInstance);
        layerGroupsRef.current = [group];
      }
    } catch (e) {
      console.warn('TacticalOverlays: map no longer valid, skipping addTo', e);
    }

    return () => clearAll(mapInstance);
  }, [mapInstance, activeScenario, phase, confidenceScore, layers, subLayers]);

  return null;
}
