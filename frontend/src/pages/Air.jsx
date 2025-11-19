import React, { useState, useRef, useEffect } from 'react'
import { apiUrl } from '../lib/api'
import Page from '../components/layout/Page'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'

export default function Air() {
  const [isActive, setIsActive] = useState(false)
  const [status, setStatus] = useState('Click Start to begin')
  const [gesture, setGesture] = useState('')
  const [mode, setMode] = useState('idle') // idle, move, draw, erase, analyze
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const drawCanvasRef = useRef(null)
  const handsRef = useRef(null)
  const cameraRef = useRef(null)
  const streamRef = useRef(null)
  const lastPositionRef = useRef(null)
  const pointerTrailRef = useRef([]) // For pointer trail

  // Load MediaPipe scripts
  useEffect(() => {
    if (window.Hands && window.Camera && window.drawConnectors && window.drawLandmarks && window.HAND_CONNECTIONS) {
      setScriptsLoaded(true)
      setStatus('Ready to start')
      return
    }

    const script1 = document.createElement('script')
    script1.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
    script1.crossOrigin = 'anonymous'

    const script2 = document.createElement('script')
    script2.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
    script2.crossOrigin = 'anonymous'

    const script3 = document.createElement('script')
    script3.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'
    script3.crossOrigin = 'anonymous'

    let loadedCount = 0
    const trySetLoaded = () => {
      loadedCount++
      if (
        window.Hands && window.Camera &&
        window.drawConnectors && window.drawLandmarks && window.HAND_CONNECTIONS &&
        loadedCount >= 3
      ) {
        setScriptsLoaded(true)
        setStatus('Ready to start')
      }
    }

    script1.onload = trySetLoaded
    script2.onload = trySetLoaded
    script3.onload = trySetLoaded

    script1.onerror = () => setStatus('Error loading MediaPipe')
    script2.onerror = () => setStatus('Error loading MediaPipe')
    script3.onerror = () => setStatus('Error loading MediaPipe')

    document.body.appendChild(script1)
    document.body.appendChild(script2)
    document.body.appendChild(script3)

    return () => {
      if (document.body.contains(script1)) document.body.removeChild(script1)
      if (document.body.contains(script2)) document.body.removeChild(script2)
      if (document.body.contains(script3)) document.body.removeChild(script3)
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      setLoading(true)
      setStatus('Starting camera...')

      if (!scriptsLoaded || !window.Hands || !window.Camera) {
        alert('MediaPipe is still loading. Please wait a moment and try again.')
        setLoading(false)
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 1280, 
          height: 720,
          facingMode: 'user'
        }
      })
      
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        streamRef.current = stream
        await video.play()
        
        // Initialize canvases
        const canvas = canvasRef.current
        const drawCanvas = drawCanvasRef.current
        
        if (canvas && drawCanvas) {
          canvas.width = 1280
          canvas.height = 720
          drawCanvas.width = 1280
          drawCanvas.height = 720
          
          // White background for drawing
          const drawCtx = drawCanvas.getContext('2d')
          drawCtx.fillStyle = '#fff'
          drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height)
        }

        // Initialize MediaPipe Hands
        const hands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        })

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        })

        hands.onResults(onHandResults)
        handsRef.current = hands

        // Start camera
        const camera = new window.Camera(video, {
          onFrame: async () => {
            await hands.send({ image: video })
          },
          width: 1280,
          height: 720
        })
        cameraRef.current = camera
        await camera.start()
        
        setIsActive(true)
        setStatus('Camera active - Show your hand!')
        setLoading(false)
      }
    } catch (err) {
      console.error('Camera error:', err)
      setStatus('Camera error: ' + err.message)
      setLoading(false)
      alert('Please allow camera access and ensure MediaPipe is loaded')
    }
  }

  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop()
      cameraRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (handsRef.current) {
      handsRef.current.close()
      handsRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsActive(false)
    setStatus('Camera stopped')
    setGesture('')
    lastPositionRef.current = null
  }


  const onHandResults = (results) => {
    const canvas = canvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (!canvas || !drawCanvas) return;

    const ctx = canvas.getContext('2d');
    const drawCtx = drawCanvas.getContext('2d');

    // Clear and draw video frame
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    // Draw pointer trail (fading)
    if (pointerTrailRef.current.length > 1) {
      for (let i = 1; i < pointerTrailRef.current.length; i++) {
        const prev = pointerTrailRef.current[i - 1];
        const curr = pointerTrailRef.current[i];
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.strokeStyle = `rgba(102,126,234,${0.2 + 0.6 * (i / pointerTrailRef.current.length)})`;
        ctx.lineWidth = 8 * (i / pointerTrailRef.current.length);
        ctx.stroke();
      }
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      // Draw hand landmarks
      if (window.drawConnectors && window.HAND_CONNECTIONS) {
        window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 2
        });
      }
      if (window.drawLandmarks) {
        window.drawLandmarks(ctx, landmarks, {
          color: '#FF0000',
          lineWidth: 1,
          radius: 3
        });
      }

      // Count fingers
      const fingers = countFingers(landmarks);
      setGesture(`${fingers} finger${fingers !== 1 ? 's' : ''}`);

      // Index finger tip for pointer (landmark 8)
      const indexTip = landmarks[8];
      const x = indexTip.x * canvas.width;
      const y = indexTip.y * canvas.height;

      // Update pointer trail
      pointerTrailRef.current.push({ x, y });
      if (pointerTrailRef.current.length > 10) pointerTrailRef.current.shift();

      // Draw pointer dot
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, 2 * Math.PI);
      ctx.fillStyle = '#667eea';
      ctx.globalAlpha = 0.7;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Mode switching (new mapping)
      if (fingers === 1) {
        setMode('draw');
        if (lastPositionRef.current) {
          // Line smoothing: interpolate between last and current
          const steps = 6;
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const ix = lastPositionRef.current.x + (x - lastPositionRef.current.x) * t;
            const iy = lastPositionRef.current.y + (y - lastPositionRef.current.y) * t;
            drawCtx.save();
            drawCtx.setTransform(-1, 0, 0, 1, drawCanvas.width, 0); // Mirror horizontally
            drawCtx.strokeStyle = '#000';
            drawCtx.lineWidth = 4;
            drawCtx.lineCap = 'round';
            drawCtx.lineJoin = 'round';
            drawCtx.beginPath();
            drawCtx.moveTo(drawCanvas.width - lastPositionRef.current.x, lastPositionRef.current.y);
            drawCtx.lineTo(drawCanvas.width - ix, iy);
            drawCtx.stroke();
            drawCtx.restore();
            lastPositionRef.current = { x: ix, y: iy };
          }
        }
        lastPositionRef.current = { x, y };
      } else if (fingers === 2) {
        setMode('move');
        lastPositionRef.current = { x, y };
      } else if (fingers === 3) {
        setMode('erase');
        drawCtx.save();
        drawCtx.setTransform(-1, 0, 0, 1, drawCanvas.width, 0); // Mirror horizontally
        drawCtx.globalCompositeOperation = 'destination-out';
        drawCtx.beginPath();
        drawCtx.arc(drawCanvas.width - x, y, 30, 0, 2 * Math.PI);
        drawCtx.fill();
        drawCtx.restore();
        lastPositionRef.current = { x, y };
      } else if (fingers === 4) {
        setMode('analyze');
        analyzeDrawingBackend(drawCanvas);
        lastPositionRef.current = null;
      } else if (fingers === 5) {
        setMode('clear');
        clearDrawing();
        lastPositionRef.current = null;
      } else {
        setMode('idle');
        lastPositionRef.current = null;
      }

      // Send drawing to backend for OCR and analysis
      async function analyzeDrawingBackend(drawCanvas) {
        setAnswer('Solving...');
        try {
          const imageData = drawCanvas.toDataURL('image/png');
          const res = await fetch(apiUrl('/api/eduair/analyze'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ strokes: [], imageData })
          });
          const data = await res.json();
          if (data.ok) {
            setAnswer(`Answer: ${data.answer}`);
          } else {
            setAnswer('Unable to analyze');
          }
        } catch (e) {
          setAnswer('Error analyzing drawing');
        }
      }
    } else {
      setGesture('');
      lastPositionRef.current = null;
      pointerTrailRef.current = [];
    }

    ctx.restore();
  }

  const countFingers = (landmarks) => {
    let count = 0

    // Thumb (check horizontal position)
    if (landmarks[4].x < landmarks[3].x) count++

    // Index, Middle, Ring, Pinky (check vertical position)
    const fingerTips = [8, 12, 16, 20]
    const fingerPips = [6, 10, 14, 18]

    for (let i = 0; i < fingerTips.length; i++) {
      if (landmarks[fingerTips[i]].y < landmarks[fingerPips[i]].y) {
        count++
      }
    }

    return count
  }

  const clearDrawing = () => {
    const drawCanvas = drawCanvasRef.current
    if (drawCanvas) {
      const ctx = drawCanvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height)
    }
  }

  const saveDrawing = () => {
    const drawCanvas = drawCanvasRef.current
    if (drawCanvas) {
      const link = document.createElement('a')
      link.download = `air-drawing-${Date.now()}.png`
      link.href = drawCanvas.toDataURL()
      link.click()
    }
  }

  return (
    <Page 
      title="EduAir - Air Canvas" 
      description="Draw in the air with hand gestures using your camera"
    >
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 24 
      }}>
        {/* Header */}
        <div style={{ 
          textAlign: 'center',
          padding: 24,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 16,
          color: '#fff'
        }}>
          <h1 style={{ 
            fontSize: 48, 
            fontWeight: 'bold', 
            margin: '0 0 12px 0'
          }}>
            ✨ Air Canvas
          </h1>
          <p style={{ fontSize: 18, margin: 0, opacity: 0.9 }}>
            Draw in the air using hand gestures powered by MediaPipe
          </p>
        </div>

        {/* Status */}
        <div style={{
          padding: 20,
          background: 'var(--background-secondary)',
          borderRadius: 12,
          textAlign: 'center',
          fontSize: 18,
          fontWeight: 600,
          color: isActive ? '#10b981' : '#64748b'
        }}>
          {loading ? <Loader /> : status}
          {gesture && <div style={{ marginTop: 8, color: '#667eea' }}>✋ {gesture} | Mode: {mode}</div>}
          {mode === 'analyze' && answer && <div style={{ marginTop: 12, color: '#f59e42', fontSize: 22 }}>{answer}</div>}
        </div>

        {/* Canvas Area */}
        <div style={{
          position: 'relative',
          background: '#000',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          aspectRatio: '16/9',
          maxHeight: '60vh'
        }}>
          {/* Video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0,
              pointerEvents: 'none',
              zIndex: 0
            }}
          />

          {/* Tracking Canvas (shows video + hand landmarks) */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 1
            }}
          />

          {/* Drawing Canvas (overlay) */}
          <canvas
            ref={drawCanvasRef}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 2,
              pointerEvents: 'none',
              opacity: 0.7
            }}
          />

          {/* Placeholder */}
          {!isActive && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: '#fff',
              zIndex: 10
            }}>
              <div style={{ fontSize: 100, marginBottom: 20 }}>✋</div>
              <h2 style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 12 }}>
                Ready to Draw?
              </h2>
              <p style={{ fontSize: 18, opacity: 0.8 }}>
                Click "Start Camera" to begin
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {!isActive ? (
            <Button 
              onClick={startCamera} 
              disabled={loading || !scriptsLoaded}
              style={{ fontSize: 18, padding: '16px 32px' }}
            >
              {loading ? '⏳ Starting...' : !scriptsLoaded ? '⏳ Loading MediaPipe...' : '▶️ Start Camera'}
            </Button>
          ) : (
            <>
              <Button 
                onClick={stopCamera}
                variant="ghost"
                style={{ fontSize: 18, padding: '16px 32px' }}
              >
                ⏹️ Stop Camera
              </Button>
              <Button 
                onClick={clearDrawing}
                style={{ 
                  fontSize: 18, 
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)'
                }}
              >
                🗑️ Clear
              </Button>
              <Button 
                onClick={saveDrawing}
                style={{ 
                  fontSize: 18, 
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #10b981, #059669)'
                }}
              >
                💾 Save Drawing
              </Button>
            </>
          )}
        </div>

        {/* Instructions */}
        <div style={{
          padding: 24,
          background: 'var(--background-secondary)',
          borderRadius: 16
        }}>
          <h3 style={{ 
            fontSize: 22, 
            fontWeight: 'bold', 
            marginBottom: 16,
            color: 'var(--text-primary)'
          }}>
            📋 How to Use
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 16
          }}>
            {/* Card styles updated for better contrast and vibrancy */}
            {[
              {
                icon: '📹',
                title: '1. Start Camera',
                desc: 'Click "Start Camera" and allow camera access'
              },
              {
                icon: '🖐️',
                title: '2. Show Your Hand',
                desc: 'Position your hand clearly in front of the camera'
              },
              {
                icon: '🫱',
                title: '3. Draw (1 finger)',
                desc: 'Point with your index finger to draw on the canvas'
              },
              {
                icon: '✌️',
                title: '4. Move (2 fingers)',
                desc: 'Move your hand with 2 fingers up to reposition pointer'
              },
              {
                icon: '🤟',
                title: '5. Erase (3 fingers)',
                desc: 'Show 3 fingers to erase at the pointer'
              },
              {
                icon: '🖐️',
                title: '6. Analyze (4 fingers)',
                desc: 'Show 4 fingers to analyze your drawing (math/GK)'
              },
              {
                icon: '🖐️',
                title: '7. Clear Canvas (5 fingers)',
                desc: 'Show all 5 fingers to clear the canvas'
              }
            ].map((item, idx) => (
              <div key={idx} style={{
                padding: 20,
                background: '#181111',
                borderRadius: 18,
                boxShadow: '0 2px 12px 0 rgba(0,0,0,0.18)',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                minHeight: 140
              }}>
                <div style={{ fontSize: 38, marginBottom: 10 }}>{item.icon}</div>
                <h4 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 6, color: '#fff' }}>{item.title}</h4>
                <p style={{ fontSize: 15, color: '#e0bfae', margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{
          padding: 24,
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
          borderRadius: 16,
          border: '2px solid rgba(102, 126, 234, 0.2)'
        }}>
          <h3 style={{ 
            fontSize: 22, 
            fontWeight: 'bold', 
            marginBottom: 16,
            color: 'var(--text-primary)'
          }}>
            ✨ Features
          </h3>
          <ul style={{ 
            fontSize: 16, 
            lineHeight: 1.8,
            color: 'var(--text-secondary)',
            margin: 0,
            paddingLeft: 24
          }}>
            <li><strong>Real-Time Hand Tracking:</strong> Powered by Google MediaPipe technology</li>
            <li><strong>Gesture Recognition:</strong> Automatically detects number of fingers raised</li>
            <li><strong>Air Drawing:</strong> Draw using just your index finger - no touch required</li>
            <li><strong>Save Your Art:</strong> Export drawings as PNG images</li>
            <li><strong>Clear Canvas:</strong> Start fresh with one click</li>
          </ul>
          <div style={{ 
            marginTop: 16, 
            padding: 12, 
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: 8,
            fontSize: 14,
            color: '#059669'
          }}>
            💡 <strong>Tip:</strong> Make sure you're in a well-lit area for best hand tracking results!
          </div>
        </div>
      </div>
    </Page>
  )
}
