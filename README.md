# AirSketch Pro

A next-generation AI-powered drawing application that transforms freehand air gestures into perfect geometric shapes. Built with React, Canvas 2D, and MediaPipe hand tracking.

![AirSketch Pro](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/react-18.2-61DAFB)
![Vite](https://img.shields.io/badge/vite-5.0-646CFF)

## Features

### Core Drawing
- **Air Drawing** — Draw in mid-air using hand tracking (pinch to draw, release to finish)
- **Predictive Smoothing** — Real-time stroke smoothing with motion prediction
- **High-DPI Canvas** — Crisp rendering on all displays

### AI Shape Recognition
- **10 Recognizable Shapes** — Circle, Ellipse, Square, Rectangle, Triangle, Diamond, Line, Arrow, Pentagon, Hexagon
- **Multi-Metric Classification** — Combines circularity, corner detection, aspect ratio, angle analysis
- **RDP Simplification** — Ramer-Douglas-Peucker algorithm for noise reduction
- **Configurable Threshold** — Adjust confidence threshold for beautification

### Smart Beautification
- **Animated Transitions** — Smooth 350ms ease-in-out morph from sketch to perfect shape
- **Vector Rendering** — Mathematically perfect Canvas 2D primitives
- **Freehand Fallback** — Low-confidence strokes remain as-drawn

### Interactive Editing
- **Selection** — Click/tap to select shapes
- **Drag & Drop** — Move shapes anywhere on canvas
- **Resize** — 8-handle bounding box for precise scaling
- **Z-Ordering** — Bring forward / send backward
- **Duplicate** — Clone shapes instantly

### History System
- **Command Pattern** — Undo/redo for every operation
- **Unlimited History** — Configurable stack depth (default 200)
- **Operations Supported** — Add, delete, move, resize, rotate, clear, z-order changes

### Export & Import
- **PNG** — Transparent or background export
- **SVG** — Vector export with editable primitives
- **JSON** — Full project serialization (restorable)

### Canvas Navigation
- **Zoom** — 25% to 400% with smooth scaling
- **Pan** — Space-drag to pan canvas
- **Reset View** — One-click reset to 100%

### UI & UX
- **Glassmorphism Toolbar** — Floating premium design with backdrop blur
- **Toast Notifications** — Animated feedback for all actions
- **Settings Panel** — Persistent preferences via localStorage
- **Keyboard Shortcuts** — Full shortcut reference (press `?`)
- **Dark/Light Theme** — Toggle between themes
- **FPS Counter** — Developer mode performance monitor
- **Accessibility** — ARIA labels, focus indicators, keyboard navigation, reduced motion support

## Architecture

```
src/
├── components/
│   ├── Camera/
│   │   ├── CameraFeed.jsx          # WebRTC camera input
│   │   └── HandOverlay.jsx         # Landmark visualization
│   ├── Drawing/
│   │   ├── DrawingCanvas.jsx       # Main canvas orchestrator
│   │   ├── PinchGesture.js         # Pinch detection engine
│   │   ├── StrokeRenderer.js       # Freehand stroke rendering
│   │   ├── StrokeSmoother.js       # Predictive smoothing
│   │   └── RecognitionBadge.jsx    # Shape recognition feedback
│   └── UI/
│       ├── FloatingToolbar.jsx     # Glassmorphism toolbar
│       ├── HandIndicator.jsx       # Hand detection status
│       ├── ToastProvider.jsx       # Notification system
│       ├── SettingsPanel.jsx       # Settings dialog
│       └── HelpDialog.jsx          # Keyboard shortcuts reference
├── recognition/
│   ├── ShapeRecognizer.js          # Async recognition pipeline
│   ├── ShapeClassifier.js          # Multi-metric classification
│   ├── StrokeAnalyzer.js           # Feature extraction (RDP, hull, corners)
│   └── GeometryUtils.js            # Pure geometric calculations
├── rendering/
│   ├── VectorShapes.js             # Perfect Canvas 2D primitives
│   ├── ShapeFactory.js             # Shape normalization & hit-testing
│   ├── ShapeAnimation.js           # Animation engine
│   └── ShapeRenderer.js            # Shape orchestrator & editor
├── history/
│   └── HistoryManager.js           # Command-pattern undo/redo
├── export/
│   └── ExportManager.js            # PNG, SVG, JSON export/import
├── keyboard/
│   └── KeyboardManager.js          # Centralized keyboard shortcuts
├── settings/
│   └── SettingsManager.js          # localStorage persistence
├── hooks/
│   └── useHandTracking.js          # MediaPipe integration
├── App.jsx                         # Root application
└── main.jsx                        # Entry point
```

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd air-drawing-app

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

### Drawing
1. Allow camera access when prompted
2. Show your hand to the camera
3. **Pinch** your thumb and index finger to start drawing
4. **Move** your hand while pinching to draw
5. **Release** the pinch to finish the stroke
6. The AI will recognize and beautify your shape automatically

### Selecting & Editing
1. **Pinch on a shape** to select it
2. **Pinch and drag** to move the shape
3. **Pinch on a handle** (small squares on bounding box) to resize
4. Use toolbar buttons or keyboard shortcuts for duplicate, delete, z-order

### Zoom & Pan
- **Ctrl + Plus/Minus** — Zoom in/out
- **Ctrl + 0** — Reset zoom
- **Space + drag** — Pan canvas

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` / `Ctrl + Y` | Redo |
| `Delete` / `Backspace` | Delete selected shape |
| `Ctrl + D` | Duplicate selected shape |
| `Ctrl + A` | Select all shapes |
| `Esc` | Deselect all |
| `Space` | Toggle pan mode |
| `]` | Bring forward |
| `[` | Send backward |
| `Ctrl + S` | Export JSON |
| `Ctrl + E` | Export PNG |
| `Ctrl + O` | Import JSON |
| `Ctrl + Plus` | Zoom in |
| `Ctrl + Minus` | Zoom out |
| `Ctrl + 0` | Reset zoom |
| `?` / `H` | Show help dialog |

## Export Formats

### PNG
- Transparent background option
- Full canvas resolution
- Raster output

### SVG
- Vector primitives for all shapes
- Editable in Illustrator, Figma, Inkscape
- Freehand strokes as path elements

### JSON
- Complete project serialization
- Restores shapes, strokes, and settings
- Versioned format for future compatibility

## Future Roadmap

- [ ] Multi-hand support
- [ ] Shape rotation handle
- [ ] Multi-select (Ctrl + Click)
- [ ] Alignment guides & snap-to-grid
- [ ] Color palette presets
- [ ] Brush texture options
- [ ] Layer system
- [ ] Collaborative drawing (WebRTC)
- [ ] Mobile touch support
- [ ] Cloud save integration

## License

MIT
