import React, { useEffect, useRef, useState } from 'react'
import { apiUrl } from '../lib/api'
import Page from '../components/layout/Page'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import ErrorNote from '../components/ui/ErrorNote'

export default function Whiteboard() {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [color, setColor] = useState('#000000')
  const [width, setWidth] = useState(4)
  const [tool, setTool] = useState('pen')
  const [answer, setAnswer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [aiAssist, setAiAssist] = useState('')
  const [sessionId] = useState(() => `whiteboard_${Date.now()}`)
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [solveMode, setSolveMode] = useState('auto') // auto, algebra, calculus, geometry

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = 900
    canvas.height = 500
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0,0,canvas.width, canvas.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const start = (e) => {
    setDrawing(true)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    const { x, y } = localPos(e)
    ctx.moveTo(x, y)
  }
  const move = (e) => {
    if (!drawing) return
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = localPos(e)
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.lineTo(x, y)
    ctx.stroke()
  }
  const end = () => setDrawing(false)

  const localPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const clear = () => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0,0,canvasRef.current.width, canvasRef.current.height)
  }

  const solve = async () => {
    setLoading(true)
    setAnswer(null)
    setError('')
    canvasRef.current.toBlob(async (blob) => {
      try {
        const form = new FormData()
        form.append('image', new File([blob], 'board.png', { type: 'image/png' }))
        const res = await fetch(apiUrl('/api/whiteboard/solve'), { method: 'POST', body: form })
        const data = await res.json()
        if (data.error) {
          setError(data.error)
        } else {
          setAnswer(data)
        }
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    })
  }

  const solveText = async () => {
    if (!textInput.trim()) return
    setLoading(true)
    setAnswer(null)
    setError('')
    try {
      const res = await fetch(apiUrl('/api/whiteboard/solve-text'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          problem: textInput, 
          type: solveMode,
          show_steps: true 
        })
      })
      const data = await res.json()
      if (data.ok) {
        setAnswer(data)
      } else {
        setError('Failed to solve')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const getAIHelp = async (prompt) => {
    try {
      const res = await fetch(apiUrl('/api/whiteboard/ai-assist'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context: '' })
      })
      const data = await res.json()
      setAiAssist(data)
    } catch (e) {
      console.error('AI assist failed:', e)
    }
  }

  return (
    <Page title="Whiteboard – AI-Powered Drawing & Problem Solving" description="Draw, solve math, get AI assistance">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Drawing Tools */}
        <div style={{ 
          padding: 16, 
          background: 'var(--background-secondary)', 
          borderRadius: 12, 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 12, 
          alignItems: 'center' 
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>Tool:</strong>
            <select value={tool} onChange={e => setTool(e.target.value)} style={{padding:'6px 12px', borderRadius: 6, border: '1px solid var(--border)'}}>
              <option value="pen">✏️ Pen</option>
              <option value="marker">🖊️ Marker</option>
              <option value="highlighter">✨ Highlighter</option>
              <option value="eraser">🧹 Eraser</option>
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>Color:</strong>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{width: 50, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer'}} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>Width:</strong>
            <input className="input" type="number" value={width} min={1} max={20} onChange={e => setWidth(Number(e.target.value))} style={{ width: 80 }} />
          </label>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={clear} variant="ghost">🗑️ Clear</Button>
            <Button onClick={solve} loading={loading}>🧮 Solve from Drawing</Button>
            <Button onClick={() => setShowTextInput(!showTextInput)} variant="outline">
              {showTextInput ? '✏️ Hide Input' : '⌨️ Type Problem'}
            </Button>
            <Button onClick={() => getAIHelp('help me')}>🤖 AI Help</Button>
          </div>
        </div>

        {/* Text Input Mode */}
        {showTextInput && (
          <div style={{ padding: 16, background: 'var(--background-secondary)', borderRadius: 12 }}>
            <h4 style={{ margin: '0 0 12px 0' }}>Type Your Problem</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="e.g., 2x + 5 = 15, integrate(x^2, x), What is 15% of 200?"
                style={{ 
                  padding: 12, 
                  borderRadius: 8, 
                  border: '1px solid var(--border)', 
                  minHeight: 80,
                  fontFamily: 'monospace',
                  fontSize: 14,
                  resize: 'vertical'
                }}
              />
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong>Type:</strong>
                  <select value={solveMode} onChange={e => setSolveMode(e.target.value)} style={{padding:'6px 12px', borderRadius: 6, border: '1px solid var(--border)'}}>
                    <option value="auto">🔍 Auto Detect</option>
                    <option value="algebra">📐 Algebra</option>
                    <option value="calculus">📊 Calculus</option>
                    <option value="geometry">📏 Geometry</option>
                    <option value="word_problem">📝 Word Problem</option>
                  </select>
                </label>
                <Button onClick={solveText} loading={loading}>✨ Solve</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div style={{ marginTop: 16 }}>
        <canvas
          ref={canvasRef}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
          style={{ 
            border: '2px solid var(--border)', 
            borderRadius: 12, 
            touchAction: 'none', 
            background: '#fff', 
            maxWidth:'100%', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            cursor: tool === 'eraser' ? 'crosshair' : 'default'
          }}
        />
      </div>

      {/* Results */}
      {loading && <div style={{ marginTop:20 }}><Loader label="🧠 Solving..." /></div>}
      {error && <div style={{ marginTop:20 }}><ErrorNote message={error} /></div>}
      
      {/* AI Assistant */}
      {aiAssist && aiAssist.ok && (
        <div style={{ marginTop:20, padding:20, background:'linear-gradient(135deg, #667eea22 0%, #764ba222 100%)', borderRadius:12, border: '2px solid #667eea' }}>
          <h4 style={{margin:'0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8}}>
            🤖 AI Assistant
          </h4>
          {aiAssist.message && <p style={{marginBottom: 12}}>{aiAssist.message}</p>}
          {aiAssist.suggestions && (
            <div>
              <strong>💡 Suggestions:</strong>
              <ul style={{marginTop: 8}}>{aiAssist.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {/* Solution Display */}
      {answer && (
        <div style={{ marginTop:20 }}>
          {/* Error/Tip Display */}
          {answer.error && (
            <div style={{
              padding: 20, 
              background: '#fff3cd', 
              border: '2px solid #ffc107',
              color: '#856404', 
              borderRadius: 12, 
              marginBottom: 16
            }}>
              <div style={{fontSize: 16, fontWeight: 600, marginBottom: 8}}>⚠️ {answer.error}</div>
              {answer.tip && <div style={{fontSize: 14, marginTop: 8}}>💡 Tip: {answer.tip}</div>}
              {answer.sympy_error && (
                <details style={{marginTop: 8}}>
                  <summary style={{cursor: 'pointer', fontSize: 13}}>Debug info</summary>
                  <pre style={{fontSize: 12, marginTop: 4, whiteSpace: 'pre-wrap'}}>{answer.sympy_error}</pre>
                </details>
              )}
            </div>
          )}

          {/* Primary Answer */}
          {(answer.result || answer.answer || answer.primary_answer) && !answer.error && (
            <div style={{
              padding: 24, 
              background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)', 
              color: 'white', 
              borderRadius: 12, 
              marginBottom: 16,
              boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)'
            }}>
              <div style={{fontSize: 18, fontWeight: 600, marginBottom: 8}}>✅ Solution</div>
              <div style={{fontSize: 28, fontWeight: 700}}>
                {JSON.stringify(answer.result || answer.answer || answer.primary_answer)}
              </div>
              {answer.type && <div style={{marginTop: 8, opacity: 0.9, fontSize: 14}}>Type: {answer.type}</div>}
              {answer.method && <div style={{opacity: 0.9, fontSize: 14}}>Method: {answer.method}</div>}
            </div>
          )}

          {/* Steps */}
          {answer.steps && answer.steps.length > 0 && (
            <div style={{
              padding: 20, 
              background: 'var(--background-secondary)', 
              borderRadius: 12, 
              marginBottom: 16
            }}>
              <h4 style={{margin: '0 0 12px 0'}}>📝 Step-by-Step Solution</h4>
              <ol style={{margin: 0, paddingLeft: 24}}>
                {answer.steps.map((step, i) => (
                  <li key={i} style={{marginBottom: 8, fontSize: 15}}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Multiple Solutions */}
          {answer.solutions && answer.solutions.length > 0 && (
            <div style={{marginBottom: 16}}>
              <h4 style={{margin: '0 0 12px 0'}}>🔢 Solutions Found: {answer.expressions_found}</h4>
              <div style={{display: 'grid', gap: 12}}>
                {answer.solutions.map((sol, i) => (
                  <div key={i} style={{
                    padding: 16, 
                    background: 'var(--background-secondary)', 
                    borderRadius: 8,
                    borderLeft: '4px solid #667eea'
                  }}>
                    <div style={{fontWeight: 600, marginBottom: 4}}>{sol.expression}</div>
                    <div style={{fontSize: 20, color: '#4CAF50'}}>= {sol.result}</div>
                    {sol.steps && (
                      <details style={{marginTop: 8}}>
                        <summary style={{cursor: 'pointer', color: '#667eea'}}>Show steps</summary>
                        <ul style={{marginTop: 8, paddingLeft: 20}}>
                          {sol.steps.map((s, j) => <li key={j}>{s}</li>)}
                        </ul>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expression Info */}
          {answer.expression && !answer.solutions && (
            <div style={{
              padding: 16, 
              background: 'var(--background-secondary)', 
              borderRadius: 8,
              marginBottom: 16
            }}>
              <strong>📐 Expression:</strong> <code style={{fontSize: 16, marginLeft: 8}}>{answer.expression}</code>
            </div>
          )}

          {/* Problem */}
          {answer.problem && (
            <div style={{
              padding: 16, 
              background: 'var(--background-secondary)', 
              borderRadius: 8,
              marginBottom: 16
            }}>
              <strong>❓ Problem:</strong>
              <div style={{marginTop: 8, fontSize: 15}}>{answer.problem}</div>
            </div>
          )}

          {/* AI Solution Text */}
          {answer.solution && (
            <div style={{
              padding: 16, 
              background: 'var(--background-secondary)', 
              borderRadius: 8,
              marginBottom: 16
            }}>
              <strong>💡 AI Solution:</strong>
              <div style={{marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.6}}>{answer.solution}</div>
            </div>
          )}

          {/* OCR Text */}
          {answer.ocr && (
            <details style={{marginTop: 16}}>
              <summary style={{cursor: 'pointer', padding: 12, background: 'var(--background-secondary)', borderRadius: 8}}>
                📷 OCR Text Detected
              </summary>
              <pre style={{ 
                marginTop: 12, 
                padding: 16, 
                background: '#f5f5f5', 
                borderRadius: 8, 
                whiteSpace: 'pre-wrap',
                fontSize: 13,
                maxHeight: 200,
                overflow: 'auto'
              }}>{answer.ocr}</pre>
            </details>
          )}
        </div>
      )}
    </Page>
  )
}
