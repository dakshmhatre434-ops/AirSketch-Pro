// Phase Stabilize: Pinch Gesture Detection — Responsive but stable
// Simple 3-frame consecutive gate + 50ms debounce. No over-engineering.

export class PinchGesture {
  constructor(options = {}) {
    this.pinchThreshold = options.pinchThreshold ?? 0.05;     // Start below this
    this.releaseThreshold = options.releaseThreshold ?? 0.08; // Release above this
    this.debounceMs = options.debounceMs ?? 50;               // Min time between changes
    this.consecutiveFrames = options.consecutiveFrames ?? 3;  // Frames to confirm

    this.isPinched = false;
    this.lastStateChange = 0;
    this.consecutiveCount = 0;
    this.pendingState = null;

    this.onPinchStart = null;
    this.onPinchEnd = null;
  }

  static distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  }

  update(landmarks) {
    if (!landmarks || landmarks.length < 21) return this.isPinched;

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const rawDist = PinchGesture.distance(thumbTip, indexTip);

    const now = performance.now();

    // Hysteresis: different thresholds for start vs release
    const targetState = this.isPinched
      ? rawDist < this.releaseThreshold   // Stay pinched until above release threshold
      : rawDist < this.pinchThreshold;    // Start pinching when below pinch threshold

    // Debounce: prevent rapid toggling
    if (now - this.lastStateChange < this.debounceMs) {
      return this.isPinched;
    }

    // Consecutive frame gate
    if (targetState !== this.pendingState) {
      this.pendingState = targetState;
      this.consecutiveCount = 1;
      return this.isPinched;
    }

    this.consecutiveCount++;
    if (this.consecutiveCount < this.consecutiveFrames) {
      return this.isPinched;
    }

    // Apply state change
    if (targetState && !this.isPinched) {
      this.isPinched = true;
      this.lastStateChange = now;
      this.onPinchStart?.(rawDist);
    } else if (!targetState && this.isPinched) {
      this.isPinched = false;
      this.lastStateChange = now;
      this.onPinchEnd?.(rawDist);
    }

    return this.isPinched;
  }

  reset() {
    this.isPinched = false;
    this.lastStateChange = 0;
    this.consecutiveCount = 0;
    this.pendingState = null;
  }
}
