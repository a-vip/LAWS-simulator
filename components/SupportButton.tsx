'use client';
import { useState } from 'react';

interface SupportButtonProps {
  onChangelogOpen?: () => void;
}

export function SupportButton({ onChangelogOpen }: SupportButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText('https://sim.sovdash.com').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Pill trigger */}
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '4px 10px', borderRadius: '20px',
          background: 'rgba(5, 8, 14, 0.88)',
          border: open ? '1px solid #ec4899' : '1px solid rgba(236, 72, 153, 0.25)',
          color: open ? '#ec4899' : '#c0cbd8',
          fontSize: '9.5px', fontWeight: 700, cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease',
          outline: 'none', fontFamily: 'monospace',
          boxShadow: open ? '0 0 14px rgba(236,72,153,0.18)' : 'none',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#ec4899';
          e.currentTarget.style.color = '#ec4899';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = open ? '#ec4899' : 'rgba(236,72,153,0.25)';
          e.currentTarget.style.color = open ? '#ec4899' : '#c0cbd8';
        }}
        title="Support / By Avi"
      >
        <span style={{ color: '#ec4899', fontSize: '10px' }}>❤</span>
        SUPPORT
      </button>

      {/* Dropdown card — opens DOWNWARD */}
      {open && (
        <>
          {/* Click-outside backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)', // ← opens downward
              right: 0,
              width: '240px',
              background: 'rgba(5, 8, 14, 0.99)',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              borderRadius: '10px', padding: '11px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.85), 0 0 20px rgba(236,72,153,0.1)',
              display: 'flex', flexDirection: 'column', gap: '10px',
              zIndex: 9999, backdropFilter: 'blur(14px)',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid rgba(236,72,153,0.2)', paddingBottom: '8px',
            }}>
              <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#ec4899', fontFamily: 'monospace', letterSpacing: '0.8px' }}>
                LAWS-SIM HUB
              </span>
              <span
                onClick={() => setOpen(false)}
                style={{ cursor: 'pointer', color: 'rgba(236,72,153,0.6)', fontWeight: 700, fontSize: '14px', lineHeight: 1, padding: '0 3px', transition: 'color 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ff2d55')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(236,72,153,0.6)')}
              >×</span>
            </div>

            {/* Creator credit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.8px' }}>
                👤 CREATOR
              </span>
              <a
                href="https://aviperera.com"
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  padding: '7px 10px', borderRadius: '6px', fontSize: '9.5px', fontWeight: 700,
                  textDecoration: 'none', letterSpacing: '0.4px', transition: 'all 0.2s',
                  background: 'rgba(0, 150, 255, 0.08)', color: '#0096ff',
                  border: '1px solid rgba(0, 150, 255, 0.22)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#0096ff'; e.currentTarget.style.color = '#000'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 150, 255, 0.08)'; e.currentTarget.style.color = '#0096ff'; }}
              >
                🌐 BY AVI — AVIPERERA.COM ↗
              </a>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

            {/* Changelog trigger */}
            {onChangelogOpen && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.8px' }}>
                    📋 UPDATE LOGS
                  </span>
                  <button
                    onClick={() => { setOpen(false); onChangelogOpen(); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                      padding: '7px 10px', borderRadius: '6px', fontSize: '9.5px', fontWeight: 700,
                      letterSpacing: '0.4px', transition: 'all 0.2s', cursor: 'pointer', outline: 'none', width: '100%',
                      background: 'rgba(0, 150, 255, 0.06)', color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.2)', fontFamily: 'monospace',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(56,189,248,0.15)'; e.currentTarget.style.borderColor = '#38bdf8'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,150,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(56,189,248,0.2)'; }}
                  >
                    VIEW CHANGELOG v2.5.0
                  </button>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
              </>
            )}

            {/* Share */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.8px' }}>
                ⚡ SHARE SIMULATOR
              </span>
              <button
                onClick={handleShare}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  padding: '7px 10px', borderRadius: '6px', fontSize: '9px', fontWeight: 700,
                  letterSpacing: '0.4px', transition: 'all 0.2s', cursor: 'pointer', outline: 'none', width: '100%',
                  background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(168,85,247,0.08)',
                  color: copied ? '#22c55e' : '#a855f7',
                  border: copied ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(168,85,247,0.22)',
                  fontFamily: 'monospace',
                }}
                onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.background = 'rgba(168,85,247,0.18)'; e.currentTarget.style.color = '#c084fc'; } }}
                onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.background = 'rgba(168,85,247,0.08)'; e.currentTarget.style.color = '#a855f7'; } }}
              >
                {copied ? '✓ LINK COPIED!' : '⇧ COPY SIM.SOVDASH.COM'}
              </button>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

            {/* Patronage */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.8px' }}>
                ❤️ SUPPORT THE WORK
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <a
                  href="https://patreon.com/aviperera"
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    padding: '7px 4px', borderRadius: '6px', fontSize: '8.5px', fontWeight: 800,
                    textDecoration: 'none', letterSpacing: '0.2px', transition: 'all 0.2s',
                    background: 'rgba(255,66,77,0.08)', color: '#ff424d',
                    border: '1px solid rgba(255,66,77,0.2)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#ff424d'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,66,77,0.08)'; e.currentTarget.style.color = '#ff424d'; }}
                >
                  ⚡ Patreon
                </a>
                <a
                  href="https://buymeacoffee.com/avip"
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    padding: '7px 4px', borderRadius: '6px', fontSize: '8.5px', fontWeight: 800,
                    textDecoration: 'none', letterSpacing: '0.2px', transition: 'all 0.2s',
                    background: 'rgba(255,221,0,0.08)', color: '#ffdd00',
                    border: '1px solid rgba(255,221,0,0.2)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#ffdd00'; e.currentTarget.style.color = '#000'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,221,0,0.08)'; e.currentTarget.style.color = '#ffdd00'; }}
                >
                  ☕ Coffee
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
