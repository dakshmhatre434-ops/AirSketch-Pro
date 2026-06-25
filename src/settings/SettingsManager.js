// Phase 6: Settings Manager with localStorage persistence

const STORAGE_KEY = 'airsketch_settings';

const DEFAULTS = {
  theme: 'dark',
  recognitionThreshold: 75,
  showLandmarks: true,
  showBadges: true,
  enableBeautification: true,
  showFps: false,
  strokeColor: '#00e5ff',
  strokeWidth: 3,
  strokeOpacity: 1,
  snapToGrid: false,
  gridSize: 20,
  showAlignmentGuides: true,
  highContrast: false,
  language: 'en'
};

export class SettingsManager {
  constructor() {
    this.settings = { ...DEFAULTS };
    this.listeners = new Set();
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.settings = { ...DEFAULTS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    if (this.settings[key] === value) return;
    this.settings[key] = value;
    this._save();
    this._notify(key, value);
  }

  setAll(updates) {
    let changed = false;
    for (const [key, value] of Object.entries(updates)) {
      if (this.settings[key] !== value) {
        this.settings[key] = value;
        changed = true;
      }
    }
    if (changed) {
      this._save();
      this._notify(null, this.settings);
    }
  }

  reset() {
    this.settings = { ...DEFAULTS };
    this._save();
    this._notify(null, this.settings);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify(key, value) {
    for (const cb of this.listeners) {
      try { cb(key, value); } catch (e) { /* ignore */ }
    }
  }

  getAll() {
    return { ...this.settings };
  }
}

export const settingsManager = new SettingsManager();
