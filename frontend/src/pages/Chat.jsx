import React, { useState, useEffect, useRef } from 'react'
import { apiUrl } from '../lib/api'
import Page from '../components/layout/Page'
import Button from '../components/ui/Button'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import Loader from '../components/ui/Loader'
import ErrorNote from '../components/ui/ErrorNote'

export default function Chat() {
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [capabilities, setCapabilities] = useState(null)
  const [sessionSummary, setSessionSummary] = useState(null)
  
  // Advanced settings
  const [learningStyle, setLearningStyle] = useState('adaptive')
  const [subjectArea, setSubjectArea] = useState('general')
  const [difficultyLevel, setDifficultyLevel] = useState('intermediate')
  const [showSettings, setShowSettings] = useState(false)
  
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const learningStyles = [
    { value: 'adaptive', label: '🔄 Adaptive (Recommended)' },
    { value: 'visual', label: '👁️ Visual' },
    { value: 'auditory', label: '👂 Auditory' },
    { value: 'kinesthetic', label: '🤲 Hands-on' },
    { value: 'reading_writing', label: '📖 Reading/Writing' }
  ]

  const subjectAreas = [
    { value: 'general', label: '📚 General Learning' },
    { value: 'mathematics', label: '🔢 Mathematics' },
    { value: 'science', label: '🔬 Science' },
    { value: 'programming', label: '💻 Programming' },
    { value: 'language', label: '🗣️ Language Arts' },
    { value: 'history', label: '🏛️ History' },
    { value: 'study_skills', label: '📝 Study Skills' }
  ]

  const difficultyLevels = [
    { value: 'beginner', label: '🌱 Beginner' },
    { value: 'intermediate', label: '📈 Intermediate' },
    { value: 'advanced', label: '🎯 Advanced' },
    { value: 'expert', label: '🏆 Expert' }
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    loadCapabilities()
    // Add welcome message
    setMessages([{
      role: 'assistant',
      content: `Hi! I'm EduChat. Ask me any question and I'll give you clear, simple answers. What would you like to know?`,
      timestamp: new Date().toISOString(),
      isWelcome: true
    }])
  }, [])

  const loadCapabilities = async () => {
    try {
      const res = await fetch(apiUrl('/api/educhat/capabilities'))
      const data = await res.json()
      setCapabilities(data)
    } catch (e) {
      console.warn('Could not load capabilities:', e)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return
    
    const userMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch(apiUrl('/api/educhat/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage.content,
          learning_style: learningStyle,
          subject_area: subjectArea,
          difficulty_level: difficultyLevel
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        const assistantMessage = {
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toISOString(),
          messageId: data.message_id,
          contextDetected: data.context_detected,
          suggestedFollowups: data.suggested_followups,
          educationalResources: data.educational_resources,
          confidenceScore: data.confidence_score,
          learningInsights: data.learning_insights
        }
        
        setMessages(prev => [...prev, assistantMessage])
        
        // Update session summary
        if (data.learning_insights) {
          setSessionSummary(data.learning_insights)
        }
      } else {
        setError(data.detail || 'Failed to get response')
      }
    } catch (e) {
      setError(`Network error: ${e.message}`)
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const clearSession = async () => {
    try {
      await fetch(apiUrl('/api/educhat/clear'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      })
      setMessages([])
      setSessionSummary(null)
      setError('')
    } catch (e) {
      setError('Failed to clear session')
    }
  }

  const handleFollowUp = (question) => {
    setInputMessage(question)
    inputRef.current?.focus()
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatMessage = (content) => {
    // Enhanced markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^\• (.*$)/gm, '<li>$1</li>')
      .replace(/^✅ (.*$)/gm, '<div class="check-item">✅ $1</div>')
      .replace(/^❌ (.*$)/gm, '<div class="error-item">❌ $1</div>')
      .replace(/^🎯 (.*$)/gm, '<div class="goal-item">🎯 $1</div>')
      .replace(/\n/g, '<br>')
  }

  return (
    <Page 
      title="EduChat - AI Learning Assistant" 
      description="Your intelligent study companion for learning any subject. Ask questions, get instant answers, and explore new topics."
    >
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        height: 'calc(100vh - 200px)', 
        minHeight: '600px' 
      }}>
        {/* Main Chat Interface */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          {/* Chat Header */}
          <div style={{
            padding: '16px 20px',
            background: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#111827', fontWeight: '600' }}>EduChat</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                Your AI study assistant
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#e5e7eb'}
                onMouseLeave={(e) => e.target.style.background = '#f3f4f6'}
                title="Settings"
              >
                ⚙️
              </button>
              <button
                onClick={clearSession}
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#e5e7eb'}
                onMouseLeave={(e) => e.target.style.background = '#f3f4f6'}
                title="New Chat"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div style={{
              padding: '16px',
              background: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              <Field label="Learning Style">
                <Select value={learningStyle} onChange={(e) => setLearningStyle(e.target.value)}>
                  {learningStyles.map(style => (
                    <option key={style.value} value={style.value}>{style.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Subject Focus">
                <Select value={subjectArea} onChange={(e) => setSubjectArea(e.target.value)}>
                  {subjectAreas.map(area => (
                    <option key={area.value} value={area.value}>{area.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Difficulty Level">
                <Select value={difficultyLevel} onChange={(e) => setDifficultyLevel(e.target.value)}>
                  {difficultyLevels.map(level => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          {/* Messages Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            background: '#ffffff'
          }}>
            {messages.map((msg, idx) => (
              <div key={idx}>
                <div style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '4px'
                }}>
                  <div style={{
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: '16px',
                    background: msg.role === 'user' 
                      ? '#3b82f6'
                      : '#f3f4f6',
                    color: msg.role === 'user' ? '#ffffff' : '#111827',
                    fontSize: '15px',
                    lineHeight: '1.6',
                    boxShadow: msg.role === 'user' ? '0 1px 2px rgba(59,130,246,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    <div 
                      style={{ lineHeight: '1.6' }}
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
                    
                    {msg.contextDetected && msg.contextDetected.length > 0 && (
                      <div style={{ 
                        marginTop: '10px', 
                        padding: '6px 10px', 
                        background: msg.role === 'user' ? 'rgba(255,255,255,0.15)' : '#e5e7eb', 
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: msg.role === 'user' ? '#ffffff' : '#4b5563'
                      }}>
                        <strong>📚 Topics:</strong> {msg.contextDetected.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Enhanced Features Display */}
                {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                  <div style={{ marginLeft: '0px', marginTop: '8px' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' }}>
                      💡 Suggested questions:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {msg.suggestedFollowups.slice(0, 3).map((question, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => handleFollowUp(question)}
                          style={{
                            padding: '8px 14px',
                            fontSize: '13px',
                            background: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '20px',
                            color: '#374151',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontWeight: '500'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#f3f4f6'
                            e.target.style.borderColor = '#d1d5db'
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#ffffff'
                            e.target.style.borderColor = '#e5e7eb'
                          }}
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {msg.educationalResources && msg.educationalResources.length > 0 && (
                  <div style={{ marginLeft: '0px', marginTop: '8px' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' }}>
                      📖 Resources:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {msg.educationalResources.map((resource, rIdx) => (
                        <div key={rIdx} style={{
                          padding: '10px 12px',
                          background: '#f9fafb',
                          borderRadius: '8px',
                          fontSize: '13px',
                          border: '1px solid #e5e7eb',
                          color: '#374151'
                        }}>
                          <strong style={{ color: '#111827' }}>{resource.type}:</strong> {resource.title} - {resource.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {msg.confidenceScore && (
                  <div style={{ marginLeft: '0px', marginTop: '6px', fontSize: '12px', color: '#9ca3af' }}>
                    🎯 Confidence: {Math.round(msg.confidenceScore * 100)}%
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '16px',
                  background: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <Loader />
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    Thinking...
                  </span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid #e5e7eb',
            background: '#ffffff'
          }}>
            {error && <ErrorNote style={{ marginBottom: '12px' }}>{error}</ErrorNote>}
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about any subject..."
                  rows={2}
                  style={{ 
                    resize: 'none',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    padding: '12px',
                    fontSize: '15px',
                    color: '#111827'
                  }}
                />
              </div>
              <Button 
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                style={{ 
                  whiteSpace: 'nowrap',
                  background: '#3b82f6',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '15px'
                }}
              >
                Send
              </Button>
            </div>
            
            <div style={{ 
              fontSize: '12px', 
              color: '#9ca3af', 
              marginTop: '10px',
              textAlign: 'center'
            }}>
              Press Enter to send • Shift+Enter for new line
            </div>
          </div>
        </div>

        {/* Sidebar - Session Info & Capabilities */}
        <div style={{
          width: '300px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Session Summary */}
          {sessionSummary && (
            <div style={{
              background: '#ffffff',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#3b82f6', fontSize: '16px', fontWeight: '600' }}>📊 Learning Session</h4>
              <div style={{ fontSize: '13px', lineHeight: '1.8', color: '#374151' }}>
                <div><strong style={{ color: '#111827' }}>Messages:</strong> {sessionSummary.session_duration}</div>
                <div><strong style={{ color: '#111827' }}>Subjects:</strong> {sessionSummary.subjects_covered?.join(', ') || 'General'}</div>
                <div><strong style={{ color: '#111827' }}>Progress:</strong> {sessionSummary.learning_progression}</div>
                <div><strong style={{ color: '#111827' }}>Pace:</strong> {sessionSummary.recommended_pace}</div>
              </div>
            </div>
          )}

          {/* Capabilities */}
          {capabilities && (
            <div style={{
              background: '#ffffff',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#3b82f6', fontSize: '16px', fontWeight: '600' }}>✨ Features</h4>
              <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#374151' }}>
                <div style={{ marginBottom: '10px' }}>
                  <strong style={{ color: '#111827' }}>Learning Support:</strong>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                    <li>Instant answers to any question</li>
                    <li>Adaptive learning styles</li>
                    <li>Progress tracking</li>
                  </ul>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong style={{ color: '#111827' }}>Subject Coverage:</strong>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                    <li>Mathematics & Science</li>
                    <li>Programming & Technology</li>
                    <li>History & Language Arts</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Quick Tips */}
          <div style={{
            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
            padding: '16px',
            borderRadius: '12px',
            color: '#1e40af',
            border: '1px solid #93c5fd'
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>💡 Tips</h4>
            <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
              • Ask specific questions for better answers<br/>
              • Use settings to personalize your experience<br/>
              • Try different difficulty levels<br/>
              • Explore suggested follow-up questions
            </div>
          </div>
        </div>
      </div>
    </Page>
  )
}