// Phase 6: Help Dialog — Keyboard Shortcuts Reference
import React from 'react';
import { SHORTCUTS } from '../../keyboard/KeyboardManager';

export function HelpDialog({ onClose }) {
  const categories = [...new Set(SHORTCUTS.map(s => s.category))];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      style={styles.overlay}
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 id="help-title" style={styles.title}>Keyboard Shortcuts</h2>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close help">
            ✕
          </button>
        </div>

        <div style={styles.content}>
          {categories.map(cat => (
            <div key={cat} style={styles.section}>
              <h3 style={styles.sectionTitle}>{cat}</h3>
              <div style={styles.table}>
                {SHORTCUTS.filter(s => s.category === cat).map((s, i) => (
                  <div key={i} style={styles.row}>
                    <kbd style={styles.key}>{s.key}</kbd>
                    <span style={styles.action}>{s.action}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.footer}>
          <p style={styles.hint}>Press ? or H anytime to open this dialog</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 500,
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  panel: {
    width: 460,
    maxHeight: '80vh',
    background: 'rgba(20, 20, 30, 0.95)',
    backdropFilter: 'blur(24px)',
    borderRadius: 20,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)'
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: '#fff',
    margin: 0,
    fontFamily: 'system-ui, sans-serif'
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    padding: '16px 24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: 'rgba(0, 229, 255, 0.7)',
    margin: 0,
    fontFamily: 'system-ui, sans-serif'
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 0'
  },
  key: {
    padding: '4px 10px',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontFamily: 'monospace, sans-serif',
    fontWeight: 600,
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
  },
  action: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'system-ui, sans-serif'
  },
  footer: {
    padding: '12px 24px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    textAlign: 'center'
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    margin: 0,
    fontFamily: 'system-ui, sans-serif'
  }
};
