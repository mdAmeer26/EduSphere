import React, { useEffect, useState } from 'react'
import { apiUrl } from '../lib/api'
import Button from '../components/ui/Button'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { useToast } from '../components/ui/ToastProvider'

export default function Notes() {
  const toast = useToast()
  
  // Form states for sharing notes
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [instructor, setInstructor] = useState('')
  const [studentName, setStudentName] = useState('')
  const [university, setUniversity] = useState('')
  const [semester, setSemester] = useState('')
  const [content, setContent] = useState('')
  const [noteType, setNoteType] = useState('lecture')
  const [tags, setTags] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState('')
  
  // Browse and search states
  const [browseSubject, setBrowseSubject] = useState('')
  const [browseUniversity, setBrowseUniversity] = useState('')
  const [browseSemester, setBrowseSemester] = useState('')
  const [browseNoteType, setBrowseNoteType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Data states
  const [notes, setNotes] = useState([])
  const [subjects, setSubjects] = useState([])
  const [selectedNote, setSelectedNote] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('browse') // browse, share, view
  
  // Load notes and subjects
  const loadNotes = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (browseSubject) params.set('subject', browseSubject)
      if (browseUniversity) params.set('university', browseUniversity)
      if (browseSemester) params.set('semester', browseSemester)
      if (browseNoteType) params.set('note_type', browseNoteType)
      if (searchQuery) params.set('search', searchQuery)
      
      const res = await fetch(apiUrl(`/api/edunotes/browse?${params}`))
      const data = await res.json()
      setNotes(data.notes || [])
    } catch (e) {
      toast.push('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }
  
  const loadSubjects = async () => {
    try {
      const res = await fetch(apiUrl('/api/edunotes/subjects'))
      const data = await res.json()
      setSubjects(data.subjects || [])
    } catch (e) {
      // Silently fail for subjects
    }
  }
  
  useEffect(() => { 
    loadNotes()
    loadSubjects()
  }, [browseSubject, browseUniversity, browseSemester, browseNoteType, searchQuery])

  // File handling
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!validTypes.includes(file.type)) {
        toast.push('Please select a PDF, JPEG, or PNG file')
        return
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.push('File size must be less than 10MB')
        return
      }
      
      setSelectedFile(file)
      setFilePreview(file.name)
    }
  }
  
  const removeFile = () => {
    setSelectedFile(null)
    setFilePreview('')
  }

  // Share note
  const shareNote = async (e) => {
    e.preventDefault()
    if (!title.trim() || !subject.trim() || !studentName.trim()) {
      toast.push('Please fill in required fields: title, subject, and student name')
      return
    }
    
    if (!content.trim() && !selectedFile) {
      toast.push('Please provide either text content or upload a file')
      return
    }
    
    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('title', title)
      formData.append('subject', subject)
      formData.append('course_code', courseCode)
      formData.append('instructor', instructor)
      formData.append('student_name', studentName)
      formData.append('university', university)
      formData.append('semester', semester)
      formData.append('content', content)
      formData.append('note_type', noteType)
      formData.append('tags', tags)
      
      if (selectedFile) {
        formData.append('file', selectedFile)
      }
      
      await fetch(apiUrl('/api/edunotes/share'), { method: 'POST', body: formData })
      
      // Clear form
      setTitle(''); setSubject(''); setCourseCode(''); setInstructor('')
      setStudentName(''); setUniversity(''); setSemester(''); setContent('')
      setTags(''); setNoteType('lecture')
      removeFile()
      
      toast.push('Notes shared successfully!')
      setActiveTab('browse')
      await loadNotes()
    } catch (e) {
      toast.push('Failed to share note')
    } finally {
      setLoading(false)
    }
  }
  
  // View note details
  const viewNote = async (note) => {
    try {
      // Increment view count
      await fetch(apiUrl(`/api/edunotes/view/${note.id}`), { method: 'POST' })
      setSelectedNote(note)
      setActiveTab('view')
    } catch (e) {
      setSelectedNote(note)
      setActiveTab('view')
    }
  }
  
  // Like note
  const likeNote = async (noteId) => {
    try {
      await fetch(apiUrl(`/api/edunotes/like/${noteId}`), { method: 'POST' })
      toast.push('Note liked!')
      await loadNotes()
      if (selectedNote && selectedNote.id === noteId) {
        setSelectedNote({...selectedNote, likes: (selectedNote.likes || 0) + 1})
      }
    } catch (e) {
      toast.push('Failed to like note')
    }
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* Header */}
      <div className="section">
        <h2 style={{ marginTop: 0 }}>EduNotes – Community Notes Sharing</h2>
        <p style={{ margin: '8px 0', color: 'var(--text-secondary)' }}>
          Share and discover class notes from students around the world
        </p>
        
        {/* Tab Navigation */}
        <div className="row" style={{ gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <Button 
            variant={activeTab === 'browse' ? 'primary' : 'ghost'} 
            onClick={() => setActiveTab('browse')}
          >
            Browse Notes
          </Button>
          <Button 
            variant={activeTab === 'share' ? 'primary' : 'ghost'} 
            onClick={() => setActiveTab('share')}
          >
            Share Notes
          </Button>
          {selectedNote && (
            <Button 
              variant={activeTab === 'view' ? 'primary' : 'ghost'} 
              onClick={() => setActiveTab('view')}
            >
              View Note
            </Button>
          )}
        </div>
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <>
          {/* Filters */}
          <div className="section">
            <h3>Find Notes</h3>
            <div className="grid" style={{ gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <Field label="Subject">
                <Select 
                  value={browseSubject} 
                  onChange={e => setBrowseSubject(e.target.value)}
                  options={[
                    { value: '', label: 'All Subjects' },
                    ...subjects.map(s => ({ value: s.name, label: `${s.name} (${s.count})` }))
                  ]}
                />
              </Field>
              <Field label="University">
                <Input 
                  value={browseUniversity} 
                  onChange={e => setBrowseUniversity(e.target.value)}
                  placeholder="e.g. MIT, Harvard..."
                />
              </Field>
              <Field label="Semester">
                <Input 
                  value={browseSemester} 
                  onChange={e => setBrowseSemester(e.target.value)}
                  placeholder="e.g. Fall 2024, Spring 2023..."
                />
              </Field>
              <Field label="Note Type">
                <Select 
                  value={browseNoteType} 
                  onChange={e => setBrowseNoteType(e.target.value)}
                  options={[
                    { value: '', label: 'All Types' },
                    { value: 'lecture', label: 'Lecture Notes' },
                    { value: 'lab', label: 'Lab Reports' },
                    { value: 'exam', label: 'Exam Prep' },
                    { value: 'assignment', label: 'Assignments' },
                    { value: 'general', label: 'General Notes' }
                  ]}
                />
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="Search">
                <div className="row" style={{ gap: 8 }}>
                  <Input 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search in titles, content, and tags..."
                  />
                  <Button 
                    onClick={() => {
                      setBrowseSubject('')
                      setBrowseUniversity('')
                      setBrowseSemester('')
                      setBrowseNoteType('')
                      setSearchQuery('')
                    }}
                    variant="ghost"
                  >
                    Clear
                  </Button>
                </div>
              </Field>
            </div>
          </div>

          {/* Notes List */}
          <div className="section">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Community Notes</h3>
              {loading && <div>Loading...</div>}
            </div>
            
            <div className="list">
              {notes.length === 0 && !loading ? (
                <div className="item">
                  <p>No notes found. Try adjusting your search filters or be the first to share notes!</p>
                </div>
              ) : null}
              
              {notes.map(note => (
                <div key={note.id} className="item" style={{ cursor: 'pointer' }} onClick={() => viewNote(note)}>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, marginBottom: 4 }}>{note.title}</h4>
                      <div className="row" style={{ gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span className="badge">{note.subject}</span>
                        {note.course_code && <span className="badge" style={{ background: 'var(--primary-light)' }}>{note.course_code}</span>}
                        <span className="badge" style={{ background: 'var(--accent)' }}>{note.note_type}</span>
                      </div>
                      <p style={{ margin: 0, marginBottom: 8, color: 'var(--text-secondary)' }}>
                        {note.content ? (
                          note.content.substring(0, 150) + (note.content.length > 150 ? '...' : '')
                        ) : (
                          note.file_url ? 'File attachment available' : 'No content preview'
                        )}
                      </p>
                      {note.file_url && (
                        <div style={{ marginBottom: 8 }}>
                          <span className="badge" style={{ background: 'var(--accent)', color: 'white' }}>
                            📎 {note.file_url.split('/').pop()}
                          </span>
                        </div>
                      )}
                      <div className="row" style={{ gap: 16, fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                        <span>👤 {note.student_name}</span>
                        {note.university && <span>🏛️ {note.university}</span>}
                        {note.instructor && <span>👨‍🏫 {note.instructor}</span>}
                        <span>👁️ {note.views || 0}</span>
                        <span>❤️ {note.likes || 0}</span>
                      </div>
                    </div>
                    <Button 
                      size="small" 
                      variant="ghost" 
                      onClick={(e) => {
                        e.stopPropagation()
                        likeNote(note.id)
                      }}
                    >
                      ❤️ Like
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Share Tab */}
      {activeTab === 'share' && (
        <div className="section">
          <h3>Share Your Notes</h3>
          <form onSubmit={shareNote} className="grid" style={{ gap: 12 }}>
            <div className="grid" style={{ gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              <Field label="Title *">
                <Input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g. Introduction to Calculus"
                  required
                />
              </Field>
              <Field label="Subject *">
                <Input 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)} 
                  placeholder="e.g. Mathematics, Physics, Computer Science"
                  required
                />
              </Field>
              <Field label="Course Code">
                <Input 
                  value={courseCode} 
                  onChange={e => setCourseCode(e.target.value)} 
                  placeholder="e.g. MATH 101, CS 50"
                />
              </Field>
              <Field label="Instructor">
                <Input 
                  value={instructor} 
                  onChange={e => setInstructor(e.target.value)} 
                  placeholder="e.g. Prof. Smith"
                />
              </Field>
              <Field label="Your Name *">
                <Input 
                  value={studentName} 
                  onChange={e => setStudentName(e.target.value)} 
                  placeholder="Your name or username"
                  required
                />
              </Field>
              <Field label="University">
                <Input 
                  value={university} 
                  onChange={e => setUniversity(e.target.value)} 
                  placeholder="e.g. MIT, Harvard University"
                />
              </Field>
              <Field label="Semester">
                <Input 
                  value={semester} 
                  onChange={e => setSemester(e.target.value)} 
                  placeholder="e.g. Fall 2024, Spring 2023"
                />
              </Field>
              <Field label="Note Type">
                <Select 
                  value={noteType} 
                  onChange={e => setNoteType(e.target.value)}
                  options={[
                    { value: 'lecture', label: 'Lecture Notes' },
                    { value: 'lab', label: 'Lab Report' },
                    { value: 'exam', label: 'Exam Preparation' },
                    { value: 'assignment', label: 'Assignment' },
                    { value: 'general', label: 'General Notes' }
                  ]}
                />
              </Field>
            </div>
            
            <Field label="Tags">
              <Input 
                value={tags} 
                onChange={e => setTags(e.target.value)} 
                placeholder="e.g. derivatives, limits, calculus (comma separated)"
              />
            </Field>
            
            <Field label="Content">
              <Textarea 
                value={content} 
                onChange={e => setContent(e.target.value)} 
                placeholder="Write your notes here... Include key concepts, formulas, examples, etc. (Optional if you're uploading a file)"
                style={{ minHeight: '150px' }}
              />
            </Field>
            
            <Field label="File Upload (Optional)">
              <div className="grid" style={{ gap: 12 }}>
                <div>
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    style={{ 
                      padding: '8px', 
                      border: '1px solid var(--border)', 
                      borderRadius: '4px',
                      width: '100%',
                      background: 'var(--background)'
                    }}
                  />
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                    Accepted: PDF, JPEG, PNG (max 10MB)
                  </div>
                </div>
                {filePreview && (
                  <div className="row" style={{ 
                    alignItems: 'center', 
                    gap: 8, 
                    padding: '8px 12px', 
                    background: 'var(--background-secondary)', 
                    borderRadius: '4px',
                    border: '1px solid var(--border)'
                  }}>
                    <span style={{ flex: 1, fontSize: '0.9rem' }}>📎 {filePreview}</span>
                    <Button 
                      size="small" 
                      variant="ghost" 
                      onClick={removeFile}
                      style={{ padding: '4px 8px' }}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </Field>
            
            <div className="row">
              <Button type="submit" loading={loading}>Share Notes</Button>
              <Button type="button" variant="ghost" onClick={() => setActiveTab('browse')}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* View Tab */}
      {activeTab === 'view' && selectedNote && (
        <div className="section">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
            <Button variant="ghost" onClick={() => setActiveTab('browse')}>
              ← Back to Browse
            </Button>
            <Button onClick={() => likeNote(selectedNote.id)} variant="ghost">
              ❤️ Like ({selectedNote.likes || 0})
            </Button>
          </div>
          
          <div className="item">
            <h2 style={{ marginTop: 0 }}>{selectedNote.title}</h2>
            
            <div className="grid" style={{ gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 16 }}>
              <div>
                <strong>Subject:</strong> {selectedNote.subject}
              </div>
              {selectedNote.course_code && (
                <div>
                  <strong>Course:</strong> {selectedNote.course_code}
                </div>
              )}
              {selectedNote.instructor && (
                <div>
                  <strong>Instructor:</strong> {selectedNote.instructor}
                </div>
              )}
              <div>
                <strong>Shared by:</strong> {selectedNote.student_name}
              </div>
              {selectedNote.university && (
                <div>
                  <strong>University:</strong> {selectedNote.university}
                </div>
              )}
              {selectedNote.semester && (
                <div>
                  <strong>Semester:</strong> {selectedNote.semester}
                </div>
              )}
              <div>
                <strong>Type:</strong> {selectedNote.note_type}
              </div>
              <div>
                <strong>Views:</strong> {selectedNote.views || 0}
              </div>
            </div>
            
            {selectedNote.tags && selectedNote.tags.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <strong>Tags:</strong> {selectedNote.tags.map(tag => (
                  <span key={tag} className="badge" style={{ marginLeft: 8 }}>{tag}</span>
                ))}
              </div>
            )}
            
            {selectedNote.content && (
              <div>
                <strong>Content:</strong>
                <div style={{ 
                  marginTop: 8, 
                  padding: 16, 
                  background: 'var(--background-secondary)', 
                  borderRadius: 8,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6
                }}>
                  {selectedNote.content}
                </div>
              </div>
            )}
            
            {selectedNote.file_url && (
              <div style={{ marginTop: selectedNote.content ? 16 : 0 }}>
                <strong>File Attachment:</strong>
                <div style={{ 
                  marginTop: 8, 
                  padding: 16, 
                  background: 'var(--background-secondary)', 
                  borderRadius: 8,
                  border: '1px solid var(--border)'
                }}>
                  <div className="row" style={{ alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>
                        📎 {selectedNote.file_url.split('/').pop()}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                        Click to download or view the attached file
                      </div>
                    </div>
                    <Button 
                      onClick={() => {
                        window.open(apiUrl(selectedNote.file_url), '_blank')
                        // Increment download count
                        fetch(apiUrl(`/api/edunotes/download/${selectedNote.id}`), { method: 'POST' })
                          .catch(() => {})
                      }}
                      variant="primary"
                    >
                      📥 Download
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
              Shared on {new Date(selectedNote.shared_at).toLocaleDateString()}
              {selectedNote.downloads && <span> • Downloaded {selectedNote.downloads} times</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
