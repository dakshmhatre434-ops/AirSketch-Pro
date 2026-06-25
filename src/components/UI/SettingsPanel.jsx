// Phase 6: Settings Panel Dialog
import React, { useState, useEffect } from 'react';
import { settingsManager } from '../../settings/SettingsManager';

export function SettingsPanel({ onClose }) {
  const [settings, setSettings] = useState(settingsManager.getAll());

  useEffect(() => {
    const unsub = settingsManager.subscribe((key, val) => {
      setSettings(prev => ({ ...prev, ...(key ? { [key]: val } : val) }));
    });
    return unsub;
  }, []);

  const update = (key, value) => settingsManager.set(key, value);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      style={styles.overlay}
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 id="settings-title" style={styles.title}>Settings</h2>
          <button
            onClick={onClose}
            style={styles.closeBtn}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div style={styles.content}>
          {/* Recognition */}
          <Section title="Recognition">
            <SliderRow
              label="Confidence Threshold"
              value={settings.recognitionThreshold}
              min={30}
              max={95}
              step={5}
              suffix="%"
              onChange={v => update('recognitionThreshold', v)}
            />
            <ToggleRow
              label="Enable Beautification"
              checked={settings.enableBeautification}
              onChange={v => update('enableBeautification', v)}
            />
            <ToggleRow
              label="Show Recognition Badges"
              checked={settings.showBadges}
              onChange={v => update('showBadges', v)}
            />
          </Section>

          {/* Appearance */}
          <Section title="Appearance">
            <ToggleRow
              label="Dark Theme"
              checked={settings.theme === 'dark'}
              onChange={v => update('theme', v ? 'dark' : 'light')}
            />
            <ToggleRow
              label="Show Hand Landmarks"
              checked={settings.showLandmarks}
              onChange={v => update('showLandmarks', v)}
            />
            <ToggleRow
              label="Show Alignment Guides"
              checked={settings.showAlignmentGuides}
              onChange={v => update('showAlignmentGuides', v)}
            />
            <ToggleRow
              label="Snap to Grid"
              checked={settings.snapToGrid}
              onChange={v => update('snapToGrid', v)}
            />
            {settings.snapToGrid && (
              <SliderRow
                label="Grid Size"
                value={settings.gridSize}
                min={5}
                max={50}
                step={5}
                suffix="px"
                onChange={v => update('gridSize', v)}
              />
            )}
            <ToggleRow
              label="High Contrast"
              checked={settings.highContrast}
              onChange={v => update('highContrast', v)}
            />
          </Section>

          {/* Developer */}
          <Section title="Developer">
            <ToggleRow
              label="Show FPS Counter"
              checked={settings.showFps}
              onChange={v => update('showFps', v)}
            />
          </Section>

          <div style={styles.footer}>
            <button
              onClick={() => settingsManager.reset()}
              style={styles.resetBtn}
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          ...styles.toggle,
          ...(checked ? styles.toggleOn : {})
        }}
      >
        <div style={{
          ...styles.toggleKnob,
          transform: checked ? 'translateX(18px)' : 'translateX(0)'
        }} />
      </button>
    </label>
  );
}

function SliderRow({ label, value, min, max, step, suffix, onChange }) {
  return (
    <label style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <div style={styles.sliderWrap}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={styles.slider}
          aria-label={label}
        />
        <span style={styles.sliderValue}>
          {value}{suffix}
        </span>
      </div>
    </label>
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
    width: 420,
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
    gap: 12
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
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16
  },
  rowLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'system-ui, sans-serif'
  },
  toggle: {
    width: 40,
    height: 22,
    borderRadius: 11,
    border: 'none',
    background: 'rgba(255,255,255,0.15)',
    cursor: 'pointer',
    padding: 2,
    position: 'relative',
    transition: 'background 0.2s ease'
  },
  toggleOn: {
    background: '#00e5ff'
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#fff',
    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
  },
  sliderWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  slider: {
    width: 120,
    accentColor: '#00e5ff',
    cursor: 'pointer'
  },
  sliderValue: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontVariantNumeric: 'tabular-nums',
    minWidth: 40,
    textAlign: 'right'
  },
  footer: {
    paddingTop: 8,
    borderTop: '1px solid rgba(255,255,255,0.06)'
  },
  resetBtn: {
    width: '100%',
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.15s ease'
  }
};
