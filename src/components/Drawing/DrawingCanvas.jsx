// Phase v23: Shape Recognition Toggle
// - Always in draw mode
// - Shape recognition toggle (ON/OFF)
// - Runs after stroke completion (pinch release)
// - Supports: circle, ellipse, square, rectangle, triangle, line, arrow

import React, { useRef, useEffect, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// ─── Shape Recognition Engine ───
function recognizeShape(points) {
  console.warn('[SHAPE] recognizeShape called with', points.length, 'points');
  if (points.length < 10) {
    console.warn('[SHAPE] Too few points, returning null');
    return null;
  }

  // Simplify stroke using Ramer-Douglas-Peucker
  const simplified = rdpSimplify(points, 5);
  console.warn('[SHAPE] Simplified to', simplified.length, 'points');
  if (simplified.length < 3) {
    console.warn('[SHAPE] Too few simplified points, returning null');
    return null;
  }

  // Bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const aspectRatio = width / (height || 1);

  // Check if closed shape (start near end)
  const start = points[0];
  const end = points[points.length - 1];
  const isClosed = Math.sqrt((start.x - end.x) ** 2 + (start.y - end.y) ** 2) < Math.max(width, height) * 0.3;

  // Calculate perimeter and area
  let perimeter = 0;
  for (let i = 1; i < points.length; i++) {
    perimeter += Math.sqrt((points[i].x - points[i-1].x) ** 2 + (points[i].y - points[i-1].y) ** 2);
  }

  // Check convex hull for triangle detection
  const hull = convexHull(points);

  // Scores for each shape
  const scores = {};

  // Circle score: check if all points are roughly equidistant from center
  if (isClosed && width > 20 && height > 20) {
    const radii = points.map(p => Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2));
    const avgRadius = radii.reduce((a, b) => a + b, 0) / radii.length;
    const radiusVariance = radii.reduce((sum, r) => sum + Math.abs(r - avgRadius), 0) / radii.length;
    const circularity = 1 - Math.min(radiusVariance / (avgRadius || 1), 1);
    scores.circle = circularity * (aspectRatio > 0.7 && aspectRatio < 1.3 ? 1 : 0.5);
  }

  // Ellipse score: like circle but allows different aspect ratios
  if (isClosed && width > 20 && height > 20) {
    const rx = width / 2;
    const ry = height / 2;
    const ellipseError = points.reduce((sum, p) => {
      const normalizedX = (p.x - centerX) / (rx || 1);
      const normalizedY = (p.y - centerY) / (ry || 1);
      return sum + Math.abs(normalizedX ** 2 + normalizedY ** 2 - 1);
    }, 0) / points.length;
    scores.ellipse = Math.max(0, 1 - ellipseError) * (aspectRatio < 0.3 || aspectRatio > 3 ? 0.7 : 0.3);
  }

  // Rectangle score: check if simplified points form ~4 corners with right angles
  if (isClosed && simplified.length >= 4 && simplified.length <= 8) {
    const corners = simplified;
    let rightAngleCount = 0;
    for (let i = 0; i < corners.length; i++) {
      const prev = corners[(i - 1 + corners.length) % corners.length];
      const curr = corners[i];
      const next = corners[(i + 1) % corners.length];
      const angle = Math.abs(calculateAngle(prev, curr, next));
      if (angle > 70 && angle < 110) rightAngleCount++;
    }
    const rectScore = rightAngleCount / corners.length;
    scores.rectangle = rectScore * (Math.abs(aspectRatio - 1) > 0.2 ? 1 : 0.8);
    scores.square = rectScore * (Math.abs(aspectRatio - 1) < 0.2 ? 1 : 0);
  }

  // Triangle score: check if convex hull has ~3 vertices
  if (isClosed && hull.length === 3 && width > 20 && height > 20) {
    scores.triangle = 0.9;
  }

  // Line score: check if points are roughly collinear
  if (!isClosed && width > 20 || height > 20) {
    const lineFit = fitLine(points);
    scores.line = lineFit.r2;

    // Arrow score: check if endpoints have arrowhead shape
    if (lineFit.r2 > 0.85 && points.length > 20) {
      const arrowScore = detectArrow(points, lineFit);
      if (arrowScore > 0.6) scores.arrow = arrowScore;
    }
  }

  // Find best match
  let bestShape = null;
  let bestScore = 0;
  for (const [shape, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestShape = shape;
    }
  }

  if (bestScore < 0.4) {
    console.warn('[SHAPE] No shape recognized. Best score:', bestScore, 'scores:', scores);
    return null;
  }

  console.warn('[SHAPE] Recognized:', bestShape, 'confidence:', Math.round(bestScore * 100));

  return {
    shape: bestShape,
    confidence: Math.round(bestScore * 100),
    bounds: { minX, maxX, minY, maxY, centerX, centerY, width, height }
  };
}

