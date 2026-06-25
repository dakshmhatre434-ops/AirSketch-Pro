// Phase v21: Working detection + simple pinch-to-draw
// Based on the working skeleton visualization

import React, { useRef, useEffect, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export const DrawingCanvas = React.forwardRef(function DrawingCanvas(
  { width, height, strokeColor, strokeWidth },
  ref
) {
  const videoRef = useRef(null);
  const persistentCanvasRef = useRef(null);
  const activeCanvasRef = useRef(null);
  const statusRef = useRef(null);
  const handCountRef = useRef(null);
  const stateRef = useRef(null);
  const pinchRef = useRef(null);

  const landmarkerRef = useRef(null);
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef([]);
  const isDrawingRef = useRef(false);
  const lastTimestampRef = useRef(0);

  const setStatus = (text) => { if (statusRef.current) statusRef.current.textContent = text; };
  const setHandCount = (n) => { if (handCountRef.current) handCountRef.current.textContent = 'Hands: ' + n; };
  const setState = (s) => { if (stateRef.current) stateRef.current.textContent = 'State: ' + s; };
  const setPinch = (d) => { if (pinchRef.current) pinchRef.current.textContent = 'Pinch: ' + d.toFixed(3); };

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
          
          aCtx.strokeStyle = pinchDist < 0.15 ? '#00ff00' : '#ff0000';
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

          // Draw current stroke on active canvas
          if (isDrawingRef.current && currentStrokeRef.current.length >= 2) {
            drawStroke(aCtx, currentStrokeRef.current, strokeColor, strokeWidth);
          }

          // Draw cursor dot
          aCtx.fillStyle = isPinching ? '#00e5ff' : '#ff1744';
          aCtx.beginPath();
          aCtx.arc(smoothX, smoothY, isPinching ? 10 : 6, 0, 2 * Math.PI);
          aCtx.fill();
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

    function drawSkeleton(ctx, landmarks, w, h) {
      const connections = [
        [0,1],[1,2],[2,3],[3,4],
        [0,5],[5,6],[6,7],[7,8],
        [0,9],[9,10],[10,11],[11,12],
        [0,13],[13,14],[14,15],[15,16],
        [0,17],[17,18],[18,19],[19,20],
        [5,9],[9,13],[13,17]
      ];
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.lineWidth = 1;
      for (const [a, b] of connections) {
        const pa = landmarks[a];
        const pb = landmarks[b];
        if (!pa || !pb) continue;
        ctx.beginPath();
        ctx.moveTo((1 - pa.x) * w, pa.y * h);
        ctx.lineTo((1 - pb.x) * w, pb.y * h);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
      for (const lm of landmarks) {
        ctx.beginPath();
        ctx.arc((1 - lm.x) * w, lm.y * h, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
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
        <div style={{ marginTop: 8, color: '#888', fontSize: 11 }}>
          Pinch thumb+index to draw<br/>
          Release to stop
        </div>
      </div>
    </div>
  );
});
