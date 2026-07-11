'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, X, Send, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'bug',      label: '🐛 Bug Report',            desc: 'Something is broken or not working as expected' },
  { id: 'feature',  label: '💡 Feature Request',        desc: 'Suggest a new feature, data source, or module' },
  { id: 'module',   label: '📋 Module Feedback',        desc: 'Comment on a specific sim module or scenario' },
  { id: 'advocacy', label: '⚖️  Advocacy Note',         desc: 'Suggest source material, legal arguments, or outreach' },
  { id: 'data',     label: '📊 Data/Accuracy Report',   desc: 'Report incorrect figures, broken links, or outdated data' },
  { id: 'general',  label: '💬 General Comment',        desc: 'Anything else you would like to share' },
] as const;

type ReportTypeId = typeof REPORT_TYPES[number]['id'];

const MODULES = [
  'General / All Modules',
  'M1 — Pipeline',
  'M2 — Lavender',
  'M3 — Habsora (Gospel)',
  'M4 — Where\'s Daddy',
  'M5 — Human Loop',
  'M6 — Compliance',
  'Command Hub',
  'Header / Navigation',
];

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: 'rgba(2, 6, 18, 0.75)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 6,
  padding: '8px 11px',
  color: '#ccd6e0',
  fontSize: 11,
  outline: 'none',
  fontFamily: '"JetBrains Mono", monospace',
  transition: 'border-color 0.2s',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 9,
  color: '#536878',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  marginBottom: 5,
  display: 'block',
};

