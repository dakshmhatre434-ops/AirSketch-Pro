// Phase 6: Command Pattern History System
// Supports undo/redo for all canvas operations

export class HistoryCommand {
  constructor(type, data) {
    this.type = type;       // 'addShape', 'deleteShape', 'moveShape', 'resizeShape', 'rotateShape', 'addStroke', 'clear', 'zOrder'
    this.data = data;       // Command-specific data
    this.timestamp = Date.now();
    this.id = `cmd_${this.timestamp}_${Math.random().toString(36).slice(2, 7)}`;
  }

  execute(renderer) {
    // Override in subclasses or handle via HistoryManager
  }

  undo(renderer) {
    // Override in subclasses or handle via HistoryManager
  }
}

export class HistoryManager {
  constructor(shapeRenderer, maxHistory = 200) {
    this.renderer = shapeRenderer;
    this.stack = [];           // Command stack
    this.index = -1;         // Current position in stack
    this.maxHistory = maxHistory;
    this.onChange = null;      // Callback: ({ canUndo, canRedo, count }) => void
  }

  _notify() {
    this.onChange?.({
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      count: this.stack.length,
      position: this.index + 1
    });
  }

  /**
   * Execute a command and add it to history.
   * @param {HistoryCommand} cmd
   */
  execute(cmd) {
    // Remove any redo commands ahead of current position
    if (this.index < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.index + 1);
    }

    // Execute the command
    this._apply(cmd);

    // Add to stack
    this.stack.push(cmd);

    // Trim if exceeds max
    if (this.stack.length > this.maxHistory) {
      this.stack.shift();
    } else {
      this.index++;
    }

