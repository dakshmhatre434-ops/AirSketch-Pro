// Phase 3+Opt: Air Drawing Engine — Stroke Smoothing Pipeline (Optimized)
// Uses double exponential smoothing + quadratic interpolation for fluid strokes

export class StrokeSmoother {
  constructor(options = {}) {
    this.alpha = options.alpha ?? 0.35;          // EMA smoothing factor (0-1)
    this.minDistance = options.minDistance ?? 1.5; // Minimum pixel distance
    this.maxInterpolationGap = options.maxInterpolationGap ?? 12;
    this.velocitySmoothing = options.velocitySmoothing ?? 0.4;
    this.deadZone = options.deadZone ?? 0.8;       // Sub-pixel jitter gate

    this.smoothedPoint = null;
    this.lastRawPoint = null;
    this.velocity = { x: 0, y: 0 };
    this.accel = { x: 0, y: 0 };
  }

  reset() {
    this.smoothedPoint = null;
    this.lastRawPoint = null;
    this.velocity = { x: 0, y: 0 };
    this.accel = { x: 0, y: 0 };
  }

  smooth(raw) {
    if (!this.smoothedPoint) {
      this.smoothedPoint = { x: raw.x, y: raw.y };
      this.lastRawPoint = { x: raw.x, y: raw.y };
      return { x: raw.x, y: raw.y };
    }

    const vx = raw.x - this.lastRawPoint.x;
    const vy = raw.y - this.lastRawPoint.y;

    // Smooth velocity (double exponential: track velocity + acceleration)
    this.velocity.x = this.velocity.x * this.velocitySmoothing + vx * (1 - this.velocitySmoothing);
    this.velocity.y = this.velocity.y * this.velocitySmoothing + vy * (1 - this.velocitySmoothing);

    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);

    // Adaptive alpha: faster = less smoothing (more responsive), slower = more smoothing (less jitter)
    const adaptiveAlpha = Math.min(0.95, this.alpha + speed * 0.015);

    // Double exponential smoothing (Holt's method): level + trend
    const levelX = this.smoothedPoint.x * (1 - adaptiveAlpha) + raw.x * adaptiveAlpha;
    const levelY = this.smoothedPoint.y * (1 - adaptiveAlpha) + raw.y * adaptiveAlpha;

    const trendX = this.velocity.x * (1 - adaptiveAlpha) + vx * adaptiveAlpha;
    const trendY = this.velocity.y * (1 - adaptiveAlpha) + vy * adaptiveAlpha;

    const newPoint = {
      x: levelX + trendX * 0.5,
      y: levelY + trendY * 0.5
    };

    // Dead zone: ignore sub-pixel jitter
    const dx = newPoint.x - this.smoothedPoint.x;
    const dy = newPoint.y - this.smoothedPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.deadZone) {
      this.lastRawPoint = { x: raw.x, y: raw.y };
      return null;
    }

    // Distance gate: skip points too close (reduces point density)
    if (distance < this.minDistance) {
      this.smoothedPoint = newPoint;
      this.lastRawPoint = { x: raw.x, y: raw.y };
      return null;
    }

    this.smoothedPoint = newPoint;
    this.lastRawPoint = { x: raw.x, y: raw.y };
    return newPoint;
  }

  /**
   * Quadratic interpolation for gap filling — smoother than linear.
   */
  interpolate(p0, p1, steps) {
    const points = [];
    // Use midpoint as control point for quadratic curve
    const mid = { x: (p0.x + p1.x) * 0.5, y: (p0.y + p1.y) * 0.5 };
    for (let i = 1; i <= steps; i++) {
      const t = i / (steps + 1);
      // Quadratic Bezier: (1-t)^2 * p0 + 2(1-t)t * mid + t^2 * p1
      const mt = 1 - t;
      const x = mt * mt * p0.x + 2 * mt * t * mid.x + t * t * p1.x;
      const y = mt * mt * p0.y + 2 * mt * t * mid.y + t * t * p1.y;
      points.push({ x, y });
    }
    return points;
  }

  processBatch(rawPoints) {
    const result = [];
    for (let i = 0; i < rawPoints.length; i++) {
      const point = this.smooth(rawPoints[i]);
      if (point) {
        if (result.length > 0) {
          const last = result[result.length - 1];
          const dx = point.x - last.x;
          const dy = point.y - last.y;
          const gap = Math.sqrt(dx * dx + dy * dy);
          if (gap > this.maxInterpolationGap) {
            const steps = Math.ceil(gap / this.maxInterpolationGap);
            result.push(...this.interpolate(last, point, steps));
          }
        }
        result.push(point);
      }
    }
    return result;
  }
}

export class PredictiveStrokeSmoother extends StrokeSmoother {
  constructor(options = {}) {
    super(options);
    this.predictFactor = options.predictFactor ?? 0.12;
  }

  smooth(raw) {
    if (!this.smoothedPoint) return super.smooth(raw);

    // Predict next position based on smoothed velocity + half acceleration
    const predictedX = raw.x + this.velocity.x * this.predictFactor + this.accel.x * 0.5 * this.predictFactor * this.predictFactor;
    const predictedY = raw.y + this.velocity.y * this.predictFactor + this.accel.y * 0.5 * this.predictFactor * this.predictFactor;

    // Blend prediction with actual (70/30) — prediction reduces perceived latency
    const blended = {
      x: raw.x * 0.75 + predictedX * 0.25,
      y: raw.y * 0.75 + predictedY * 0.25
    };

    return super.smooth(blended);
  }
}
