// Phase 6: Export System — PNG, SVG, JSON, Import

import { VectorShapes } from '../rendering/VectorShapes.js';

export class ExportManager {
  /**
   * Export the entire scene as a PNG data URL.
   * @param {HTMLCanvasElement} canvas — The persistent canvas
   * @param {Object} options — { backgroundColor, transparent }
   * @returns {string} — Data URL
   */
  static exportPNG(canvas, options = {}) {
    const { backgroundColor = null, transparent = true } = options;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');

    if (!transparent && backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    ctx.drawImage(canvas, 0, 0);
    return exportCanvas.toDataURL('image/png');
  }

  /**
   * Export all shapes and strokes as SVG.
   * @param {number} width — Canvas width
   * @param {number} height — Canvas height
   * @param {Array} shapes — Shape objects from ShapeRenderer
   * @param {Array} freehandStrokes — Stroke objects
   * @param {Object} options — { backgroundColor }
   * @returns {string} — SVG XML string
   */
  static exportSVG(width, height, shapes, freehandStrokes, options = {}) {
    const { backgroundColor = null } = options;
    const dpr = window.devicePixelRatio || 1;
    const w = width / dpr;
    const h = height / dpr;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n`;

    if (backgroundColor) {
      svg += `  <rect width="${w}" height="${h}" fill="${backgroundColor}"/>\n`;
    }

    // Render freehand strokes as paths
    for (const stroke of freehandStrokes) {
      if (!stroke.points || stroke.points.length < 2) continue;
      const d = this._pointsToSVGPath(stroke.points);
      svg += `  <path d="${d}" fill="none" stroke="${stroke.strokeColor}" stroke-width="${stroke.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>\n`;
    }

    // Render shapes as SVG primitives
    for (const shape of shapes) {
      svg += this._shapeToSVG(shape, dpr);
    }

    svg += `</svg>\n`;
    return svg;
  }

  /**
   * Export project as JSON (restorable).
   * @param {Array} shapes
   * @param {Array} freehandStrokes
   * @param {Object} settings
   * @returns {string} — JSON string
   */
  static exportJSON(shapes, freehandStrokes, settings = {}) {
    const project = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      canvas: {
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio || 1
      },
      settings,
      shapes: shapes.map(s => ({ ...s })),
      freehandStrokes: freehandStrokes.map(s => ({
        id: s.id,
        points: s.points,
        strokeColor: s.strokeColor,
        strokeWidth: s.strokeWidth,
        createdAt: s.createdAt
      }))
    };
    return JSON.stringify(project, null, 2);
  }

  /**
   * Import project from JSON.
   * @param {string} jsonString
   * @returns {Object|null} — { shapes, freehandStrokes, settings, canvas } or null
   */
  static importJSON(jsonString) {
    try {
      const project = JSON.parse(jsonString);
      if (!project.version || !Array.isArray(project.shapes)) {
        throw new Error('Invalid project file');
      }
      return {
        shapes: project.shapes || [],
        freehandStrokes: project.freehandStrokes || [],
        settings: project.settings || {},
        canvas: project.canvas || {}
      };
    } catch (e) {
      console.error('Import failed:', e);
      return null;
    }
  }

  /**
   * Trigger a file download.
   * @param {string} data — File content or data URL
   * @param {string} filename
   * @param {string} mimeType
   */
  static download(data, filename, mimeType) {
    const link = document.createElement('a');
    if (data.startsWith('data:')) {
      link.href = data;
    } else {
      const blob = new Blob([data], { type: mimeType });
      link.href = URL.createObjectURL(blob);
    }
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ─── Helpers ───

  static _pointsToSVGPath(points) {
    if (!points || points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  }

  static _shapeToSVG(shape, dpr) {
    const sc = shape.strokeColor;
    const sw = shape.strokeWidth;
    const rot = shape.rotation || 0;
    const cx = shape.center?.x ?? (shape.start?.x + shape.end?.x) / 2;
    const cy = shape.center?.y ?? (shape.start?.y + shape.end?.y) / 2;

    const transform = rot !== 0 ? ` transform="rotate(${rot} ${cx} ${cy})"` : '';

    switch (shape.type) {
      case 'Circle': {
        const r = shape.radius;
        return `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${sc}" stroke-width="${sw}"${transform}/>\n`;
      }
      case 'Ellipse': {
        const rx = shape.radiusX;
        const ry = shape.radiusY;
        return `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${sc}" stroke-width="${sw}"${transform}/>\n`;
      }
      case 'Square': {
        const s = shape.size;
        return `  <rect x="${cx - s/2}" y="${cy - s/2}" width="${s}" height="${s}" fill="none" stroke="${sc}" stroke-width="${sw}"${transform}/>\n`;
      }
      case 'Rectangle': {
        const w = shape.width;
        const h = shape.height;
        return `  <rect x="${cx - w/2}" y="${cy - h/2}" width="${w}" height="${h}" fill="none" stroke="${sc}" stroke-width="${sw}"${transform}/>\n`;
      }
      case 'Triangle': {
        const hw = shape.width / 2;
        const hh = shape.height / 2;
        const pts = `${cx},${cy - hh} ${cx - hw},${cy + hh} ${cx + hw},${cy + hh}`;
        return `  <polygon points="${pts}" fill="none" stroke="${sc}" stroke-width="${sw}"${transform}/>\n`;
      }
      case 'Diamond': {
        const dhw = shape.width / 2;
        const dhh = shape.height / 2;
        const dpts = `${cx},${cy - dhh} ${cx + dhw},${cy} ${cx},${cy + dhh} ${cx - dhw},${cy}`;
        return `  <polygon points="${dpts}" fill="none" stroke="${sc}" stroke-width="${sw}"${transform}/>\n`;
      }
      case 'Line': {
        return `  <line x1="${shape.start.x}" y1="${shape.start.y}" x2="${shape.end.x}" y2="${shape.end.y}" stroke="${sc}" stroke-width="${sw}" stroke-linecap="round"/>\n`;
      }
      case 'Arrow': {
        // Arrow as line + polygon head
        const sx = shape.start.x, sy = shape.start.y;
        const ex = shape.end.x, ey = shape.end.y;
        const angle = Math.atan2(ey - sy, ex - sx);
        const head = shape.headSize || 12;
        const a1 = angle + Math.PI / 6;
        const a2 = angle - Math.PI / 6;
        const h1x = ex - head * Math.cos(a1);
        const h1y = ey - head * Math.sin(a1);
        const h2x = ex - head * Math.cos(a2);
        const h2y = ey - head * Math.sin(a2);
        let svg = `  <line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${sc}" stroke-width="${sw}" stroke-linecap="round"/>\n`;
        svg += `  <polygon points="${ex},${ey} ${h1x},${h1y} ${h2x},${h2y}" fill="none" stroke="${sc}" stroke-width="${sw}" stroke-linejoin="round"/>\n`;
        return svg;
      }
      case 'Pentagon':
      case 'Hexagon': {
        const sides = shape.type === 'Pentagon' ? 5 : 6;
        const r = shape.radius;
        let pts = '';
        for (let i = 0; i < sides; i++) {
          const a = (i * 2 * Math.PI) / sides - Math.PI / 2;
          const px = cx + r * Math.cos(a);
          const py = cy + r * Math.sin(a);
          pts += `${px},${py} `;
        }
        return `  <polygon points="${pts.trim()}" fill="none" stroke="${sc}" stroke-width="${sw}"${transform}/>\n`;
      }
      default:
        return '';
    }
  }
}