    this._notify();
  }

  /**
   * Undo the last command.
   */
  undo() {
    if (!this.canUndo()) return;

    const cmd = this.stack[this.index];
    this._revert(cmd);
    this.index--;
    this._notify();
  }

  /**
   * Redo the next command.
   */
  redo() {
    if (!this.canRedo()) return;

    this.index++;
    const cmd = this.stack[this.index];
    this._apply(cmd);
    this._notify();
  }

  canUndo() {
    return this.index >= 0;
  }

  canRedo() {
    return this.index < this.stack.length - 1;
  }

  /**
   * Clear all history.
   */
  clear() {
    this.stack = [];
    this.index = -1;
    this._notify();
  }

  /**
   * Get current state for serialization.
   */
  getState() {
    return {
      stack: this.stack.map(c => ({ type: c.type, data: c.data, timestamp: c.timestamp })),
      index: this.index
    };
  }

  // ─── Internal Apply/Revert Logic ───

  _apply(cmd) {
    const r = this.renderer;
    const d = cmd.data;

    switch (cmd.type) {
      case 'addShape':
        r.addShape(d.shape);
        break;
      case 'deleteShape':
        r.removeShape(d.shapeId);
        break;
      case 'moveShape':
        r.moveShape(d.shapeId, d.dx, d.dy);
        break;
      case 'resizeShape':
        r.resizeShape(d.shapeId, d.handleIndex, d.dx, d.dy);
        break;
      case 'rotateShape':
        if (d.shape) d.shape.rotation = (d.shape.rotation || 0) + d.delta;
        r._requestDraw();
        break;
      case 'addStroke':
        r.addFreehandStroke(d.points, d.style);
        break;
      case 'deleteStroke':
        r.removeFreehandStroke(d.strokeId);
        break;
      case 'clear':
        // Store current state for undo
        d.previousShapes = r.getShapes().map(s => ({ ...s }));
        d.previousStrokes = r.getFreehandStrokes().map(s => ({ ...s }));
        r.clear();
        break;
      case 'zOrder':
        // Move shape in array
        if (d.direction === 'forward' && d.shapeIndex < r.shapes.length - 1) {
          [r.shapes[d.shapeIndex], r.shapes[d.shapeIndex + 1]] = [r.shapes[d.shapeIndex + 1], r.shapes[d.shapeIndex]];
        } else if (d.direction === 'backward' && d.shapeIndex > 0) {
          [r.shapes[d.shapeIndex], r.shapes[d.shapeIndex - 1]] = [r.shapes[d.shapeIndex - 1], r.shapes[d.shapeIndex]];
        }
        r._requestDraw();
        break;
      case 'duplicateShape':
        r.addShape(d.newShape);
        break;
      case 'changeShapeColor': {
        const shape = r.getShapes().find(s => s.id === d.shapeId);
        if (shape) shape.strokeColor = d.newColor;
        r._requestDraw();
        break;
      }
      default:
        break;
    }
  }

  _revert(cmd) {
    const r = this.renderer;
    const d = cmd.data;

    switch (cmd.type) {
      case 'addShape':
        r.removeShape(d.shape.id);
        break;
      case 'deleteShape':
        r.addShape(d.shape);
        break;
      case 'moveShape':
        r.moveShape(d.shapeId, -d.dx, -d.dy);
        break;
      case 'resizeShape':
        r.resizeShape(d.shapeId, d.handleIndex, -d.dx, -d.dy);
        break;
      case 'rotateShape':
        if (d.shape) d.shape.rotation = (d.shape.rotation || 0) - d.delta;
        r._requestDraw();
        break;
      case 'addStroke':
        // Remove the last added stroke with matching points
        const strokes = r.getFreehandStrokes();
        const last = strokes[strokes.length - 1];
        if (last) r.removeFreehandStroke(last.id);
        break;
      case 'deleteStroke':
        r.addFreehandStroke(d.points, d.style);
        break;
      case 'clear':
        // Restore previous state
        r.shapes = d.previousShapes || [];
        r.freehandStrokes = d.previousStrokes || [];
        r._requestDraw();
        break;
      case 'zOrder':
        // Reverse z-order
        if (d.direction === 'forward' && d.shapeIndex < r.shapes.length - 1) {
          [r.shapes[d.shapeIndex + 1], r.shapes[d.shapeIndex]] = [r.shapes[d.shapeIndex], r.shapes[d.shapeIndex + 1]];
        } else if (d.direction === 'backward' && d.shapeIndex > 0) {
          [r.shapes[d.shapeIndex - 1], r.shapes[d.shapeIndex]] = [r.shapes[d.shapeIndex], r.shapes[d.shapeIndex - 1]];
        }
        r._requestDraw();
        break;
      case 'duplicateShape':
        r.removeShape(d.newShape.id);
        break;
      case 'changeShapeColor': {
        const shape = r.getShapes().find(s => s.id === d.shapeId);
        if (shape) shape.strokeColor = d.oldColor;
        r._requestDraw();
        break;
      }
      default:
        break;
    }
  }

  // ─── Convenience Factory Methods ───

  static addShape(shape) {
    return new HistoryCommand('addShape', { shape });
  }

  static deleteShape(shape) {
    return new HistoryCommand('deleteShape', { shape: { ...shape }, shapeId: shape.id });
  }

  static moveShape(shapeId, dx, dy) {
    return new HistoryCommand('moveShape', { shapeId, dx, dy });
  }

  static resizeShape(shapeId, handleIndex, dx, dy) {
    return new HistoryCommand('resizeShape', { shapeId, handleIndex, dx, dy });
  }

  static rotateShape(shape, delta) {
    return new HistoryCommand('rotateShape', { shape, delta });
  }

  static addStroke(points, style) {
    return new HistoryCommand('addStroke', { points, style });
  }

  static clear() {
    return new HistoryCommand('clear', {});
  }

  static zOrder(shapeIndex, direction) {
    return new HistoryCommand('zOrder', { shapeIndex, direction });
  }

  static duplicateShape(newShape) {
    return new HistoryCommand('duplicateShape', { newShape });
  }
}
