import React, { useState, useRef, useEffect } from 'react'
import { apiUrl } from '../lib/api'

export default function Meet() {
  const [view, setView] = useState('home') // home, create, meeting

  useEffect(() => {
    // Add pulse animation for face recognition indicator
    const style = document.createElement('style')
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.05); }
      }
    `
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  const [meetings, setMeetings] = useState([])
  const [currentMeeting, setCurrentMeeting] = useState(null)
  const [userName, setUserName] = useState(localStorage.getItem('eduMeetUserName') || '')
  
  // Create Meeting Form
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingDescription, setMeetingDescription] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [duration, setDuration] = useState(60)
  const [maxParticipants, setMaxParticipants] = useState(100)
  const [enableRecording, setEnableRecording] = useState(false)
  const [enableAttendance, setEnableAttendance] = useState(true)
  const [enableBreakoutRooms, setEnableBreakoutRooms] = useState(false)
  const [enableWhiteboard, setEnableWhiteboard] = useState(true)
  const [requireApproval, setRequireApproval] = useState(false)
  
  // Meeting State
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [showWhiteboard, setShowWhiteboard] = useState(false)
  const [showPolls, setShowPolls] = useState(false)
  const [showBreakout, setShowBreakout] = useState(false)
  const [showAttendancePanel, setShowAttendancePanel] = useState(false)
  const [layout, setLayout] = useState('grid') // grid, speaker, sidebar
  const [attendance, setAttendance] = useState([])
  const [enrolledUsers, setEnrolledUsers] = useState([])
  const [faceRecognitionEnabled, setFaceRecognitionEnabled] = useState(false)
  const [polls, setPolls] = useState([])
  const [breakoutRooms, setBreakoutRooms] = useState([])
  const [whiteboardData, setWhiteboardData] = useState({ shapes: [] })
  const [reactions, setReactions] = useState([])
  const [recordings, setRecordings] = useState([])
  
  // Whiteboard
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawColor, setDrawColor] = useState('#000000')
  const [drawWidth, setDrawWidth] = useState(2)
  
  // Video Refs
  const localVideoRef = useRef(null)
  const recognitionCanvasRef = useRef(null)
  const recognitionIntervalRef = useRef(null)
  const remoteVideosRef = useRef({})

  useEffect(() => {
    loadMeetings()
  }, [])

  async function loadMeetings() {
    try {
      const res = await fetch(apiUrl('/api/edumeet/meetings/list'))
      const data = await res.json()
      setMeetings(data.meetings || [])
    } catch (e) {
      console.error('Failed to load meetings:', e)
    }
  }

  async function createMeeting() {
    console.log('Create Meeting clicked', { meetingTitle, userName })
    
    if (!meetingTitle.trim() || !userName.trim()) {
      alert('Please enter meeting title and your name')
      return
    }
    
    console.log('Creating meeting...')
    
    try {
      const res = await fetch(apiUrl('/api/edumeet/meeting/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: meetingTitle,
          description: meetingDescription,
          host: userName,
          scheduled_time: scheduledTime || new Date().toISOString(),
          duration_minutes: duration,
          max_participants: maxParticipants,
          settings: {
            enable_recording: enableRecording,
            enable_attendance: enableAttendance,
            enable_breakout_rooms: enableBreakoutRooms,
            enable_whiteboard: enableWhiteboard,
            require_approval: requireApproval
          }
        })
      })
      
      console.log('Response status:', res.status)
      const data = await res.json()
      console.log('Response data:', data)
      
      if (data.meeting) {
        setCurrentMeeting(data.meeting)
        localStorage.setItem('eduMeetUserName', userName)
        setView('meeting')
        initializeMeeting(data.meeting.id)
      } else {
        alert('Failed to create meeting: ' + (data.error || 'Unknown error'))
      }
    } catch (e) {
      console.error('Failed to create meeting:', e)
      alert('Failed to create meeting: ' + e.message)
    }
  }

  async function joinMeeting(meeting) {
    if (!userName.trim()) {
      alert('Please enter your name')
      return
    }
    
    try {
      const res = await fetch(apiUrl('/api/edumeet/meeting/join'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id: meeting.id,
          user_name: userName
        })
      })
      const data = await res.json()
      if (data.ok) {
        setCurrentMeeting(meeting)
        localStorage.setItem('eduMeetUserName', userName)
        setView('meeting')
        initializeMeeting(meeting.id)
      }
    } catch (e) {
      console.error('Failed to join meeting:', e)
    }
  }

  async function initializeMeeting(meetingId) {
    // Load participants
    try {
      const res = await fetch(apiUrl(`/api/edumeet/meeting/${meetingId}/participants`))
      const data = await res.json()
      setParticipants(data.participants || [])
    } catch (e) {
      console.error('Failed to load participants:', e)
    }
    
    // Mark attendance
    if (currentMeeting?.settings?.enable_attendance) {
      markAttendance(meetingId)
    }
    
    // Initialize WebRTC (simplified for demo)
    initializeMedia()
  }

  async function initializeMedia() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
    } catch (e) {
      console.error('Failed to access media:', e)
    }
  }

  async function markAttendance(meetingId) {
    try {
      // Get enrolled users for face recognition
      const enrolledRes = await fetch(apiUrl('/api/attendance/enrolled'))
      const enrolledData = await enrolledRes.json()
      if (enrolledData.ok) {
        setEnrolledUsers(enrolledData.users || [])
      }

      // Mark initial attendance
      await fetch(apiUrl('/api/edumeet/attendance/mark'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id: meetingId,
          user_name: userName,
          timestamp: new Date().toISOString()
        })
      })

      // Start face recognition if enabled
      if (faceRecognitionEnabled && localVideoRef.current) {
        startFaceRecognition(meetingId)
      }
    } catch (e) {
      console.error('Failed to mark attendance:', e)
    }
  }

  function startFaceRecognition(meetingId) {
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current)
    }

    recognitionIntervalRef.current = setInterval(async () => {
      if (!localVideoRef.current || !recognitionCanvasRef.current) return

      const video = localVideoRef.current
      const canvas = recognitionCanvasRef.current

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
            // Update attendance with recognized user
            await fetch(apiUrl('/api/edumeet/attendance/mark'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                meeting_id: meetingId,
                user_name: data.match.name,
                recognized: true,
                confidence: data.match.similarity,
                timestamp: new Date().toISOString()
              })
            })

            // Update local attendance list
            setAttendance(prev => {
              const exists = prev.find(a => a.user_name === data.match.name)
              if (!exists) {
                return [...prev, {
                  user_name: data.match.name,
                  recognized: true,
                  confidence: (data.match.similarity * 100).toFixed(0) + '%',
                  timestamp: new Date().toISOString()
                }]
              }
              return prev
            })
          }
        } catch (e) {
          console.error('Face recognition error:', e)
        }
      }, 'image/jpeg', 0.85)
    }, 3000) // Check every 3 seconds
  }

  useEffect(() => {
    return () => {
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current)
      }
    }
  }, [])

  function toggleVideo() {
    setIsVideoOn(!isVideoOn)
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getVideoTracks().forEach(track => {
        track.enabled = !isVideoOn
      })
    }
  }

  function toggleAudio() {
    setIsAudioOn(!isAudioOn)
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getAudioTracks().forEach(track => {
        track.enabled = !isAudioOn
      })
    }
  }

  async function shareScreen() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      setIsScreenSharing(true)
      // Replace video track with screen track
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      stream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false)
        initializeMedia() // Restore camera
      }
    } catch (e) {
      console.error('Failed to share screen:', e)
    }
  }

  function sendMessage() {
    if (!newMessage.trim()) return
    const msg = {
      id: Date.now(),
      user: userName,
      text: newMessage,
      timestamp: new Date().toISOString()
    }
    setMessages([...messages, msg])
    setNewMessage('')
    
    // Send to server
    fetch(apiUrl('/api/edumeet/chat/send'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meeting_id: currentMeeting.id, message: msg })
    }).catch(e => console.error('Failed to send message:', e))
  }

  function sendReaction(emoji) {
    const reaction = { user: userName, emoji, timestamp: Date.now() }
    setReactions([...reactions, reaction])
    setTimeout(() => {
      setReactions(r => r.filter(x => x.timestamp !== reaction.timestamp))
    }, 3000)
  }

  async function endMeeting() {
    if (confirm('Are you sure you want to end this meeting?')) {
      try {
        await fetch(apiUrl(`/api/edumeet/meeting/${currentMeeting.id}/end`), {
          method: 'POST'
        })
        setView('home')
        setCurrentMeeting(null)
        loadMeetings()
      } catch (e) {
        console.error('Failed to end meeting:', e)
      }
    }
  }

  async function createPoll() {
    const question = prompt('Enter poll question:')
    if (!question) return
    const options = prompt('Enter options (comma separated):')?.split(',').map(o => o.trim()).filter(Boolean)
    if (!options || options.length < 2) return
    
    const poll = {
      id: Date.now(),
      question,
      options: options.map(o => ({ text: o, votes: 0 })),
      voters: []
    }
    
    try {
      const res = await fetch(apiUrl('/api/edumeet/poll/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: currentMeeting.id, poll })
      })
      const data = await res.json()
      if (data.ok) {
        setPolls([...polls, poll])
      }
    } catch (e) {
      console.error('Failed to create poll:', e)
    }
  }

  function votePoll(pollId, optionIndex) {
    setPolls(polls.map(p => {
      if (p.id === pollId && !p.voters.includes(userName)) {
        p.options[optionIndex].votes++
        p.voters.push(userName)
      }
      return p
    }))
  }

  async function createBreakoutRoom() {
    const name = prompt('Enter breakout room name:')
    if (!name) return
    
    const room = {
      id: Date.now(),
      name,
      participants: []
    }
    
    try {
      const res = await fetch(apiUrl('/api/edumeet/breakout/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: currentMeeting.id, room })
      })
      const data = await res.json()
      if (data.ok) {
        setBreakoutRooms([...breakoutRooms, room])
      }
    } catch (e) {
      console.error('Failed to create breakout room:', e)
    }
  }

  // Whiteboard functions
  function startDrawing(e) {
    setIsDrawing(true)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  function draw(e) {
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    ctx.strokeStyle = drawColor
    ctx.lineWidth = drawWidth
    ctx.lineCap = 'round'
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  function stopDrawing() {
    setIsDrawing(false)
  }

  function clearWhiteboard() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  async function downloadAttendance() {
    try {
      const res = await fetch(apiUrl(`/api/edumeet/meeting/${currentMeeting.id}/attendance`))
      const data = await res.json()
      
      // Create CSV
      const csv = [
        ['Name', 'Join Time', 'Duration', 'Status'],
        ...data.attendance.map(a => [
          a.user_name,
          new Date(a.join_time).toLocaleString(),
          a.duration || 'In progress',
          a.status || 'Present'
        ])
      ].map(row => row.join(',')).join('\n')
      
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance-${currentMeeting.title}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
    } catch (e) {
      console.error('Failed to download attendance:', e)
    }
  }

  if (view === 'home') {
    return (
      <div style={{ padding: 20, fontFamily: 'system-ui', maxWidth: 1400, margin: '0 auto' }}>
        <header style={{ marginBottom: 40, textAlign: 'center' }}>
          <h1 style={{ fontSize: 48, margin: 0, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📹 EduMeet Pro
          </h1>
          <p style={{ color: '#666', fontSize: 18, marginTop: 10 }}>
            Advanced Video Conferencing • Smart Attendance • Collaboration Tools
          </p>
        </header>

        <div style={{ marginBottom: 30 }}>
          <input
            type="text"
            placeholder="Enter your name"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            style={{
              width: '100%',
              maxWidth: 400,
              padding: 15,
              fontSize: 16,
              border: '2px solid #ddd',
              borderRadius: 10,
              marginBottom: 20
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 20, marginBottom: 40, flexWrap: 'wrap' }}>
          <button
            onClick={() => setView('create')}
            style={{
              padding: '20px 40px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 18,
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
          >
            🎥 Create New Meeting
          </button>
          
          <button
            onClick={loadMeetings}
            style={{
              padding: '20px 40px',
              background: '#fff',
              color: '#667eea',
              border: '2px solid #667eea',
              borderRadius: 10,
              fontSize: 18,
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh Meetings
          </button>
        </div>

        <div>
          <h2 style={{ fontSize: 28, marginBottom: 20 }}>Active Meetings</h2>
          
          {meetings.length === 0 ? (
            <div style={{ 
              padding: 60, 
              textAlign: 'center', 
              background: '#f5f5f5', 
              borderRadius: 15,
              color: '#666'
            }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>📭</div>
              <p style={{ fontSize: 18 }}>No active meetings. Create one to get started!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
              {meetings.map(meeting => (
                <div
                  key={meeting.id}
                  style={{
                    padding: 25,
                    border: '2px solid #ddd',
                    borderRadius: 15,
                    background: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <h3 style={{ margin: '0 0 10px 0', fontSize: 20 }}>{meeting.title}</h3>
                  <p style={{ color: '#666', fontSize: 14, marginBottom: 15 }}>
                    {meeting.description || 'No description'}
                  </p>
                  
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 15, fontSize: 13 }}>
                    <span style={{ padding: '4px 10px', background: '#E3F2FD', color: '#1976D2', borderRadius: 5 }}>
                      👤 {meeting.participants?.length || 0} participants
                    </span>
                    <span style={{ padding: '4px 10px', background: '#F3E5F5', color: '#7B1FA2', borderRadius: 5 }}>
                      👨‍🏫 Host: {meeting.host}
                    </span>
                    {meeting.settings?.enable_recording && (
                      <span style={{ padding: '4px 10px', background: '#FFEBEE', color: '#C62828', borderRadius: 5 }}>
                        🔴 Recording
                      </span>
                    )}
                  </div>
                  
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 15 }}>
                    Started: {new Date(meeting.created_at).toLocaleString()}
                  </div>
                  
                  <button
                    onClick={() => joinMeeting(meeting)}
                    disabled={!userName.trim()}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: userName.trim() ? '#4CAF50' : '#ccc',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: '600',
                      cursor: userName.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Join Meeting
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (view === 'create') {
    return (
      <div style={{ padding: 20, fontFamily: 'system-ui', maxWidth: 800, margin: '0 auto' }}>
        <button
          onClick={() => setView('home')}
          style={{
            padding: '10px 20px',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 8,
            cursor: 'pointer',
            marginBottom: 20
          }}
        >
          ← Back
        </button>

        <h1 style={{ fontSize: 36, marginBottom: 30 }}>Create New Meeting</h1>

        <div style={{ display: 'grid', gap: 20 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: '600' }}>Meeting Title *</label>
            <input
              type="text"
              value={meetingTitle}
              onChange={e => setMeetingTitle(e.target.value)}
              placeholder="e.g., Math Class - Chapter 5"
              style={{ width: '100%', padding: 12, fontSize: 16, border: '2px solid #ddd', borderRadius: 8 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: '600' }}>Description</label>
            <textarea
              value={meetingDescription}
              onChange={e => setMeetingDescription(e.target.value)}
              placeholder="Add meeting description..."
              style={{ width: '100%', padding: 12, fontSize: 16, border: '2px solid #ddd', borderRadius: 8, minHeight: 80 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: '600' }}>Duration (minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value))}
                style={{ width: '100%', padding: 12, fontSize: 16, border: '2px solid #ddd', borderRadius: 8 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: '600' }}>Max Participants</label>
              <input
                type="number"
                value={maxParticipants}
                onChange={e => setMaxParticipants(parseInt(e.target.value))}
                style={{ width: '100%', padding: 12, fontSize: 16, border: '2px solid #ddd', borderRadius: 8 }}
              />
            </div>
          </div>

          <div style={{ padding: 20, background: '#f5f5f5', borderRadius: 10 }}>
            <h3 style={{ marginTop: 0, marginBottom: 15 }}>Meeting Settings</h3>
            
            <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enableAttendance}
                  onChange={e => setEnableAttendance(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
                <span>✅ Enable Smart Attendance Tracking</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enableRecording}
                  onChange={e => setEnableRecording(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
                <span>🔴 Enable Recording</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enableWhiteboard}
                  onChange={e => setEnableWhiteboard(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
                <span>🖍️ Enable Collaborative Whiteboard</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enableBreakoutRooms}
                  onChange={e => setEnableBreakoutRooms(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
                <span>🚪 Enable Breakout Rooms</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={e => setRequireApproval(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
                <span>🔒 Require Host Approval to Join</span>
              </label>
            </div>
          </div>

          <button
            onClick={createMeeting}
            disabled={!meetingTitle.trim() || !userName.trim()}
            style={{
              padding: '16px',
              background: meetingTitle.trim() && userName.trim() 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                : 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 18,
              fontWeight: '600',
              cursor: meetingTitle.trim() && userName.trim() ? 'pointer' : 'not-allowed',
              boxShadow: meetingTitle.trim() && userName.trim() ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none',
              position: 'relative'
            }}
            title={!userName.trim() ? 'Please enter your name on the home screen' : !meetingTitle.trim() ? 'Please enter a meeting title' : ''}
          >
            {!userName.trim() ? '⚠️ Enter Your Name First' : !meetingTitle.trim() ? '⚠️ Enter Meeting Title' : 'Create Meeting & Start'}
          </button>
          
          {!userName.trim() && (
            <p style={{ color: '#f44336', fontSize: 14, marginTop: 10, textAlign: 'center' }}>
              ⚠️ Please go back and enter your name on the home screen
            </p>
          )}
        </div>
      </div>
    )
  }

  if (view === 'meeting' && currentMeeting) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui', background: '#1a1a1a' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '15px 20px', 
          background: '#2d2d2d',
          borderBottom: '1px solid #444'
        }}>
          <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>{currentMeeting.title}</h3>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 5 }}>
              {participants.length} participants • {new Date(currentMeeting.created_at).toLocaleTimeString()}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setLayout('grid')}
              style={{
                padding: '8px 16px',
                background: layout === 'grid' ? '#667eea' : '#444',
                color: '#fff',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
                fontSize: 12
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setLayout('speaker')}
              style={{
                padding: '8px 16px',
                background: layout === 'speaker' ? '#667eea' : '#444',
                color: '#fff',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
                fontSize: 12
              }}
            >
              Speaker
            </button>
            <button
              onClick={() => setLayout('sidebar')}
              style={{
                padding: '8px 16px',
                background: layout === 'sidebar' ? '#667eea' : '#444',
                color: '#fff',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
                fontSize: 12
              }}
            >
              Sidebar
            </button>
          </div>

          <button
            onClick={endMeeting}
            style={{
              padding: '10px 20px',
              background: '#d32f2f',
              color: '#fff',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            End Meeting
          </button>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Video Grid */}
          <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: layout === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr',
              gap: 15,
              height: '100%'
            }}>
              {/* Local Video */}
              <div style={{ 
                position: 'relative', 
                background: '#000', 
                borderRadius: 10, 
                overflow: 'hidden',
                minHeight: 200
              }}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <canvas 
                  ref={recognitionCanvasRef}
                  style={{ display: 'none' }}
                />
                <div style={{ 
                  position: 'absolute', 
                  bottom: 10, 
                  left: 10, 
                  background: 'rgba(0,0,0,0.7)', 
                  color: '#fff', 
                  padding: '5px 10px', 
                  borderRadius: 5,
                  fontSize: 12
                }}>
                  {userName} (You)
                </div>
                {faceRecognitionEnabled && (
                  <div style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    animation: 'pulse 2s infinite'
                  }}>
                    <span style={{ fontSize: 14 }}>🎯</span>
                    Face Recognition Active
                  </div>
                )}
                {!isVideoOn && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: 64,
                    color: '#fff'
                  }}>
                    👤
                  </div>
                )}
              </div>

              {/* Participant Videos (Demo) */}
              {participants.filter(p => p !== userName).slice(0, 11).map((participant, i) => (
                <div 
                  key={i}
                  style={{ 
                    position: 'relative', 
                    background: '#333', 
                    borderRadius: 10, 
                    overflow: 'hidden',
                    minHeight: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <div style={{ fontSize: 64, color: '#666' }}>👤</div>
                  <div style={{ 
                    position: 'absolute', 
                    bottom: 10, 
                    left: 10, 
                    background: 'rgba(0,0,0,0.7)', 
                    color: '#fff', 
                    padding: '5px 10px', 
                    borderRadius: 5,
                    fontSize: 12
                  }}>
                    {participant}
                  </div>
                </div>
              ))}
            </div>

            {/* Floating Reactions */}
            <div style={{ position: 'fixed', bottom: 120, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10 }}>
              {reactions.map((r, i) => (
                <div
                  key={r.timestamp}
                  style={{
                    fontSize: 48,
                    animation: 'floatUp 3s ease-out',
                    opacity: 0
                  }}
                >
                  {r.emoji}
                </div>
              ))}
            </div>
          </div>

          {/* Side Panels */}
          {showChat && (
            <div style={{ 
              width: 350, 
              background: '#2d2d2d', 
              borderLeft: '1px solid #444',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ padding: 15, borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: '#fff' }}>Chat</h4>
                <button
                  onClick={() => setShowChat(false)}
                  style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
              <div style={{ flex: 1, padding: 15, overflowY: 'auto' }}>
                {messages.map(msg => (
                  <div key={msg.id} style={{ marginBottom: 15 }}>
                    <div style={{ fontSize: 12, color: '#aaa', marginBottom: 3 }}>
                      {msg.user} • {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                    <div style={{ 
                      padding: '8px 12px', 
                      background: msg.user === userName ? '#667eea' : '#444', 
                      color: '#fff', 
                      borderRadius: 8,
                      display: 'inline-block',
                      maxWidth: '80%'
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: 15, borderTop: '1px solid #444', display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  style={{ 
                    flex: 1, 
                    padding: 10, 
                    background: '#444', 
                    border: 'none', 
                    borderRadius: 5, 
                    color: '#fff' 
                  }}
                />
                <button
                  onClick={sendMessage}
                  style={{
                    padding: '10px 20px',
                    background: '#667eea',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 5,
                    cursor: 'pointer'
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {showParticipants && (
            <div style={{ 
              width: 300, 
              background: '#2d2d2d', 
              borderLeft: '1px solid #444',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ padding: 15, borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: '#fff' }}>Participants ({participants.length})</h4>
                <button
                  onClick={() => setShowParticipants(false)}
                  style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
              <div style={{ flex: 1, padding: 15, overflowY: 'auto' }}>
                {participants.map((p, i) => (
                  <div key={i} style={{ 
                    padding: '10px 15px', 
                    background: '#444', 
                    borderRadius: 8, 
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}>
                    <div style={{ fontSize: 24 }}>👤</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontWeight: '600' }}>{p}</div>
                      {p === currentMeeting.host && (
                        <div style={{ fontSize: 11, color: '#4CAF50' }}>Host</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {currentMeeting.settings?.enable_attendance && (
                <div style={{ padding: 15, borderTop: '1px solid #444' }}>
                  <button
                    onClick={downloadAttendance}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    📥 Download Attendance
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Smart Attendance Panel */}
          {showAttendancePanel && (
            <div style={{
              position: 'absolute',
              top: 70,
              right: 20,
              width: 400,
              maxHeight: '80vh',
              background: '#2a2a2a',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ padding: 15, borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: '#fff' }}>✅ Smart Attendance</h4>
                <button
                  onClick={() => setShowAttendancePanel(false)}
                  style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: 15, background: '#333', borderBottom: '1px solid #444' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={faceRecognitionEnabled}
                    onChange={(e) => {
                      setFaceRecognitionEnabled(e.target.checked)
                      if (e.target.checked && currentMeeting) {
                        startFaceRecognition(currentMeeting.id)
                      } else if (recognitionIntervalRef.current) {
                        clearInterval(recognitionIntervalRef.current)
                      }
                    }}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ fontWeight: '600' }}>🎯 Enable Face Recognition</span>
                </label>
                <p style={{ margin: '8px 0 0 28px', fontSize: 12, color: '#999' }}>
                  Automatically recognize enrolled users via camera
                </p>
              </div>

              <div style={{ flex: 1, padding: 15, overflowY: 'auto' }}>
                <h5 style={{ color: '#fff', marginTop: 0, marginBottom: 12 }}>Present ({attendance.length})</h5>
                {attendance.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                    No attendance marked yet
                  </div>
                ) : (
                  attendance.map((a, i) => (
                    <div key={i} style={{ 
                      padding: '12px 15px', 
                      background: a.recognized ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)' : '#444', 
                      borderRadius: 8, 
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12
                    }}>
                      <div style={{ 
                        fontSize: 24,
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: a.recognized ? '#fff' : '#555',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {a.recognized ? '✅' : '👤'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
                          {a.user_name}
                        </div>
                        {a.recognized && (
                          <div style={{ fontSize: 12, color: a.recognized ? '#fff' : '#aaa', opacity: 0.9 }}>
                            🎯 Recognized ({a.confidence})
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: a.recognized ? '#fff' : '#999', opacity: 0.8, marginTop: 2 }}>
                          {new Date(a.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ padding: 15, borderTop: '1px solid #444', display: 'flex', gap: 10 }}>
                <button
                  onClick={downloadAttendance}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  📥 Download CSV
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(attendance.map(a => `${a.user_name} - ${new Date(a.timestamp).toLocaleString()}`).join('\\n'))
                    alert('Attendance list copied!')
                  }}
                  style={{
                    padding: '12px 20px',
                    background: '#444',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  📋
                </button>
              </div>
            </div>
          )}

          {/* Chat Panel */}
          {showChat && (
            <div style={{
              width: 400,
              background: '#2d2d2d',
              borderLeft: '1px solid #444',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ padding: 15, borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: '#fff' }}>Chat</h4>
                <button
                  onClick={() => setShowChat(false)}
                  style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
              <div style={{ flex: 1, padding: 15, overflowY: 'auto' }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ marginBottom: 15 }}>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{msg.user}</div>
                    <div style={{ color: '#fff', background: '#444', padding: 10, borderRadius: 8 }}>
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: 15, borderTop: '1px solid #444', display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    padding: 10,
                    background: '#444',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff'
                  }}
                />
                <button
                  onClick={sendMessage}
                  style={{
                    padding: '10px 20px',
                    background: '#667eea',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Whiteboard Panel */}
          {showWhiteboard && (
            <div style={{ 
              width: 600, 
              background: '#2d2d2d', 
              borderLeft: '1px solid #444',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ padding: 15, borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: '#fff' }}>Whiteboard</h4>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={drawColor}
                    onChange={e => setDrawColor(e.target.value)}
                    style={{ width: 30, height: 30, border: 'none', cursor: 'pointer' }}
                  />
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={drawWidth}
                    onChange={e => setDrawWidth(parseInt(e.target.value))}
                    style={{ width: 100 }}
                  />
                  <button
                    onClick={clearWhiteboard}
                    style={{ padding: '5px 10px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowWhiteboard(false)}
                    style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <canvas
                ref={canvasRef}
                width={600}
                height={800}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{ background: '#fff', cursor: 'crosshair' }}
              />
            </div>
          )}

          {showPolls && (
            <div style={{ 
              width: 400, 
              background: '#2d2d2d', 
              borderLeft: '1px solid #444',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ padding: 15, borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: '#fff' }}>Polls</h4>
                <div style={{ display: 'flex', gap: 10 }}>
                  {currentMeeting.host === userName && (
                    <button
                      onClick={createPoll}
                      style={{ padding: '5px 10px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}
                    >
                      + Create Poll
                    </button>
                  )}
                  <button
                    onClick={() => setShowPolls(false)}
                    style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, padding: 15, overflowY: 'auto' }}>
                {polls.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#aaa', marginTop: 50 }}>
                    No polls yet
                  </div>
                ) : (
                  polls.map(poll => (
                    <div key={poll.id} style={{ padding: 15, background: '#444', borderRadius: 8, marginBottom: 15 }}>
                      <h4 style={{ color: '#fff', marginTop: 0 }}>{poll.question}</h4>
                      {poll.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => votePoll(poll.id, i)}
                          disabled={poll.voters.includes(userName)}
                          style={{
                            width: '100%',
                            padding: 10,
                            marginBottom: 8,
                            background: poll.voters.includes(userName) ? '#555' : '#667eea',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 5,
                            cursor: poll.voters.includes(userName) ? 'not-allowed' : 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}
                        >
                          <span>{opt.text}</span>
                          <span>{opt.votes} votes</span>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Control Bar */}
        <div style={{ 
          padding: '15px 20px', 
          background: '#2d2d2d', 
          borderTop: '1px solid #444',
          display: 'flex',
          justifyContent: 'center',
          gap: 15
        }}>
          <button
            onClick={toggleAudio}
            style={{
              padding: '15px 20px',
              background: isAudioOn ? '#444' : '#d32f2f',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 24,
              minWidth: 60
            }}
            title={isAudioOn ? 'Mute' : 'Unmute'}
          >
            {isAudioOn ? '🎤' : '🔇'}
          </button>

          <button
            onClick={toggleVideo}
            style={{
              padding: '15px 20px',
              background: isVideoOn ? '#444' : '#d32f2f',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 24,
              minWidth: 60
            }}
            title={isVideoOn ? 'Stop Video' : 'Start Video'}
          >
            {isVideoOn ? '📹' : '📵'}
          </button>

          <button
            onClick={shareScreen}
            style={{
              padding: '15px 20px',
              background: isScreenSharing ? '#667eea' : '#444',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 24,
              minWidth: 60
            }}
            title="Share Screen"
          >
            🖥️
          </button>

          <button
            onClick={() => setIsHandRaised(!isHandRaised)}
            style={{
              padding: '15px 20px',
              background: isHandRaised ? '#FFB74D' : '#444',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 24,
              minWidth: 60
            }}
            title="Raise Hand"
          >
            ✋
          </button>

          <button
            onClick={() => setShowChat(!showChat)}
            style={{
              padding: '15px 20px',
              background: showChat ? '#667eea' : '#444',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 24,
              minWidth: 60
            }}
            title="Chat"
          >
            💬
          </button>

          <button
            onClick={() => setShowParticipants(!showParticipants)}
            style={{
              padding: '15px 20px',
              background: showParticipants ? '#667eea' : '#444',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 24,
              minWidth: 60
            }}
            title="Participants"
          >
            👥
          </button>

          {currentMeeting.settings?.enable_attendance && (
            <button
              onClick={() => setShowAttendancePanel(!showAttendancePanel)}
              style={{
                padding: '15px 20px',
                background: showAttendancePanel ? '#667eea' : '#444',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 24,
                minWidth: 60
              }}
              title="Smart Attendance"
            >
              ✅
            </button>
          )}

          {currentMeeting.settings?.enable_whiteboard && (
            <button
              onClick={() => setShowWhiteboard(!showWhiteboard)}
              style={{
                padding: '15px 20px',
                background: showWhiteboard ? '#667eea' : '#444',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 24,
                minWidth: 60
              }}
              title="Whiteboard"
            >
              🖍️
            </button>
          )}

          <button
            onClick={() => setShowPolls(!showPolls)}
            style={{
              padding: '15px 20px',
              background: showPolls ? '#667eea' : '#444',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 24,
              minWidth: 60
            }}
            title="Polls"
          >
            📊
          </button>

          <button
            onClick={() => sendReaction('👍')}
            style={{
              padding: '15px 20px',
              background: '#444',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 24,
              minWidth: 60
            }}
            title="React"
          >
            😊
          </button>
        </div>

        <style>{`
          @keyframes floatUp {
            0% { transform: translateY(0); opacity: 1; }
            100% { transform: translateY(-200px); opacity: 0; }
          }
        `}</style>
      </div>
    )
  }

  return null
}
