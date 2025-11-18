import React, { useState, useRef, useEffect } from 'react'
import Page from '../components/layout/Page'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'

export default function Air() {
  const [isActive, setIsActive] = useState(false)
  const [status, setStatus] = useState('Click Start to begin')
  const [gesture, setGesture] = useState('')
  const [loading, setLoading] = useState(false)
  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const drawCanvasRef = useRef(null)
  const handsRef = useRef(null)
  const cameraRef = useRef(null)
  const streamRef = useRef(null)
  const lastPositionRef = useRef(null)

  // Load MediaPipe scripts
  useEffect(() => {
    if (window.Hands && window.Camera) {
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

    script2.onload = () => {
      setScriptsLoaded(true)
      setStatus('Ready to start')
    }

    script1.onerror = () => setStatus('Error loading MediaPipe')
    script2.onerror = () => setStatus('Error loading MediaPipe')

    document.body.appendChild(script1)
    document.body.appendChild(script2)

    return () => {
      if (document.body.contains(script1)) document.body.removeChild(script1)
      if (document.body.contains(script2)) document.body.removeChild(script2)
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
    const canvas = canvasRef.current
    const drawCanvas = drawCanvasRef.current
    if (!canvas || !drawCanvas) return

    const ctx = canvas.getContext('2d')
    const drawCtx = drawCanvas.getContext('2d')

    // Clear and draw video frame
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0]

      // Draw hand landmarks
      if (window.drawConnectors && window.HAND_CONNECTIONS) {
        window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 2
        })
      }
      if (window.drawLandmarks) {
        window.drawLandmarks(ctx, landmarks, {
          color: '#FF0000',
          lineWidth: 1,
          radius: 3
        })
      }

      // Count fingers
      const fingers = countFingers(landmarks)
      setGesture(`${fingers} finger${fingers !== 1 ? 's' : ''}`)

      // Index finger tip for drawing (landmark 8)
      const indexTip = landmarks[8]
      const x = indexTip.x * canvas.width
      const y = indexTip.y * canvas.height

      // Draw only when index finger is up (1 finger)
      if (fingers === 1) {
        if (lastPositionRef.current) {
          drawCtx.strokeStyle = '#000'
          drawCtx.lineWidth = 4
          drawCtx.lineCap = 'round'
          drawCtx.lineJoin = 'round'
          drawCtx.beginPath()
          drawCtx.moveTo(lastPositionRef.current.x, lastPositionRef.current.y)
          drawCtx.lineTo(x, y)
          drawCtx.stroke()
        }
        lastPositionRef.current = { x, y }
      } else {
        lastPositionRef.current = null
      }
    } else {
      setGesture('')
      lastPositionRef.current = null
    }

    ctx.restore()
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
          {gesture && <div style={{ marginTop: 8, color: '#667eea' }}>👆 {gesture}</div>}
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
              display: 'none'
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
            <div style={{ padding: 16, background: 'var(--background)', borderRadius: 12 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📹</div>
              <h4 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>1. Start Camera</h4>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                Click "Start Camera" and allow camera access
              </p>
            </div>
            
            <div style={{ padding: 16, background: 'var(--background)', borderRadius: 12 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✋</div>
              <h4 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>2. Show Your Hand</h4>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                Position your hand clearly in front of the camera
              </p>
            </div>
            
            <div style={{ padding: 16, background: 'var(--background)', borderRadius: 12 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👆</div>
              <h4 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>3. Draw with 1 Finger</h4>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                Point with your index finger to draw on the canvas
              </p>
            </div>
            
            <div style={{ padding: 16, background: 'var(--background)', borderRadius: 12 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✌️</div>
              <h4 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>4. Stop Drawing</h4>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                Show 2+ fingers or close your hand to stop drawing
              </p>
            </div>
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
