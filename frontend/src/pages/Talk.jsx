import React, { useState, useEffect, useRef } from 'react'
import { apiUrl } from '../lib/api'
import Page from '../components/layout/Page'

export default function Talk() {
  const [view, setView] = useState('chats') // chats, contacts, settings
  const [userName, setUserName] = useState(localStorage.getItem('eduTalkUserName') || '')
  const [userAvatar, setUserAvatar] = useState(localStorage.getItem('eduTalkUserAvatar') || '👤')
  
  // Chats & Groups
  const [chats, setChats] = useState([])
  const [groups, setGroups] = useState([])
  const [channels, setChannels] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  
  // Contacts
  const [contacts, setContacts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  
  // Media
  const [selectedFile, setSelectedFile] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [audioChunks, setAudioChunks] = useState([])
  
  // UI States
  const [showChatInfo, setShowChatInfo] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  
  // New Group/Channel
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [newGroupIcon, setNewGroupIcon] = useState('👥')
  const [selectedMembers, setSelectedMembers] = useState([])
  const [groupSettings, setGroupSettings] = useState({
    onlyAdminsCanMessage: false,
    approveMembers: false,
    disappearingMessages: false
  })
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => {
    if (userName) {
      loadChats()
      loadContacts()
      loadGroups()
      loadChannels()
    }
  }, [userName])

  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat.id, activeChat.type)
      scrollToBottom()
    }
  }, [activeChat])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function loadChats() {
    try {
      const res = await fetch(apiUrl('/api/edutalk/chats/list'))
      const data = await res.json()
      setChats(data.chats || [])
    } catch (e) {
      console.error('Failed to load chats:', e)
    }
  }

  async function loadGroups() {
    try {
      const res = await fetch(apiUrl('/api/edutalk/groups/list'))
      const data = await res.json()
      setGroups(data.groups || [])
    } catch (e) {
      console.error('Failed to load groups:', e)
    }
  }

  async function loadChannels() {
    try {
      const res = await fetch(apiUrl('/api/edutalk/channels/list'))
      const data = await res.json()
      setChannels(data.channels || [])
    } catch (e) {
      console.error('Failed to load channels:', e)
    }
  }

  async function loadContacts() {
    try {
      const res = await fetch(apiUrl('/api/edutalk/contacts/list'))
      const data = await res.json()
      setContacts(data.contacts || [])
    } catch (e) {
      console.error('Failed to load contacts:', e)
    }
  }

  async function loadMessages(chatId, chatType) {
    try {
      const res = await fetch(apiUrl(`/api/edutalk/messages/${chatType}/${chatId}`))
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (e) {
      console.error('Failed to load messages:', e)
    }
  }

  async function sendMessage(type = 'text', content = null) {
    if (!activeChat) return
    
    const messageContent = content || newMessage.trim()
    if (!messageContent && type === 'text') return

    const message = {
      id: Date.now(),
      sender: userName,
      senderAvatar: userAvatar,
      content: messageContent,
      type: type, // text, image, file, voice, video
      timestamp: new Date().toISOString(),
      status: 'sent' // sent, delivered, read
    }

    setMessages([...messages, message])
    setNewMessage('')
    setSelectedFile(null)

    try {
      await fetch(apiUrl('/api/edutalk/message/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: activeChat.id,
          chat_type: activeChat.type,
          message
        })
      })
    } catch (e) {
      console.error('Failed to send message:', e)
    }
  }

  async function createGroup() {
    if (!newGroupName.trim()) {
      alert('Please enter group name')
      return
    }

    try {
      const res = await fetch(apiUrl('/api/edutalk/group/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription,
          icon: newGroupIcon,
          creator: userName,
          members: [userName, ...selectedMembers],
          settings: groupSettings
        })
      })
      const data = await res.json()
      if (data.group) {
        setGroups([...groups, data.group])
        setShowNewGroup(false)
        setNewGroupName('')
        setNewGroupDescription('')
        setSelectedMembers([])
        setActiveChat({ ...data.group, type: 'group' })
      }
    } catch (e) {
      console.error('Failed to create group:', e)
    }
  }

  async function createChannel() {
    if (!newGroupName.trim()) {
      alert('Please enter channel name')
      return
    }

    try {
      const res = await fetch(apiUrl('/api/edutalk/channel/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription,
          icon: newGroupIcon,
          creator: userName,
          settings: groupSettings
        })
      })
      const data = await res.json()
      if (data.channel) {
        setChannels([...channels, data.channel])
        setShowNewChannel(false)
        setNewGroupName('')
        setNewGroupDescription('')
        setActiveChat({ ...data.channel, type: 'channel' })
      }
    } catch (e) {
      console.error('Failed to create channel:', e)
    }
  }

  function startVoiceRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const recorder = new MediaRecorder(stream)
        setMediaRecorder(recorder)
        setAudioChunks([])
        
        recorder.ondataavailable = (e) => {
          setAudioChunks(prev => [...prev, e.data])
        }
        
        recorder.onstop = () => {
          const blob = new Blob(audioChunks, { type: 'audio/webm' })
          const url = URL.createObjectURL(blob)
          sendMessage('voice', url)
          stream.getTracks().forEach(track => track.stop())
        }
        
        recorder.start()
        setIsRecording(true)
        
        // Start timer
        let time = 0
        const interval = setInterval(() => {
          time++
          setRecordingTime(time)
        }, 1000)
        
        recorder.addEventListener('stop', () => {
          clearInterval(interval)
          setRecordingTime(0)
        })
      })
      .catch(e => {
        console.error('Failed to access microphone:', e)
        alert('Could not access microphone')
      })
  }

  function stopVoiceRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    
    setSelectedFile(file)
    
    // Auto-send file
    const reader = new FileReader()
    reader.onload = (event) => {
      const fileType = file.type.startsWith('image/') ? 'image' : 
                       file.type.startsWith('video/') ? 'video' : 'file'
      sendMessage(fileType, {
        name: file.name,
        size: file.size,
        url: event.target.result
      })
    }
    reader.readAsDataURL(file)
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' })
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  const emojis = ['😀', '😂', '😍', '😎', '🤔', '😮', '😢', '😡', '👍', '👏', '🙏', '❤️', '🔥', '⭐', '🎉', '✅']

  if (!userName) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: 'system-ui'
      }}>
        <div style={{
          background: '#fff',
          padding: 60,
          borderRadius: 20,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          maxWidth: 400,
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>💬</div>
          <h1 style={{ fontSize: 32, margin: '0 0 10px 0' }}>EduTalk Pro</h1>
          <p style={{ color: '#666', marginBottom: 30 }}>Advanced Messaging Platform</p>
          
          <input
            type="text"
            placeholder="Enter your name"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            onKeyPress={e => {
              if (e.key === 'Enter' && userName.trim()) {
                localStorage.setItem('eduTalkUserName', userName.trim())
                setUserName(userName.trim())
              }
            }}
            style={{
              width: '100%',
              padding: 15,
              fontSize: 16,
              border: '2px solid #ddd',
              borderRadius: 10,
              marginBottom: 15
            }}
          />
          
          <button
            onClick={() => {
              if (userName.trim()) {
                localStorage.setItem('eduTalkUserName', userName.trim())
                setUserName(userName.trim())
              }
            }}
            disabled={!userName.trim()}
            style={{
              width: '100%',
              padding: 15,
              background: userName.trim() ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 18,
              fontWeight: '600',
              cursor: userName.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Get Started
          </button>
        </div>
      </div>
    )
  }

  return (
    <Page title="EduTalk - WhatsApp-like Messaging" description="Chat with friends, create groups, share files">
    <div style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      fontFamily: 'system-ui',
      background: '#f0f2f5',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }}>
      {/* Sidebar */}
      <div style={{ 
        width: 380, 
        background: '#fff', 
        borderRight: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ 
          padding: 20, 
          background: '#00a884',
          color: '#fff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <h2 style={{ margin: 0, fontSize: 24 }}>💬 EduTalk Pro</h2>
            <div style={{ display: 'flex', gap: 15 }}>
              <button
                onClick={() => setShowNewChat(true)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: 50,
                  width: 40,
                  height: 40,
                  cursor: 'pointer',
                  fontSize: 20
                }}
                title="New Chat"
              >
                💬
              </button>
              <button
                onClick={() => setShowNewGroup(true)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: 50,
                  width: 40,
                  height: 40,
                  cursor: 'pointer',
                  fontSize: 20
                }}
                title="New Group"
              >
                👥
              </button>
              <button
                onClick={() => setShowNewChannel(true)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: 50,
                  width: 40,
                  height: 40,
                  cursor: 'pointer',
                  fontSize: 20
                }}
                title="New Channel"
              >
                📢
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setView('chats')}
              style={{
                flex: 1,
                padding: '8px 16px',
                background: view === 'chats' ? 'rgba(255,255,255,0.3)' : 'transparent',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 20,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: '600'
              }}
            >
              Chats
            </button>
            <button
              onClick={() => setView('contacts')}
              style={{
                flex: 1,
                padding: '8px 16px',
                background: view === 'contacts' ? 'rgba(255,255,255,0.3)' : 'transparent',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 20,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: '600'
              }}
            >
              Contacts
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: 15, background: '#f6f6f6' }}>
          <input
            type="text"
            placeholder="🔍 Search or start new chat"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 15px',
              border: 'none',
              borderRadius: 10,
              background: '#fff',
              fontSize: 14
            }}
          />
        </div>

        {/* Chat List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {view === 'chats' && (
            <>
              {/* Individual Chats */}
              {chats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(chat => (
                <div
                  key={chat.id}
                  onClick={() => setActiveChat({ ...chat, type: 'chat' })}
                  style={{
                    padding: '15px 20px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    background: activeChat?.id === chat.id ? '#f0f2f5' : '#fff',
                    display: 'flex',
                    gap: 12
                  }}
                >
                  <div style={{ fontSize: 40 }}>{chat.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ fontWeight: '600', fontSize: 16 }}>{chat.name}</div>
                      <div style={{ fontSize: 12, color: '#667781' }}>{formatTime(chat.lastMessage?.timestamp)}</div>
                    </div>
                    <div style={{ 
                      fontSize: 14, 
                      color: '#667781',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {chat.lastMessage?.type === 'text' ? chat.lastMessage.content : 
                       chat.lastMessage?.type === 'image' ? '📷 Photo' :
                       chat.lastMessage?.type === 'voice' ? '🎤 Voice message' :
                       chat.lastMessage?.type === 'file' ? '📎 File' : 'No messages yet'}
                    </div>
                  </div>
                  {chat.unread > 0 && (
                    <div style={{
                      background: '#00a884',
                      color: '#fff',
                      borderRadius: 50,
                      minWidth: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: '600',
                      padding: '0 6px'
                    }}>
                      {chat.unread}
                    </div>
                  )}
                </div>
              ))}

              {/* Groups */}
              {groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase())).map(group => (
                <div
                  key={group.id}
                  onClick={() => setActiveChat({ ...group, type: 'group' })}
                  style={{
                    padding: '15px 20px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    background: activeChat?.id === group.id ? '#f0f2f5' : '#fff',
                    display: 'flex',
                    gap: 12
                  }}
                >
                  <div style={{ fontSize: 40 }}>{group.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ fontWeight: '600', fontSize: 16 }}>{group.name}</div>
                      <div style={{ fontSize: 12, color: '#667781' }}>{formatTime(group.lastMessage?.timestamp)}</div>
                    </div>
                    <div style={{ fontSize: 13, color: '#667781' }}>
                      {group.members?.length || 0} members
                    </div>
                  </div>
                </div>
              ))}

              {/* Channels */}
              {channels.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(channel => (
                <div
                  key={channel.id}
                  onClick={() => setActiveChat({ ...channel, type: 'channel' })}
                  style={{
                    padding: '15px 20px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    background: activeChat?.id === channel.id ? '#f0f2f5' : '#fff',
                    display: 'flex',
                    gap: 12
                  }}
                >
                  <div style={{ fontSize: 40 }}>{channel.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ fontWeight: '600', fontSize: 16 }}>{channel.name}</div>
                      <div style={{ fontSize: 12, color: '#667781' }}>{formatTime(channel.lastMessage?.timestamp)}</div>
                    </div>
                    <div style={{ fontSize: 13, color: '#667781' }}>
                      📢 {channel.subscribers?.length || 0} subscribers
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {view === 'contacts' && (
            <>
              {contacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(contact => (
                <div
                  key={contact.id}
                  onClick={() => {
                    setActiveChat({ ...contact, type: 'chat' })
                    setView('chats')
                  }}
                  style={{
                    padding: '15px 20px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    background: '#fff',
                    display: 'flex',
                    gap: 12
                  }}
                >
                  <div style={{ fontSize: 40 }}>{contact.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: 16, marginBottom: 3 }}>{contact.name}</div>
                    <div style={{ fontSize: 13, color: '#667781' }}>{contact.status || 'Available'}</div>
                  </div>
                  {contact.online && (
                    <div style={{
                      width: 12,
                      height: 12,
                      background: '#00a884',
                      borderRadius: 50,
                      border: '2px solid #fff'
                    }} />
                  )}
                </div>
              ))}
            </>
          )}

          {(chats.length === 0 && groups.length === 0 && channels.length === 0 && view === 'chats') && (
            <div style={{ padding: 60, textAlign: 'center', color: '#667781' }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>💬</div>
              <p style={{ fontSize: 16 }}>No chats yet</p>
              <p style={{ fontSize: 14 }}>Start a new conversation!</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#efeae2' }}>
        {!activeChat ? (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            color: '#667781'
          }}>
            <div style={{ fontSize: 100, marginBottom: 20 }}>💬</div>
            <h2 style={{ fontSize: 32, margin: '0 0 10px 0', color: '#41525d' }}>EduTalk Pro</h2>
            <p style={{ fontSize: 16 }}>Select a chat to start messaging</p>
            <div style={{ display: 'flex', gap: 20, marginTop: 30 }}>
              <button
                onClick={() => setShowNewChat(true)}
                style={{
                  padding: '12px 24px',
                  background: '#00a884',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 16,
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                💬 New Chat
              </button>
              <button
                onClick={() => setShowNewGroup(true)}
                style={{
                  padding: '12px 24px',
                  background: '#00a884',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 16,
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                👥 New Group
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div style={{ 
              padding: '10px 20px', 
              background: '#f0f2f5',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 44 }}>{activeChat.avatar || activeChat.icon}</div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: 18 }}>{activeChat.name}</div>
                  <div style={{ fontSize: 13, color: '#667781' }}>
                    {activeChat.type === 'chat' && (activeChat.online ? 'Online' : 'Offline')}
                    {activeChat.type === 'group' && `${activeChat.members?.length || 0} members`}
                    {activeChat.type === 'channel' && `${activeChat.subscribers?.length || 0} subscribers`}
                    {typingUsers.length > 0 && ` • ${typingUsers[0]} is typing...`}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 15 }}>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 24,
                    cursor: 'pointer',
                    color: '#54656f'
                  }}
                  title="Voice Call"
                >
                  📞
                </button>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 24,
                    cursor: 'pointer',
                    color: '#54656f'
                  }}
                  title="Video Call"
                >
                  📹
                </button>
                <button
                  onClick={() => setShowChatInfo(!showChatInfo)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 24,
                    cursor: 'pointer',
                    color: '#54656f'
                  }}
                  title="Chat Info"
                >
                  ℹ️
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: 20,
              backgroundImage: 'repeating-linear-gradient(45deg, #efeae2 0px, #efeae2 10px, #e8e3db 10px, #e8e3db 20px)'
            }}>
              {messages.map((msg, i) => {
                const isOwn = msg.sender === userName
                const showAvatar = !isOwn && (i === 0 || messages[i-1].sender !== msg.sender)
                
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: isOwn ? 'flex-end' : 'flex-start',
                      marginBottom: 8,
                      gap: 8
                    }}
                  >
                    {!isOwn && showAvatar && (
                      <div style={{ fontSize: 32, marginTop: 'auto' }}>{msg.senderAvatar}</div>
                    )}
                    {!isOwn && !showAvatar && <div style={{ width: 40 }} />}
                    
                    <div style={{
                      maxWidth: '65%',
                      background: isOwn ? '#d9fdd3' : '#fff',
                      padding: '8px 12px',
                      borderRadius: 8,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}>
                      {!isOwn && activeChat.type !== 'chat' && showAvatar && (
                        <div style={{ fontSize: 13, color: '#00a884', fontWeight: '600', marginBottom: 4 }}>
                          {msg.sender}
                        </div>
                      )}
                      
                      {msg.type === 'text' && (
                        <div style={{ fontSize: 14.5, wordWrap: 'break-word' }}>{msg.content}</div>
                      )}
                      
                      {msg.type === 'image' && (
                        <div>
                          <img 
                            src={msg.content.url} 
                            alt="Shared"
                            style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 5 }}
                          />
                          {msg.content.caption && (
                            <div style={{ fontSize: 14.5, marginTop: 5 }}>{msg.content.caption}</div>
                          )}
                        </div>
                      )}
                      
                      {msg.type === 'voice' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button
                            style={{
                              background: '#00a884',
                              border: 'none',
                              borderRadius: 50,
                              width: 32,
                              height: 32,
                              cursor: 'pointer',
                              color: '#fff',
                              fontSize: 16
                            }}
                            onClick={() => {
                              const audio = new Audio(msg.content)
                              audio.play()
                            }}
                          >
                            ▶️
                          </button>
                          <div style={{ 
                            flex: 1, 
                            height: 24, 
                            background: '#00a884',
                            borderRadius: 12,
                            opacity: 0.3
                          }} />
                          <div style={{ fontSize: 11, color: '#667781' }}>0:45</div>
                        </div>
                      )}
                      
                      {msg.type === 'file' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                          <div style={{ fontSize: 40 }}>📎</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: '600' }}>{msg.content.name}</div>
                            <div style={{ fontSize: 12, color: '#667781' }}>{formatFileSize(msg.content.size)}</div>
                          </div>
                          <button
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: 24,
                              cursor: 'pointer'
                            }}
                          >
                            ⬇️
                          </button>
                        </div>
                      )}
                      
                      <div style={{ 
                        fontSize: 11, 
                        color: '#667781',
                        marginTop: 4,
                        textAlign: 'right',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 5
                      }}>
                        {formatTime(msg.timestamp)}
                        {isOwn && (
                          <span style={{ color: msg.status === 'read' ? '#53bdeb' : '#667781' }}>
                            {msg.status === 'sent' && '✓'}
                            {msg.status === 'delivered' && '✓✓'}
                            {msg.status === 'read' && '✓✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div style={{ 
              padding: '10px 20px', 
              background: '#f0f2f5',
              borderTop: '1px solid #e0e0e0'
            }}>
              {selectedFile && (
                <div style={{
                  padding: '10px 15px',
                  background: '#fff',
                  borderRadius: 10,
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <div style={{ fontSize: 32 }}>📎</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: '600' }}>{selectedFile.name}</div>
                    <div style={{ fontSize: 12, color: '#667781' }}>{formatFileSize(selectedFile.size)}</div>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 20,
                      cursor: 'pointer'
                    }}
                  >
                    ❌
                  </button>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 24,
                      cursor: 'pointer'
                    }}
                  >
                    😊
                  </button>
                  {showEmojiPicker && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      background: '#fff',
                      padding: 15,
                      borderRadius: 10,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(8, 1fr)',
                      gap: 5,
                      marginBottom: 10
                    }}>
                      {emojis.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setNewMessage(newMessage + emoji)
                            setShowEmojiPicker(false)
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: 24,
                            cursor: 'pointer',
                            padding: 5
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 24,
                    cursor: 'pointer'
                  }}
                  title="Attach File"
                >
                  📎
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  accept="image/*,video/*,application/*"
                />
                
                <input
                  type="text"
                  placeholder="Type a message"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendMessage()}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    border: 'none',
                    borderRadius: 25,
                    background: '#fff',
                    fontSize: 15
                  }}
                />
                
                {newMessage.trim() ? (
                  <button
                    onClick={() => sendMessage()}
                    style={{
                      background: '#00a884',
                      border: 'none',
                      borderRadius: 50,
                      width: 48,
                      height: 48,
                      cursor: 'pointer',
                      fontSize: 20,
                      color: '#fff'
                    }}
                  >
                    ➤
                  </button>
                ) : (
                  <button
                    onClick={() => isRecording ? stopVoiceRecording() : startVoiceRecording()}
                    style={{
                      background: isRecording ? '#ff4444' : '#00a884',
                      border: 'none',
                      borderRadius: 50,
                      width: 48,
                      height: 48,
                      cursor: 'pointer',
                      fontSize: 20,
                      color: '#fff'
                    }}
                  >
                    {isRecording ? '⏹️' : '🎤'}
                  </button>
                )}
              </div>
              
              {isRecording && (
                <div style={{
                  marginTop: 10,
                  padding: '10px 15px',
                  background: '#ffe0e0',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <div style={{ 
                    width: 12, 
                    height: 12, 
                    background: '#ff4444', 
                    borderRadius: 50,
                    animation: 'pulse 1s infinite'
                  }} />
                  <div style={{ fontSize: 14, color: '#ff4444', fontWeight: '600' }}>
                    Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Chat Info Sidebar */}
      {showChatInfo && activeChat && (
        <div style={{
          width: 400,
          background: '#fff',
          borderLeft: '1px solid #e0e0e0',
          overflowY: 'auto'
        }}>
          <div style={{ padding: 30, textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ fontSize: 100, marginBottom: 15 }}>{activeChat.avatar || activeChat.icon}</div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: 24 }}>{activeChat.name}</h3>
            <p style={{ color: '#667781', fontSize: 14 }}>
              {activeChat.type === 'group' && `Group • ${activeChat.members?.length} members`}
              {activeChat.type === 'channel' && `Channel • ${activeChat.subscribers?.length} subscribers`}
              {activeChat.type === 'chat' && (activeChat.online ? 'Online' : 'Offline')}
            </p>
          </div>
          
          {activeChat.description && (
            <div style={{ padding: 20, borderBottom: '1px solid #e0e0e0' }}>
              <div style={{ fontSize: 13, color: '#00a884', marginBottom: 8 }}>Description</div>
              <div style={{ fontSize: 14, color: '#3b4a54' }}>{activeChat.description}</div>
            </div>
          )}
          
          <div style={{ padding: 20 }}>
            <button
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 15,
                color: '#3b4a54',
                display: 'flex',
                alignItems: 'center',
                gap: 15,
                borderRadius: 5
              }}
              onMouseEnter={e => e.target.style.background = '#f0f2f5'}
              onMouseLeave={e => e.target.style.background = 'none'}
            >
              <span style={{ fontSize: 20 }}>🔇</span>
              Mute Notifications
            </button>
            
            <button
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 15,
                color: '#3b4a54',
                display: 'flex',
                alignItems: 'center',
                gap: 15,
                borderRadius: 5
              }}
              onMouseEnter={e => e.target.style.background = '#f0f2f5'}
              onMouseLeave={e => e.target.style.background = 'none'}
            >
              <span style={{ fontSize: 20 }}>⏱️</span>
              Disappearing Messages
            </button>
            
            <button
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 15,
                color: '#3b4a54',
                display: 'flex',
                alignItems: 'center',
                gap: 15,
                borderRadius: 5
              }}
              onMouseEnter={e => e.target.style.background = '#f0f2f5'}
              onMouseLeave={e => e.target.style.background = 'none'}
            >
              <span style={{ fontSize: 20 }}>📎</span>
              Media & Files
            </button>
            
            <button
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 15,
                color: '#ea0038',
                display: 'flex',
                alignItems: 'center',
                gap: 15,
                borderRadius: 5,
                marginTop: 20
              }}
              onMouseEnter={e => e.target.style.background = '#f0f2f5'}
              onMouseLeave={e => e.target.style.background = 'none'}
            >
              <span style={{ fontSize: 20 }}>🗑️</span>
              Delete Chat
            </button>
          </div>
        </div>
      )}

      {/* New Group Modal */}
      {(showNewGroup || showNewChannel) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 15,
            width: '90%',
            maxWidth: 500,
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{
              padding: 20,
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: 20 }}>
                {showNewGroup ? 'Create New Group' : 'Create New Channel'}
              </h3>
              <button
                onClick={() => {
                  setShowNewGroup(false)
                  setShowNewChannel(false)
                  setNewGroupName('')
                  setNewGroupDescription('')
                  setSelectedMembers([])
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 80, marginBottom: 10 }}>{newGroupIcon}</div>
                <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['👥', '📚', '💼', '🎮', '🎵', '🏀', '🍕', '✈️', '🎨', '💻'].map(icon => (
                    <button
                      key={icon}
                      onClick={() => setNewGroupIcon(icon)}
                      style={{
                        background: newGroupIcon === icon ? '#e0f7e0' : 'none',
                        border: newGroupIcon === icon ? '2px solid #00a884' : '1px solid #e0e0e0',
                        borderRadius: 5,
                        padding: 8,
                        fontSize: 24,
                        cursor: 'pointer'
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              
              <input
                type="text"
                placeholder={showNewGroup ? "Group name" : "Channel name"}
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  border: '2px solid #e0e0e0',
                  borderRadius: 8,
                  fontSize: 15,
                  marginBottom: 15
                }}
              />
              
              <textarea
                placeholder="Description (optional)"
                value={newGroupDescription}
                onChange={e => setNewGroupDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  border: '2px solid #e0e0e0',
                  borderRadius: 8,
                  fontSize: 15,
                  minHeight: 80,
                  marginBottom: 15,
                  resize: 'vertical'
                }}
              />
              
              {showNewGroup && (
                <>
                  <div style={{ marginBottom: 10, fontSize: 14, color: '#667781' }}>
                    Add Members
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    {contacts.map(contact => (
                      <label
                        key={contact.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 0',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(contact.name)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedMembers([...selectedMembers, contact.name])
                            } else {
                              setSelectedMembers(selectedMembers.filter(m => m !== contact.name))
                            }
                          }}
                          style={{ width: 18, height: 18 }}
                        />
                        <div style={{ fontSize: 32 }}>{contact.avatar}</div>
                        <div style={{ fontSize: 15 }}>{contact.name}</div>
                      </label>
                    ))}
                  </div>
                </>
              )}
              
              <div style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 10, fontSize: 14, color: '#667781' }}>Settings</div>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={groupSettings.onlyAdminsCanMessage}
                    onChange={e => setGroupSettings({...groupSettings, onlyAdminsCanMessage: e.target.checked})}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ fontSize: 15 }}>Only admins can send messages</span>
                </label>
                
                {showNewGroup && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={groupSettings.approveMembers}
                      onChange={e => setGroupSettings({...groupSettings, approveMembers: e.target.checked})}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 15 }}>Approve new members</span>
                  </label>
                )}
                
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={groupSettings.disappearingMessages}
                    onChange={e => setGroupSettings({...groupSettings, disappearingMessages: e.target.checked})}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ fontSize: 15 }}>Enable disappearing messages</span>
                </label>
              </div>
              
              <button
                onClick={showNewGroup ? createGroup : createChannel}
                disabled={!newGroupName.trim()}
                style={{
                  width: '100%',
                  padding: 15,
                  background: newGroupName.trim() ? '#00a884' : '#ccc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: '600',
                  cursor: newGroupName.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Create {showNewGroup ? 'Group' : 'Channel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
    </Page>
  )
}
