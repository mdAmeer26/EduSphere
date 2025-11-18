import React, { useState, useRef, useEffect } from 'react'
import { apiUrl } from '../lib/api'
import Page from '../components/layout/Page'
import Button from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import Dropzone from '../components/ui/Dropzone'
import Loader from '../components/ui/Loader'
import ErrorNote from '../components/ui/ErrorNote'

export default function Attendance() {
  const [name, setName] = useState('')
  const [enrollPhoto, setEnrollPhoto] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [autoMode, setAutoMode] = useState(false)
  const [monthlyStats, setMonthlyStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    loadAnalytics()
    loadMonthlyStats()
  }, [])

  useEffect(() => {
    if (autoMode) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [autoMode])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
    } catch (e) {
      setError('Camera access denied')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    
    canvas.toBlob(async (blob) => {
      if (!blob) return
      
      setLoading(true)
      setError('')
      const form = new FormData()
      form.append('photo', blob, 'capture.jpg')
      
      try {
        const res = await fetch(apiUrl('/api/attendance/recognize'), { method: 'POST', body: form })
        const data = await res.json()
        
        if (data.recognized) {
          setResult({
            type: 'auto_recognition',
            name: data.match.name,
            similarity: data.match.similarity,
            message: data.message,
            attendance_marked: data.attendance_marked
          })
          await loadAnalytics()
          await loadMonthlyStats()
        }
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }, 'image/jpeg', 0.9)
  }

  useEffect(() => {
    if (autoMode && !loading) {
      const interval = setInterval(() => {
        captureAndRecognize()
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [autoMode, loading])

  const enroll = async (e) => {
    e.preventDefault()
    if (!name.trim() || !enrollPhoto) return
    
    setLoading(true)
    setResult(null)
    setError('')
    const form = new FormData()
    form.append('name', name)
    form.append('photo', enrollPhoto)
    
    try {
      const res = await fetch(apiUrl('/api/attendance/enroll'), { method: 'POST', body: form })
      const data = await res.json()
      setResult({ type: 'enroll', data })
      setName('')
      setEnrollPhoto(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const loadMonthlyStats = async () => {
    try {
      const res = await fetch(apiUrl('/api/attendance/monthly-stats'))
      const data = await res.json()
      setMonthlyStats(data)
    } catch (e) {
      console.error('Failed to load monthly stats:', e)
    }
  }

  const loadAnalytics = async () => {
    try {
      const res = await fetch(apiUrl('/api/attendance/analytics'))
      const data = await res.json()
      setAnalytics(data)
    } catch (e) {
      console.error('Failed to load analytics:', e)
    }
  }

  return (
    <Page title="Smart Attendance - Auto Recognition" description="AI-powered facial recognition attendance">
      
      {/* Auto Recognition Mode */}
      <div style={{ marginBottom: 24, padding: 20, background: 'var(--background-secondary)', borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>🎥 Automatic Recognition</h3>
          <Button onClick={() => setAutoMode(!autoMode)} style={{ background: autoMode ? '#f44336' : '#4CAF50' }}>
            {autoMode ? '⏸ Stop' : '▶ Start Auto Mode'}
          </Button>
        </div>
        {autoMode && (
          <div style={{ position: 'relative' }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxWidth: 640, borderRadius: 8, border: '3px solid #4CAF50' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={{ marginTop: 12, padding: 12, background: '#4CAF50', color: 'white', borderRadius: 6, textAlign: 'center' }}>
              🔍 Scanning... Stand in front of camera to mark attendance!
            </div>
          </div>
        )}
        {result && result.type === 'auto_recognition' && (
          <div style={{ marginTop: 16, padding: 16, background: '#4CAF50', color: 'white', borderRadius: 8 }}>
            <h4 style={{ margin: '0 0 8px 0' }}>✅ {result.message}</h4>
            <p style={{ margin: 0 }}>Confidence: {(result.similarity * 100).toFixed(1)}%</p>
          </div>
        )}
      </div>

      {/* Enroll */}
      <div style={{ marginBottom: 24, padding: 20, background: 'var(--background-secondary)', borderRadius: 12 }}>
        <h3>👤 Enroll New Person</h3>
        <form onSubmit={enroll} style={{ display: 'grid', gap: 12, maxWidth: 500 }}>
          <Field label="Name"><Input placeholder="Enter name" value={name} onChange={e => setName(e.target.value)} /></Field>
          <Dropzone accept="image/*" onFiles={(files) => setEnrollPhoto(files[0])}>
            {enrollPhoto ? `Selected: ${enrollPhoto.name}` : 'Drop face photo'}
          </Dropzone>
          <Button type="submit" loading={loading} disabled={!name.trim() || !enrollPhoto}>Enroll</Button>
        </form>
      </div>

      {/* Monthly Stats */}
      {monthlyStats && monthlyStats.ok && (
        <div style={{ marginBottom: 24, padding: 20, background: 'var(--background-secondary)', borderRadius: 12 }}>
          <h3>📊 Monthly Report - {monthlyStats.month}/{monthlyStats.year}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div style={{ padding: 16, background: '#2196F3', color: 'white', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold' }}>{monthlyStats.total_records}</div>
              <div>Total Records</div>
            </div>
            <div style={{ padding: 16, background: '#4CAF50', color: 'white', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold' }}>{monthlyStats.unique_people}</div>
              <div>People</div>
            </div>
            <div style={{ padding: 16, background: '#FF9800', color: 'white', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold' }}>{monthlyStats.average_attendance}</div>
              <div>Avg</div>
            </div>
          </div>
          <div style={{ padding: 20, background: '#4CAF50', color: 'white', borderRadius: 8, marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 8px 0' }}>🏆 Most Present: {monthlyStats.most_present.name}</h4>
            <p style={{ margin: 0, fontSize: 24 }}>Days: {monthlyStats.most_present.count}</p>
          </div>
          {/* Bar Chart */}
          <div style={{ background: 'white', padding: 20, borderRadius: 8 }}>
            <h4 style={{ margin: '0 0 16px 0', color: '#333' }}>Attendance by Person</h4>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 250 }}>
              {monthlyStats.graph_data.labels.map((label, idx) => {
                const value = monthlyStats.graph_data.values[idx]
                const maxValue = Math.max(...monthlyStats.graph_data.values)
                const height = (value / maxValue) * 100
                const color = monthlyStats.graph_data.colors[idx % monthlyStats.graph_data.colors.length]
                return (
                  <div key={idx} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{ width: '100%', height: `${height}%`, background: color, borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 8, color: 'white', fontWeight: 'bold' }}>
                        {value}
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#666', wordBreak: 'break-word' }}>{label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Analytics */}
      {analytics && analytics.ok && (
        <div style={{ padding: 20, background: 'var(--background-secondary)', borderRadius: 12 }}>
          <h3>📈 Analytics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={{ padding: 16, background: '#673AB7', color: 'white', borderRadius: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{analytics.enrolled_faces}</div>
              <div>Enrolled</div>
            </div>
            <div style={{ padding: 16, background: '#00BCD4', color: 'white', borderRadius: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{analytics.automatic_checkins}</div>
              <div>Auto Check-ins</div>
            </div>
            <div style={{ padding: 16, background: '#E91E63', color: 'white', borderRadius: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{analytics.manual_checkins}</div>
              <div>Manual</div>
            </div>
            <div style={{ padding: 16, background: '#FFEB3B', color: '#333', borderRadius: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{analytics.recent_activity}</div>
              <div>Recent (7d)</div>
            </div>
          </div>
        </div>
      )}

      {loading && !autoMode && <div style={{ marginTop: 12 }}><Loader label="Processing..." /></div>}
      {error && <div style={{ marginTop: 12 }}><ErrorNote message={error} /></div>}
      {result && result.type === 'enroll' && (
        <div style={{ marginTop: 12, padding: 16, background: '#4CAF50', color: 'white', borderRadius: 8 }}>
          ✅ Enrolled: {result.data.enrolled?.name}
        </div>
      )}
    </Page>
  )
}
