import React, { useState } from 'react'
import { apiUrl } from '../lib/api'
import Page from '../components/layout/Page'
import Button from '../components/ui/Button'
import { Field, Input, Textarea, Select } from '../components/ui/Field'
import Loader from '../components/ui/Loader'
import ErrorNote from '../components/ui/ErrorNote'

export default function Chart() {
  const [type, setType] = useState('pie')
  const [title, setTitle] = useState('')
  const [labels, setLabels] = useState('Product A, Product B, Product C')
  const [values, setValues] = useState('30, 45, 25')
  const [description, setDescription] = useState('Start -> Process -> Decision -> End')
  const [download, setDownload] = useState('')
  const [mermaid, setMermaid] = useState('')
  const [chartImage, setChartImage] = useState('')
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  // Canvas chart rendering functions with animations
  const drawPieChart = (canvas, data) => {
    const ctx = canvas.getContext('2d')
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 50
    
    const total = data.reduce((sum, val) => sum + val, 0)
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF9F80', '#C9CBCF']
    
    if (total === 0) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Animation variables
    let animationProgress = 0
    const animationDuration = 1500 // 1.5 seconds
    const startTime = Date.now()
    
    function animate() {
      const elapsed = Date.now() - startTime
      animationProgress = Math.min(elapsed / animationDuration, 1)
      
      // Easing function for smooth animation
      const easeProgress = 1 - Math.pow(1 - animationProgress, 3)
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      let currentAngle = -Math.PI / 2
      let totalDrawn = 0
      
      data.forEach((value, index) => {
        const sliceAngle = (value / total) * 2 * Math.PI
        const animatedAngle = sliceAngle * easeProgress
        
        if (animatedAngle > 0.01) { // Only draw if there's enough angle to see
          // Draw slice with shadow and scale effect
          ctx.save()
          
          // Pulsing effect
          const scale = 0.95 + 0.05 * Math.sin(elapsed * 0.01 + index)
          ctx.translate(centerX, centerY)
          ctx.scale(scale, scale)
          ctx.translate(-centerX, -centerY)
          
          ctx.shadowColor = 'rgba(0,0,0,0.3)'
          ctx.shadowBlur = 8
          ctx.shadowOffsetX = 3
          ctx.shadowOffsetY = 3
          
          ctx.beginPath()
          ctx.moveTo(centerX, centerY)
          ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + animatedAngle)
          ctx.closePath()
          
          // Gradient fill for depth
          const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
          gradient.addColorStop(0, colors[index % colors.length])
          gradient.addColorStop(0.7, colors[index % colors.length])
          gradient.addColorStop(1, colors[index % colors.length] + '80')
          
          ctx.fillStyle = gradient
          ctx.fill()
          ctx.restore()
          
          // Border with glow
          ctx.beginPath()
          ctx.moveTo(centerX, centerY)
          ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + animatedAngle)
          ctx.closePath()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 3
          ctx.stroke()
          
          // Animated percentage labels
          if (animatedAngle > 0.15 && animationProgress > 0.7) {
            const labelAngle = currentAngle + animatedAngle / 2
            const labelRadius = radius * (0.4 + 0.25 * (animationProgress - 0.7) / 0.3)
            const labelX = centerX + Math.cos(labelAngle) * labelRadius
            const labelY = centerY + Math.sin(labelAngle) * labelRadius
            
            const percentage = Math.round((value / total) * 100)
            const labelAlpha = Math.min((animationProgress - 0.7) / 0.3, 1)
            
            ctx.save()
            ctx.globalAlpha = labelAlpha
            ctx.fillStyle = 'white'
            ctx.font = 'bold 14px Arial'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            
            // Text glow effect
            ctx.shadowColor = 'rgba(0,0,0,0.8)'
            ctx.shadowBlur = 4
            ctx.fillText(`${percentage}%`, labelX, labelY)
            ctx.restore()
          }
        }
        
        currentAngle += sliceAngle
        totalDrawn += value
      })
      
      // Continue animation if not complete
      if (animationProgress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    animate()
  }
  
  const drawBarChart = (canvas, chartLabels, data) => {
    const ctx = canvas.getContext('2d')
    const padding = 50
    const chartWidth = canvas.width - 2 * padding
    const chartHeight = canvas.height - 2 * padding
    const barWidth = chartWidth / data.length * 0.8
    const barGap = chartWidth / data.length * 0.2
    
    const maxValue = Math.max(...data) || 1
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Animation variables
    let animationProgress = 0
    const animationDuration = 1200
    const startTime = Date.now()
    
    function animate() {
      const elapsed = Date.now() - startTime
      animationProgress = Math.min(elapsed / animationDuration, 1)
      
      // Easing function
      const easeProgress = 1 - Math.pow(1 - animationProgress, 2)
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw animated axes
      const axisProgress = Math.min(animationProgress * 2, 1)
      ctx.strokeStyle = '#ddd'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(padding, canvas.height - padding)
      ctx.lineTo(padding, canvas.height - padding - (chartHeight * axisProgress))
      ctx.moveTo(padding, canvas.height - padding)
      ctx.lineTo(padding + (chartWidth * axisProgress), canvas.height - padding)
      ctx.stroke()
      
      // Draw grid lines with fade-in
      if (animationProgress > 0.3) {
        const gridAlpha = Math.min((animationProgress - 0.3) / 0.3, 0.3)
        ctx.save()
        ctx.globalAlpha = gridAlpha
        ctx.strokeStyle = '#f0f0f0'
        ctx.lineWidth = 1
        for (let i = 1; i <= 5; i++) {
          const y = canvas.height - padding - (i * chartHeight / 5)
          ctx.beginPath()
          ctx.moveTo(padding, y)
          ctx.lineTo(canvas.width - padding, y)
          ctx.stroke()
        }
        ctx.restore()
      }
      
      // Draw bars with staggered animation
      data.forEach((value, index) => {
        const staggerDelay = index * 0.1
        const barProgress = Math.max(0, Math.min((animationProgress - staggerDelay) / 0.8, 1))
        
        if (barProgress > 0) {
          const targetHeight = (value / maxValue) * chartHeight * 0.8
          const barHeight = targetHeight * (1 - Math.pow(1 - barProgress, 3))
          const x = padding + index * (barWidth + barGap) + barGap / 2
          const y = canvas.height - padding - barHeight
          
          // Gradient fill with animation
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight)
          const color = colors[index % colors.length]
          gradient.addColorStop(0, color)
          gradient.addColorStop(0.5, color + 'CC')
          gradient.addColorStop(1, color + '80')
          
          // Shadow effect
          ctx.save()
          ctx.shadowColor = 'rgba(0,0,0,0.2)'
          ctx.shadowBlur = 6
          ctx.shadowOffsetX = 2
          ctx.shadowOffsetY = 2
          
          ctx.fillStyle = gradient
          ctx.fillRect(x, y, barWidth, barHeight)
          ctx.restore()
          
          // Border with glow
          ctx.strokeStyle = color
          ctx.lineWidth = 2
          ctx.strokeRect(x, y, barWidth, barHeight)
          
          // Animated value labels
          if (barProgress > 0.7) {
            const labelAlpha = Math.min((barProgress - 0.7) / 0.3, 1)
            ctx.save()
            ctx.globalAlpha = labelAlpha
            ctx.fillStyle = '#333'
            ctx.font = 'bold 12px Arial'
            ctx.textAlign = 'center'
            ctx.fillText(value.toString(), x + barWidth/2, y - 8)
            
            // Bottom labels
            ctx.fillStyle = '#666'
            ctx.font = '11px Arial'
            const label = chartLabels[index] || `Item ${index + 1}`
            ctx.fillText(label, x + barWidth/2, canvas.height - padding + 20)
            ctx.restore()
          }
          
          // Floating particles effect on new bars
          if (barProgress < 1 && barProgress > 0.5) {
            for (let p = 0; p < 3; p++) {
              const particleX = x + Math.random() * barWidth
              const particleY = y + Math.random() * barHeight
              const particleAlpha = (1 - barProgress) * 0.8
              
              ctx.save()
              ctx.globalAlpha = particleAlpha
              ctx.fillStyle = color
              ctx.beginPath()
              ctx.arc(particleX, particleY, 2, 0, Math.PI * 2)
              ctx.fill()
              ctx.restore()
            }
          }
        }
      })
      
      if (animationProgress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    animate()
  }
  
  const drawLineChart = (canvas, chartLabels, data) => {
    const ctx = canvas.getContext('2d')
    const padding = 50
    const chartWidth = canvas.width - 2 * padding
    const chartHeight = canvas.height - 2 * padding
    
    const maxValue = Math.max(...data) || 1
    const minValue = Math.min(...data, 0)
    const range = maxValue - minValue || 1
    
    if (data.length === 0) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Animation variables
    let animationProgress = 0
    const animationDuration = 2000
    const startTime = Date.now()
    
    // Calculate all points
    const points = data.map((value, index) => ({
      x: padding + (index / Math.max(data.length - 1, 1)) * chartWidth,
      y: canvas.height - padding - ((value - minValue) / range) * chartHeight * 0.8,
      value,
      label: chartLabels[index] || `Point ${index + 1}`
    }))
    
    function animate() {
      const elapsed = Date.now() - startTime
      animationProgress = Math.min(elapsed / animationDuration, 1)
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw animated axes
      const axisProgress = Math.min(animationProgress * 2, 1)
      ctx.strokeStyle = '#ddd'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(padding, canvas.height - padding)
      ctx.lineTo(padding, canvas.height - padding - (chartHeight * axisProgress))
      ctx.moveTo(padding, canvas.height - padding)
      ctx.lineTo(padding + (chartWidth * axisProgress), canvas.height - padding)
      ctx.stroke()
      
      // Draw grid lines with fade-in
      if (animationProgress > 0.2) {
        const gridAlpha = Math.min((animationProgress - 0.2) / 0.3, 0.5)
        ctx.save()
        ctx.globalAlpha = gridAlpha
        ctx.strokeStyle = '#f0f0f0'
        ctx.lineWidth = 1
        for (let i = 1; i <= 5; i++) {
          const y = canvas.height - padding - (i * chartHeight / 5)
          ctx.beginPath()
          ctx.moveTo(padding, y)
          ctx.lineTo(canvas.width - padding, y)
          ctx.stroke()
        }
        ctx.restore()
      }
      
      // Draw animated line with path tracing
      if (animationProgress > 0.3) {
        const lineProgress = (animationProgress - 0.3) / 0.5
        const pathLength = lineProgress * (points.length - 1)
        
        // Main line with glow effect
        ctx.save()
        ctx.shadowColor = '#FF6384'
        ctx.shadowBlur = 10
        ctx.strokeStyle = '#FF6384'
        ctx.lineWidth = 4
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        
        ctx.beginPath()
        if (pathLength >= 0) {
          ctx.moveTo(points[0].x, points[0].y)
          
          for (let i = 1; i < points.length; i++) {
            if (i <= pathLength) {
              ctx.lineTo(points[i].x, points[i].y)
            } else if (i - 1 < pathLength) {
              // Partial segment
              const segmentProgress = pathLength - (i - 1)
              const x = points[i-1].x + (points[i].x - points[i-1].x) * segmentProgress
              const y = points[i-1].y + (points[i].y - points[i-1].y) * segmentProgress
              ctx.lineTo(x, y)
              break
            }
          }
        }
        ctx.stroke()
        ctx.restore()
        
        // Thin line overlay
        ctx.strokeStyle = '#FF6384'
        ctx.lineWidth = 2
        ctx.stroke()
        
        // Draw animated points with scale effect
        points.forEach((point, index) => {
          const pointDelay = index * 0.1
          const pointProgress = Math.max(0, Math.min((lineProgress - pointDelay) * 2, 1))
          
          if (pointProgress > 0 && index <= pathLength) {
            const scale = 0.5 + 0.5 * (1 - Math.pow(1 - pointProgress, 2))
            const pulseScale = 1 + 0.3 * Math.sin(elapsed * 0.01 + index)
            
            // Outer glow
            ctx.save()
            ctx.shadowColor = '#FF6384'
            ctx.shadowBlur = 15
            ctx.fillStyle = '#FF6384'
            ctx.beginPath()
            ctx.arc(point.x, point.y, 8 * scale * pulseScale, 0, 2 * Math.PI)
            ctx.fill()
            ctx.restore()
            
            // Main point
            ctx.fillStyle = '#FF6384'
            ctx.beginPath()
            ctx.arc(point.x, point.y, 6 * scale, 0, 2 * Math.PI)
            ctx.fill()
            
            // White center
            ctx.fillStyle = 'white'
            ctx.beginPath()
            ctx.arc(point.x, point.y, 3 * scale, 0, 2 * Math.PI)
            ctx.fill()
            
            // Animated labels
            if (pointProgress > 0.5) {
              const labelAlpha = Math.min((pointProgress - 0.5) / 0.5, 1)
              ctx.save()
              ctx.globalAlpha = labelAlpha
              
              // Value label with background
              ctx.fillStyle = 'rgba(255, 99, 132, 0.9)'
              ctx.font = 'bold 12px Arial'
              ctx.textAlign = 'center'
              const valueText = point.value.toString()
              const textWidth = ctx.measureText(valueText).width
              ctx.fillRect(point.x - textWidth/2 - 4, point.y - 25, textWidth + 8, 18)
              
              ctx.fillStyle = 'white'
              ctx.fillText(valueText, point.x, point.y - 12)
              
              // Bottom label
              ctx.fillStyle = '#666'
              ctx.font = '11px Arial'
              ctx.fillText(point.label, point.x, canvas.height - padding + 20)
              ctx.restore()
            }
          }
        })
        
        // Animated drawing tip
        if (lineProgress < 1 && pathLength > 0) {
          const tipIndex = Math.floor(pathLength)
          const tipProgress = pathLength - tipIndex
          
          if (tipIndex < points.length - 1) {
            const tipX = points[tipIndex].x + (points[tipIndex + 1].x - points[tipIndex].x) * tipProgress
            const tipY = points[tipIndex].y + (points[tipIndex + 1].y - points[tipIndex].y) * tipProgress
            
            // Glowing tip
            ctx.save()
            ctx.shadowColor = '#FF6384'
            ctx.shadowBlur = 20
            ctx.fillStyle = '#FF6384'
            ctx.beginPath()
            ctx.arc(tipX, tipY, 4, 0, 2 * Math.PI)
            ctx.fill()
            ctx.restore()
          }
        }
      }
      
      if (animationProgress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    animate()
  }

  // Real-time preview update
  const updatePreview = () => {
    if (type === 'pie' || type === 'bar' || type === 'line') {
      const parsedLabels = labels.split(',').map(s => s.trim()).filter(Boolean)
      const parsedData = values.split(',').map(s => Number(s.trim())).filter(v => !isNaN(v))
      
      // Disable preview for large datasets (> 20 items) to avoid performance issues
      if (parsedLabels.length > 20) {
        setShowPreview(false)
        setChartData(null)
        return
      }
      
      if (parsedLabels.length === parsedData.length && parsedLabels.length > 0) {
        setChartData({ labels: parsedLabels, data: parsedData })
        setShowPreview(true)
        setError('')
        
        // Draw chart on canvas after state update
        setTimeout(() => {
          const canvas = document.getElementById('previewCanvas')
          if (canvas) {
            if (type === 'pie') {
              drawPieChart(canvas, parsedData)
            } else if (type === 'bar') {
              drawBarChart(canvas, parsedLabels, parsedData)
            } else if (type === 'line') {
              drawLineChart(canvas, parsedLabels, parsedData)
            }
          }
        }, 50)
      } else {
        setShowPreview(false)
      }
    } else {
      setShowPreview(false)
    }
  }
  
  // Update preview when data changes
  React.useEffect(() => {
    if (labels.trim() && values.trim()) {
      updatePreview()
    } else {
      setShowPreview(false)
      setChartData(null)
    }
  }, [labels, values, type])

  const onGenerate = async () => {
    setLoading(true); setError('')
    setDownload('')
    setMermaid('')
    setChartImage('')
    
    const payload = { type, title: title || undefined }
    let parsedData = []
    let parsedLabels = []
    
    if (type === 'pie' || type === 'bar' || type === 'line') {
      parsedLabels = labels.split(',').map(s => s.trim()).filter(Boolean)
      parsedData = values.split(',').map(s => Number(s.trim())).filter(v => !isNaN(v))
      
      if (parsedLabels.length !== parsedData.length || parsedLabels.length === 0) {
        setError('Please enter valid labels and values (must match in count)')
        setLoading(false)
        return
      }
      
      payload.labels = parsedLabels
      payload.values = parsedData
      
    } else if (type === 'flowchart' || type === 'mindmap') {
      payload.description = description
    }
    
    try {
      const res = await fetch(apiUrl('/api/educhart/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.download_url) {
        setDownload(data.download_url)
        if (data.mermaid) {
          setMermaid(data.mermaid)
        }
        if (data.type !== 'flowchart' && data.type !== 'mindmap') {
          setChartImage(apiUrl(data.download_url))
        }
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const autoDownload = () => {
    if (!download) return
    const a = document.createElement('a')
    a.href = apiUrl(download)
    a.download = ''
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <Page title="EduChart – Interactive Chart Generator" description="Create beautiful charts with real-time preview as you type.">
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '24px',
        minHeight: '600px'
      }}>
        
        {/* Left Panel - Data Input */}
        <div style={{
          background: 'var(--background-secondary)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid var(--border)',
          height: 'fit-content'
        }}>
          <h2 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Enter Your Data</h2>
          
          <div style={{
            background: 'var(--background)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            border: '1px solid var(--border)',
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.6'
          }}>
            Enter data with labels and values. Example:<br/>
            Product A: 30<br/>
            Product B: 45<br/>
            Product C: 25
          </div>
          
          <div className="grid" style={{ gap: '16px' }}>
            <Field label="Chart Title (Optional)">
              <input 
                type="text"
                className="input"
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Enter chart title..."
              />
            </Field>
            
            <Field label="Labels (comma separated)">
              <input 
                type="text"
                className="input"
                value={labels} 
                onChange={(e) => setLabels(e.target.value)} 
                placeholder="Product A, Product B, Product C"
              />
            </Field>
            
            <Field label="Values (comma separated)">
              <input 
                type="text"
                className="input"
                value={values} 
                onChange={(e) => setValues(e.target.value)} 
                placeholder="30, 45, 25"
              />
            </Field>
            
            {/* Chart Type Selection */}
            <div style={{ marginTop: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '12px', 
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>Chart Type</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { value: 'bar', label: 'Bar Chart' },
                  { value: 'pie', label: 'Pie Chart' },
                  { value: 'line', label: 'Line Chart' }
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: '1px solid var(--border)',
                      background: type === option.value ? 'var(--primary)' : 'var(--background)',
                      color: type === option.value ? 'white' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: type === option.value ? '600' : '400',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            <Button 
              onClick={onGenerate}
              loading={loading} 
              style={{
                marginTop: '20px',
                background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                color: 'white',
                fontWeight: '600',
                fontSize: '1rem'
              }}
            >
              {loading ? 'Generating...' : 'Generate Chart'}
            </Button>
          </div>
          
          {error && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#fee2e2',
              color: '#dc2626',
              borderRadius: '8px',
              border: '1px solid #fecaca'
            }}>
              {error}
            </div>
          )}
        </div>
        
        {/* Right Panel - Live Preview */}
        <div style={{
          background: 'var(--background-secondary)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Chart Preview</h2>
          
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            minHeight: '400px',
            position: 'relative'
          }}>
            {showPreview && chartData ? (
              <>
                {title && (
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontWeight: '600',
                    fontSize: '1.1rem',
                    color: '#333'
                  }}>
                    {title}
                  </div>
                )}
                <canvas 
                  id="previewCanvas"
                  width="500" 
                  height="350"
                  style={{ 
                    maxWidth: '100%',
                    height: 'auto',
                    borderRadius: '4px'
                  }}
                />
              </>
            ) : (
              <div style={{
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: '1.1rem'
              }}>
                {labels.trim() && values.trim() ? (
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📊</div>
                    {labels.split(',').filter(Boolean).length > 20 ? (
                      <div>
                        <div style={{ fontWeight: '600', marginBottom: '8px' }}>Large Dataset Detected</div>
                        <div style={{ fontSize: '0.95rem' }}>
                          Preview disabled for {labels.split(',').filter(Boolean).length} items.
                          <br/>Click "Generate Chart" to create your chart.
                        </div>
                      </div>
                    ) : (
                      'Preparing your chart...'
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📊</div>
                    Enter labels and values to see live preview
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Download Section */}
      {download && (
        <div style={{
          marginTop: '24px',
          background: 'var(--background-secondary)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid var(--border)'
        }}>
          <h3 style={{ margin: '0 0 16px 0' }}>📥 Download & Export</h3>
          <div className="row" style={{ gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <strong>High-quality chart ready for download</strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Professional {type} chart generated successfully
              </div>
            </div>
            <Button onClick={autoDownload} variant="primary">
              📥 Download Chart
            </Button>
            <Button 
              onClick={() => window.open(apiUrl(download), '_blank')} 
              variant="ghost"
            >
              🔗 Open Link
            </Button>
          </div>
        </div>
      )}
    </Page>
  )
}
