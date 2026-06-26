// Phase v22: Horizontal Floating Toolbar — Top-center glassmorphism design
// Redesigned from vertical sidebar to horizontal floating bar
import React, { useState, useRef, useCallback } from 'react';

const ACTIONS = [
  { id: 'draw', icon: '✏️', label: 'Draw', section: 'tools', toggle: true },
  { id: 'eraser', icon: '🧽', label: 'Eraser', section: 'tools', toggle: true },
  { id: 'undo', icon: '↩', label: 'Undo', shortcut: 'Ctrl+Z', section: 'history' },
  { id: 'redo', icon: '↪', label: 'Redo', shortcut: 'Ctrl+Shift+Z', section: 'history' },
  { id: 'clear', icon: '🗑', label: 'Clear', section: 'edit' },
  { id: 'shape', icon: '📐', label: 'Shapes', section: 'tools', toggle: true },
  { id: 'downloadPNG', icon: '💾', label: 'Save PNG', shortcut: 'Ctrl+E', section: 'export' },
  { id: 'exportSVG', icon: '📐', label: 'Export SVG', section: 'export' },
  { id: 'exportJSON', icon: '💾', label: 'Export', shortcut: 'Ctrl+S', section: 'export' },
  { id: 'importJSON', icon: '📂', label: 'Import', shortcut: 'Ctrl+O', section: 'export' },
  { id: 'settings', icon: '⚙', label: 'Settings', section: 'system' },
  { id: 'help', icon: '❓', label: 'Help', section: 'system' },
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
  activeTool = 'draw'
}) {
  const [recentColors, setRecentColors] = useState(() => {
    const saved = localStorage.getItem('airsketch_recent_colors');
    return saved ? JSON.parse(saved) : [];
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const fileInputRef = useRef(null);
  const colorBtnRef = useRef(null);
  const [shapeRecognition, setShapeRecognition] = useState(false);

  const handleColorSelect = useCallback((color) => {
    onColorChange?.(color);
    setRecentColors(prev => {
      const filtered = prev.filter(c => c !== color);
      const updated = [color, ...filtered].slice(0, 8);
      localStorage.setItem('airsketch_recent_colors', JSON.stringify(updated));
      return updated;
    });
    setShowColorPicker(false);
  }, [onColorChange]);

  const handleCustomColor = useCallback((e) => {
    handleColorSelect(e.target.value);
  }, [handleColorSelect]);

  const handleAction = useCallback((actionId) => {
    if (actionId === 'importJSON') {
      fileInputRef.current?.click();
      return;
    }
    if (actionId === 'settings') {
      onSettings?.();
      return;
    }
    if (actionId === 'help') {
      onHelp?.();
      return;
    }
    if (actionId === 'shapeRecognition') {
      console.warn('[TOOLBAR] shapeRecognition clicked, current:', shapeRecognition);
      const newVal = !shapeRecognition;
      setShapeRecognition(newVal);
      console.warn('[TOOLBAR] calling onAction with:', 'shapeRecognition', newVal);
      onAction?.('shapeRecognition', newVal);
      return;
    }
    onAction?.(actionId);
  }, [onAction, onSettings, onHelp, shapeRecognition]);

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

  // Group actions
  const toolActions = ACTIONS.filter(a => a.section === 'tools');
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

      {/* ─── Main Horizontal Toolbar ─── */}
      <div
        role="toolbar"
        aria-label="Drawing toolbar"
        style={styles.container}
      >
        {/* Tools Section */}
        <div style={styles.group}>
          {toolActions.map(action => (
            <ToolbarButton
              key={action.id}
              onClick={() => handleAction(action.id)}
              label={action.label}
              active={activeTool === action.id}
              toggle={action.toggle}
              ariaLabel={action.label}
            >
              <span style={{ fontSize: 18 }}>{action.icon}</span>
            </ToolbarButton>
          ))}
        </div>

        <div style={styles.separator} />

        {/* Color Picker Button */}
        <div style={styles.group}>
          <button
            ref={colorBtnRef}
            onClick={() => setShowColorPicker(v => !v)}
            title="Color"
            aria-label="Color picker"
            aria-expanded={showColorPicker}
            style={{
              ...styles.colorBtn,
              backgroundColor: strokeColor,
              boxShadow: showColorPicker
                ? '0 0 0 3px rgba(0, 229, 255, 0.5), 0 2px 8px rgba(0,0,0,0.3)'
                : '0 2px 8px rgba(0,0,0,0.3)'
            }}
          />
        </div>

        <div style={styles.separator} />

        {/* Brush Settings — Compact Horizontal */}
        <div style={styles.settingsGroup}>
          <div style={styles.sliderRow}>
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
          <div style={styles.sliderRow}>
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

        {/* History */}
        <div style={styles.group}>
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

        {/* Edit */}
        <div style={styles.group}>
          {editActions.map(action => (
            <ToolbarButton
              key={action.id}
              onClick={() => handleAction(action.id)}
              label={action.label}
              ariaLabel={action.label}
            >
              <span style={{ fontSize: 16 }}>{action.icon}</span>
            </ToolbarButton>
          ))}
        </div>

        <div style={styles.separator} />

        {/* Shape Recognition Toggle */}
        <div style={styles.group}>
          <button
            onClick={() => handleAction('shapeRecognition')}
            title={shapeRecognition ? 'Shape Recognition: ON' : 'Shape Recognition: OFF'}
            aria-label="Shape Recognition toggle"
            aria-pressed={shapeRecognition}
            style={{
              ...styles.button,
              ...(shapeRecognition ? styles.buttonActive : {}),
              width: 'auto',
              padding: '0 12px',
              gap: 6
            }}
          >
            <span style={{ fontSize: 16 }}>📐</span>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: shapeRecognition ? '#00e5ff' : 'rgba(255,255,255,0.65)',
              letterSpacing: 0.5
            }}>
              {shapeRecognition ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        <div style={styles.separator} />

        {/* Export */}
        <div style={styles.group}>
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

        {/* System */}
        <div style={styles.group}>
          {systemActions.map(action => (
            <ToolbarButton
              key={action.id}
              onClick={() => handleAction(action.id)}
              label={action.label}
              ariaLabel={action.label}
            >
              <span style={{ fontSize: 16 }}>{action.icon}</span>
            </ToolbarButton>
          ))}
        </div>
      </div>

      {/* ─── Color Popover ─── */}
      {showColorPicker && (
        <div style={styles.colorPopover}>
          <div style={styles.colorGrid}>
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => handleColorSelect(c)}
                title={c}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: strokeColor === c ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  padding: 0,
                  boxShadow: strokeColor === c ? '0 0 10px rgba(255,255,255,0.5)' : 'inset 0 1px 2px rgba(0,0,0,0.3)',
                  transition: 'all 0.15s ease'
                }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
          <div style={styles.customColorRow}>
            <label style={styles.customLabel}>Custom</label>
            <input
              type="color"
              value={strokeColor}
              onChange={handleCustomColor}
              style={styles.customColorInput}
              aria-label="Custom color picker"
            />
            <span style={styles.hexValue}>{strokeColor}</span>
          </div>
          {recentColors.length > 0 && (
            <div style={styles.recentRow}>
              <span style={styles.recentLabel}>Recent</span>
              <div style={styles.recentGrid}>
                {recentColors.map(c => (
                  <button
                    key={c}
                    onClick={() => handleColorSelect(c)}
                    title={c}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: c,
                      border: strokeColor === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      padding: 0
                    }}
                    aria-label={`Select recent color ${c}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ToolbarButton({ active, onClick, children, disabled, label, ariaLabel, toggle }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel || label}
        aria-pressed={active}
        title={label}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...styles.button,
          ...(active ? styles.buttonActive : {}),
          ...(disabled ? styles.buttonDisabled : {})
        }}
      >
        {children}
      </button>
      {/* Tooltip */}
      {hovered && label && (
        <div style={styles.tooltip}>
          {label}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    padding: '10px 16px',
    background: 'rgba(18, 18, 28, 0.72)',
    backdropFilter: 'blur(24px) saturate(1.6)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
    borderRadius: 20,
    border: '1px solid rgba(255, 255, 255, 0.09)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
    maxWidth: '95vw',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none'
  },
  group: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  separator: {
    width: 1,
    height: 28,
    background: 'rgba(255, 255, 255, 0.08)',
    margin: '0 10px',
    flexShrink: 0
  },
  button: {
    width: 40,
    height: 40,
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
  tooltip: {
    position: 'absolute',
    bottom: -30,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '4px 10px',
    background: 'rgba(0, 0, 0, 0.85)',
    color: '#fff',
    fontSize: 11,
    borderRadius: 6,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: 200,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  },
  colorBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.2s ease',
    flexShrink: 0
  },
  settingsGroup: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: '0 4px'
  },
  sliderRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  sliderLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: 600,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    whiteSpace: 'nowrap'
  },
  slider: {
    width: 80,
    height: 16,
    accentColor: '#00e5ff',
    cursor: 'pointer'
  },
  sliderValue: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 500,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minWidth: 28,
    textAlign: 'right'
  },
  // Color Popover
  colorPopover: {
    position: 'fixed',
    bottom: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: 16,
    background: 'rgba(22, 22, 34, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.15)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minWidth: 220
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: 8,
    justifyItems: 'center'
  },
  customColorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    borderTop: '1px solid rgba(255,255,255,0.08)'
  },
  customLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: 600
  },
  customColorInput: {
    width: 32,
    height: 32,
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: '50%',
    cursor: 'pointer',
    padding: 0,
    background: 'none'
  },
  hexValue: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace'
  },
  recentRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '8px 0',
    borderTop: '1px solid rgba(255,255,255,0.08)'
  },
  recentLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  recentGrid: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap'
  }
};
