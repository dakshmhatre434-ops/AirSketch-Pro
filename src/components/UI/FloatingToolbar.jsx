// Phase 6: Floating Toolbar — Professional glassmorphism design
// Redesigned layout: wider toolbar, horizontal sliders, consistent spacing, no overlaps
import React, { useState, useRef, useCallback } from 'react';

const ACTIONS = [
  { id: 'undo', icon: '↩', label: 'Undo', shortcut: 'Ctrl+Z', section: 'history' },
  { id: 'redo', icon: '↪', label: 'Redo', shortcut: 'Ctrl+Shift+Z', section: 'history' },
  { id: 'clear', icon: '🗑', label: 'Clear', shortcut: '', section: 'edit' },
  { id: 'downloadPNG', icon: '🖼', label: 'PNG', shortcut: 'Ctrl+E', section: 'export' },
  { id: 'exportSVG', icon: '📐', label: 'SVG', shortcut: '', section: 'export' },
  { id: 'exportJSON', icon: '💾', label: 'Export', shortcut: 'Ctrl+S', section: 'export' },
  { id: 'importJSON', icon: '📂', label: 'Import', shortcut: 'Ctrl+O', section: 'export' },
  { id: 'settings', icon: '⚙', label: 'Settings', shortcut: '', section: 'system' },
  { id: 'help', icon: '?', label: 'Help', shortcut: '?', section: 'system' },
  { id: 'debug', icon: '🐛', label: 'Debug', shortcut: '', section: 'system' },
];

const PRESET_COLORS = [
  '#000000', '#333333', '#666666', '#999999',
  '#ffffff', '#ff1744', '#ff6d00', '#ffc800',
  '#00ff88', '#00e5ff', '#2979ff', '#b388ff',
  '#ff4081', '#76ff03', '#651fff', '#ff3d00'
];

