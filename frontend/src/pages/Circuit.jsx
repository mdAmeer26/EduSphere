import React, { useState, useRef, useEffect } from 'react'
import { apiUrl } from '../lib/api'

export default function Circuit() {
  const [components, setComponents] = useState([])
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [draggingId, setDraggingId] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [connections, setConnections] = useState([])
  const [connectingFrom, setConnectingFrom] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [simulation, setSimulation] = useState(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [arduinoCode, setArduinoCode] = useState('')
  const [showArduinoModal, setShowArduinoModal] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  
  const canvasRef = useRef(null)

  const libraries = {
    basic: [
      { type: 'battery', icon: '🔋', label: 'Battery', value: '9V', color: '#fbbf24' },
      { type: 'resistor', icon: '⚡', label: 'Resistor', value: '1kΩ', color: '#f59e0b' },
      { type: 'led', icon: '💡', label: 'LED', value: 'Red', color: '#ef4444' },
      { type: 'capacitor', icon: '🔌', label: 'Capacitor', value: '100µF', color: '#8b5cf6' },
      { type: 'switch', icon: '🔘', label: 'Switch', value: 'SPST', color: '#6366f1' },
      { type: 'ground', icon: '⏚', label: 'Ground', value: '', color: '#64748b' }
    ],
    arduino: [
      { type: 'arduino_uno', icon: '🎛️', label: 'Arduino Uno', value: '', color: '#0ea5e9' },
      { type: 'ir_sensor', icon: '👁️', label: 'IR Sensor', value: 'HC-SR501', color: '#06b6d4' },
      { type: 'ultrasonic', icon: '📡', label: 'Ultrasonic', value: 'HC-SR04', color: '#14b8a6' },
      { type: 'servo', icon: '⚙️', label: 'Servo', value: 'SG90', color: '#10b981' },
      { type: 'lcd', icon: '📺', label: 'LCD', value: '16x2', color: '#22c55e' },
      { type: 'buzzer', icon: '🔊', label: 'Buzzer', value: 'Active', color: '#84cc16' },
      { type: 'relay', icon: '🔋', label: 'Relay', value: '5V', color: '#eab308' }
    ],
    advanced: [
      { type: 'inductor', icon: '🧲', label: 'Inductor', value: '10mH', color: '#f97316' },
      { type: 'diode', icon: '◄', label: 'Diode', value: '1N4007', color: '#ec4899' },
      { type: 'transistor', icon: '🔺', label: 'Transistor', value: '2N2222', color: '#d946ef' },
      { type: 'op_amp', icon: '△', label: 'Op-Amp', value: '741', color: '#a855f7' },
      { type: 'mosfet', icon: '▭', label: 'MOSFET', value: 'IRF540', color: '#8b5cf6' }
    ]
  }

  // Add component
  const addComponent = (lib) => {
    const newComp = {
      id: Date.now(),
      ...lib,
      x: 300 + Math.random() * 200,
      y: 200 + Math.random() * 150
    }
    setComponents([...components, newComp])
  }

  // Mouse handlers for canvas
  const handleCanvasMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Find clicked component
    const clicked = components.find(c => {
      const size = c.type === 'arduino_uno' ? 80 : 60
      return x >= c.x - size/2 && x <= c.x + size/2 &&
             y >= c.y - size/2 && y <= c.y + size/2
    })

    if (clicked) {
      if (e.shiftKey) {
        // Start connection
        setConnectingFrom(clicked.id)
      } else {
        // Start dragging
        setDraggingId(clicked.id)
        setDragOffset({ x: x - clicked.x, y: y - clicked.y })
        setSelectedComponent(clicked)
      }
    } else {
      setSelectedComponent(null)
    }
  }

  const handleCanvasMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setMousePos({ x, y })

    if (draggingId) {
      setComponents(components.map(c =>
        c.id === draggingId
          ? { ...c, x: x - dragOffset.x, y: y - dragOffset.y }
          : c
      ))
    }
  }

  const handleCanvasMouseUp = (e) => {
    if (connectingFrom) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const target = components.find(c => {
        const size = c.type === 'arduino_uno' ? 80 : 60
        return c.id !== connectingFrom &&
               x >= c.x - size/2 && x <= c.x + size/2 &&
               y >= c.y - size/2 && y <= c.y + size/2
      })

      if (target) {
        setConnections([...connections, { from: connectingFrom, to: target.id }])
      }
      setConnectingFrom(null)
    }
    setDraggingId(null)
  }

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    
    // Clear
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Grid
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 1
    for (let x = 0; x < canvas.width; x += 25) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += 25) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Connections
    connections.forEach(conn => {
      const from = components.find(c => c.id === conn.from)
      const to = components.find(c => c.id === conn.to)
      if (from && to) {
        ctx.strokeStyle = '#00d4ff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()
      }
    })

    // Connecting line
    if (connectingFrom) {
      const from = components.find(c => c.id === connectingFrom)
      if (from) {
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(mousePos.x, mousePos.y)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // Components
    components.forEach(comp => {
      const size = comp.type === 'arduino_uno' ? 80 : 60
      const isSelected = selectedComponent?.id === comp.id
      
      // Shadow
      ctx.shadowBlur = isSelected ? 20 : 10
      ctx.shadowColor = isSelected ? comp.color : 'rgba(0,0,0,0.5)'
      
      // Box
      ctx.fillStyle = comp.color || '#334155'
      ctx.fillRect(comp.x - size/2, comp.y - size/2, size, size)
      
      // Border
      ctx.strokeStyle = isSelected ? '#fff' : '#475569'
      ctx.lineWidth = isSelected ? 3 : 2
      ctx.strokeRect(comp.x - size/2, comp.y - size/2, size, size)
      
      ctx.shadowBlur = 0
      
      // Icon
      ctx.font = 'bold 24px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fff'
      ctx.fillText(comp.icon, comp.x, comp.y - 8)
      
      // Label
      ctx.font = '11px Arial'
      ctx.fillStyle = '#fff'
      ctx.fillText(comp.label, comp.x, comp.y + 18)
    })
  }, [components, connections, selectedComponent, connectingFrom, mousePos])

  // Simulate circuit
  const runSimulation = async () => {
    try {
      const res = await fetch(`${apiUrl}/circuit/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'My Circuit',
          components: components.map(c => ({
            type: c.type,
            value: c.value,
            x: c.x,
            y: c.y
          }))
        })
      })
      const data = await res.json()
      if (data.ok) {
        setSimulation(data.simulation)
      }
    } catch (err) {
      console.error('Simulation error:', err)
    }
  }

  // Generate Arduino code
  const generateArduino = () => {
    if (!components.some(c => c.type === 'arduino_uno')) {
      alert('Add Arduino Uno first!')
      return
    }

    let code = '// Generated Arduino Code\n\n'
    let pins = {}
    let pinNum = 2

    components.forEach(c => {
      if (c.type === 'arduino_uno') return
      
      if (c.type === 'ir_sensor') {
        pins[c.id] = pinNum++
        code += `#define IR_PIN ${pins[c.id]}\n`
      } else if (c.type === 'led') {
        pins[c.id] = pinNum++
        code += `#define LED_PIN ${pins[c.id]}\n`
      } else if (c.type === 'ultrasonic') {
        pins[c.id] = { trig: pinNum++, echo: pinNum++ }
        code += `#define TRIG ${pins[c.id].trig}\n#define ECHO ${pins[c.id].echo}\n`
      } else if (c.type === 'servo') {
        pins[c.id] = pinNum++
        code += `#include <Servo.h>\nServo servo;\n#define SERVO_PIN ${pins[c.id]}\n`
      } else if (c.type === 'buzzer') {
        pins[c.id] = pinNum++
        code += `#define BUZZER_PIN ${pins[c.id]}\n`
      } else if (c.type === 'lcd') {
        code += `#include <LiquidCrystal.h>\nLiquidCrystal lcd(12,11,5,4,3,2);\n`
      }
    })

    code += '\nvoid setup() {\n  Serial.begin(9600);\n'
    
    components.forEach(c => {
      if (c.type === 'ir_sensor') code += `  pinMode(IR_PIN, INPUT);\n`
      else if (c.type === 'led') code += `  pinMode(LED_PIN, OUTPUT);\n`
      else if (c.type === 'ultrasonic') code += `  pinMode(TRIG, OUTPUT);\n  pinMode(ECHO, INPUT);\n`
      else if (c.type === 'servo') code += `  servo.attach(SERVO_PIN);\n`
      else if (c.type === 'buzzer') code += `  pinMode(BUZZER_PIN, OUTPUT);\n`
      else if (c.type === 'lcd') code += `  lcd.begin(16, 2);\n  lcd.print("Ready!");\n`
    })
    
    code += '}\n\nvoid loop() {\n'
    
    const hasIR = components.some(c => c.type === 'ir_sensor')
    const hasLED = components.some(c => c.type === 'led')
    
    if (hasIR && hasLED) {
      code += '  if (digitalRead(IR_PIN) == HIGH) {\n    digitalWrite(LED_PIN, HIGH);\n  } else {\n    digitalWrite(LED_PIN, LOW);\n  }\n'
    }
    
    code += '  delay(100);\n}\n'
    
    setArduinoCode(code)
    setShowArduinoModal(true)
  }

  // AI Generate - Complete Circuit Builder
  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return
    
    const prompt = aiPrompt.toLowerCase()
    let newComps = []
    let newConns = []
    let baseX = 400, baseY = 300
    let arduinoId = null
    
    // ALWAYS add Arduino Uno as the brain
    if (prompt.includes('arduino') || prompt.includes('circuit')) {
      arduinoId = Date.now()
      newComps.push({
        id: arduinoId,
        type: 'arduino_uno',
        icon: '🎛️',
        label: 'Arduino Uno',
        value: '',
        color: '#0ea5e9',
        x: baseX,
        y: baseY
      })
    }
    
    // IR Sensor with complete wiring
    if (prompt.includes('ir') || prompt.includes('motion') || prompt.includes('sensor')) {
      const irId = Date.now() + 1
      newComps.push({
        id: irId,
        type: 'ir_sensor',
        icon: '👁️',
        label: 'IR Sensor',
        value: 'HC-SR501',
        color: '#06b6d4',
        x: baseX - 200,
        y: baseY - 150
      })
      
      // Add resistor for IR sensor
      const resistorId = Date.now() + 2
      newComps.push({
        id: resistorId,
        type: 'resistor',
        icon: '⚡',
        label: 'Resistor',
        value: '10kΩ',
        color: '#f59e0b',
        x: baseX - 100,
        y: baseY - 150
      })
      
      if (arduinoId) {
        newConns.push({ from: irId, to: resistorId })
        newConns.push({ from: resistorId, to: arduinoId })
      }
    }
    
    // LED with resistor (always needed for LED)
    if (prompt.includes('led') || prompt.includes('light')) {
      const ledId = Date.now() + 3
      newComps.push({
        id: ledId,
        type: 'led',
        icon: '💡',
        label: 'LED',
        value: 'Red',
        color: '#ef4444',
        x: baseX + 200,
        y: baseY - 150
      })
      
      const ledResistorId = Date.now() + 4
      newComps.push({
        id: ledResistorId,
        type: 'resistor',
        icon: '⚡',
        label: 'Resistor',
        value: '220Ω',
        color: '#f59e0b',
        x: baseX + 100,
        y: baseY - 150
      })
      
      if (arduinoId) {
        newConns.push({ from: arduinoId, to: ledResistorId })
        newConns.push({ from: ledResistorId, to: ledId })
      }
    }
    
    // Ultrasonic sensor
    if (prompt.includes('ultrasonic') || prompt.includes('distance')) {
      const ultraId = Date.now() + 5
      newComps.push({
        id: ultraId,
        type: 'ultrasonic',
        icon: '📡',
        label: 'Ultrasonic',
        value: 'HC-SR04',
        color: '#14b8a6',
        x: baseX - 200,
        y: baseY + 150
      })
      
      if (arduinoId) {
        newConns.push({ from: ultraId, to: arduinoId })
      }
    }
    
    // Servo motor
    if (prompt.includes('servo') || prompt.includes('motor')) {
      const servoId = Date.now() + 6
      newComps.push({
        id: servoId,
        type: 'servo',
        icon: '⚙️',
        label: 'Servo',
        value: 'SG90',
        color: '#10b981',
        x: baseX + 200,
        y: baseY + 150
      })
      
      if (arduinoId) {
        newConns.push({ from: arduinoId, to: servoId })
      }
    }
    
    // LCD Display
    if (prompt.includes('lcd') || prompt.includes('display') || prompt.includes('screen')) {
      const lcdId = Date.now() + 7
      newComps.push({
        id: lcdId,
        type: 'lcd',
        icon: '📺',
        label: 'LCD',
        value: '16x2',
        color: '#22c55e',
        x: baseX,
        y: baseY - 200
      })
      
      if (arduinoId) {
        newConns.push({ from: arduinoId, to: lcdId })
      }
    }
    
    // Buzzer
    if (prompt.includes('buzzer') || prompt.includes('alarm') || prompt.includes('sound')) {
      const buzzerId = Date.now() + 8
      newComps.push({
        id: buzzerId,
        type: 'buzzer',
        icon: '🔊',
        label: 'Buzzer',
        value: 'Active',
        color: '#84cc16',
        x: baseX,
        y: baseY + 200
      })
      
      if (arduinoId) {
        newConns.push({ from: arduinoId, to: buzzerId })
      }
    }
    
    // Battery & Ground (power supply)
    if (newComps.length > 1) {
      const batteryId = Date.now() + 9
      newComps.push({
        id: batteryId,
        type: 'battery',
        icon: '🔋',
        label: 'Battery',
        value: '9V',
        color: '#fbbf24',
        x: baseX - 250,
        y: baseY
      })
      
      const groundId = Date.now() + 10
      newComps.push({
        id: groundId,
        type: 'ground',
        icon: '⏚',
        label: 'Ground',
        value: '',
        color: '#64748b',
        x: baseX + 250,
        y: baseY
      })
      
      if (arduinoId) {
        newConns.push({ from: batteryId, to: arduinoId })
        newConns.push({ from: arduinoId, to: groundId })
      }
    }
    
    // Relay for high power control
    if (prompt.includes('relay') || prompt.includes('switch') || prompt.includes('control')) {
      const relayId = Date.now() + 11
      newComps.push({
        id: relayId,
        type: 'relay',
        icon: '🔋',
        label: 'Relay',
        value: '5V',
        color: '#eab308',
        x: baseX,
        y: baseY + 150
      })
      
      if (arduinoId) {
        newConns.push({ from: arduinoId, to: relayId })
      }
    }
    
    // Add transistor for switching
    if (prompt.includes('transistor') || prompt.includes('amplif')) {
      const transId = Date.now() + 12
      newComps.push({
        id: transId,
        type: 'transistor',
        icon: '🔺',
        label: 'Transistor',
        value: '2N2222',
        color: '#d946ef',
        x: baseX + 150,
        y: baseY
      })
      
      if (arduinoId) {
        newConns.push({ from: arduinoId, to: transId })
      }
    }
    
    // Capacitor for power smoothing
    if (prompt.includes('capacitor') || prompt.includes('stable') || newComps.length > 3) {
      const capId = Date.now() + 13
      newComps.push({
        id: capId,
        type: 'capacitor',
        icon: '🔌',
        label: 'Capacitor',
        value: '100µF',
        color: '#8b5cf6',
        x: baseX - 150,
        y: baseY
      })
      
      if (arduinoId) {
        newConns.push({ from: capId, to: arduinoId })
      }
    }
    
    setComponents([...components, ...newComps])
    setConnections([...connections, ...newConns])
    setAiPrompt('')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a, #1a1a2e)',
      color: '#fff',
      padding: 20
    }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <h1 style={{
          fontSize: 42,
          fontWeight: 'bold',
          marginBottom: 10,
          background: 'linear-gradient(135deg, #00d4ff, #0081ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          ⚡ Circuit Designer Pro
        </h1>
        <p style={{ fontSize: 16, color: '#888', marginBottom: 25 }}>
          Drag components • Shift+Click to connect • Generate Arduino code
        </p>

        {/* AI Generator */}
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          borderRadius: 15,
          padding: 20,
          marginBottom: 20,
          display: 'flex',
          gap: 15
        }}>
          <input
            placeholder="Describe circuit (e.g., 'Arduino with IR sensor and LED')"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && generateWithAI()}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: 'rgba(0,0,0,0.3)',
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: 10,
              color: '#fff',
              fontSize: 16,
              outline: 'none'
            }}
          />
          <button
            onClick={generateWithAI}
            style={{
              padding: '12px 30px',
              background: 'linear-gradient(135deg, #00d4ff, #0081ff)',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontSize: 16,
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ✨ Generate
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 300px', gap: 20 }}>
          {/* Left - Components */}
          <div style={{
            background: '#1e293b',
            borderRadius: 15,
            padding: 20,
            border: '2px solid #475569',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: 18, marginBottom: 15 }}>📦 Components</h3>
            
            <div style={{ display: 'flex', gap: 8, marginBottom: 15 }}>
              {['basic', 'arduino', 'advanced'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '6px 12px',
                    background: activeTab === tab ? '#00d4ff' : '#334155',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {libraries[activeTab].map(lib => (
              <button
                key={lib.type}
                onClick={() => addComponent(lib)}
                style={{
                  width: '100%',
                  padding: '12px',
                  marginBottom: 10,
                  background: lib.color,
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <span style={{ fontSize: 24 }}>{lib.icon}</span>
                <span>{lib.label}</span>
              </button>
            ))}
          </div>

          {/* Center - Canvas */}
          <div style={{
            background: '#0a0a0a',
            borderRadius: 15,
            border: '3px solid #334155',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: 15,
              left: 15,
              right: 15,
              display: 'flex',
              gap: 12,
              zIndex: 10
            }}>
              <button
                onClick={runSimulation}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #00d4ff, #0081ff)',
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ▶️ Simulate
              </button>
              <button
                onClick={generateArduino}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                💻 Arduino Code
              </button>
              <button
                onClick={() => {
                  setComponents([])
                  setConnections([])
                  setSimulation(null)
                }}
                style={{
                  padding: '10px 20px',
                  background: '#ff006e',
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                🗑️ Clear
              </button>
            </div>

            <canvas
              ref={canvasRef}
              width={1000}
              height={650}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={() => {
                setDraggingId(null)
                setConnectingFrom(null)
              }}
              style={{
                width: '100%',
                height: '100%',
                cursor: draggingId ? 'grabbing' : connectingFrom ? 'crosshair' : 'default'
              }}
            />

            {components.length === 0 && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <div style={{ fontSize: 64, marginBottom: 15 }}>⚡</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#777', marginBottom: 10 }}>
                  Start Building
                </div>
                <div style={{ fontSize: 14, color: '#555' }}>
                  Click components to add<br/>
                  Drag to move • Shift+Click to connect
                </div>
              </div>
            )}
          </div>

          {/* Right - Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {selectedComponent && (
              <div style={{
                background: '#1e293b',
                borderRadius: 15,
                padding: 20,
                border: `2px solid ${selectedComponent.color}`
              }}>
                <h3 style={{ fontSize: 18, marginBottom: 15 }}>
                  {selectedComponent.icon} {selectedComponent.label}
                </h3>
                
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 5 }}>
                    Value:
                  </label>
                  <input
                    value={selectedComponent.value}
                    onChange={(e) => {
                      setComponents(components.map(c =>
                        c.id === selectedComponent.id
                          ? { ...c, value: e.target.value }
                          : c
                      ))
                      setSelectedComponent({ ...selectedComponent, value: e.target.value })
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#0a0a0a',
                      border: '1px solid #475569',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 14
                    }}
                  />
                </div>

                <button
                  onClick={() => {
                    setComponents(components.filter(c => c.id !== selectedComponent.id))
                    setConnections(connections.filter(conn =>
                      conn.from !== selectedComponent.id && conn.to !== selectedComponent.id
                    ))
                    setSelectedComponent(null)
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#ff006e',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            )}

            {simulation && (
              <div style={{
                background: '#1e293b',
                borderRadius: 15,
                padding: 20,
                border: '2px solid #475569'
              }}>
                <h3 style={{ fontSize: 18, marginBottom: 15 }}>📊 Simulation</h3>

                <div style={{
                  background: simulation.valid ? '#065f46' : '#991b1b',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 15,
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}>
                  {simulation.valid ? '✅ Valid' : '❌ Invalid'}
                </div>

                {simulation.voltage && (
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ color: '#888' }}>Voltage:</span>
                    <span style={{ float: 'right', fontWeight: 'bold', color: '#00d4ff' }}>
                      {simulation.voltage}V
                    </span>
                  </div>
                )}

                {simulation.current && (
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ color: '#888' }}>Current:</span>
                    <span style={{ float: 'right', fontWeight: 'bold', color: '#00d4ff' }}>
                      {simulation.current}A
                    </span>
                  </div>
                )}
              </div>
            )}

            <div style={{
              background: '#1e293b',
              borderRadius: 15,
              padding: 20,
              border: '2px solid #475569'
            }}>
              <h3 style={{ fontSize: 18, marginBottom: 15 }}>📈 Stats</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ textAlign: 'center', padding: 15, background: '#0a0a0a', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#00d4ff' }}>
                    {components.length}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>Components</div>
                </div>
                <div style={{ textAlign: 'center', padding: 15, background: '#0a0a0a', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#a855f7' }}>
                    {connections.length}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>Connections</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Arduino Code Modal */}
        {showArduinoModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={() => setShowArduinoModal(false)}
          >
            <div
              style={{
                background: '#1e293b',
                borderRadius: 15,
                padding: 30,
                maxWidth: 700,
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto',
                border: '3px solid #7c3aed'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 24, fontWeight: 'bold' }}>💻 Arduino Code</h2>
                <button
                  onClick={() => setShowArduinoModal(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#ff006e',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  ✖
                </button>
              </div>

              <pre style={{
                background: '#0a0a0a',
                padding: 20,
                borderRadius: 10,
                fontSize: 13,
                lineHeight: 1.6,
                overflowX: 'auto',
                color: '#00d4ff',
                fontFamily: 'Monaco, monospace'
              }}>
                {arduinoCode}
              </pre>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(arduinoCode)
                  alert('Copied to clipboard!')
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #00d4ff, #0081ff)',
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginTop: 15
                }}
              >
                📋 Copy Code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
