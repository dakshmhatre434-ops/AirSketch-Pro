// Phase 6: Keyboard Shortcuts Manager
// Centralized keyboard handling with ARIA-friendly help dialog

export const SHORTCUTS = [
  { key: 'Ctrl+Z', action: 'Undo', category: 'Edit' },
  { key: 'Ctrl+Shift+Z', action: 'Redo', category: 'Edit' },
  { key: 'Ctrl+Y', action: 'Redo', category: 'Edit' },
  { key: 'Delete', action: 'Remove selected shape', category: 'Edit' },
  { key: 'Ctrl+D', action: 'Duplicate selected shape', category: 'Edit' },
  { key: 'Ctrl+A', action: 'Select all shapes', category: 'Edit' },
  { key: 'Esc', action: 'Deselect all', category: 'Edit' },
  { key: 'D', action: 'Draw tool', category: 'Tools' },
  { key: 'E', action: 'Eraser tool', category: 'Tools' },
  { key: 'V', action: 'Select tool', category: 'Tools' },
  { key: 'Space', action: 'Toggle pan mode', category: 'Navigation' },
  { key: 'Ctrl+S', action: 'Export JSON', category: 'Export' },
  { key: 'Ctrl+E', action: 'Export PNG', category: 'Export' },
  { key: 'Ctrl+O', action: 'Import JSON', category: 'Export' },
  { key: 'Ctrl+Plus', action: 'Zoom in', category: 'Navigation' },
  { key: 'Ctrl+Minus', action: 'Zoom out', category: 'Navigation' },
  { key: 'Ctrl+0', action: 'Reset zoom', category: 'Navigation' },
  { key: ']', action: 'Bring forward', category: 'Arrange' },
  { key: '[', action: 'Send backward', category: 'Arrange' },
  { key: '?', action: 'Show help', category: 'General' },
  { key: 'H', action: 'Show help', category: 'General' }
];

export class KeyboardManager {
  constructor() {
    this.handlers = new Map(); // action -> callback
    this.enabled = true;
    this._bound = false;
  }

  bind() {
    if (this._bound) return;
    document.addEventListener('keydown', this._onKeyDown);
    this._bound = true;
  }

  unbind() {
    if (!this._bound) return;
    document.removeEventListener('keydown', this._onKeyDown);
    this._bound = false;
  }

  register(action, callback) {
    this.handlers.set(action, callback);
  }

  unregister(action) {
    this.handlers.delete(action);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  _onKeyDown = (e) => {
    if (!this.enabled) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = this._normalizeKey(e);
    const action = this._resolveAction(key);

    if (action && this.handlers.has(action)) {
      e.preventDefault();
      this.handlers.get(action)(e);
    }
  };

  _normalizeKey(e) {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    let key = e.key;
    if (key === ' ') key = 'Space';
    if (key === '?') key = '?';
    if (key === 'Dead') key = e.code.replace('Key', '');
    if (key === 'BracketLeft') key = '[';
    if (key === 'BracketRight') key = ']';
    if (key === 'Equal' && e.shiftKey) key = 'Plus';
    if (key === 'Minus') key = 'Minus';
    if (key.length === 1) key = key.toUpperCase();

    parts.push(key);
    return parts.join('+');
  }

  _resolveAction(key) {
    const map = {
      'Ctrl+Z': 'undo',
      'Ctrl+Shift+Z': 'redo',
      'Ctrl+Y': 'redo',
      'Delete': 'delete',
      'Backspace': 'delete',
      'Ctrl+D': 'duplicate',
      'Ctrl+A': 'selectAll',
      'D': 'drawTool',
      'E': 'eraserTool',
      'V': 'selectTool',
      'Escape': 'deselect',
      'Space': 'togglePan',
      'Ctrl+S': 'exportJSON',
      'Ctrl+E': 'exportPNG',
      'Ctrl+O': 'importJSON',
      'Ctrl+Plus': 'zoomIn',
      'Ctrl+Equal': 'zoomIn',
      'Ctrl+Minus': 'zoomOut',
      'Ctrl+0': 'zoomReset',
      'BracketRight': 'bringForward',
      'BracketLeft': 'sendBackward',
      'Question': 'help',
      'H': 'help',
      'Shift+Question': 'help'
    };
    return map[key] || null;
  }

  getShortcuts() {
    return SHORTCUTS;
  }
}

export const keyboardManager = new KeyboardManager();
