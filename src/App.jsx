import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DrawingCanvas } from './components/Drawing/DrawingCanvas';
import { FloatingToolbar } from './components/UI/FloatingToolbar';
import { ToastProvider, useToast } from './components/UI/ToastProvider';
import { SettingsPanel } from './components/UI/SettingsPanel';
import { HelpDialog } from './components/UI/HelpDialog';
import { keyboardManager } from './keyboard/KeyboardManager';
import { settingsManager } from './settings/SettingsManager';

function AppContent() {
  const canvasRef = useRef(null);
  const { showToast } = useToast();

  const [strokeColor, setStrokeColor] = useState('#00e5ff');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeOpacity, setStrokeOpacity] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const width = window.innerWidth;
  const height = window.innerHeight;

  // Keyboard shortcuts
  useEffect(() => {
    keyboardManager.bind();
    keyboardManager.register('undo', () => {
      canvasRef.current?.undo();
      showToast('Undo', 'info');
    });
    keyboardManager.register('redo', () => {
      canvasRef.current?.redo();
      showToast('Redo', 'info');
    });
    keyboardManager.register('exportPNG', () => {
      canvasRef.current?.exportPNG();
      showToast('PNG exported', 'success');
    });
    keyboardManager.register('exportSVG', () => {
      canvasRef.current?.exportSVG();
      showToast('SVG exported', 'success');
    });
    keyboardManager.register('exportJSON', () => {
      canvasRef.current?.exportJSON();
      showToast('JSON exported', 'success');
    });
    keyboardManager.register('help', () => setShowHelp(v => !v));

    return () => keyboardManager.unbind();
  }, [showToast]);

  // Load settings
  useEffect(() => {
    setStrokeColor(settingsManager.get('strokeColor') ?? '#00e5ff');
    setStrokeWidth(settingsManager.get('strokeWidth') ?? 3);
    setStrokeOpacity(settingsManager.get('strokeOpacity') ?? 1);
    const unsub = settingsManager.subscribe((key, val) => {
      if (key === 'strokeColor') setStrokeColor(val);
      if (key === 'strokeWidth') setStrokeWidth(val);
      if (key === 'strokeOpacity') setStrokeOpacity(val);
    });
    return unsub;
  }, []);

  const handleColorChange = useCallback((color) => {
    setStrokeColor(color);
    settingsManager.set('strokeColor', color);
  }, []);

  const [activeTool, setActiveTool] = useState('draw');
  const [shapeRecognitionEnabled, setShapeRecognitionEnabled] = useState(false);

  const handleToolbarAction = useCallback((action, value) => {
    console.warn('[APP] handleToolbarAction called:', action, value);
    if (action === 'draw' || action === 'eraser' || action === 'shape') {
      setActiveTool(action);
      return;
    }
    if (action === 'shapeRecognition') {
      console.warn('[APP] Setting shape recognition to:', value);
      setShapeRecognitionEnabled(value);
      showToast(`Shape Recognition: ${value ? 'ON' : 'OFF'}`, 'info');
      return;
    }
    switch (action) {
      case 'undo':
        canvasRef.current?.undo();
        break;
      case 'redo':
        canvasRef.current?.redo();
        break;
      case 'clear':
        canvasRef.current?.clear();
        showToast('Canvas cleared', 'info');
        break;
      case 'downloadPNG':
        canvasRef.current?.exportPNG();
        showToast('PNG exported', 'success');
        break;
      case 'exportSVG':
        canvasRef.current?.exportSVG();
        showToast('SVG exported', 'success');
        break;
      case 'exportJSON':
        canvasRef.current?.exportJSON();
        showToast('JSON exported', 'success');
        break;
      case 'importJSON':
        document.getElementById('import-file-input')?.click();
        break;
      case 'settings':
        setShowSettings(true);
        break;
      case 'help':
        setShowHelp(true);
        break;
      default:
        break;
    }
  }, [showToast]);

  const handleFileImport = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      canvasRef.current?.importJSON(ev.target.result);
      showToast('Project imported', 'success');
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [showToast]);

  return (
    <div style={styles.container}>
      <div style={{
        position: 'fixed', top: 10, right: 10, zIndex: 200,
        padding: '8px 12px', background: 'rgba(0,0,0,0.8)',
        borderRadius: 8, color: shapeRecognitionEnabled ? '#00ff88' : '#ff1744',
        fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold'
      }}>
        Shape: {shapeRecognitionEnabled ? 'ON' : 'OFF'}
      </div>
      <DrawingCanvas
        ref={canvasRef}
        width={width}
        height={height}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        shapeRecognitionEnabled={shapeRecognitionEnabled}
      />

      <FloatingToolbar
        onAction={handleToolbarAction}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
        onColorChange={handleColorChange}
        onWidthChange={setStrokeWidth}
        onOpacityChange={setStrokeOpacity}
        onSettings={() => setShowSettings(true)}
        onHelp={() => setShowHelp(true)}
        activeTool={activeTool}
      />

      <input
        id="import-file-input"
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#0a0a0a'
  }
};

export default App;