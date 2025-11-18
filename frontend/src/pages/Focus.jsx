import React, { useState, useRef, useEffect } from 'react'
import { apiUrl } from '../lib/api'

export default function Focus() {
  const [task, setTask] = useState('')
  const [duration, setDuration] = useState(25)
  const [isActive, setIsActive] = useState(false)
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [mode, setMode] = useState('focus') // focus, short-break, long-break
  const [pomodoroCount, setPomodoroCount] = useState(0)
  const [blockedApps, setBlockedApps] = useState(['chrome', 'firefox', 'discord', 'slack'])
  const [newApp, setNewApp] = useState('')
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState({ streak: 0, totalMinutes: 0, todaySessions: 0 })
  const [aiInsights, setAiInsights] = useState([])
  const [showInsights, setShowInsights] = useState(false)
  const [blockingActive, setBlockingActive] = useState(false)

  const intervalRef = useRef(null)
  const blockIntervalRef = useRef(null)

  // Timer
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            completeSession()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isActive])

  // App blocking when focus mode is active
  useEffect(() => {
    if (isActive && mode === 'focus' && blockedApps.length > 0) {
      setBlockingActive(true)
      blockApps()
      blockIntervalRef.current = setInterval(blockApps, 3000) // Check every 3 seconds
    } else {
      setBlockingActive(false)
      if (blockIntervalRef.current) clearInterval(blockIntervalRef.current)
    }
    return () => {
      if (blockIntervalRef.current) clearInterval(blockIntervalRef.current)
    }
  }, [isActive, mode, blockedApps])

  const blockApps = async () => {
    try {
      await fetch(`${apiUrl}/focus/block-apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apps: blockedApps })
      })
    } catch (err) {
      console.error('App blocking error:', err)
    }
  }

  const startTimer = () => {
    if (!task.trim()) {
      alert('Enter a task!')
      return
    }
    setIsActive(true)
  }

  const stopTimer = () => {
    setIsActive(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (blockIntervalRef.current) clearInterval(blockIntervalRef.current)
    setBlockingActive(false)
  }

  const resetTimer = () => {
    stopTimer()
    setTimeLeft(duration * 60)
  }

  const completeSession = () => {
    setIsActive(false)
    
    const newSession = {
      id: Date.now(),
      task: task,
      duration: duration,
      completedAt: new Date().toISOString(),
      mode: mode
    }
    
    setSessions([newSession, ...sessions])
    
    if (mode === 'focus') {
      const newCount = pomodoroCount + 1
      setPomodoroCount(newCount)
      
      if (newCount % 4 === 0) {
        setMode('long-break')
        setDuration(15)
        setTimeLeft(15 * 60)
      } else {
        setMode('short-break')
        setDuration(5)
        setTimeLeft(5 * 60)
      }
    } else {
      setMode('focus')
      setDuration(25)
      setTimeLeft(25 * 60)
    }
    
    setTask('')
    updateStats()
    playSound()
  }

  const updateStats = () => {
    const today = new Date().toDateString()
    const todaySessions = sessions.filter(s => 
      new Date(s.completedAt).toDateString() === today
    ).length + 1
    
    const totalMinutes = sessions.reduce((acc, s) => acc + s.duration, 0) + duration
    
    setStats({
      streak: pomodoroCount + 1,
      totalMinutes: totalMinutes,
      todaySessions: todaySessions
    })
  }

  const generateAIInsights = () => {
    if (sessions.length === 0) {
      setAiInsights(['Complete some sessions to get AI insights!'])
      setShowInsights(true)
      return
    }
    
    const insights = []
    const avgDuration = sessions.reduce((acc, s) => acc + s.duration, 0) / sessions.length
    
    if (avgDuration < 20) {
      insights.push('📊 Try longer focus sessions (25+ min) for deep work')
    } else {
      insights.push('✨ Great focus duration! You\'re in the zone')
    }
    
    const today = new Date().toDateString()
    const todaySessions = sessions.filter(s => 
      new Date(s.completedAt).toDateString() === today
    ).length
    
    if (todaySessions >= 4) {
      insights.push('🔥 Amazing! 4+ sessions today - you\'re crushing it!')
    } else if (todaySessions >= 2) {
      insights.push('👍 Good progress! Keep the momentum going')
    }
    
    if (pomodoroCount % 4 === 3) {
      insights.push('🎯 Next break will be longer - you\'ve earned it!')
    }
    
    insights.push(`💪 Total productivity: ${Math.floor(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m`)
    
    setAiInsights(insights)
    setShowInsights(true)
  }

  const playSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFAtNouL...') // Beep sound
    audio.play().catch(e => console.log('Audio play failed'))
  }

  const addApp = () => {
    if (newApp.trim() && !blockedApps.includes(newApp.toLowerCase().trim())) {
      setBlockedApps([...blockedApps, newApp.toLowerCase().trim()])
      setNewApp('')
    }
  }

  const removeApp = (app) => {
    setBlockedApps(blockedApps.filter(a => a !== app))
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100

  return (
    <div style={{
      minHeight: '100vh',
      background: mode === 'focus' 
        ? 'linear-gradient(135deg, #0f172a, #1e293b, #334155)'
        : 'linear-gradient(135deg, #065f46, #047857)',
      color: '#fff',
      padding: 40,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ maxWidth: 1200, width: '100%' }}>
        <h1 style={{
          fontSize: 52,
          fontWeight: 'bold',
          marginBottom: 10,
          textAlign: 'center',
          background: mode === 'focus'
            ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
            : 'linear-gradient(135deg, #10b981, #34d399)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          ⏰ FocusAI Pro
        </h1>
        <p style={{ textAlign: 'center', fontSize: 18, color: '#94a3b8', marginBottom: 40 }}>
          {mode === 'focus' ? '🎯 Deep Focus Mode' : '☕ Break Time'}
        </p>

        {/* Main Timer */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 350px',
          gap: 30,
          marginBottom: 30
        }}>
          {/* Left - Timer */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(20px)',
            borderRadius: 25,
            padding: 50,
            border: '2px solid rgba(255,255,255,0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Progress Ring */}
            <svg style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 350,
              height: 350
            }}>
              <circle
                cx="175"
                cy="175"
                r="160"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="12"
              />
              <circle
                cx="175"
                cy="175"
                r="160"
                fill="none"
                stroke={mode === 'focus' ? '#06b6d4' : '#10b981'}
                strokeWidth="12"
                strokeDasharray={`${2 * Math.PI * 160}`}
                strokeDashoffset={`${2 * Math.PI * 160 * (1 - progress / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 175 175)"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>

            {/* Time Display */}
            <div style={{
              position: 'relative',
              zIndex: 1,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: 92,
                fontWeight: 'bold',
                marginBottom: 25,
                fontFamily: 'monospace',
                letterSpacing: 5
              }}>
                {formatTime(timeLeft)}
              </div>

              {/* Task Input */}
              {!isActive && (
                <input
                  placeholder="What are you working on?"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '15px 20px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: 15,
                    color: '#fff',
                    fontSize: 16,
                    marginBottom: 20,
                    outline: 'none'
                  }}
                />
              )}

              {isActive && (
                <div style={{
                  fontSize: 22,
                  fontWeight: 'bold',
                  marginBottom: 20,
                  color: '#94a3b8'
                }}>
                  {task}
                </div>
              )}

              {/* Controls */}
              <div style={{ display: 'flex', gap: 15, justifyContent: 'center' }}>
                {!isActive ? (
                  <button
                    onClick={startTimer}
                    style={{
                      padding: '18px 50px',
                      background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                      border: 'none',
                      borderRadius: 15,
                      color: '#fff',
                      fontSize: 20,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 10px 30px rgba(6,182,212,0.4)'
                    }}
                  >
                    ▶️ Start
                  </button>
                ) : (
                  <>
                    <button
                      onClick={stopTimer}
                      style={{
                        padding: '18px 40px',
                        background: '#ef4444',
                        border: 'none',
                        borderRadius: 15,
                        color: '#fff',
                        fontSize: 18,
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      ⏸️ Stop
                    </button>
                    <button
                      onClick={resetTimer}
                      style={{
                        padding: '18px 40px',
                        background: '#f59e0b',
                        border: 'none',
                        borderRadius: 15,
                        color: '#fff',
                        fontSize: 18,
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      🔄 Reset
                    </button>
                  </>
                )}
              </div>

              {/* Mode Selection */}
              {!isActive && (
                <div style={{ display: 'flex', gap: 12, marginTop: 25, justifyContent: 'center' }}>
                  {[
                    { mode: 'focus', time: 25, emoji: '🎯' },
                    { mode: 'short-break', time: 5, emoji: '☕' },
                    { mode: 'long-break', time: 15, emoji: '🌴' }
                  ].map(m => (
                    <button
                      key={m.mode}
                      onClick={() => {
                        setMode(m.mode)
                        setDuration(m.time)
                        setTimeLeft(m.time * 60)
                      }}
                      style={{
                        padding: '12px 20px',
                        background: mode === m.mode 
                          ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                          : 'rgba(0,0,0,0.3)',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderRadius: 12,
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {m.emoji} {m.time}min
                    </button>
                  ))}
                </div>
              )}

              {/* Blocking Status */}
              {blockingActive && (
                <div style={{
                  marginTop: 25,
                  padding: '12px 20px',
                  background: 'rgba(239,68,68,0.2)',
                  border: '2px solid #ef4444',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10
                }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#ef4444',
                    animation: 'pulse 2s infinite'
                  }} />
                  🚫 Blocking {blockedApps.length} apps
                </div>
              )}
            </div>
          </div>

          {/* Right - Blocked Apps */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(20px)',
            borderRadius: 25,
            padding: 30,
            border: '2px solid rgba(255,255,255,0.1)',
            maxHeight: 600,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ fontSize: 22, marginBottom: 20, fontWeight: 'bold' }}>
              🚫 Blocked Apps
            </h3>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <input
                placeholder="App name (e.g., chrome)"
                value={newApp}
                onChange={(e) => setNewApp(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addApp()}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
              <button
                onClick={addApp}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                  border: 'none',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ➕
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              {blockedApps.map(app => (
                <div
                  key={app}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(239,68,68,0.2)',
                    border: '2px solid #ef4444',
                    borderRadius: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 'bold' }}>
                    🚫 {app}
                  </span>
                  <button
                    onClick={() => removeApp(app)}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(0,0,0,0.4)',
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    ✖
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats & Sessions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20,
          marginBottom: 30
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(20px)',
            borderRadius: 20,
            padding: 25,
            border: '2px solid rgba(255,255,255,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 42, fontWeight: 'bold', color: '#06b6d4', marginBottom: 8 }}>
              {pomodoroCount}
            </div>
            <div style={{ fontSize: 14, color: '#94a3b8' }}>🍅 Pomodoros</div>
          </div>

          <div style={{
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(20px)',
            borderRadius: 20,
            padding: 25,
            border: '2px solid rgba(255,255,255,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 42, fontWeight: 'bold', color: '#10b981', marginBottom: 8 }}>
              {stats.todaySessions}
            </div>
            <div style={{ fontSize: 14, color: '#94a3b8' }}>📅 Today</div>
          </div>

          <div style={{
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(20px)',
            borderRadius: 20,
            padding: 25,
            border: '2px solid rgba(255,255,255,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 42, fontWeight: 'bold', color: '#f59e0b', marginBottom: 8 }}>
              {Math.floor(stats.totalMinutes / 60)}h
            </div>
            <div style={{ fontSize: 14, color: '#94a3b8' }}>⏱️ Total Time</div>
          </div>

          <div style={{
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(20px)',
            borderRadius: 20,
            padding: 25,
            border: '2px solid rgba(255,255,255,0.1)',
            textAlign: 'center'
          }}>
            <button
              onClick={generateAIInsights}
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                border: 'none',
                borderRadius: 16,
                color: '#fff',
                fontSize: 16,
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <span style={{ fontSize: 32 }}>✨</span>
              <span>AI Insights</span>
            </button>
          </div>
        </div>

        {/* AI Insights Modal */}
        {showInsights && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={() => setShowInsights(false)}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #1e293b, #334155)',
                borderRadius: 25,
                padding: 40,
                maxWidth: 600,
                width: '90%',
                border: '3px solid #8b5cf6'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ fontSize: 32, marginBottom: 25, fontWeight: 'bold' }}>
                ✨ AI Productivity Insights
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginBottom: 30 }}>
                {aiInsights.map((insight, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 18,
                      background: 'rgba(139,92,246,0.2)',
                      border: '2px solid #8b5cf6',
                      borderRadius: 15,
                      fontSize: 16,
                      lineHeight: 1.6
                    }}
                  >
                    {insight}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowInsights(false)}
                style={{
                  width: '100%',
                  padding: '15px',
                  background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                  border: 'none',
                  borderRadius: 15,
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Got it! 👍
              </button>
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(20px)',
            borderRadius: 25,
            padding: 30,
            border: '2px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ fontSize: 22, marginBottom: 20, fontWeight: 'bold' }}>
              📝 Recent Sessions
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto' }}>
              {sessions.slice(0, 10).map(session => (
                <div
                  key={session.id}
                  style={{
                    padding: 16,
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
                      {session.task}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      {new Date(session.completedAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{
                    padding: '8px 16px',
                    background: session.mode === 'focus' 
                      ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                      : 'linear-gradient(135deg, #10b981, #34d399)',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 'bold'
                  }}>
                    {session.duration} min
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}