export function FloatingToolbar({
  onAction,
  canUndo = false,
  canRedo = false,
  strokeColor = '#00e5ff',
  strokeWidth = 3,
  strokeOpacity = 1,
  onColorChange,
  onWidthChange,
  onOpacityChange,
  onSettings,
  onHelp,
  isPanMode = false
}) {
  const [recentColors, setRecentColors] = useState(() => {
    const saved = localStorage.getItem('airsketch_recent_colors');
    return saved ? JSON.parse(saved) : [];
  });
  const fileInputRef = useRef(null);

  const handleColorSelect = useCallback((color) => {
    onColorChange?.(color);
    // Add to recent colors (max 8, no duplicates, move to front)
    setRecentColors(prev => {
      const filtered = prev.filter(c => c !== color);
      const updated = [color, ...filtered].slice(0, 8);
      localStorage.setItem('airsketch_recent_colors', JSON.stringify(updated));
      return updated;
    });
  }, [onColorChange]);

  const handleCustomColor = useCallback((e) => {
    const color = e.target.value;
    handleColorSelect(color);
  }, [handleColorSelect]);

  const handleAction = useCallback((actionId) => {
    if (actionId === 'importJSON') {
      fileInputRef.current?.click();
      return;
    }
    onAction?.(actionId);
  }, [onAction]);

  const handleFileImport = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onAction?.('importJSONData', ev.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [onAction]);

  // Group actions by section for visual separators
  const historyActions = ACTIONS.filter(a => a.section === 'history');
  const editActions = ACTIONS.filter(a => a.section === 'edit');
  const exportActions = ACTIONS.filter(a => a.section === 'export');
  const systemActions = ACTIONS.filter(a => a.section === 'system');

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileImport}
        aria-hidden="true"
      />

      <div
        role="toolbar"
        aria-label="Drawing toolbar"
        style={styles.container}
      >
        {/* ─── Gesture Info ─── */}
        <div style={styles.section}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '4px 0' }}>
            Pinch to draw<br/>Open hand to erase
          </div>
        </div>

        <div style={styles.separator} />

        {/* ─── Color Section ─── */}
        <div style={styles.section}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Color</div>
          
          {/* Preset color grid — 4×4 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: '4px 2px', justifyItems: 'center' }}>
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => handleColorSelect(c)}
                title={c}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: strokeColor === c ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                  boxShadow: strokeColor === c ? '0 0 10px rgba(255,255,255,0.5)' : 'inset 0 1px 2px rgba(0,0,0,0.3)',
                  transition: 'all 0.15s ease'
                }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>

          {/* Custom color picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', width: '100%' }}>
            <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>Custom</label>
            <input
              type="color"
              value={strokeColor}
              onChange={handleCustomColor}
              style={{
                width: 32,
                height: 32,
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '50%',
                cursor: 'pointer',
                padding: 0,
                background: 'none'
              }}
              aria-label="Custom color picker"
            />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{strokeColor}</span>
          </div>

          {/* Recent colors */}
          {recentColors.length > 0 && (
            <div style={{ padding: '4px 2px', width: '100%' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Recent</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                {recentColors.map(c => (
                  <button
                    key={c}
                    onClick={() => handleColorSelect(c)}
                    title={c}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: c,
                      border: strokeColor === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      padding: 0,
                      flexShrink: 0
                    }}
                    aria-label={`Select recent color ${c}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={styles.separator} />

        {/* ─── Brush Settings ─── */}
        <div style={styles.section}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Brush</div>
          
          {/* Brush size slider */}
          <div style={styles.sliderGroup}>
            <span style={styles.sliderLabel}>Size</span>
            <input
              type="range"
              min={1}
              max={20}
              step={0.5}
              value={strokeWidth}
              onChange={e => onWidthChange?.(parseFloat(e.target.value))}
              style={styles.slider}
              aria-label="Brush size"
            />
            <span style={styles.sliderValue}>{strokeWidth.toFixed(1)}</span>
          </div>

          {/* Opacity slider */}
          <div style={styles.sliderGroup}>
            <span style={styles.sliderLabel}>Opacity</span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={strokeOpacity}
              onChange={e => onOpacityChange?.(parseFloat(e.target.value))}
              style={styles.slider}
              aria-label="Stroke opacity"
            />
            <span style={styles.sliderValue}>{Math.round(strokeOpacity * 100)}%</span>
          </div>
        </div>

        <div style={styles.separator} />

        {/* ─── History Actions ─── */}
        <div style={styles.section}>
          {historyActions.map(action => (
            <ToolbarButton
              key={action.id}
              onClick={() => handleAction(action.id)}
              label={action.label}
              shortcut={action.shortcut}
              disabled={
                (action.id === 'undo' && !canUndo) ||
                (action.id === 'redo' && !canRedo)
              }
              ariaLabel={`${action.label}${action.shortcut ? ` (${action.shortcut})` : ''}`}
            >
              <span style={{ fontSize: 16 }}>{action.icon}</span>
            </ToolbarButton>
          ))}
        </div>

        <div style={styles.separator} />

        {/* ─── Edit Actions ─── */}
        <div style={styles.section}>
          {editActions.map(action => (
            <ToolbarButton
              key={action.id}
              onClick={() => handleAction(action.id)}
              label={action.label}
              shortcut={action.shortcut}
              ariaLabel={`${action.label}${action.shortcut ? ` (${action.shortcut})` : ''}`}
            >
              <span style={{ fontSize: 16 }}>{action.icon}</span>
            </ToolbarButton>
          ))}
        </div>

        <div style={styles.separator} />

        {/* ─── Export Actions ─── */}
        <div style={styles.section}>
          {exportActions.map(action => (
            <ToolbarButton
              key={action.id}
              onClick={() => handleAction(action.id)}
              label={action.label}
              shortcut={action.shortcut}
              ariaLabel={`${action.label}${action.shortcut ? ` (${action.shortcut})` : ''}`}
            >
              <span style={{ fontSize: 16 }}>{action.icon}</span>
            </ToolbarButton>
          ))}
        </div>

        <div style={styles.separator} />

        {/* ─── System Actions ─── */}
        <div style={styles.section}>
          {systemActions.map(action => (
            <ToolbarButton
              key={action.id}
              onClick={() => handleAction(action.id)}
              label={action.label}
              shortcut={action.shortcut}
              ariaLabel={`${action.label}${action.shortcut ? ` (${action.shortcut})` : ''}`}
            >
              <span style={{ fontSize: 16 }}>{action.icon}</span>
            </ToolbarButton>
          ))}
        </div>
      </div>
    </>
  );
}

function ToolbarButton({ active, onClick, children, disabled, label, ariaLabel }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || label}
      aria-pressed={active}
      title={label}
      style={{
        ...styles.button,
        ...(active ? styles.buttonActive : {}),
        ...(disabled ? styles.buttonDisabled : {})
      }}
    >
      {children}
    </button>
  );
}

const styles = {
  container: {
    position: 'fixed',
    left: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0,
    padding: '14px 10px',
    width: 110,
    background: 'rgba(18, 18, 28, 0.72)',
    backdropFilter: 'blur(24px) saturate(1.6)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
    borderRadius: 22,
    border: '1px solid rgba(255, 255, 255, 0.09)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
    maxHeight: '92vh',
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    width: '100%'
  },
  separator: {
    width: 56,
    height: 1,
    background: 'rgba(255, 255, 255, 0.08)',
    margin: '10px 0',
    flexShrink: 0
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 12,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.65)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    outline: 'none',
    flexShrink: 0
  },
  buttonActive: {
    background: 'rgba(0, 229, 255, 0.18)',
    color: '#00e5ff',
    boxShadow: '0 0 16px rgba(0, 229, 255, 0.2), inset 0 0 8px rgba(0, 229, 255, 0.05)'
  },
  buttonDisabled: {
    opacity: 0.25,
    cursor: 'not-allowed',
    color: 'rgba(255,255,255,0.3)'
  },
  colorPicker: {
    position: 'fixed',
    left: 110,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
    padding: 16,
    background: 'rgba(22, 22, 34, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.15)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
    zIndex: 200,
    minWidth: 160
  },
  // Horizontal slider group
  sliderGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: '8px 0',
    width: '100%'
  },
  sliderLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: 600,
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  slider: {
    width: 72,
    height: 16,
    accentColor: '#00e5ff',
    cursor: 'pointer',
    // Custom track styling via CSS is in index.css
  },
  sliderValue: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 500,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: 14
  }
};
