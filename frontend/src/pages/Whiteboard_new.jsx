import { useState, useRef, useEffect } from 'react'
import Page from '../components/layout/Page'
import { apiUrl } from '../lib/api'

export default function Whiteboard() {
  const canvasRef = useRef(null)
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(4)
  const [isDrawing, setIsDrawing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState(null)
  const [error, setError] = useState('')
  const [textInput, setTextInput] = useState('')
  const [questionType, setQuestionType] = useState('auto')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    
    // Set canvas size
    canvas.width = 1800
    canvas.height = 900
    
    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const localPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    
    // Calculate scale factors
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = localPos(e)
    
    setIsDrawing(true)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (e) => {
    if (!isDrawing) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = localPos(e)
    
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setAnswer(null)
    setError('')
  }

  const solveDrawing = async () => {
    setLoading(true)
    setError('')
    
    const canvas = canvasRef.current
    const imageBlob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png')
    })

    const formData = new FormData()
    formData.append('image', imageBlob, 'drawing.png')
    formData.append('type', questionType)
    formData.append('show_steps', 'true')

    try {
      const res = await fetch(apiUrl('/api/whiteboard/solve-drawing'), {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      setAnswer(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const solveText = async () => {
    if (!textInput.trim()) return
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch(apiUrl('/api/whiteboard/solve-text'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          problem: textInput, 
          type: questionType,
          show_steps: true 
        })
      })
      const data = await res.json()
      setAnswer(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page title="🎨 Advanced Whiteboard" description="Professional canvas for solving any question">
      <div style={{ 
        display: 'flex',
        height: 'calc(100vh - 140px)',
        gap: '16px',
        overflow: 'hidden'
      }}>
          {/* Left Panel - Canvas and Controls */}
          <div style={{
            flex: '1 1 65%',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: 0
          }}>
            {/* Toolbar */}
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              alignItems: 'center',
              padding: '10px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              flexShrink: 0
            }}>
              {/* Pen Button */}
              <button
                onClick={() => {
                  setTool('pen')
                  setColor('#000000')
                  setLineWidth(4)
                }}
                style={{
                  padding: '10px 16px',
                  background: tool === 'pen' ? '#10b981' : 'white',
                  color: tool === 'pen' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                  boxShadow: tool === 'pen' ? '0 4px 12px rgba(16, 185, 129, 0.4)' : '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                🖊️ Pen
              </button>

              {/* Marker Button */}
              <button
                onClick={() => {
                  setTool('marker')
                  setColor('#000000')
                  setLineWidth(8)
                }}
                style={{
                  padding: '10px 16px',
                  background: tool === 'marker' ? '#10b981' : 'white',
                  color: tool === 'marker' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                  boxShadow: tool === 'marker' ? '0 4px 12px rgba(16, 185, 129, 0.4)' : '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                🖍️ Marker
              </button>

              {/* Eraser Button */}
              <button
                onClick={() => {
                  setTool('eraser')
                  setColor('#ffffff')
                  setLineWidth(20)
                }}
                style={{
                  padding: '10px 16px',
                  background: tool === 'eraser' ? '#ef4444' : 'white',
                  color: tool === 'eraser' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                  boxShadow: tool === 'eraser' ? '0 4px 12px rgba(239, 68, 68, 0.4)' : '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                🧹 Eraser
              </button>

              {/* Clear Button */}
              <button
                onClick={clearCanvas}
                style={{
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #f43f5e 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
                  transition: 'all 0.2s'
                }}
              >
                🗑️ Clear
              </button>

              {/* Solve Drawing Button */}
              <button
                onClick={solveDrawing}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: loading ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  fontSize: '14px',
                  boxShadow: loading ? 'none' : '0 6px 20px rgba(16, 185, 129, 0.5)',
                  transition: 'all 0.2s',
                  marginLeft: 'auto'
                }}
              >
                {loading ? '⏳ Solving...' : '✨ SOLVE'}
              </button>
            </div>

            {/* Canvas Container */}
            <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{
                  border: '3px solid #8b5cf6',
                  borderRadius: '12px',
                  cursor: 'crosshair',
                  boxShadow: '0 8px 24px rgba(139, 92, 246, 0.25)',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  width: '100%',
                  height: '100%'
                }}
              />
              
              {/* Watermark */}
              {!answer && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '48px',
                  fontWeight: '800',
                  color: 'rgba(139, 92, 246, 0.08)',
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}>
                  Draw Here
                </div>
              )}
            </div>

            {/* Text Input */}
            <div style={{
              background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
              padding: '14px',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(139, 92, 246, 0.25)',
              flexShrink: 0
            }}>
              <label style={{ 
                display: 'block',
                marginBottom: '8px',
                fontWeight: '700',
                color: 'white',
                fontSize: '13px'
              }}>
                ✍️ Or Type Your Question:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="e.g., Pythagorean theorem, capital of India, what is H2O"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && textInput.trim()) {
                      solveText()
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    background: 'rgba(255,255,255,0.95)',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={solveText}
                  disabled={loading || !textInput.trim()}
                  style={{
                    padding: '10px 20px',
                    background: loading || !textInput.trim() ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading || !textInput.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '13px',
                    boxShadow: loading || !textInput.trim() ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.4)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {loading ? '⏳' : '✨ Solve'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Permanent Solution Display */}
          <div style={{
            flex: '0 0 400px',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(168, 237, 234, 0.3)',
            padding: '20px',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#0f766e', fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>📊</span> Solution Panel
            </h3>
            
            {loading && (
              <div style={{
                padding: '40px 20px',
                background: 'white',
                borderRadius: '10px',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>⏳</div>
                <div style={{ color: '#0f766e', fontWeight: '600', fontSize: '15px' }}>Processing...</div>
                <div style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>Using advanced AI recognition</div>
              </div>
            )}

            {error && !loading && (
              <div style={{
                padding: '20px',
                background: 'white',
                borderRadius: '10px',
                border: '2px solid #fecaca',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
                <div style={{ color: '#dc2626', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Error Occurred</div>
                <div style={{ color: '#dc2626', fontSize: '12px' }}>{error}</div>
              </div>
            )}

            {!loading && !error && !answer && (
              <div style={{
                padding: '30px 20px',
                background: 'white',
                borderRadius: '10px',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '12px' }}>🎯</div>
                <div style={{ color: '#0f766e', fontWeight: '600', fontSize: '15px', marginBottom: '8px' }}>Ready to Solve!</div>
                <div style={{ color: '#64748b', fontSize: '12px', lineHeight: '1.6' }}>
                  Draw a shape or equation on the canvas,<br/>
                  or type your question below.<br/><br/>
                  <strong style={{ color: '#0f766e' }}>I can solve:</strong><br/>
                  📐 Math & Geometry<br/>
                  🔬 Science & Physics<br/>
                  🌍 General Knowledge<br/>
                  💻 Programming & More
                </div>
              </div>
            )}

            {!loading && !error && answer && (
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '12px',
                  paddingBottom: '12px',
                  borderBottom: '2px solid #f0fdfa'
                }}>
                  <span style={{ fontSize: '24px' }}>✅</span>
                  <span style={{ color: '#0f766e', fontWeight: '700', fontSize: '14px' }}>SOLUTION</span>
                </div>
                
                <div style={{ 
                  fontSize: '22px', 
                  fontWeight: '700', 
                  color: '#0f766e', 
                  marginBottom: '16px',
                  lineHeight: '1.4',
                  wordWrap: 'break-word'
                }}>
                  {answer.result || answer.answer || answer.primary_answer}
                </div>

                {answer.answer && answer.answer !== answer.result && (
                  <div style={{ 
                    background: '#f0fdfa', 
                    padding: '14px', 
                    borderRadius: '8px',
                    marginBottom: '12px',
                    color: '#0f766e',
                    fontSize: '13px',
                    lineHeight: '1.6'
                  }}>
                    {answer.answer}
                  </div>
                )}
                
                {answer.steps && Array.isArray(answer.steps) && answer.steps.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      marginBottom: '10px'
                    }}>
                      <span style={{ fontSize: '18px' }}>📝</span>
                      <strong style={{ color: '#0f766e', fontSize: '13px' }}>Step-by-Step:</strong>
                    </div>
                    <ol style={{ 
                      margin: '0', 
                      paddingLeft: '20px', 
                      color: '#374151', 
                      fontSize: '12px',
                      lineHeight: '1.8'
                    }}>
                      {answer.steps.map((step, i) => (
                        <li key={i} style={{ margin: '6px 0' }}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {answer.solutions && Array.isArray(answer.solutions) && answer.solutions.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      marginBottom: '10px'
                    }}>
                      <span style={{ fontSize: '18px' }}>🔢</span>
                      <strong style={{ color: '#0f766e', fontSize: '13px' }}>All Solutions:</strong>
                    </div>
                    {answer.solutions.map((sol, i) => (
                      <div key={i} style={{ 
                        marginTop: '8px', 
                        padding: '12px', 
                        background: '#f0fdfa', 
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontWeight: '600', color: '#0f766e', fontSize: '11px', marginBottom: '4px' }}>
                          Expression {i + 1}:
                        </div>
                        <div style={{ color: '#374151', fontSize: '13px', fontWeight: '500' }}>
                          {sol.result}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {answer.category && (
                  <div style={{ 
                    marginTop: '16px',
                    padding: '10px',
                    background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#1e40af',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    📚 {answer.category}
                  </div>
                )}

                {answer.tip && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '12px', 
                    background: 'rgba(14, 165, 233, 0.1)', 
                    borderRadius: '6px', 
                    color: '#0369a1', 
                    fontSize: '11px',
                    lineHeight: '1.5'
                  }}>
                    💡 <strong>Tip:</strong> {answer.tip}
                  </div>
                )}
              </div>
            )}
          </div>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Page>
  )
}
