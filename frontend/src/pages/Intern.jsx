import React, { useEffect, useState } from 'react'

export default function Intern() {
  const [view, setView] = useState('browse')
  const [internships, setInternships] = useState([])
  const [filters, setFilters] = useState({ mode: '', is_paid: '', scholarship_only: false, skills: '', search: '', sort_by: 'recent' })
  const [options, setOptions] = useState({ modes: [], experience_levels: [], durations: [], industries: [], skills: [], sort_options: [] })
  const [selected, setSelected] = useState(null)
  const [applyForm, setApplyForm] = useState({ applicant: '', email: '', resume_url: '', cover_letter: '', phone: '', availability: '' })
  const [scholarForm, setScholarForm] = useState({ applicant: '', email: '', cgpa: '', essay: '', financial_need: '', achievements: '' })
  const [student, setStudent] = useState({ name: '', email: '', university: '', major: '', cgpa: '', skills: '' })
  const [username] = useState(`student_${Math.floor(Math.random() * 1000)}`)
  const [myApplications, setMyApplications] = useState([])
  const [myScholarships, setMyScholarships] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadOptions()
    loadInternships()
  }, [])

  async function loadOptions() {
    const res = await fetch('/api/eduintern/filters/options')
    const data = await res.json()
    setOptions(data)
  }

  async function loadInternships() {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== false) params.append(k, v)
    })
    const res = await fetch(`/api/eduintern/list?${params}`)
    const data = await res.json()
    setInternships(data.internships || [])
    setLoading(false)
  }

  async function loadMyApplications() {
    const res = await fetch(`/api/eduintern/applications?applicant=${username}`)
    const data = await res.json()
    setMyApplications(data.applications || [])
  }

  async function loadMyScholarships() {
    const res = await fetch(`/api/eduintern/scholarship/applications?applicant=${username}`)
    const data = await res.json()
    setMyScholarships(data.scholarship_applications || [])
  }

  async function loadAnalytics() {
    const res = await fetch('/api/eduintern/analytics/platform')
    const data = await res.json()
    setAnalytics(data)
  }

  async function viewDetails(job) {
    const res = await fetch(`/api/eduintern/internship/${job.id}`)
    const data = await res.json()
    setSelected(data.internship || job)
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function validateApplyForm() {
    const errs = {}
    if (!applyForm.email || !validateEmail(applyForm.email)) errs.email = 'Valid email required'
    if (!applyForm.applicant || applyForm.applicant.trim().length < 2) errs.applicant = 'Name required'
    return errs
  }

  function validateScholarForm() {
    const errs = {}
    if (!scholarForm.email || !validateEmail(scholarForm.email)) errs.email = 'Valid email required'
    if (!scholarForm.cgpa || isNaN(scholarForm.cgpa) || scholarForm.cgpa < 0 || scholarForm.cgpa > 4) errs.cgpa = 'CGPA must be 0-4'
    if (!scholarForm.essay || scholarForm.essay.trim().length < 50) errs.essay = 'Essay must be at least 50 characters'
    return errs
  }

  async function submitApplication(e) {
    e.preventDefault()
    if (!selected) return alert('Choose an internship')
    const errs = validateApplyForm()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setLoading(true)
    const payload = { internship_id: selected.id, applicant: applyForm.applicant || username, email: applyForm.email, resume_url: applyForm.resume_url, cover_letter: applyForm.cover_letter, phone: applyForm.phone, availability: applyForm.availability }
    const res = await fetch('/api/eduintern/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    setLoading(false)
    if (data.ok) { alert('✅ Application submitted successfully!'); setApplyForm({ applicant: '', email: '', resume_url: '', cover_letter: '', phone: '', availability: '' }); loadInternships() }
    else alert(data.error || 'Failed to apply')
  }

  async function submitScholarship(e) {
    e.preventDefault()
    if (!selected) return alert('Choose an internship')
    const errs = validateScholarForm()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setLoading(true)
    const payload = { internship_id: selected.id, applicant: scholarForm.applicant || username, email: scholarForm.email, cgpa: parseFloat(scholarForm.cgpa || 0), essay: scholarForm.essay, financial_need: scholarForm.financial_need, achievements: scholarForm.achievements }
    const res = await fetch('/api/eduintern/scholarship/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    setLoading(false)
    if (data.ok) { alert('✅ Scholarship application sent!'); setScholarForm({ applicant: '', email: '', cgpa: '', essay: '', financial_need: '', achievements: '' }); loadInternships() }
    else alert(data.error || 'Failed to apply for scholarship')
  }

  async function registerStudent(e) {
    e.preventDefault()
    setLoading(true)
    const payload = { name: student.name || username, email: student.email, university: student.university, major: student.major, cgpa: parseFloat(student.cgpa || 0), skills: student.skills }
    const res = await fetch('/api/eduintern/student/register', { method: 'POST', body: new URLSearchParams(payload) })
    const data = await res.json()
    setLoading(false)
    if (data.ok) alert('✅ Student registered successfully!')
    else alert(data.error || 'Failed to register')
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <h2>🎓 EduIntern — Internships (Online & Offline)</h2>
      <p style={{ color: '#666' }}>Mode: online / offline / hybrid — supports paid, unpaid and scholarship programs.</p>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '2px solid #eee', paddingBottom: 10 }}>
        <button onClick={() => setView('browse')} style={{ padding: '8px 16px', background: view === 'browse' ? '#4CAF50' : '#fff', color: view === 'browse' ? '#fff' : '#333', border: '1px solid #ddd', borderRadius: 5, cursor: 'pointer' }}>Browse</button>
        <button onClick={() => { setView('dashboard'); loadMyApplications(); loadMyScholarships() }} style={{ padding: '8px 16px', background: view === 'dashboard' ? '#4CAF50' : '#fff', color: view === 'dashboard' ? '#fff' : '#333', border: '1px solid #ddd', borderRadius: 5, cursor: 'pointer' }}>My Dashboard</button>
        <button onClick={() => { setView('analytics'); loadAnalytics() }} style={{ padding: '8px 16px', background: view === 'analytics' ? '#4CAF50' : '#fff', color: view === 'analytics' ? '#fff' : '#333', border: '1px solid #ddd', borderRadius: 5, cursor: 'pointer' }}>Analytics</button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 20, color: '#2196F3' }}>Loading...</div>}

      {/* Browse View */}
      {view === 'browse' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <input placeholder="Search roles or skills" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} style={{ flex: 1, padding: 8, border: '1px solid #ddd', borderRadius: 5 }} />
            <select value={filters.mode} onChange={e => setFilters({ ...filters, mode: e.target.value })} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 5 }}>
              <option value="">Any Mode</option>
              {options.modes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select value={filters.is_paid} onChange={e => setFilters({ ...filters, is_paid: e.target.value === '' ? '' : e.target.value === 'true' })} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 5 }}>
              <option value="">Paid/Unpaid</option>
              <option value="true">Paid Only</option>
              <option value="false">Unpaid Only</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, padding: 8 }}>
              <input type="checkbox" checked={filters.scholarship_only} onChange={e => setFilters({ ...filters, scholarship_only: e.target.checked })} />
              Scholarship
            </label>
            <select value={filters.sort_by} onChange={e => setFilters({ ...filters, sort_by: e.target.value })} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 5 }}>
              {options.sort_options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={loadInternships} style={{ padding: '8px 16px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer' }}>Apply Filters</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
            <div>
              {internships.length === 0 && !loading && <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>No internships found. Try different filters.</div>}
              <div style={{ display: 'grid', gap: 12 }}>
                {internships.map(job => (
                  <div key={job.id} style={{ border: '1px solid #eee', padding: 15, borderRadius: 8, background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: 16 }}>{job.role}</strong>
                        <div style={{ color: '#666', marginTop: 4 }}>
                          {job.company} • <span style={{ color: '#2196F3' }}>{job.mode}</span> • {job.duration}
                        </div>
                        {job.skills_required && job.skills_required.length > 0 && (
                          <div style={{ marginTop: 6 }}>
                            {job.skills_required.slice(0, 3).map((s, i) => (
                              <span key={i} style={{ display: 'inline-block', background: '#E3F2FD', padding: '2px 8px', borderRadius: 3, fontSize: 12, marginRight: 4 }}>{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: job.is_paid ? '#2e7d32' : '#666', fontWeight: '600', fontSize: 18 }}>
                          {job.is_paid ? `₹${(job.stipend * 83).toLocaleString('en-IN')}` : 'Unpaid'}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>{job.openings_remaining} openings</div>
                        {job.scholarship_available && <div style={{ fontSize: 11, color: '#FF9800', marginTop: 2 }}>🎓 Scholarship</div>}
                      </div>
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      <button onClick={() => { viewDetails(job); setView('detail') }} style={{ padding: '6px 12px', background: '#2196F3', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer' }}>View Details</button>
                      <button onClick={() => { setSelected(job); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={{ padding: '6px 12px', background: '#fff', color: '#2196F3', border: '1px solid #2196F3', borderRadius: 5, cursor: 'pointer' }}>Quick Apply</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside style={{ border: '1px solid #eee', padding: 15, borderRadius: 8, background: '#fff', height: 'fit-content', position: 'sticky', top: 20 }}>
              <h3>Quick Apply</h3>
              {selected ? (
                <div>
                  <h4 style={{ margin: '10px 0' }}>{selected.role}</h4>
                  <div style={{ color: '#666', fontSize: 14 }}>{selected.company} • {selected.mode} • {selected.duration}</div>
                  
                  <hr style={{ margin: '15px 0' }} />
                  <h4>Apply Now</h4>
                  <form onSubmit={submitApplication}>
                    <input 
                      placeholder="Your name*" 
                      value={applyForm.applicant} 
                      onChange={e => setApplyForm({ ...applyForm, applicant: e.target.value })} 
                      style={{ width: '100%', padding: 8, marginBottom: 8, border: errors.applicant ? '1px solid red' : '1px solid #ddd', borderRadius: 5 }} 
                      required
                    />
                    {errors.applicant && <div style={{ color: 'red', fontSize: 12, marginTop: -6, marginBottom: 6 }}>{errors.applicant}</div>}
                    
                    <input 
                      type="email"
                      placeholder="Email*" 
                      value={applyForm.email} 
                      onChange={e => setApplyForm({ ...applyForm, email: e.target.value })} 
                      style={{ width: '100%', padding: 8, marginBottom: 8, border: errors.email ? '1px solid red' : '1px solid #ddd', borderRadius: 5 }} 
                      required
                    />
                    {errors.email && <div style={{ color: 'red', fontSize: 12, marginTop: -6, marginBottom: 6 }}>{errors.email}</div>}
                    
                    <input 
                      placeholder="Resume URL" 
                      value={applyForm.resume_url} 
                      onChange={e => setApplyForm({ ...applyForm, resume_url: e.target.value })} 
                      style={{ width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ddd', borderRadius: 5 }} 
                    />
                    <input 
                      placeholder="Phone" 
                      value={applyForm.phone} 
                      onChange={e => setApplyForm({ ...applyForm, phone: e.target.value })} 
                      style={{ width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ddd', borderRadius: 5 }} 
                    />
                    <textarea 
                      placeholder="Cover letter (optional)" 
                      value={applyForm.cover_letter} 
                      onChange={e => setApplyForm({ ...applyForm, cover_letter: e.target.value })} 
                      style={{ width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ddd', borderRadius: 5, minHeight: 60 }} 
                    />
                    <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: loading ? '#ccc' : '#4CAF50', color: '#fff', border: 'none', borderRadius: 5, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                      {loading ? 'Submitting...' : 'Submit Application'}
                    </button>
                  </form>

                  {selected.scholarship_available && (
                    <div style={{ marginTop: 15, paddingTop: 15, borderTop: '1px solid #eee' }}>
                      <h4 style={{ color: '#FF9800' }}>🎓 Apply for Scholarship</h4>
                      <p style={{ fontSize: 12, color: '#666' }}>Min CGPA: {selected.min_cgpa || 'Not specified'}</p>
                      <form onSubmit={submitScholarship}>
                        <input 
                          placeholder="Name*" 
                          value={scholarForm.applicant} 
                          onChange={e => setScholarForm({ ...scholarForm, applicant: e.target.value })} 
                          style={{ width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ddd', borderRadius: 5 }} 
                          required
                        />
                        <input 
                          type="email"
                          placeholder="Email*" 
                          value={scholarForm.email} 
                          onChange={e => setScholarForm({ ...scholarForm, email: e.target.value })} 
                          style={{ width: '100%', padding: 8, marginBottom: 8, border: errors.email ? '1px solid red' : '1px solid #ddd', borderRadius: 5 }} 
                          required
                        />
                        {errors.email && <div style={{ color: 'red', fontSize: 12, marginTop: -6, marginBottom: 6 }}>{errors.email}</div>}
                        
                        <input 
                          type="number"
                          step="0.01"
                          placeholder="CGPA (0-4)*" 
                          value={scholarForm.cgpa} 
                          onChange={e => setScholarForm({ ...scholarForm, cgpa: e.target.value })} 
                          style={{ width: '100%', padding: 8, marginBottom: 8, border: errors.cgpa ? '1px solid red' : '1px solid #ddd', borderRadius: 5 }} 
                          required
                        />
                        {errors.cgpa && <div style={{ color: 'red', fontSize: 12, marginTop: -6, marginBottom: 6 }}>{errors.cgpa}</div>}
                        
                        <textarea 
                          placeholder="Essay (min 50 chars)*" 
                          value={scholarForm.essay} 
                          onChange={e => setScholarForm({ ...scholarForm, essay: e.target.value })} 
                          style={{ width: '100%', padding: 8, marginBottom: 8, border: errors.essay ? '1px solid red' : '1px solid #ddd', borderRadius: 5, minHeight: 80 }} 
                          required
                        />
                        {errors.essay && <div style={{ color: 'red', fontSize: 12, marginTop: -6, marginBottom: 6 }}>{errors.essay}</div>}
                        
                        <textarea 
                          placeholder="Financial need" 
                          value={scholarForm.financial_need} 
                          onChange={e => setScholarForm({ ...scholarForm, financial_need: e.target.value })} 
                          style={{ width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ddd', borderRadius: 5, minHeight: 50 }} 
                        />
                        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: loading ? '#ccc' : '#FF9800', color: '#fff', border: 'none', borderRadius: 5, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                          {loading ? 'Submitting...' : 'Apply for Scholarship'}
                        </button>
                      </form>
                    </div>
                  )}

                </div>
              ) : (
                <div style={{ color: '#999', padding: 20, textAlign: 'center' }}>Select an internship to view details and apply</div>
              )}

              <hr style={{ margin: '20px 0' }} />
              <h4>Student Registration</h4>
              <form onSubmit={registerStudent}>
                <input placeholder="Full name*" value={student.name} onChange={e => setStudent({ ...student, name: e.target.value })} style={{ width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ddd', borderRadius: 5 }} required />
                <input type="email" placeholder="Email*" value={student.email} onChange={e => setStudent({ ...student, email: e.target.value })} style={{ width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ddd', borderRadius: 5 }} required />
                <input placeholder="University" value={student.university} onChange={e => setStudent({ ...student, university: e.target.value })} style={{ width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ddd', borderRadius: 5 }} />
                <input placeholder="Major" value={student.major} onChange={e => setStudent({ ...student, major: e.target.value })} style={{ width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ddd', borderRadius: 5 }} />
                <input type="number" step="0.01" placeholder="CGPA" value={student.cgpa} onChange={e => setStudent({ ...student, cgpa: e.target.value })} style={{ width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ddd', borderRadius: 5 }} />
                <input placeholder="Skills (comma separated)" value={student.skills} onChange={e => setStudent({ ...student, skills: e.target.value })} style={{ width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ddd', borderRadius: 5 }} />
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '8px', background: loading ? '#ccc' : '#2196F3', color: '#fff', border: 'none', borderRadius: 5, cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Registering...' : 'Register'}
                </button>
              </form>
            </aside>
          </div>
        </>
      )}

      {/* Dashboard View */}
      {view === 'dashboard' && (
        <div>
          <h3>My Dashboard</h3>
          <div style={{ marginBottom: 30 }}>
            <h4>My Applications ({myApplications.length})</h4>
            {myApplications.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No applications yet</div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {myApplications.map(app => (
                  <div key={app.id} style={{ border: '1px solid #eee', padding: 15, borderRadius: 8, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <strong>{app.role}</strong>
                        <div style={{ color: '#666', fontSize: 14 }}>{app.company}</div>
                        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>Applied: {new Date(app.created_at).toLocaleDateString()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ 
                          padding: '4px 12px', 
                          borderRadius: 5, 
                          fontSize: 12, 
                          fontWeight: 'bold',
                          background: app.status === 'accepted' ? '#4CAF50' : app.status === 'rejected' ? '#f44336' : '#FF9800',
                          color: '#fff'
                        }}>
                          {app.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4>My Scholarship Applications ({myScholarships.length})</h4>
            {myScholarships.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No scholarship applications yet</div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {myScholarships.map(schol => (
                  <div key={schol.id} style={{ border: '1px solid #eee', padding: 15, borderRadius: 8, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <strong>{schol.role}</strong>
                        <div style={{ color: '#666', fontSize: 14 }}>{schol.company}</div>
                        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>CGPA: {schol.cgpa}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ 
                          padding: '4px 12px', 
                          borderRadius: 5, 
                          fontSize: 12, 
                          fontWeight: 'bold',
                          background: schol.status === 'approved' ? '#4CAF50' : schol.status === 'rejected' ? '#f44336' : '#FF9800',
                          color: '#fff'
                        }}>
                          {schol.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics View */}
      {view === 'analytics' && analytics && (
        <div>
          <h3>Platform Analytics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15, marginBottom: 30 }}>
            <div style={{ border: '1px solid #eee', padding: 20, borderRadius: 8, textAlign: 'center', background: '#fff' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#4CAF50' }}>{analytics.total_internships}</div>
              <div style={{ color: '#666' }}>Total Internships</div>
            </div>
            <div style={{ border: '1px solid #eee', padding: 20, borderRadius: 8, textAlign: 'center', background: '#fff' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#2196F3' }}>{analytics.active_internships}</div>
              <div style={{ color: '#666' }}>Active</div>
            </div>
            <div style={{ border: '1px solid #eee', padding: 20, borderRadius: 8, textAlign: 'center', background: '#fff' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#FF9800' }}>{analytics.total_scholarships}</div>
              <div style={{ color: '#666' }}>Scholarships</div>
            </div>
            <div style={{ border: '1px solid #eee', padding: 20, borderRadius: 8, textAlign: 'center', background: '#fff' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#9C27B0' }}>₹{(analytics.average_stipend * 83).toLocaleString('en-IN')}</div>
              <div style={{ color: '#666' }}>Avg Stipend</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ border: '1px solid #eee', padding: 20, borderRadius: 8, background: '#fff' }}>
              <h4>Mode Breakdown</h4>
              <div>Online: {analytics.mode_breakdown?.online || 0}</div>
              <div>Offline: {analytics.mode_breakdown?.offline || 0}</div>
              <div>Hybrid: {analytics.mode_breakdown?.hybrid || 0}</div>
            </div>
            <div style={{ border: '1px solid #eee', padding: 20, borderRadius: 8, background: '#fff' }}>
              <h4>Payment Stats</h4>
              <div>Paid: {analytics.payment_breakdown?.paid || 0}</div>
              <div>Unpaid: {analytics.payment_breakdown?.unpaid || 0}</div>
              <div>With Scholarship: {analytics.payment_breakdown?.with_scholarship || 0}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
