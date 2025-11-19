import React, { useState, useRef, useEffect } from 'react'
import { apiUrl } from '../lib/api'
import Page from '../components/layout/Page'

export default function Attendance() {
  const [enrollName, setEnrollName] = useState('')
  const [enrollPhoto, setEnrollPhoto] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [enrolledUsers, setEnrolledUsers] = useState([])
  const [recognizedUser, setRecognizedUser] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const overlayRef = useRef(null)
  const streamRef = useRef(null)
  const scanIntervalRef = useRef(null)
  const cameraContainerRef = useRef(null)

  useEffect(() => {
    loadEnrolledUsers()
  }, [])

  useEffect(() => {
    if (scanning) {
      startCamera()
      // Scroll camera into view
      setTimeout(() => {
        cameraContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [scanning])

  const loadEnrolledUsers = async () => {
    try {
      const res = await fetch(apiUrl('/api/attendance/enrolled'))
      const data = await res.json()
      if (data.ok) {
        setEnrolledUsers(data.users || [])
        console.log('Loaded users:', data.users)
      }
    } catch (e) {
      console.error('Failed to load users:', e)
    }
  }

  const startCamera = async () => {
    try {
      console.log('Starting camera...')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false
      })
      
      console.log('Got stream:', stream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded')
          videoRef.current.play().then(() => {
            console.log('Video playing')
            setTimeout(() => {
              scanIntervalRef.current = setInterval(() => {
                captureAndRecognize()
              }, 2000)
            }, 1000)
          }).catch(err => {
            console.error('Play failed:', err)
            setError('Failed to play video: ' + err.message)
          })
        }
      }
    } catch (e) {
      console.error('Camera error:', e)
      setError('Camera access denied: ' + e.message)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    setRecognizedUser(null)
    clearOverlay()
  }

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    
    canvas.toBlob(async (blob) => {
      if (!blob) return
      
      const formData = new FormData()
      formData.append('photo', blob, 'frame.jpg')
      
      try {
        const res = await fetch(apiUrl('/api/attendance/recognize'), {
          method: 'POST',
          body: formData
        })
        const data = await res.json()
        
        if (data.recognized && data.match) {
          const user = data.match
          setRecognizedUser({
            name: user.name,
            confidence: (user.similarity * 100).toFixed(0)
          })
          drawRecognizedFace(user.name, user.similarity)
          
          if (data.attendance_marked) {
            setMessage(`✅ ${user.name} - Attendance Marked at ${new Date().toLocaleTimeString()}`)
          }
        } else {
          setRecognizedUser(null)
          drawScanningMessage()
        }
      } catch (e) {
        console.error('Recognition error:', e)
      }
    }, 'image/jpeg', 0.85)
  }

  const drawRecognizedFace = (name, similarity) => {
    const overlay = overlayRef.current
    const video = videoRef.current
    if (!overlay || !video) return
    
    overlay.width = video.videoWidth
    overlay.height = video.videoHeight
    
    const ctx = overlay.getContext('2d')
    ctx.clearRect(0, 0, overlay.width, overlay.height)
    
    // Green border
    ctx.strokeStyle = '#4CAF50'
    ctx.lineWidth = 8
    ctx.strokeRect(4, 4, overlay.width - 8, overlay.height - 8)
    
    // Name box at top
    const centerX = overlay.width / 2
    const topY = 60
    
    ctx.fillStyle = '#4CAF50'
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.roundRect(centerX - 140, topY - 45, 280, 75, 12)
    ctx.fill()
    ctx.shadowBlur = 0
    
    ctx.fillStyle = 'white'
    ctx.font = 'bold 32px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(name.toUpperCase(), centerX, topY - 10)
    
    ctx.font = 'bold 18px Arial'
    ctx.fillText(`✓ ${(similarity * 100).toFixed(0)}% Match`, centerX, topY + 15)
    
    // Present box at bottom
    ctx.fillStyle = '#4CAF50'
    ctx.beginPath()
    ctx.roundRect(centerX - 90, overlay.height - 100, 180, 55, 10)
    ctx.fill()
    
    ctx.fillStyle = 'white'
    ctx.font = 'bold 24px Arial'
    ctx.fillText('✓ PRESENT', centerX, overlay.height - 70)
  }

  const drawScanningMessage = () => {
    const overlay = overlayRef.current
    if (!overlay) return
    
    const ctx = overlay.getContext('2d')
    ctx.clearRect(0, 0, overlay.width, overlay.height)
    
    const centerX = overlay.width / 2
    const centerY = overlay.height / 2
    
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.roundRect(centerX - 150, centerY - 40, 300, 80, 10)
    ctx.fill()
    
    ctx.fillStyle = '#333'
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('🔍 Scanning...', centerX, centerY)
  }

  const clearOverlay = () => {
    const overlay = overlayRef.current
    if (overlay) {
      const ctx = overlay.getContext('2d')
      ctx.clearRect(0, 0, overlay.width, overlay.height)
    }
  }

  const handleEnroll = async (e) => {
    e.preventDefault()
    if (!enrollName.trim() || !enrollPhoto) return
    
    setError('')
    setMessage('')
    
    const formData = new FormData()
    formData.append('name', enrollName.trim())
    formData.append('photo', enrollPhoto)
    
    try {
      const res = await fetch(apiUrl('/api/attendance/enroll'), {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (data.ok) {
        setMessage(`✅ ${data.enrolled.name} enrolled successfully!`)
        setEnrollName('')
        setEnrollPhoto(null)
        await loadEnrolledUsers()
      } else {
        setError(data.error || 'Enrollment failed')
      }
    } catch (e) {
      setError('Failed to enroll: ' + e.message)
    }
  }

  return (
    <Page title="🎯 Smart Attendance" description="AI Facial Recognition Attendance System">
      
      {/* Stats */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: 32,
        borderRadius: 16,
        marginBottom: 24,
        color: 'white',
        boxShadow: '0 10px 40px rgba(102, 126, 234, 0.4)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 700 }}>{enrolledUsers.length}</div>
            <div style={{ fontSize: 15, opacity: 0.95 }}>👥 Enrolled Users</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 700 }}>
              {recognizedUser ? '✓' : '—'}
            </div>
            <div style={{ fontSize: 15, opacity: 0.95 }}>🔍 Face Detection</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 700 }}>
              {scanning ? '🟢' : '🔴'}
            </div>
            <div style={{ fontSize: 15, opacity: 0.95 }}>📹 Camera Status</div>
          </div>
        </div>
      </div>

      {/* Live Camera */}
      <div 
        ref={cameraContainerRef}
        style={{ 
        marginBottom: 24,
        padding: 32,
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        borderRadius: 16,
        boxShadow: '0 10px 40px rgba(240, 147, 251, 0.4)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', color: 'white', fontSize: 26, fontWeight: 700 }}>
              📹 Live Face Recognition
            </h3>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.95)', fontSize: 15 }}>
              Automatic attendance with real-time face detection
            </p>
          </div>
          <button 
            onClick={() => setScanning(!scanning)}
            style={{
              background: scanning ? '#f44336' : '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '16px 32px',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            {scanning ? '⏹ Stop Camera' : '▶ Start Recognition'}
          </button>
        </div>

        {scanning && (
          <div>
            <div style={{ position: 'relative', background: '#000', borderRadius: 16, overflow: 'hidden' }}>
              <video 
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: 'auto',
                  minHeight: 400,
                  maxHeight: 500,
                  display: 'block'
                }}
              />
              <canvas 
                ref={overlayRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none'
                }}
              />
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            <div style={{
              marginTop: 16,
              padding: 20,
              background: recognizedUser ? '#4CAF50' : 'rgba(255,255,255,0.95)',
              color: recognizedUser ? 'white' : '#333',
              borderRadius: 12,
              textAlign: 'center',
              fontSize: 17,
              fontWeight: 700
            }}>
              {recognizedUser ? (
                `✅ ${recognizedUser.name} DETECTED - ${recognizedUser.confidence}% Match - PRESENT`
              ) : (
                '🔍 Scanning for faces...'
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enroll Section */}
      <div style={{
        marginBottom: 24,
        padding: 32,
        background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        borderRadius: 16,
        boxShadow: '0 10px 40px rgba(168, 237, 234, 0.4)'
      }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 26, fontWeight: 700 }}>
          ➕ Enroll New User
        </h3>
        <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: 15 }}>
          Register a person for automatic face recognition
        </p>
        
        <form onSubmit={handleEnroll} style={{ maxWidth: 600 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Full Name</label>
            <input 
              type="text"
              placeholder="Enter full name"
              value={enrollName}
              onChange={e => setEnrollName(e.target.value)}
              style={{
                width: '100%',
                padding: 14,
                fontSize: 16,
                border: '2px solid #ddd',
                borderRadius: 8
              }}
            />
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Face Photo</label>
            <input 
              type="file"
              accept="image/*"
              onChange={e => setEnrollPhoto(e.target.files[0])}
              style={{
                width: '100%',
                padding: 14,
                fontSize: 16,
                border: '2px solid #ddd',
                borderRadius: 8
              }}
            />
          </div>
          
          <button 
            type="submit"
            disabled={!enrollName.trim() || !enrollPhoto}
            style={{
              width: '100%',
              padding: 16,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 17,
              fontWeight: 700,
              cursor: enrollName.trim() && enrollPhoto ? 'pointer' : 'not-allowed',
              opacity: enrollName.trim() && enrollPhoto ? 1 : 0.5
            }}
          >
            ✅ Enroll User
          </button>
        </form>
      </div>

      {/* Enrolled Users */}
      {enrolledUsers.length > 0 && (
        <div style={{
          padding: 32,
          background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
          borderRadius: 16,
          boxShadow: '0 10px 40px rgba(255, 236, 210, 0.4)'
        }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: 26, fontWeight: 700 }}>
            👥 Enrolled Users ({enrolledUsers.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {enrolledUsers.map((user, i) => (
              <div 
                key={i}
                style={{
                  padding: 20,
                  background: 'white',
                  borderRadius: 12,
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: '#667eea',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  fontWeight: 700,
                  margin: '0 auto 12px'
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{user.name}</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  ID: {user.id.substring(0, 8)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div style={{
          marginTop: 16,
          padding: 16,
          background: '#4CAF50',
          color: 'white',
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 600
        }}>
          {message}
        </div>
      )}
      
      {error && (
        <div style={{
          marginTop: 16,
          padding: 16,
          background: '#f44336',
          color: 'white',
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 600
        }}>
          ❌ {error}
        </div>
      )}
    </Page>
  )
}
