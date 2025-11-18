import React, { useEffect, useState } from 'react'
import { apiUrl } from '../lib/api'
import Page from '../components/layout/Page'
import Button from '../components/ui/Button'
import { Field, Input, Textarea } from '../components/ui/Field'
import Loader from '../components/ui/Loader'
import ErrorNote from '../components/ui/ErrorNote'
import Empty from '../components/ui/Empty'

export default function Tutor() {
  const [currentUser] = useState('student_' + Math.random().toString(36).substr(2, 9))
  const [view, setView] = useState('browse') // browse, book, sessions, become_tutor
  const [tutors, setTutors] = useState([])
  const [selectedTutor, setSelectedTutor] = useState(null)
  const [sessions, setSessions] = useState([])
  const [promotions, setPromotions] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Filters
  const [filterSubject, setFilterSubject] = useState('')
  const [filterMode, setFilterMode] = useState('')
  const [filterMaxRate, setFilterMaxRate] = useState('')
  const [sortBy, setSortBy] = useState('rating')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Booking
  const [bookDate, setBookDate] = useState('')
  const [bookTime, setBookTime] = useState('9:00-10:00')
  const [bookDuration, setBookDuration] = useState(1)
  const [bookMode, setBookMode] = useState('online')
  const [bookType, setBookType] = useState('individual')
  const [bookLocation, setBookLocation] = useState('')
  
  // Registration
  const [tutorName, setTutorName] = useState('')
  const [tutorEmail, setTutorEmail] = useState('')
  const [tutorPhone, setTutorPhone] = useState('')
  const [tutorSubjects, setTutorSubjects] = useState('')
  const [tutorRate, setTutorRate] = useState(15)
  const [tutorBio, setTutorBio] = useState('')
  const [tutorQualifications, setTutorQualifications] = useState('')
  const [tutorExperience, setTutorExperience] = useState(1)
  const [tutorLanguages, setTutorLanguages] = useState('English')
  const [tutorModes, setTutorModes] = useState(['online'])
  const [tutorLocation, setTutorLocation] = useState('')

  useEffect(() => {
    loadTutors()
    loadStats()
    loadPromotions()
  }, [])

  const loadTutors = async () => {
    setLoading(true)
    setError('')
    try {
      let url = `/api/edututor/list?sort_by=${sortBy}`
      if (filterSubject) url += `&subject=${encodeURIComponent(filterSubject)}`
      if (filterMode) url += `&mode=${filterMode}`
      if (filterMaxRate) url += `&max_rate=${filterMaxRate}`
      
      const res = await fetch(apiUrl(url))
      const data = await res.json()
      setTutors(data.tutors || [])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await fetch(apiUrl('/api/edututor/stats'))
      const data = await res.json()
      setStats(data)
    } catch (e) {
      console.error(e)
    }
  }

  const loadPromotions = async () => {
    try {
      const res = await fetch(apiUrl('/api/edututor/promotions'))
      const data = await res.json()
      setPromotions(data.promotions || [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadSessions = async () => {
    try {
      const res = await fetch(apiUrl(`/api/edututor/sessions?student=${currentUser}`))
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (e) {
      console.error(e)
    }
  }

  const searchTutors = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const res = await fetch(apiUrl(`/api/edututor/search?q=${encodeURIComponent(searchQuery)}`))
      const data = await res.json()
      setTutors(data.tutors || [])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const viewTutorProfile = async (tutorId) => {
    setLoading(true)
    try {
      const res = await fetch(apiUrl(`/api/edututor/tutor/${tutorId}`))
      const data = await res.json()
      if (data.ok) {
        setSelectedTutor(data.tutor)
        setView('book')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const bookSession = async (e) => {
    e.preventDefault()
    if (!selectedTutor) return
    
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/edututor/session/book'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutor_id: selectedTutor.id,
          student: currentUser,
          student_email: 'student@example.com',
          subject: filterSubject || selectedTutor.subjects[0],
          date: bookDate,
          time_slot: bookTime,
          duration_hours: bookDuration,
          mode: bookMode,
          session_type: bookType,
          location: bookLocation,
          participants: [currentUser]
        })
      })
      const data = await res.json()
      if (data.ok) {
        alert(data.message)
        setView('sessions')
        loadSessions()
      } else {
        setError(data.error || 'Booking failed')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const registerTutor = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/edututor/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tutorName,
          email: tutorEmail,
          phone: tutorPhone,
          subjects: tutorSubjects.split(',').map(s => s.trim()),
          hourly_rate: tutorRate,
          bio: tutorBio,
          qualifications: tutorQualifications.split(',').map(q => q.trim()).filter(Boolean),
          experience_years: tutorExperience,
          languages: tutorLanguages.split(',').map(l => l.trim()),
          teaching_mode: tutorModes,
          location: tutorLocation,
          availability: {},
          max_students_group: 1
        })
      })
      const data = await res.json()
      if (data.ok) {
        alert(data.message)
        setView('browse')
        loadTutors()
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const instantBook = async () => {
    setLoading(true)
    try {
      const form = new URLSearchParams()
      form.append('subject', filterSubject || 'math')
      form.append('student', currentUser)
      form.append('mode', bookMode)
      form.append('duration', bookDuration)
      
      const res = await fetch(apiUrl('/api/edututor/session/instant'), {
        method: 'POST',
        body: form
      })
      const data = await res.json()
      if (data.ok) {
        alert(data.message)
        setView('sessions')
        loadSessions()
      } else {
        setError(data.error || 'No tutors available')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (view === 'sessions') loadSessions()
  }, [view])

  return (
    <Page title="EduTutor - Affordable Tutoring" description="Find expert tutors at minimal fees for online and offline sessions">
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Sidebar */}
        <div style={{ width: 260, flexShrink: 0 }}>
          <div style={{ position: 'sticky', top: 20 }}>
            {/* Stats Card */}
            {stats && (
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: 12,
                padding: 20,
                marginBottom: 16
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 16 }}>📚 Platform Stats</h4>
                <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                  <div>🎓 {stats.total_tutors} Expert Tutors</div>
                  <div>✅ {stats.completed_sessions} Sessions</div>
                  <div>⭐ {stats.average_rating}/5 Rating</div>
                  <div>💰 ${stats.average_rate}/hr Average</div>
                  <div>🔥 {stats.affordable_tutors} Under $20/hr</div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div style={{ background: 'var(--background-secondary)', borderRadius: 12, padding: 8, marginBottom: 16 }}>
              {[
                { id: 'browse', icon: '🔍', label: 'Browse Tutors' },
                { id: 'sessions', icon: '📅', label: 'My Sessions' },
                { id: 'become_tutor', icon: '👨‍🏫', label: 'Become a Tutor' },
              ].map(item => (
                <div
                  key={item.id}
                  onClick={() => setView(item.id)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderRadius: 8,
                    background: view === item.id ? 'var(--primary)' : 'transparent',
                    color: view === item.id ? 'white' : 'inherit',
                    marginBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontWeight: view === item.id ? 600 : 400
                  }}
                >
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>

            {/* Promotions */}
            {promotions.length > 0 && (
              <div style={{ background: '#fff3cd', borderRadius: 12, padding: 16, border: '2px solid #ffc107' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#856404' }}>🎁 Active Deals</h4>
                {promotions.slice(0, 2).map(promo => (
                  <div key={promo.id} style={{ marginBottom: 12, fontSize: 13, color: '#856404' }}>
                    <strong>{promo.title}</strong>
                    <div style={{ fontSize: 12, marginTop: 2 }}>{promo.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {/* Browse Tutors */}
          {view === 'browse' && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ margin: '0 0 8px 0' }}>Find Your Perfect Tutor</h1>
                <p style={{ margin: 0, color: '#666' }}>Affordable, flexible tutoring - online or offline</p>
              </div>

              {/* Search & Filters */}
              <div style={{
                background: 'var(--background-secondary)',
                borderRadius: 12,
                padding: 20,
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && searchTutors()}
                    placeholder="Search by name, subject, or qualifications..."
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 14
                    }}
                  />
                  <Button onClick={searchTutors}>🔍 Search</Button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                  <select
                    value={filterSubject}
                    onChange={e => { setFilterSubject(e.target.value); loadTutors() }}
                    style={{ padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }}
                  >
                    <option value="">All Subjects</option>
                    <option value="math">Math</option>
                    <option value="physics">Physics</option>
                    <option value="chemistry">Chemistry</option>
                    <option value="biology">Biology</option>
                    <option value="english">English</option>
                    <option value="programming">Programming</option>
                  </select>

                  <select
                    value={filterMode}
                    onChange={e => { setFilterMode(e.target.value); loadTutors() }}
                    style={{ padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }}
                  >
                    <option value="">All Modes</option>
                    <option value="online">🌐 Online</option>
                    <option value="offline">📍 Offline</option>
                  </select>

                  <select
                    value={filterMaxRate}
                    onChange={e => { setFilterMaxRate(e.target.value); loadTutors() }}
                    style={{ padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }}
                  >
                    <option value="">Any Price</option>
                    <option value="10">Under $10/hr</option>
                    <option value="20">Under $20/hr</option>
                    <option value="35">Under $35/hr</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={e => { setSortBy(e.target.value); loadTutors() }}
                    style={{ padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }}
                  >
                    <option value="rating">⭐ Top Rated</option>
                    <option value="price_low">💰 Price: Low to High</option>
                    <option value="experience">🎓 Most Experienced</option>
                    <option value="popular">🔥 Most Popular</option>
                  </select>
                </div>

                <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                  <Button onClick={instantBook} variant="outline">⚡ Instant Book (Available Now)</Button>
                </div>
              </div>

              {/* Tutors List */}
              {loading && <Loader label="Finding tutors..." />}
              {error && <ErrorNote message={error} />}
              
              {!loading && tutors.length === 0 ? (
                <Empty>No tutors found. Try adjusting your filters.</Empty>
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                  {tutors.map(tutor => (
                    <div
                      key={tutor.id}
                      style={{
                        background: 'var(--background-secondary)',
                        borderRadius: 12,
                        padding: 20,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: '2px solid transparent'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                      onClick={() => viewTutorProfile(tutor.id)}
                    >
                      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                        <div style={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 32,
                          color: 'white',
                          flexShrink: 0
                        }}>{tutor.name.charAt(0)}</div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 4px 0', fontSize: 20 }}>{tutor.name}</h3>
                          <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                            {tutor.experience_years}+ years experience • {tutor.location || 'Online'}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                            {tutor.badges?.map((badge, i) => (
                              <span key={i} style={{
                                padding: '4px 10px',
                                background: '#e0e7ff',
                                color: '#667eea',
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600
                              }}>{badge}</span>
                            ))}
                          </div>
                          <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                            <strong>Subjects:</strong> {tutor.subjects.join(', ')}
                          </div>
                          <div style={{ fontSize: 14, color: '#666' }}>
                            <strong>Languages:</strong> {tutor.languages?.join(', ')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#4CAF50', marginBottom: 4 }}>
                            ${tutor.hourly_rate}/hr
                          </div>
                          <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                            {tutor.affordability}
                          </div>
                          <div style={{ fontSize: 18, marginBottom: 4 }}>
                            {'⭐'.repeat(Math.floor(tutor.rating))} {tutor.rating}
                          </div>
                          <div style={{ fontSize: 13, color: '#666' }}>
                            ({tutor.ratings_count} reviews)
                          </div>
                          <div style={{ marginTop: 8, display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            {tutor.teaching_mode?.map((mode, i) => (
                              <span key={i} style={{ fontSize: 12, opacity: 0.7 }}>
                                {mode === 'online' ? '🌐' : '📍'}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      {tutor.bio && (
                        <p style={{ margin: 0, fontSize: 14, color: '#666', lineHeight: 1.6 }}>
                          {tutor.bio.substring(0, 150)}{tutor.bio.length > 150 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Book Session */}
          {view === 'book' && selectedTutor && (
            <div>
              <Button onClick={() => setView('browse')} variant="ghost" style={{ marginBottom: 16 }}>
                ← Back to Tutors
              </Button>

              <div style={{ background: 'var(--background-secondary)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
                  <div style={{
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 40,
                    color: 'white'
                  }}>{selectedTutor.name.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ margin: '0 0 8px 0' }}>{selectedTutor.name}</h2>
                    <div style={{ fontSize: 16, color: '#666', marginBottom: 12 }}>
                      {selectedTutor.experience_years}+ years • {selectedTutor.location || 'Online'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {selectedTutor.badges?.map((badge, i) => (
                        <span key={i} style={{
                          padding: '6px 12px',
                          background: '#e0e7ff',
                          color: '#667eea',
                          borderRadius: 12,
                          fontSize: 13,
                          fontWeight: 600
                        }}>{badge}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#4CAF50' }}>
                      ${selectedTutor.hourly_rate}/hour
                    </div>
                  </div>
                </div>

                {selectedTutor.bio && (
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{ margin: '0 0 8px 0' }}>About</h4>
                    <p style={{ margin: 0, lineHeight: 1.6 }}>{selectedTutor.bio}</p>
                  </div>
                )}

                {selectedTutor.qualifications && selectedTutor.qualifications.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{ margin: '0 0 8px 0' }}>Qualifications</h4>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {selectedTutor.qualifications.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                  </div>
                )}

                {selectedTutor.stats && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 16,
                    marginBottom: 20,
                    padding: 16,
                    background: '#f8f9fa',
                    borderRadius: 8
                  }}>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#667eea' }}>
                        {selectedTutor.stats.total_sessions}
                      </div>
                      <div style={{ fontSize: 13, color: '#666' }}>Total Sessions</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#667eea' }}>
                        {selectedTutor.rating}⭐
                      </div>
                      <div style={{ fontSize: 13, color: '#666' }}>Rating</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#667eea' }}>
                        {selectedTutor.stats.response_rate}
                      </div>
                      <div style={{ fontSize: 13, color: '#666' }}>Response Rate</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#667eea' }}>
                        {selectedTutor.response_time}
                      </div>
                      <div style={{ fontSize: 13, color: '#666' }}>Response Time</div>
                    </div>
                  </div>
                )}

                {selectedTutor.reviews && selectedTutor.reviews.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 12px 0' }}>Recent Reviews</h4>
                    {selectedTutor.reviews.slice(0, 3).map(review => (
                      <div key={review.id} style={{
                        padding: 12,
                        background: '#f8f9fa',
                        borderRadius: 8,
                        marginBottom: 8
                      }}>
                        <div style={{ marginBottom: 4 }}>
                          {'⭐'.repeat(Math.floor(review.rating))} {review.rating}
                        </div>
                        <p style={{ margin: 0, fontSize: 14 }}>{review.review_text}</p>
                        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                          - {review.student}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Booking Form */}
              <div style={{ background: 'var(--background-secondary)', borderRadius: 12, padding: 24 }}>
                <h3 style={{ margin: '0 0 20px 0' }}>Book a Session</h3>
                <form onSubmit={bookSession}>
                  <div style={{ display: 'grid', gap: 16 }}>
                    <Field label="Subject">
                      <select
                        value={filterSubject || selectedTutor.subjects[0]}
                        onChange={e => setFilterSubject(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }}
                      >
                        {selectedTutor.subjects.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </Field>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <Field label="Date">
                        <Input type="date" value={bookDate} onChange={e => setBookDate(e.target.value)} required />
                      </Field>
                      <Field label="Time Slot">
                        <select
                          value={bookTime}
                          onChange={e => setBookTime(e.target.value)}
                          style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }}
                        >
                          <option value="9:00-10:00">9:00 AM - 10:00 AM</option>
                          <option value="10:00-11:00">10:00 AM - 11:00 AM</option>
                          <option value="11:00-12:00">11:00 AM - 12:00 PM</option>
                          <option value="14:00-15:00">2:00 PM - 3:00 PM</option>
                          <option value="15:00-16:00">3:00 PM - 4:00 PM</option>
                          <option value="16:00-17:00">4:00 PM - 5:00 PM</option>
                          <option value="17:00-18:00">5:00 PM - 6:00 PM</option>
                        </select>
                      </Field>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                      <Field label="Duration (hours)">
                        <Input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={bookDuration}
                          onChange={e => setBookDuration(Number(e.target.value))}
                          required
                        />
                      </Field>
                      <Field label="Mode">
                        <select
                          value={bookMode}
                          onChange={e => setBookMode(e.target.value)}
                          style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }}
                        >
                          {selectedTutor.teaching_mode?.map(mode => (
                            <option key={mode} value={mode}>
                              {mode === 'online' ? '🌐 Online' : '📍 Offline'}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Type">
                        <select
                          value={bookType}
                          onChange={e => setBookType(e.target.value)}
                          style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }}
                        >
                          <option value="individual">Individual</option>
                          <option value="group">Group (20% off)</option>
                        </select>
                      </Field>
                    </div>

                    {bookMode === 'offline' && (
                      <Field label="Meeting Location">
                        <Input
                          value={bookLocation}
                          onChange={e => setBookLocation(e.target.value)}
                          placeholder="Enter meeting address"
                          required
                        />
                      </Field>
                    )}

                    <div style={{
                      padding: 16,
                      background: '#e8f5e9',
                      borderRadius: 8,
                      border: '2px solid #4CAF50'
                    }}>
                      <h4 style={{ margin: '0 0 8px 0' }}>Total Cost</h4>
                      <div style={{ fontSize: 32, fontWeight: 700, color: '#4CAF50' }}>
                        ${(selectedTutor.hourly_rate * bookDuration * (bookType === 'group' ? 0.8 : 1)).toFixed(2)}
                      </div>
                      {bookType === 'group' && (
                        <div style={{ fontSize: 13, color: '#2e7d32', marginTop: 4 }}>
                          ✨ 20% group discount applied!
                        </div>
                      )}
                    </div>

                    <Button type="submit" loading={loading}>
                      📅 Confirm Booking
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* My Sessions */}
          {view === 'sessions' && (
            <div>
              <h2 style={{ margin: '0 0 20px 0' }}>My Tutoring Sessions</h2>
              {sessions.length === 0 ? (
                <Empty>No sessions booked yet. Find a tutor to get started!</Empty>
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                  {sessions.map(session => (
                    <div key={session.id} style={{
                      background: 'var(--background-secondary)',
                      borderRadius: 12,
                      padding: 20
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <h3 style={{ margin: '0 0 4px 0' }}>{session.subject}</h3>
                          <div style={{ fontSize: 15, color: '#666' }}>
                            with {session.tutor_name}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            display: 'inline-block',
                            padding: '6px 12px',
                            borderRadius: 12,
                            fontSize: 13,
                            fontWeight: 600,
                            background: session.status === 'confirmed' ? '#e3f2fd' : '#e8f5e9',
                            color: session.status === 'confirmed' ? '#1976d2' : '#2e7d32'
                          }}>
                            {session.status}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
                        📅 {session.date} • ⏰ {session.time_slot} • ⌛ {session.duration_hours}h
                      </div>
                      <div style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
                        {session.mode === 'online' ? '🌐 Online' : '📍 Offline'} • 
                        {session.session_type === 'group' ? ' 👥 Group' : ' 👤 Individual'}
                      </div>
                      {session.meeting_link && (
                        <div style={{ marginBottom: 12 }}>
                          <a
                            href={session.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-block',
                              padding: '8px 16px',
                              background: '#4CAF50',
                              color: 'white',
                              borderRadius: 8,
                              textDecoration: 'none',
                              fontSize: 14,
                              fontWeight: 600
                            }}
                          >
                            🎥 Join Meeting
                          </a>
                        </div>
                      )}
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#4CAF50' }}>
                        ${session.total_cost}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Become a Tutor */}
          {view === 'become_tutor' && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ margin: '0 0 8px 0' }}>Become a Tutor</h1>
                <p style={{ margin: 0, color: '#666' }}>Share your knowledge and earn at minimal platform fees</p>
              </div>

              <div style={{ background: 'var(--background-secondary)', borderRadius: 12, padding: 24 }}>
                <form onSubmit={registerTutor}>
                  <div style={{ display: 'grid', gap: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <Field label="Full Name">
                        <Input value={tutorName} onChange={e => setTutorName(e.target.value)} required />
                      </Field>
                      <Field label="Email">
                        <Input type="email" value={tutorEmail} onChange={e => setTutorEmail(e.target.value)} required />
                      </Field>
                    </div>

                    <Field label="Phone">
                      <Input value={tutorPhone} onChange={e => setTutorPhone(e.target.value)} required />
                    </Field>

                    <Field label="Subjects (comma-separated)">
                      <Input
                        value={tutorSubjects}
                        onChange={e => setTutorSubjects(e.target.value)}
                        placeholder="e.g., math, physics, chemistry"
                        required
                      />
                    </Field>

                    <Field label="Hourly Rate (USD) - Keep it affordable! (Max $50)">
                      <Input
                        type="number"
                        min="5"
                        max="50"
                        value={tutorRate}
                        onChange={e => setTutorRate(Number(e.target.value))}
                        required
                      />
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        💡 Recommended: $10-$20/hr for more students
                      </div>
                    </Field>

                    <Field label="Bio">
                      <Textarea
                        rows={4}
                        value={tutorBio}
                        onChange={e => setTutorBio(e.target.value)}
                        placeholder="Tell students about your teaching style and experience..."
                        required
                      />
                    </Field>

                    <Field label="Qualifications (comma-separated)">
                      <Input
                        value={tutorQualifications}
                        onChange={e => setTutorQualifications(e.target.value)}
                        placeholder="e.g., Bachelor's in Math, 5+ years teaching"
                      />
                    </Field>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <Field label="Years of Experience">
                        <Input
                          type="number"
                          min="0"
                          value={tutorExperience}
                          onChange={e => setTutorExperience(Number(e.target.value))}
                          required
                        />
                      </Field>
                      <Field label="Languages">
                        <Input
                          value={tutorLanguages}
                          onChange={e => setTutorLanguages(e.target.value)}
                          placeholder="e.g., English, Spanish"
                          required
                        />
                      </Field>
                    </div>

                    <Field label="Teaching Modes">
                      <div style={{ display: 'flex', gap: 16 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={tutorModes.includes('online')}
                            onChange={e => {
                              if (e.target.checked) {
                                setTutorModes([...tutorModes, 'online'])
                              } else {
                                setTutorModes(tutorModes.filter(m => m !== 'online'))
                              }
                            }}
                          />
                          🌐 Online
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={tutorModes.includes('offline')}
                            onChange={e => {
                              if (e.target.checked) {
                                setTutorModes([...tutorModes, 'offline'])
                              } else {
                                setTutorModes(tutorModes.filter(m => m !== 'offline'))
                              }
                            }}
                          />
                          📍 Offline
                        </label>
                      </div>
                    </Field>

                    {tutorModes.includes('offline') && (
                      <Field label="Location (City, Country)">
                        <Input
                          value={tutorLocation}
                          onChange={e => setTutorLocation(e.target.value)}
                          placeholder="e.g., San Francisco, USA"
                          required
                        />
                      </Field>
                    )}

                    {error && <ErrorNote message={error} />}

                    <Button type="submit" loading={loading}>
                      🎓 Register as Tutor
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </Page>
  )
}