function rdpSimplify(points, epsilon) {
  if (points.length <= 2) return points;

  function findFarthest(start, end) {
    let maxDist = 0;
    let index = -1;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len2 = dx * dx + dy * dy;

    for (let i = start + 1; i < end; i++) {
      const t = len2 === 0 ? 0 : ((points[i].x - start.x) * dx + (points[i].y - start.y) * dy) / len2;
      const projX = start.x + t * dx;
      const projY = start.y + t * dy;
      const dist = Math.sqrt((points[i].x - projX) ** 2 + (points[i].y - projY) ** 2);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }
    return { index, dist: maxDist };
  }

  function simplify(start, end) {
    const { index, dist } = findFarthest(start, end);
    if (dist > epsilon && index !== -1) {
      return [...simplify(start, index), ...simplify(index, end).slice(1)];
    }
    return [points[start], points[end]];
  }

  return simplify(0, points.length - 1);
}

function convexHull(points) {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function calculateAngle(a, b, c) {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2);
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2);
  if (magBA === 0 || magBC === 0) return 0;
  const cos = dot / (magBA * magBC);
  return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
}

function fitLine(points) {
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0, den = 0;
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  // R² calculation
  const ssTot = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

function detectArrow(points, lineFit) {
  // Check if one end has a V-shape (arrowhead)
  const start = points[0];
  const end = points[points.length - 1];
  const midIdx = Math.floor(points.length / 2);

  // Check start end for arrowhead
  const startRegion = points.slice(0, Math.min(10, midIdx));
  const endRegion = points.slice(Math.max(midIdx, points.length - 10));

  function hasArrowhead(region, tip) {
    if (region.length < 5) return 0;
    const spread = region.reduce((max, p) => {
      const dist = Math.abs((p.y - lineFit.intercept - lineFit.slope * p.x) / Math.sqrt(1 + lineFit.slope ** 2));
      return Math.max(max, dist);
    }, 0);
    return Math.min(spread / 30, 1); // Normalize
  }

  const startArrow = hasArrowhead(startRegion, start);
  const endArrow = hasArrowhead(endRegion, end);

  return Math.max(startArrow, endArrow);
}

function drawRecognizedShape(ctx, result, color, width) {
  const { shape, bounds } = result;
  const { centerX, centerY, width: w, height: h } = bounds;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (shape) {
    case 'circle': {
      const radius = Math.max(w, h) / 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
      break;
    }
    case 'ellipse': {
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, w / 2, h / 2, 0, 0, 2 * Math.PI);
      ctx.stroke();
      break;
    }
    case 'square': {
      const size = Math.max(w, h);
      ctx.strokeRect(centerX - size / 2, centerY - size / 2, size, size);
      break;
    }
    case 'rectangle': {
      ctx.strokeRect(centerX - w / 2, centerY - h / 2, w, h);
      break;
    }
    case 'triangle': {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - h / 2);
      ctx.lineTo(centerX - w / 2, centerY + h / 2);
      ctx.lineTo(centerX + w / 2, centerY + h / 2);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'line': {
      ctx.beginPath();
      ctx.moveTo(bounds.minX, bounds.minY);
      ctx.lineTo(bounds.maxX, bounds.maxY);
      ctx.stroke();
      break;
    }
    case 'arrow': {
      // Draw line with arrowhead
      ctx.beginPath();
      ctx.moveTo(bounds.minX, bounds.minY);
      ctx.lineTo(bounds.maxX, bounds.maxY);
      ctx.stroke();
      // Arrowhead at end
      const angle = Math.atan2(bounds.maxY - bounds.minY, bounds.maxX - bounds.minX);
      const arrowLen = 20;
      ctx.beginPath();
      ctx.moveTo(bounds.maxX, bounds.maxY);
      ctx.lineTo(bounds.maxX - arrowLen * Math.cos(angle - Math.PI / 6), bounds.maxY - arrowLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(bounds.maxX, bounds.maxY);
      ctx.lineTo(bounds.maxX - arrowLen * Math.cos(angle + Math.PI / 6), bounds.maxY - arrowLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

// ─── Main Component ───
export const DrawingCanvas = React.forwardRef(function DrawingCanvas(
  { width, height, strokeColor, strokeWidth, shapeRecognitionEnabled = false },
  ref
) {
  // Visual indicator for shape recognition state
  const [shapeIndicator, setShapeIndicator] = useState('OFF');
  const videoRef = useRef(null);
  const persistentCanvasRef = useRef(null);
  const activeCanvasRef = useRef(null);
  const statusRef = useRef(null);
  const handCountRef = useRef(null);
  const stateRef = useRef(null);
  const pinchRef = useRef(null);
  const shapeRef = useRef(null);

  const landmarkerRef = useRef(null);
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef([]);
  const isDrawingRef = useRef(false);
  const lastTimestampRef = useRef(0);
  const shapeEnabledRef = useRef(shapeRecognitionEnabled);

  // Keep ref in sync with prop
  useEffect(() => {
    shapeEnabledRef.current = shapeRecognitionEnabled;
    setShapeIndicator(shapeRecognitionEnabled ? 'ON' : 'OFF');
  }, [shapeRecognitionEnabled]);

  const setStatus = (text) => { if (statusRef.current) statusRef.current.textContent = text; };
  const setHandCount = (n) => { if (handCountRef.current) handCountRef.current.textContent = 'Hands: ' + n; };
  const setState = (s) => { if (stateRef.current) stateRef.current.textContent = 'State: ' + s; };
  const setPinch = (d) => { if (pinchRef.current) pinchRef.current.textContent = 'Pinch: ' + d.toFixed(3); };
  const setShape = (s) => { if (shapeRef.current) shapeRef.current.textContent = s; };

  useEffect(() => {
    let mounted = true;
    const video = videoRef.current;
    const pCanvas = persistentCanvasRef.current;
    const aCanvas = activeCanvasRef.current;
    if (!video || !pCanvas || !aCanvas) return;

    const pCtx = pCanvas.getContext('2d');
    const aCtx = aCanvas.getContext('2d');
    pCanvas.width = window.innerWidth;
    pCanvas.height = window.innerHeight;
    aCanvas.width = window.innerWidth;
    aCanvas.height = window.innerHeight;

    setStatus('Starting camera...');

    // Camera
    navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
    }).then(stream => {
      if (!mounted) return;
      video.srcObject = stream;
      video.play().then(() => {
        setStatus('Camera active');
      });
    }).catch(err => {
      setStatus('Camera failed: ' + err.message);
    });

    // MediaPipe
    (async () => {
      try {
        setStatus('Loading MediaPipe...');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          numHands: 1,
          runningMode: 'VIDEO',
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3
        });
        if (!mounted) return;
        landmarkerRef.current = landmarker;
        setStatus('Ready — pinch to draw');
        startLoop();
      } catch (err) {
        setStatus('MediaPipe failed: ' + err.message);
      }
    })();

    function startLoop() {
      let frameCount = 0;

      const loop = () => {
        if (!mounted) return;

        const video = videoRef.current;
        const landmarker = landmarkerRef.current;
        if (!video || !landmarker || video.readyState < 2) {
          requestAnimationFrame(loop);
          return;
        }

        const aCtx = activeCanvasRef.current.getContext('2d');
        aCtx.clearRect(0, 0, aCanvas.width, aCanvas.height);

        frameCount++;
        const timestamp = Math.max(performance.now(), lastTimestampRef.current + 1);
        lastTimestampRef.current = timestamp;

        let hands = 0;
        let landmarks = null;
        try {
          const results = landmarker.detectForVideo(video, timestamp);
          hands = results.landmarks ? results.landmarks.length : 0;
          if (hands > 0) landmarks = results.landmarks[0];
        } catch (e) {
          console.error('Detection error:', e);
        }

        setHandCount(hands);

        if (hands > 0 && landmarks) {
          // Calculate pinch distance (thumb tip #4 to index tip #8)
          const thumb = landmarks[4];
          const index = landmarks[8];
          const pinchDist = Math.sqrt(
            Math.pow(thumb.x - index.x, 2) + 
            Math.pow(thumb.y - index.y, 2)
          );
          setPinch(pinchDist);
          
          // Draw line between thumb and index to visualize pinch
          const thumbX = (1 - thumb.x) * aCanvas.width;
          const thumbY = thumb.y * aCanvas.height;
          const indexX = (1 - index.x) * aCanvas.width;
          const indexY = index.y * aCanvas.height;
          
          aCtx.strokeStyle = pinchDist < 0.12 ? '#00ff00' : '#ff0000';
          aCtx.lineWidth = 3;
          aCtx.beginPath();
          aCtx.moveTo(thumbX, thumbY);
          aCtx.lineTo(indexX, indexY);
          aCtx.stroke();
          
          // Draw circles at thumb and index
          aCtx.fillStyle = '#ffff00';
          aCtx.beginPath();
          aCtx.arc(thumbX, thumbY, 8, 0, 2 * Math.PI);
          aCtx.fill();
          aCtx.beginPath();
          aCtx.arc(indexX, indexY, 8, 0, 2 * Math.PI);
          aCtx.fill();

          // Map index tip to canvas coordinates (with object-fit: cover correction)
          const tip = landmarks[8];
          const videoAspect = video.videoWidth / video.videoHeight;
          const canvasAspect = aCanvas.width / aCanvas.height;
          let sx, sy, sWidth, sHeight;
          if (videoAspect > canvasAspect) {
            sHeight = 1; sWidth = canvasAspect / videoAspect; sx = (1 - sWidth) / 2; sy = 0;
          } else {
            sWidth = 1; sHeight = videoAspect / canvasAspect; sx = 0; sy = (1 - sHeight) / 2;
          }
          const x = ((1 - tip.x) - sx) / sWidth * aCanvas.width;
          const y = (tip.y - sy) / sHeight * aCanvas.height;

          // Smooth the cursor (EMA filter)
          const alpha = 0.3;
          if (!window.smoothX) { window.smoothX = x; window.smoothY = y; }
          window.smoothX = alpha * x + (1 - alpha) * window.smoothX;
          window.smoothY = alpha * y + (1 - alpha) * window.smoothY;
          const smoothX = window.smoothX;
          const smoothY = window.smoothY;

          // Pinch threshold: < 0.12 is pinching
          const isPinching = pinchDist < 0.12;
          
          // Open palm check for erasing
          const wrist = landmarks[0];
          const isExtended = (tipIdx, pipIdx) => {
            const tip = landmarks[tipIdx];
            const pip = landmarks[pipIdx];
            if (!tip || !pip || !wrist) return false;
            const tipDist = Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2));
            const pipDist = Math.sqrt(Math.pow(pip.x - wrist.x, 2) + Math.pow(pip.y - wrist.y, 2));
            return tipDist > pipDist * 1.1;
          };
          const indexExt = isExtended(8, 6);
          const middleExt = isExtended(12, 10);
          const ringExt = isExtended(16, 14);
          const pinkyExt = isExtended(20, 18);
          const isOpenPalm = indexExt && middleExt && ringExt && pinkyExt && !isPinching;

          if (isPinching) {
            if (!isDrawingRef.current) {
              isDrawingRef.current = true;
              currentStrokeRef.current = [{ x: smoothX, y: smoothY }];
              setState('DRAWING');
            } else {
              const last = currentStrokeRef.current[currentStrokeRef.current.length - 1];
              const dx = smoothX - last.x;
              const dy = smoothY - last.y;
              if (Math.sqrt(dx * dx + dy * dy) > 2) {
                currentStrokeRef.current.push({ x: smoothX, y: smoothY });
              }
            }
          } else if (isOpenPalm) {
            // ERASE MODE
            if (isDrawingRef.current) {
              isDrawingRef.current = false;
              if (currentStrokeRef.current.length >= 2) {
                strokesRef.current.push({
                  points: [...currentStrokeRef.current],
                  color: strokeColor,
                  width: strokeWidth
                });
                drawStroke(pCtx, currentStrokeRef.current, strokeColor, strokeWidth);
              }
              currentStrokeRef.current = [];
            }
            setState('ERASING');
            
            // Erase strokes near palm center
            const palmX = (1 - wrist.x) * aCanvas.width;
            const palmY = wrist.y * aCanvas.height;
            const eraserRadius = 80;
            const before = strokesRef.current.length;
            strokesRef.current = strokesRef.current.filter(stroke => {
              if (!stroke.points || stroke.points.length === 0) return true;
              for (const p of stroke.points) {
                if (Math.sqrt(Math.pow(p.x - palmX, 2) + Math.pow(p.y - palmY, 2)) < eraserRadius) {
                  return false;
                }
              }
              return true;
            });
            if (strokesRef.current.length < before) {
              pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
              strokesRef.current.forEach(s => drawStroke(pCtx, s.points, s.color, s.width));
            }
            
            // Show eraser indicator
            aCtx.strokeStyle = '#ff1744';
            aCtx.lineWidth = 3;
            aCtx.beginPath();
            aCtx.arc(palmX, palmY, eraserRadius, 0, 2 * Math.PI);
            aCtx.stroke();
            aCtx.fillStyle = 'rgba(255, 23, 68, 0.2)';
            aCtx.fill();
          } else {
            if (isDrawingRef.current) {
              // Stroke just ended — run shape recognition if enabled
              isDrawingRef.current = false;
              if (currentStrokeRef.current.length >= 2) {
                const strokePoints = [...currentStrokeRef.current];
                
  // Check if shape recognition is enabled
  if (shapeEnabledRef.current) {
    console.warn('[SHAPE] Recognition enabled, points:', strokePoints.length);
    const result = recognizeShape(strokePoints);
    console.warn('[SHAPE] Result:', result);
    if (result) {
                    // Replace with recognized shape
                    strokesRef.current.push({
                      shape: result.shape,
                      bounds: result.bounds,
                      color: strokeColor,
                      width: strokeWidth,
                      confidence: result.confidence
                    });
                    drawRecognizedShape(pCtx, result, strokeColor, strokeWidth);
                    setShape(`${result.shape} (${result.confidence}%)`);
                    setTimeout(() => setShape(''), 2000);
                  } else {
                    // Keep original freehand stroke
                    strokesRef.current.push({
                      points: strokePoints,
                      color: strokeColor,
                      width: strokeWidth
                    });
                    drawStroke(pCtx, strokePoints, strokeColor, strokeWidth);
                  }
                } else {
                  // Normal freehand drawing
                  strokesRef.current.push({
                    points: strokePoints,
                    color: strokeColor,
                    width: strokeWidth
                  });
                  drawStroke(pCtx, strokePoints, strokeColor, strokeWidth);
                }
              }
              currentStrokeRef.current = [];
              setState('IDLE');
            }
          }

          // Draw current stroke on active canvas
          if (isDrawingRef.current && currentStrokeRef.current.length >= 2) {
            drawStroke(aCtx, currentStrokeRef.current, strokeColor, strokeWidth);
          }

          // Draw cursor dot
          aCtx.fillStyle = isPinching ? '#00e5ff' : '#ff1744';
          aCtx.beginPath();
          aCtx.arc(smoothX, smoothY, isPinching ? 10 : 6, 0, 2 * Math.PI);
          aCtx.fill();

          // Show shape recognition status
          if (shapeEnabledRef.current) {
            aCtx.fillStyle = '#00ff88';
            aCtx.font = 'bold 14px monospace';
            aCtx.fillText('📐 SHAPE ON', 20, aCanvas.height - 20);
          }
        } else {
          // No hand detected
          if (isDrawingRef.current) {
            isDrawingRef.current = false;
            if (currentStrokeRef.current.length >= 2) {
              strokesRef.current.push({
                points: [...currentStrokeRef.current],
                color: strokeColor,
                width: strokeWidth
              });
              drawStroke(pCtx, currentStrokeRef.current, strokeColor, strokeWidth);
            }
            currentStrokeRef.current = [];
            setState('IDLE');
          }
        }

        requestAnimationFrame(loop);
      };

      requestAnimationFrame(loop);
    }

    function drawStroke(ctx, points, color, width) {
      if (points.length < 2) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      if (points.length === 2) {
        ctx.lineTo(points[1].x, points[1].y);
      } else {
        for (let i = 1; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        const last = points[points.length - 1];
        ctx.lineTo(last.x, last.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    return () => { mounted = false; };
  }, [strokeColor, strokeWidth]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <video
        ref={videoRef}
        style={{
          position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh',
          objectFit: 'cover', zIndex: 1,
          transform: 'scaleX(-1)',
          opacity: 0.3
        }}
        playsInline muted
      />
      <canvas
        ref={persistentCanvasRef}
        style={{
          position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh',
          zIndex: 2, pointerEvents: 'none'
        }}
      />
      <canvas
        ref={activeCanvasRef}
        style={{
          position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh',
          zIndex: 3, pointerEvents: 'none'
        }}
      />
      <div style={{
        position: 'fixed', top: 10, left: 10, zIndex: 100,
        padding: '10px 14px', background: 'rgba(0,0,0,0.85)',
        borderRadius: 8, color: '#fff',
        fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6
      }}>
        <div style={{ color: '#00e5ff', fontWeight: 600 }}>DEBUG</div>
        <div ref={statusRef}>Loading...</div>
        <div ref={handCountRef}>Hands: 0</div>
        <div ref={stateRef}>State: IDLE</div>
        <div ref={pinchRef}>Pinch: 0</div>
        <div ref={shapeRef} style={{ color: '#00ff88', minHeight: 18 }}></div>
        <div style={{ color: shapeIndicator === 'ON' ? '#00ff88' : '#ff1744', fontWeight: 600 }}>
          Shape: {shapeIndicator}
        </div>
        <div style={{ marginTop: 8, color: '#888', fontSize: 11 }}>
          Pinch thumb+index to draw<br/>
          Release to stop<br/>
          Open palm to erase
        </div>
      </div>
    </div>
  );
});
