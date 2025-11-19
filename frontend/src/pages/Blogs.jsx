import React, { useEffect, useState } from 'react'
import { apiUrl } from '../lib/api'
import Page from '../components/layout/Page'
import Button from '../components/ui/Button'
import { Field, Input, Textarea } from '../components/ui/Field'
import Loader from '../components/ui/Loader'
import ErrorNote from '../components/ui/ErrorNote'
import Empty from '../components/ui/Empty'

export default function Blogs() {
  const [currentUser] = useState('user_' + Math.random().toString(36).substr(2, 9))
  const [view, setView] = useState('feed') // feed, profile, network, jobs, search
  const [posts, setPosts] = useState([])
  const [profile, setProfile] = useState(null)
  const [connections, setConnections] = useState([])
  const [jobs, setJobs] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Post creation
  const [postTitle, setPostTitle] = useState('')
  const [postContent, setPostContent] = useState('')
  const [postType, setPostType] = useState('post')
  const [pollOptions, setPollOptions] = useState(['', ''])
  
  // Profile editing
  const [editProfile, setEditProfile] = useState(false)
  const [profileName, setProfileName] = useState('John Doe')
  const [profileHeadline, setProfileHeadline] = useState('Computer Science Student')
  const [profileBio, setProfileBio] = useState('Passionate about AI and Web Development')
  const [profileSkills, setProfileSkills] = useState('Python, JavaScript, React')
  const [profileLocation, setProfileLocation] = useState('San Francisco, CA')
  
  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)

  useEffect(() => {
    loadFeed()
    loadProfile()
    loadNotifications()
  }, [])

  const loadFeed = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(apiUrl(`/api/edublogs/feed?user=${currentUser}`))
      const data = await res.json()
      setPosts(data.posts || [])
    } catch (e) { setError(String(e)) } finally { setLoading(false) }
  }

  const loadProfile = async () => {
    try {
      const res = await fetch(apiUrl(`/api/edublogs/profile/${currentUser}`))
      const data = await res.json()
      if (data.ok) {
        setProfile(data.profile)
        setProfileName(data.profile.name)
        setProfileHeadline(data.profile.headline)
        setProfileBio(data.profile.bio)
        setProfileSkills(data.profile.skills.join(', '))
        setProfileLocation(data.profile.location)
      }
    } catch (e) { console.error(e) }
  }

  const loadConnections = async () => {
    try {
      const res = await fetch(apiUrl(`/api/edublogs/connections?user=${currentUser}`))
      const data = await res.json()
      setConnections(data.connections || [])
    } catch (e) { console.error(e) }
  }

  const loadJobs = async () => {
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/edublogs/jobs'))
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch (e) { setError(String(e)) } finally { setLoading(false) }
  }

  const loadNotifications = async () => {
    try {
      const res = await fetch(apiUrl(`/api/edublogs/notifications/${currentUser}`))
      const data = await res.json()
      setNotifications(data.notifications || [])
    } catch (e) { console.error(e) }
  }

  const createPost = async (e) => {
    e.preventDefault()
    if (!postTitle.trim() || !postContent.trim()) return
    
    setLoading(true)
    try {
      const payload = {
        title: postTitle,
        content: postContent,
        author: currentUser,
        post_type: postType,
        poll_options: postType === 'poll' ? pollOptions.filter(o => o.trim()) : [],
        media_urls: [],
        tags: []
      }
      
      await fetch(apiUrl('/api/edublogs/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      setPostTitle('')
      setPostContent('')
      setPollOptions(['', ''])
      setPostType('post')
      await loadFeed()
    } catch (e) { setError(String(e)) } finally { setLoading(false) }
  }

  const saveProfile = async () => {
    setLoading(true)
    try {
      const payload = {
        user_id: currentUser,
        name: profileName,
        headline: profileHeadline,
        bio: profileBio,
        skills: profileSkills.split(',').map(s => s.trim()).filter(Boolean),
        location: profileLocation,
        avatar: '',
        experience: [],
        education: [],
        website: ''
      }
      
      await fetch(apiUrl('/api/edublogs/profile/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      setEditProfile(false)
      await loadProfile()
    } catch (e) { setError(String(e)) } finally { setLoading(false) }
  }

  const react = async (postId, reactionType) => {
    try {
      await fetch(apiUrl('/api/edublogs/reaction'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, user: currentUser, reaction_type: reactionType })
      })
      await loadFeed()
    } catch (e) { console.error(e) }
  }

  const savePost = async (postId) => {
    try {
      const form = new URLSearchParams()
      form.append('post_id', postId)
      form.append('user', currentUser)
      await fetch(apiUrl('/api/edublogs/save'), { method: 'POST', body: form })
    } catch (e) { console.error(e) }
  }

  const votePoll = async (postId, option) => {
    try {
      const form = new URLSearchParams()
      form.append('post_id', postId)
      form.append('user', currentUser)
      form.append('option', option)
      await fetch(apiUrl('/api/edublogs/poll/vote'), { method: 'POST', body: form })
      await loadFeed()
    } catch (e) { console.error(e) }
  }

  const search = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const res = await fetch(apiUrl(`/api/edublogs/search?q=${encodeURIComponent(searchQuery)}&type=all`))
      const data = await res.json()
      setSearchResults(data)
      setView('search')
    } catch (e) { setError(String(e)) } finally { setLoading(false) }
  }

  const formatDate = (iso) => {
    const date = new Date(iso)
    const now = new Date()
    const diff = Math.floor((now - date) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return Math.floor(diff / 60) + 'm'
    if (diff < 86400) return Math.floor(diff / 3600) + 'h'
    if (diff < 604800) return Math.floor(diff / 86400) + 'd'
    return date.toLocaleDateString()
  }

  const reactionIcons = {
    like: '👍', celebrate: '🎉', support: '💪', love: '❤️', insightful: '💡', curious: '🤔'
  }

  return (
    <Page title="✍️ EduBlogs Network" description="Connect with educators, share your knowledge, and build your professional learning community">
      <div style={{ display: 'flex', gap: 20 }}>
        {/* Sidebar */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <div style={{ position: 'sticky', top: 20 }}>
            {/* Profile Card */}
            <div style={{ 
              background: '#FAF5F6', 
              borderRadius: 12, 
              padding: 16, 
              marginBottom: 16,
              textAlign: 'center'
            }}>
              <div style={{ 
                width: 80, 
                height: 80, 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #732E4A 0%, #B38F92 100%)',
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                color: 'white'
              }}>{profileName.charAt(0)}</div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: 16 }}>{profileName}</h4>
              <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#666' }}>{profileHeadline}</p>
              {profile && (
                <div style={{ fontSize: 13, color: '#666', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Posts</span>
                    <strong>{profile.stats?.posts || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Connections</span>
                    <strong>{profile.stats?.connections || 0}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div style={{ background: '#FAF5F6', borderRadius: 12, padding: 8 }}>
              {[
                { id: 'feed', icon: '🏠', label: 'Feed' },
                { id: 'profile', icon: '👤', label: 'Profile' },
                { id: 'network', icon: '🤝', label: 'Network' },
                { id: 'jobs', icon: '💼', label: 'Jobs' },
              ].map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    setView(item.id)
                    if (item.id === 'network') loadConnections()
                    if (item.id === 'jobs') loadJobs()
                  }}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderRadius: 8,
                    marginBottom: 4,
                    background: view === item.id ? 'linear-gradient(135deg, #732E4A 0%, #B38F92 100%)' : 'transparent',
                    color: view === item.id ? 'white' : 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 14,
                    fontWeight: view === item.id ? 600 : 400
                  }}
                >
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, maxWidth: 680 }}>
          {/* Search Bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && search()}
                placeholder="Search posts, people, jobs..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: 24,
                  fontSize: 14
                }}
              />
              <Button onClick={search}>🔍</Button>
            </div>
          </div>

          {/* Feed View */}
          {view === 'feed' && (
            <div>
              {/* Create Post */}
              <div style={{ background: '#FAF5F6', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 16px 0' }}>Share Something</h3>
                <form onSubmit={createPost}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {['post', 'article', 'poll'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPostType(type)}
                        style={{
                          padding: '8px 16px',
                          border: postType === type ? '2px solid #732E4A' : '1px solid var(--border)',
                          borderRadius: 8,
                          background: postType === type ? 'linear-gradient(135deg, #732E4A 0%, #B38F92 100%)' : 'white',
                          color: postType === type ? 'white' : 'inherit',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 600
                        }}
                      >
                        {type === 'post' && '📝 Post'}
                        {type === 'article' && '📄 Article'}
                        {type === 'poll' && '📊 Poll'}
                      </button>
                    ))}
                  </div>
                  <input
                    value={postTitle}
                    onChange={e => setPostTitle(e.target.value)}
                    placeholder="Title"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      marginBottom: 12,
                      fontSize: 16,
                      fontWeight: 600
                    }}
                  />
                  <textarea
                    value={postContent}
                    onChange={e => setPostContent(e.target.value)}
                    placeholder="What do you want to talk about? Use #hashtags and @mentions"
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      marginBottom: 12,
                      fontSize: 14,
                      resize: 'vertical'
                    }}
                  />
                  {postType === 'poll' && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Poll Options:</p>
                      {pollOptions.map((opt, i) => (
                        <input
                          key={i}
                          value={opt}
                          onChange={e => {
                            const newOpts = [...pollOptions]
                            newOpts[i] = e.target.value
                            setPollOptions(newOpts)
                          }}
                          placeholder={`Option ${i + 1}`}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            marginBottom: 8,
                            fontSize: 14
                          }}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => setPollOptions([...pollOptions, ''])}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          background: 'white',
                          cursor: 'pointer',
                          fontSize: 13
                        }}
                      >
                        + Add Option
                      </button>
                    </div>
                  )}
                  <Button type="submit" loading={loading}>Post</Button>
                </form>
              </div>

              {/* Posts Feed */}
              {loading && <Loader label="Loading feed..." />}
              {error && <ErrorNote message={error} />}
              {posts.length === 0 && !loading ? <Empty>No posts yet. Be the first to share!</Empty> :
                posts.map(post => (
                  <div key={post.id} style={{
                    background: '#FAF5F6',
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 16
                  }}>
                    {/* Post Header */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #732E4A 0%, #B38F92 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        color: 'white',
                        marginRight: 12
                      }}>{post.author.charAt(0).toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{post.author}</div>
                        <div style={{ fontSize: 13, color: '#666' }}>{formatDate(post.created_at)}</div>
                      </div>
                      <button
                        onClick={() => savePost(post.id)}
                        style={{
                          padding: '8px 12px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontSize: 18
                        }}
                      >🔖</button>
                    </div>

                    {/* Post Content */}
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>{post.title}</h3>
                    <p style={{ margin: '0 0 12px 0', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {post.content}
                    </p>

                    {/* Hashtags */}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        {post.hashtags.map((tag, i) => (
                          <span
                            key={i}
                            style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              background: '#F2DFE1',
                              color: '#732E4A',
                              borderRadius: 4,
                              fontSize: 12,
                              marginRight: 6,
                              marginBottom: 6
                            }}
                          >#{tag}</span>
                        ))}
                      </div>
                    )}

                    {/* Poll */}
                    {post.post_type === 'poll' && post.poll_options && (
                      <div style={{ marginBottom: 12 }}>
                        {post.poll_options.map((option, i) => {
                          const votes = post.poll_votes?.[option]?.length || 0
                          const totalVotes = Object.values(post.poll_votes || {}).reduce((sum, v) => sum + v.length, 0)
                          const percentage = totalVotes > 0 ? (votes / totalVotes * 100) : 0
                          const hasVoted = post.poll_votes?.[option]?.includes(currentUser)

                          return (
                            <div
                              key={i}
                              onClick={() => votePoll(post.id, option)}
                              style={{
                                padding: '12px',
                                border: hasVoted ? '2px solid #732E4A' : '1px solid var(--border)',
                                borderRadius: 8,
                                marginBottom: 8,
                                cursor: 'pointer',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  height: '100%',
                                  width: `${percentage}%`,
                                  background: 'rgba(179, 143, 146, 0.15)',
                                  transition: 'width 0.3s'
                                }}
                              />
                              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: hasVoted ? 600 : 400 }}>{option}</span>
                                <span style={{ fontSize: 13, color: '#666' }}>
                                  {percentage.toFixed(0)}% ({votes})
                                </span>
                              </div>
                            </div>
                          )
                        })}
                        <div style={{ fontSize: 13, color: '#666', marginTop: 8 }}>
                          {Object.values(post.poll_votes || {}).reduce((sum, v) => sum + v.length, 0)} votes
                        </div>
                      </div>
                    )}

                    {/* Reactions */}
                    <div style={{
                      display: 'flex',
                      gap: 16,
                      paddingTop: 12,
                      borderTop: '1px solid var(--border)'
                    }}>
                      {Object.entries(reactionIcons).map(([type, icon]) => (
                        <button
                          key={type}
                          onClick={() => react(post.id, type)}
                          style={{
                            padding: '8px 12px',
                            border: 'none',
                            background: Object.values(post.reactions || {}).includes(type) && Object.keys(post.reactions || {}).includes(currentUser) ? '#e0e7ff' : 'transparent',
                            borderRadius: 20,
                            cursor: 'pointer',
                            fontSize: 14,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <span>{icon}</span>
                          <span style={{ fontSize: 13 }}>
                            {Object.values(post.reactions || {}).filter(r => r === type).length || ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* Profile View */}
          {view === 'profile' && (
            <div style={{ background: '#FAF5F6', borderRadius: 12, padding: 24 }}>
              {!editProfile ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
                    <div>
                      <h2 style={{ margin: '0 0 8px 0' }}>{profileName}</h2>
                      <p style={{ margin: '0 0 4px 0', fontSize: 16, color: '#666' }}>{profileHeadline}</p>
                      <p style={{ margin: 0, fontSize: 14, color: '#999' }}>📍 {profileLocation}</p>
                    </div>
                    <Button onClick={() => setEditProfile(true)}>✏️ Edit</Button>
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <h4 style={{ margin: '0 0 8px 0' }}>About</h4>
                    <p style={{ margin: 0, lineHeight: 1.6 }}>{profileBio}</p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 12px 0' }}>Skills</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {profileSkills.split(',').map((skill, i) => (
                        <span key={i} style={{
                          padding: '8px 16px',
                          background: '#F2DFE1',
                          color: '#732E4A',
                          borderRadius: 20,
                          fontSize: 14,
                          fontWeight: 600
                        }}>{skill.trim()}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 style={{ margin: '0 0 24px 0' }}>Edit Profile</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Field label="Name">
                      <Input value={profileName} onChange={e => setProfileName(e.target.value)} />
                    </Field>
                    <Field label="Headline">
                      <Input value={profileHeadline} onChange={e => setProfileHeadline(e.target.value)} />
                    </Field>
                    <Field label="Bio">
                      <Textarea rows={4} value={profileBio} onChange={e => setProfileBio(e.target.value)} />
                    </Field>
                    <Field label="Skills (comma-separated)">
                      <Input value={profileSkills} onChange={e => setProfileSkills(e.target.value)} />
                    </Field>
                    <Field label="Location">
                      <Input value={profileLocation} onChange={e => setProfileLocation(e.target.value)} />
                    </Field>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <Button onClick={saveProfile} loading={loading}>Save Profile</Button>
                      <Button variant="ghost" onClick={() => setEditProfile(false)}>Cancel</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Jobs View */}
          {view === 'jobs' && (
            <div>
              <h2 style={{ margin: '0 0 20px 0' }}>Job Opportunities</h2>
              {loading && <Loader label="Loading jobs..." />}
              {jobs.length === 0 ? <Empty>No jobs posted yet.</Empty> :
                jobs.map(job => (
                  <div key={job.id} style={{
                    background: '#FAF5F6',
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 16
                  }}>
                    <div style={{ marginBottom: 12 }}>
                      <h3 style={{ margin: '0 0 4px 0' }}>{job.title}</h3>
                      <p style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 600, color: '#732E4A' }}>
                        {job.company}
                      </p>
                      <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
                        📍 {job.location} • {job.type}
                      </p>
                    </div>
                    <p style={{ margin: '0 0 16px 0', fontSize: 14, lineHeight: 1.6 }}>
                      {job.description}
                    </p>
                    <Button>Apply Now</Button>
                  </div>
                ))
              }
            </div>
          )}

          {/* Search Results */}
          {view === 'search' && searchResults && (
            <div>
              <h2 style={{ margin: '0 0 20px 0' }}>Search Results for "{searchQuery}"</h2>
              
              {searchResults.posts && searchResults.posts.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ margin: '0 0 12px 0' }}>Posts</h3>
                  {searchResults.posts.map(post => (
                    <div key={post.id} style={{
                      background: '#FAF5F6',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12
                    }}>
                      <h4 style={{ margin: '0 0 4px 0' }}>{post.title}</h4>
                      <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
                        {post.content.substring(0, 150)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
              
              {searchResults.people && searchResults.people.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ margin: '0 0 12px 0' }}>People</h3>
                  {searchResults.people.map(person => (
                    <div key={person.user_id} style={{
                      background: '#FAF5F6',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12
                    }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #732E4A 0%, #B38F92 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        color: 'white'
                      }}>{person.name.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{person.name}</div>
                        <div style={{ fontSize: 14, color: '#666' }}>{person.headline}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{ position: 'sticky', top: 20 }}>
            {/* Notifications */}
            {notifications.length > 0 && (
              <div style={{
                background: '#FAF5F6',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 15 }}>
                  🔔 Notifications ({notifications.filter(n => !n.read).length})
                </h4>
                {notifications.slice(0, 5).map(notif => (
                  <div
                    key={notif.id}
                    style={{
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border)',
                      fontSize: 13,
                      color: notif.read ? '#999' : 'inherit'
                    }}
                  >
                    {notif.message}
                    <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                      {formatDate(notif.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Trending Topics */}
            <div style={{
              background: '#FAF5F6',
              borderRadius: 12,
              padding: 16
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 15 }}>🔥 Trending</h4>
              {['#ArtificialIntelligence', '#WebDevelopment', '#DataScience', '#MachineLearning', '#CloudComputing'].map((tag, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 0',
                    borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
                    fontSize: 13,
                    cursor: 'pointer',
                    color: '#732E4A',
                    fontWeight: 600
                  }}
                  onClick={() => {
                    setSearchQuery(tag)
                    search()
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Page>
  )
}