interface FeedbackModalProps {
  onClose: () => void;
}

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const [type,      setType]      = useState<ReportTypeId>('bug');
  const [subject,   setSubject]   = useState('');
  const [details,   setDetails]   = useState('');
  const [email,     setEmail]     = useState('');
  const [module,    setModule]    = useState(MODULES[0]);
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState('');
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !details.trim()) {
      setError('Subject and details are required.');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, subject: subject.trim(), details: details.trim(), email: email.trim(), module }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transmission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [type, subject, details, email, module]);

  const selectedType = REPORT_TYPES.find(t => t.id === type)!;

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1000000, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(560px, 95vw)',
          maxHeight: '85vh',
          overflowY: 'auto',
          zIndex: 1000001,
          background: 'rgba(4, 6, 12, 0.99)',
          border: '1px solid rgba(0,150,255,0.28)',
          borderRadius: 12,
          boxShadow: '0 28px 80px rgba(0,0,0,0.95), 0 0 40px rgba(0,150,255,0.08)',
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid rgba(0,150,255,0.18)',
          background: 'rgba(0,150,255,0.04)',
          position: 'sticky', top: 0, zIndex: 10,
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MessageSquare style={{ width: 14, height: 14, color: '#0096ff' }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#0096ff', letterSpacing: '0.1em' }}>
                FEEDBACK &amp; INTELLIGENCE REPORT
              </div>
              <div style={{ fontSize: 7.5, color: '#536878', marginTop: 2 }}>
                LAWS-SIM v2.5.0  ·  Reports sent directly to the developer
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#536878', padding: 4, borderRadius: 4, transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ccd6e0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#536878')}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 18px' }}>

          {success ? (
            /* ── Success state ── */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', gap: 14, textAlign: 'center' }}>
              <CheckCircle style={{ width: 36, height: 36, color: '#00d47e' }} />
              <div style={{ fontSize: 14, fontWeight: 800, color: '#ccd6e0', letterSpacing: '0.04em' }}>
                TRANSMISSION CONFIRMED
              </div>
              <div style={{ fontSize: 10, color: '#536878', lineHeight: 1.6, maxWidth: 320 }}>
                Your report has been securely transmitted. The developer will review it shortly.
                Thank you for helping improve the simulation.
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  onClick={() => { setSuccess(false); setSubject(''); setDetails(''); setEmail(''); }}
                  style={{ background: 'rgba(0,150,255,0.08)', border: '1px solid rgba(0,150,255,0.28)', color: '#0096ff', borderRadius: 6, padding: '8px 18px', fontSize: 9, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.08em', fontFamily: 'monospace' }}
                >
                  SUBMIT ANOTHER
                </button>
                <button
                  onClick={onClose}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#ccd6e0', borderRadius: 6, padding: '8px 18px', fontSize: 9, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.08em', fontFamily: 'monospace' }}
                >
                  CLOSE
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Error */}
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,26,46,0.08)', border: '1px solid rgba(255,26,46,0.28)', borderRadius: 6, padding: '9px 12px', color: '#ff1a2e', fontSize: 10 }}>
                  <AlertCircle style={{ width: 13, height: 13, flexShrink: 0 }} />
                  {error}
                </div>
              )}

              {/* Report type grid */}
              <div>
                <span style={LABEL_STYLE}>Report Type</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {REPORT_TYPES.map(rt => (
                    <button
                      key={rt.id}
                      type="button"
                      onClick={() => setType(rt.id)}
                      style={{
                        background:   type === rt.id ? 'rgba(0,150,255,0.12)' : 'rgba(255,255,255,0.02)',
                        border:       `1px solid ${type === rt.id ? 'rgba(0,150,255,0.45)' : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: 7, padding: '7px 10px',
                        color:        type === rt.id ? '#0096ff' : '#536878',
                        fontSize:     9, fontWeight: 700, cursor: 'pointer',
                        textAlign:    'left', fontFamily: 'monospace',
                        transition:   'all 0.18s',
                        boxShadow:    type === rt.id ? '0 0 10px rgba(0,150,255,0.12)' : 'none',
                      }}
                    >
                      {rt.label}
                    </button>
                  ))}
                </div>
                {selectedType && (
                  <div style={{ fontSize: 8, color: '#536878', marginTop: 6, paddingLeft: 2 }}>{selectedType.desc}</div>
                )}
              </div>

              {/* Module + Subject row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LABEL_STYLE}>Module / Area</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={module}
                      onChange={e => setModule(e.target.value)}
                      style={{ ...INPUT_STYLE, appearance: 'none', paddingRight: 28, cursor: 'pointer' }}
                    >
                      {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 11, height: 11, color: '#536878', pointerEvents: 'none' }} />
                  </div>
                </div>
                <div>
                  <label style={LABEL_STYLE}>Your Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="anonymous@simulation.net"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={INPUT_STYLE}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,150,255,0.45)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label style={LABEL_STYLE}>Subject <span style={{ color: '#ff1a2e' }}>*</span></label>
                <input
                  type="text"
                  placeholder="Brief summary of your report..."
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  required
                  style={INPUT_STYLE}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,150,255,0.45)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </div>

              {/* Details */}
              <div>
                <label style={LABEL_STYLE}>Details &amp; Description <span style={{ color: '#ff1a2e' }}>*</span></label>
                <textarea
                  rows={4}
                  placeholder="Please provide as much context as possible. For bugs, describe what you expected vs. what happened. For features, explain the use case..."
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  required
                  style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: 1.6, minHeight: 88 }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,150,255,0.45)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </div>

              {/* Anonymous notice */}
              <div style={{ fontSize: 8, color: '#2a3a4a', lineHeight: 1.6, paddingTop: 2 }}>
                📡 All submissions are anonymous unless you provide an email. This sim is a disarmament advocacy tool — all feedback helps improve it.
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: loading ? 'rgba(0,150,255,0.06)' : '#0096ff',
                  color: loading ? '#0096ff' : '#000917',
                  border: '1px solid rgba(0,150,255,0.5)',
                  borderRadius: 8, padding: '11px 0', fontSize: 10, fontWeight: 800,
                  letterSpacing: '0.1em', cursor: loading ? 'wait' : 'pointer',
                  fontFamily: 'monospace', transition: 'all 0.2s',
                  boxShadow: loading ? 'none' : '0 0 16px rgba(0,150,255,0.2)',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 0 26px rgba(0,150,255,0.38)'; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.boxShadow = '0 0 16px rgba(0,150,255,0.2)'; }}
              >
                <Send style={{ width: 12, height: 12 }} />
                {loading ? 'TRANSMITTING...' : 'SUBMIT INTELLIGENCE REPORT'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
