import React, { useEffect, useState } from 'react'
import { apiUrl } from '../lib/api'
import Page from '../components/layout/Page'
import Button from '../components/ui/Button'
import { Field, Input, Textarea, Select } from '../components/ui/Field'
import Loader from '../components/ui/Loader'
import ErrorNote from '../components/ui/ErrorNote'
import Dropzone from '../components/ui/Dropzone'
import Empty from '../components/ui/Empty'

export default function Doc() {
  const [tab, setTab] = useState('vault')
  const [file, setFile] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Document upload states
  const [category, setCategory] = useState('academic')
  const [description, setDescription] = useState('')
  
  // Resume builder states
  const [resumeData, setResumeData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    summary: '',
    skills: '',
    experience: '',
    education: '',
    certifications: '',
    projects: ''
  })
  const [resumeLoading, setResumeLoading] = useState(false)
  const [generatedResume, setGeneratedResume] = useState('')

  const documentCategories = [
    { value: 'academic', label: '🎓 Academic (Marksheets, Transcripts)' },
    { value: 'certificates', label: '🏆 Certificates & Awards' },
    { value: 'professional', label: '💼 Professional (Experience Letters)' },
    { value: 'government', label: '🏛️ Government (ID, Tax, Legal)' },
    { value: 'personal', label: '👤 Personal Documents' },
    { value: 'financial', label: '💰 Financial (Bank, Investment)' }
  ]

  const loadDocuments = async () => {
    try {
      const res = await fetch(apiUrl('/api/edudoc/documents'))
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch (e) {
      setError(String(e))
    }
  }

  useEffect(() => { loadDocuments() }, [])

  const onUploadDocument = async (e) => {
    e.preventDefault()
    if (!file) return
    setLoading(true); setError('')
    
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('category', category)
      form.append('description', description)
      
      const res = await fetch(apiUrl('/api/edudoc/upload'), { 
        method: 'POST', 
        body: form 
      })
      const data = await res.json()
      
      if (data.success) {
        await loadDocuments()
        setFile(null)
        setDescription('')
        setError('')
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }
  
  const onGenerateResume = async () => {
    setResumeLoading(true)
    setError('')
    
    try {
      const res = await fetch(apiUrl('/api/edudoc/generate-resume'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resumeData)
      })
      const data = await res.json()
      
      if (data.download_url) {
        setGeneratedResume(data.download_url)
      } else {
        setError(data.error || 'Resume generation failed')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setResumeLoading(false)
    }
  }
  
  const deleteDocument = async (docId) => {
    try {
      const res = await fetch(apiUrl(`/api/edudoc/delete/${docId}`), {
        method: 'DELETE'
      })
      if (res.ok) {
        await loadDocuments()
      }
    } catch (e) {
      setError(String(e))
    }
  }
  
  const groupedDocs = documents.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = []
    acc[doc.category].push(doc)
    return acc
  }, {})

  return (
    <Page title="EduDoc – Personal Document Vault" description="Securely store your important documents and generate ATS-friendly resumes.">
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '12px'
      }}>
        {[
          { id: 'vault', label: '🗃️ Document Vault', desc: 'Store & organize documents' },
          { id: 'resume', label: '📄 Resume Builder', desc: 'Create ATS-friendly resumes' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              borderRadius: '8px',
              background: tab === t.id ? 'var(--primary)' : 'var(--background-secondary)',
              color: tab === t.id ? 'white' : 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: tab === t.id ? '600' : '500',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              minWidth: '150px'
            }}
          >
            <div>{t.label}</div>
            <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>{t.desc}</div>
          </button>
        ))}
      </div>
      
      {error && <ErrorNote>{error}</ErrorNote>}
      
      {/* Document Vault Tab */}
      {tab === 'vault' && (
        <div>
          {/* Upload Section */}
          <div style={{
            background: 'var(--background-secondary)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--primary)' }}>
              📁 Upload New Document
            </h3>
            
            <form onSubmit={onUploadDocument} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Field label="Document Category">
                <Select 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  required
                >
                  {documentCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </Select>
              </Field>
              
              <Field label="Description (Optional)">
                <Input 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of the document..."
                />
              </Field>
              
              <Field label="Select File">
                <Dropzone 
                  onFileSelect={setFile}
                  selectedFile={file}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </Field>
              
              <Button type="submit" loading={loading} disabled={!file}>
                📤 Upload Document
              </Button>
            </form>
          </div>
          
          {/* Documents Display */}
          <div>
            <h3 style={{ marginBottom: '20px' }}>📚 Your Document Vault</h3>
            
            {documents.length === 0 ? (
              <Empty>
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
                  <h4>No documents yet</h4>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Upload your first document using the form above
                  </p>
                </div>
              </Empty>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {documentCategories.map(category => {
                  const categoryDocs = groupedDocs[category.value] || []
                  if (categoryDocs.length === 0) return null
                  
                  return (
                    <div key={category.value} style={{
                      background: 'var(--background-secondary)',
                      padding: '20px',
                      borderRadius: '12px'
                    }}>
                      <h4 style={{ 
                        margin: '0 0 12px 0',
                        color: 'var(--primary)',
                        borderBottom: '1px solid var(--border)',
                        paddingBottom: '8px'
                      }}>
                        {category.label} ({categoryDocs.length})
                      </h4>
                      
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {categoryDocs.map(doc => (
                          <div key={doc.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            background: 'var(--background)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)'
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                                <a 
                                  href={apiUrl(doc.url)} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  style={{ 
                                    color: 'var(--primary)', 
                                    textDecoration: 'none',
                                    borderRadius: '4px',
                                    padding: '2px 4px'
                                  }}
                                  onMouseOver={e => e.target.style.background = 'var(--primary-light)'}
                                  onMouseOut={e => e.target.style.background = 'transparent'}
                                >
                                  📄 {doc.filename}
                                </a>
                              </div>
                              {doc.description && (
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                  {doc.description}
                                </div>
                              )}
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Uploaded: {new Date(doc.uploadDate).toLocaleDateString()} • 
                                Size: {Math.round(doc.size / 1024)} KB
                              </div>
                            </div>
                            <button
                              onClick={() => deleteDocument(doc.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--error)',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '6px',
                                fontSize: '16px'
                              }}
                              title="Delete document"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Resume Builder Tab */}
      {tab === 'resume' && (
        <div>
          <div style={{
            background: 'var(--background-secondary)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--primary)' }}>
              📄 ATS-Friendly Resume Builder
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Create a professional, ATS-optimized resume using your stored documents as reference.
            </p>
            
            <div style={{ display: 'grid', gap: '20px' }}>
              {/* Personal Information */}
              <div>
                <h4 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Personal Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Field label="Full Name *">
                    <Input 
                      value={resumeData.fullName}
                      onChange={e => setResumeData({...resumeData, fullName: e.target.value})}
                      placeholder="John Doe"
                      required
                    />
                  </Field>
                  <Field label="Email *">
                    <Input 
                      type="email"
                      value={resumeData.email}
                      onChange={e => setResumeData({...resumeData, email: e.target.value})}
                      placeholder="john.doe@email.com"
                      required
                    />
                  </Field>
                  <Field label="Phone *">
                    <Input 
                      value={resumeData.phone}
                      onChange={e => setResumeData({...resumeData, phone: e.target.value})}
                      placeholder="+1 (555) 123-4567"
                      required
                    />
                  </Field>
                  <Field label="Address">
                    <Input 
                      value={resumeData.address}
                      onChange={e => setResumeData({...resumeData, address: e.target.value})}
                      placeholder="City, State, Country"
                    />
                  </Field>
                </div>
              </div>
              
              {/* Professional Summary */}
              <Field label="Professional Summary">
                <Textarea 
                  value={resumeData.summary}
                  onChange={e => setResumeData({...resumeData, summary: e.target.value})}
                  placeholder="Brief professional summary highlighting key achievements and expertise..."
                  rows={3}
                />
              </Field>
              
              {/* Skills */}
              <Field label="Technical Skills">
                <Textarea 
                  value={resumeData.skills}
                  onChange={e => setResumeData({...resumeData, skills: e.target.value})}
                  placeholder="Programming Languages: Python, JavaScript, Java&#10;Frameworks: React, Django, Node.js&#10;Tools: Git, Docker, AWS"
                  rows={3}
                />
              </Field>
              
              {/* Experience */}
              <Field label="Professional Experience">
                <Textarea 
                  value={resumeData.experience}
                  onChange={e => setResumeData({...resumeData, experience: e.target.value})}
                  placeholder="Software Engineer | ABC Company | 2020-2023&#10;• Developed and maintained web applications serving 10k+ users&#10;• Led team of 3 developers on critical projects&#10;&#10;Junior Developer | XYZ Corp | 2018-2020&#10;• Built responsive user interfaces using React&#10;• Collaborated with cross-functional teams"
                  rows={6}
                />
              </Field>
              
              {/* Education */}
              <Field label="Education">
                <Textarea 
                  value={resumeData.education}
                  onChange={e => setResumeData({...resumeData, education: e.target.value})}
                  placeholder="Bachelor of Science in Computer Science&#10;University Name | 2014-2018 | GPA: 3.8/4.0"
                  rows={3}
                />
              </Field>
              
              {/* Certifications */}
              <Field label="Certifications">
                <Textarea 
                  value={resumeData.certifications}
                  onChange={e => setResumeData({...resumeData, certifications: e.target.value})}
                  placeholder="AWS Certified Developer Associate&#10;Google Cloud Professional Developer&#10;Certified Scrum Master"
                  rows={3}
                />
              </Field>
              
              {/* Projects */}
              <Field label="Notable Projects">
                <Textarea 
                  value={resumeData.projects}
                  onChange={e => setResumeData({...resumeData, projects: e.target.value})}
                  placeholder="E-Commerce Platform&#10;• Built full-stack application with React and Django&#10;• Integrated payment processing and inventory management&#10;&#10;Data Visualization Dashboard&#10;• Created interactive dashboards using D3.js&#10;• Processed and analyzed large datasets"
                  rows={6}
                />
              </Field>
            </div>
            
            <div style={{ marginTop: '24px' }}>
              <Button 
                onClick={onGenerateResume}
                loading={resumeLoading}
                disabled={!resumeData.fullName || !resumeData.email || !resumeData.phone}
              >
                🚀 Generate ATS Resume
              </Button>
            </div>
          </div>
          
          {/* Generated Resume Download */}
          {generatedResume && (
            <div style={{
              background: 'var(--success-bg)',
              border: '1px solid var(--success)',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ color: 'var(--success)', marginBottom: '8px', fontSize: '18px' }}>
                ✅ Resume Generated Successfully!
              </div>
              <a 
                href={apiUrl(generatedResume)}
                download
                style={{
                  display: 'inline-block',
                  background: 'var(--success)',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                📥 Download Resume (.docx)
              </a>
            </div>
          )}
        </div>
      )}
      
      {loading && <Loader label="Processing..." />}
    </Page>
  )
}