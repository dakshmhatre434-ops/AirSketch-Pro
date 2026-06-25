// One-Euro Filter — optimal for hand tracking: removes jitter at low speed, minimal lag at high speed
// Based on Casiez et al. 2012
// https://cristal.univ-lille.fr/~casiez/publications/CHI2012-casiez.pdf

class LowPassFilter {
  constructor(alpha) {
    this.alpha = alpha;
    this.y = null;
    this.s = null;
  }

  filter(x, alpha) {
    if (this.y == null) {
      this.y = x;
      this.s = x;
      return x;
    }
    const a = alpha ?? this.alpha;
    this.s = a * x + (1 - a) * this.s;
    return this.s;
  }

  reset() {
    this.y = null;
    this.s = null;
  }
}

export class OneEuroFilter {
  constructor(options = {}) {
    this.freq = options.freq ?? 60;        // Expected sampling frequency (Hz)
    this.minCutoff = options.minCutoff ?? 1.0;  // Minimum cutoff frequency (reduces jitter)
    this.beta = options.beta ?? 0.05;      // Speed coefficient (reduces lag at high speed)
    this.dCutoff = options.dCutoff ?? 1.0;   // Derivative cutoff frequency

    this.xFilter = new LowPassFilter(this._alpha(this.minCutoff));
    this.dxFilter = new LowPassFilter(this._alpha(this.dCutoff));

    this.lastTime = 0;
  }

  _alpha(cutoff) {
    const te = 1.0 / this.freq;
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / te);
  }

  filter(x, timestamp = performance.now()) {
    if (this.lastTime === 0) {
      this.lastTime = timestamp;
      this.xFilter.reset();
      this.dxFilter.reset();
      return x;
    }

    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Avoid division by zero
    const te = Math.max(dt, 1e-6);
    const freq = 1.0 / te;

    // Previous filtered value
    const prevX = this.xFilter.s ?? x;

    // Compute derivative
    const dx = (x - prevX) * freq;
    const edx = this.dxFilter.filter(dx, this._alpha(this.dCutoff));

    // Adaptive cutoff based on speed
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const alpha = this._alpha(cutoff);

    return this.xFilter.filter(x, alpha);
  }

  reset() {
    this.lastTime = 0;
    this.xFilter.reset();
    this.dxFilter.reset();
  }
}

// 2D wrapper for One-Euro Filter
export class OneEuroFilter2D {
  constructor(options = {}) {
    this.xFilter = new OneEuroFilter(options);
    this.yFilter = new OneEuroFilter(options);
  }

  filter(point, timestamp = performance.now()) {
    return {
      x: this.xFilter.filter(point.x, timestamp),
      y: this.yFilter.filter(point.y, timestamp)
    };
  }

  reset() {
    this.xFilter.reset();
    this.yFilter.reset();
  }
}
