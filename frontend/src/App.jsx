import React, { useEffect, useState } from 'react'
import PDF from './pages/PDF'
import YouTube from './pages/YouTube'
import Excel from './pages/Excel'
import Present from './pages/Present'
import Chart from './pages/Chart'
import Doc from './pages/Doc'
import Chat from './pages/Chat'
import Notes from './pages/Notes'
import Whiteboard from './pages/Whiteboard'
import Attendance from './pages/Attendance'
import Meet from './pages/Meet'
import Talk from './pages/Talk'
import Blogs from './pages/Blogs'
import Tutor from './pages/Tutor'
import Trade from './pages/Trade'
import Intern from './pages/Intern'
import Lingo from './pages/Lingo'
import Focus from './pages/Focus'
import VI from './pages/VI'
import Air from './pages/Air'
import Circuit from './pages/Circuit'
import ApiStatus from './components/ApiStatus'
import Button from './components/ui/Button'

const Tab = ({ label, active, onClick, icon }) => (
  <button onClick={onClick} style={{
    padding: '14px 20px',
    margin: '4px',
    borderRadius: '12px',
    background: active 
      ? 'linear-gradient(135deg, #5c3d2e 0%, #a07866 100%)' 
      : 'rgba(255,255,255,0.95)',
    color: active ? '#fff' : '#5c3d2e',
    cursor: 'pointer',
    fontWeight: active ? '700' : '600',
    fontSize: '14px',
    boxShadow: active 
      ? '0 8px 20px rgba(92, 61, 46, 0.3)' 
      : '0 4px 12px rgba(160, 120, 102, 0.15)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
    minWidth: 'max-content',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    border: active ? 'none' : '2px solid #5c3d2e'
  }}
  onMouseEnter={(e) => {
    if (!active) {
      e.target.style.transform = 'translateY(-3px)'
      e.target.style.boxShadow = '0 12px 28px rgba(92, 61, 46, 0.25)'
      e.target.style.borderColor = '#d4a574'
    }
  }}
  onMouseLeave={(e) => {
    if (!active) {
      e.target.style.transform = 'translateY(0)'
      e.target.style.boxShadow = '0 4px 12px rgba(160, 120, 102, 0.15)'
      e.target.style.borderColor = '#5c3d2e'
    }
  }}>
    {icon && <span style={{ fontSize: '18px' }}>{icon}</span>}
    <span style={{ 
      overflow: 'hidden', 
      textOverflow: 'ellipsis',
      fontSize: window.innerWidth < 768 ? '13px' : '14px'
    }}>{label}</span>
  </button>
)

export default function App() {
  const [tab, setTab] = useState('home')
  const [theme, setTheme] = useState('light')
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  
  const aboutRef = React.useRef(null)
  const modulesRef = React.useRef(null)
  const contactRef = React.useRef(null)
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'pdf', label: 'EduPDF', icon: '📄' },
    { id: 'yt', label: 'EduTube', icon: '🎥' },
    { id: 'excel', label: 'EduExcel', icon: '📊' },
    { id: 'present', label: 'EduPresent', icon: '📽️' },
    { id: 'notes', label: 'EduNotes', icon: '📝' },
    { id: 'chart', label: 'EduChart', icon: '📈' },
    { id: 'doc', label: 'EduDoc', icon: '📁' },
    { id: 'chat', label: 'EduChat', icon: '💬' },
    { id: 'whiteboard', label: 'Whiteboard', icon: '🖍️' },
    { id: 'attendance', label: 'Attendance', icon: '✅' },
    { id: 'blogs', label: 'EduBlogs', icon: '✍️' },
    { id: 'tutor', label: 'EduTutor', icon: '👨‍🏫' },
    { id: 'trade', label: 'EduTrade', icon: '🛒' },
    { id: 'intern', label: 'Internships', icon: '💼' },
    { id: 'lingo', label: 'EduLingo', icon: '🌍' },
    { id: 'meet', label: 'EduMeet', icon: '📹' },
    { id: 'talk', label: 'EduTalk', icon: '💭' },
    { id: 'vi', label: 'EduVI', icon: '🎨' },
    { id: 'air', label: 'EduAir', icon: '✨' },
    { id: 'circuit', label: 'Circuit', icon: '⚡' },
    { id: 'focus', label: 'FocusAI', icon: '🎯' },
  ]
  
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1410 0%, #2e1f1a 50%, #3d2a1f 100%)',
      backgroundAttachment: 'fixed',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif"
    }}>
      {/* Main Content Wrapper */}
      <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
        padding: '20px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '1px solid rgba(212, 165, 116, 0.2)'
      }}>
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '24px'
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src="/logo.png" 
              alt="EduSphere Logo" 
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                boxShadow: '0 8px 20px rgba(92, 61, 46, 0.3)',
                objectFit: 'cover'
              }}
            />
            <h1 style={{ 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: '800', 
              color: '#000000',
              letterSpacing: '-0.5px'
            }}>
              EduSphere
            </h1>
          </div>
          
          {/* Navigation */}
          <nav style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px'
          }}>
            <button 
              onClick={() => {
                setTab('home')
                setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: tab === 'home' ? '#000000' : '#222222',
                fontSize: '15px',
                fontWeight: tab === 'home' ? '700' : '600',
                cursor: 'pointer',
                padding: '10px 20px',
                borderRadius: '10px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(0,0,0,0.04)'
                e.target.style.color = '#000000'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = tab === 'home' ? '#000000' : '#222222'
              }}
            >
              Home
            </button>
            <button 
              onClick={() => {
                setTab('home')
                setTimeout(() => aboutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#222222',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '10px 20px',
                borderRadius: '10px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(0,0,0,0.04)'
                e.target.style.color = '#000000'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = '#222222'
              }}
            >
              About
            </button>
            <button 
              onClick={() => {
                setTab('home')
                setTimeout(() => modulesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#222222',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '10px 20px',
                borderRadius: '10px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(0,0,0,0.04)'
                e.target.style.color = '#000000'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = '#222222'
              }}
            >
              Modules
            </button>
            <button 
              onClick={() => {
                setTab('home')
                setTimeout(() => contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#222222',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '10px 20px',
                borderRadius: '10px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(0,0,0,0.04)'
                e.target.style.color = '#000000'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = '#222222'
              }}
            >
              Contact Us
            </button>
          </nav>
          
          {/* API Status */}
          <ApiStatus />
        </div>
      </header>

      {/* Main Content */}
      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto', 
        padding: '20px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Homepage Hero */}
        {tab === 'home' && (
          <div>
            <div style={{
              background: 'rgba(30, 20, 15, 0.8)',
              borderRadius: '24px',
              padding: '60px 24px',
              textAlign: 'center',
              marginBottom: '48px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              width: '100%',
              boxSizing: 'border-box',
              border: '1px solid rgba(212, 165, 116, 0.3)',
              backdropFilter: 'blur(20px)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Animated Background Elements */}
              <div style={{
                position: 'absolute',
                top: '10%',
                left: '5%',
                fontSize: '40px',
                opacity: 0.15,
                animation: 'float 6s ease-in-out infinite, fadeIn 1s ease-out'
              }}>📚</div>
              <div style={{
                position: 'absolute',
                top: '20%',
                right: '8%',
                fontSize: '35px',
                opacity: 0.15,
                animation: 'float 5s ease-in-out infinite 1s, fadeIn 1s ease-out 0.2s backwards'
              }}>🎓</div>
              <div style={{
                position: 'absolute',
                bottom: '15%',
                left: '10%',
                fontSize: '30px',
                opacity: 0.15,
                animation: 'float 7s ease-in-out infinite 2s, fadeIn 1s ease-out 0.4s backwards'
              }}>✏️</div>
              <div style={{
                position: 'absolute',
                bottom: '20%',
                right: '12%',
                fontSize: '38px',
                opacity: 0.15,
                animation: 'float 5.5s ease-in-out infinite 1.5s, fadeIn 1s ease-out 0.6s backwards'
              }}>🧪</div>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '15%',
                fontSize: '32px',
                opacity: 0.15,
                animation: 'float 6.5s ease-in-out infinite 0.5s, fadeIn 1s ease-out 0.8s backwards'
              }}>🎨</div>
              <div style={{
                position: 'absolute',
                top: '60%',
                right: '15%',
                fontSize: '36px',
                opacity: 0.15,
                animation: 'float 5.8s ease-in-out infinite 2.5s, fadeIn 1s ease-out 1s backwards'
              }}>🔬</div>
              <div style={{
                position: 'absolute',
                top: '35%',
                left: '20%',
                fontSize: '34px',
                opacity: 0.15,
                animation: 'float 6.2s ease-in-out infinite 1.8s, fadeIn 1s ease-out 0.3s backwards'
              }}>💻</div>
              <div style={{
                position: 'absolute',
                bottom: '25%',
                right: '20%',
                fontSize: '33px',
                opacity: 0.15,
                animation: 'float 5.3s ease-in-out infinite 3s, fadeIn 1s ease-out 0.5s backwards'
              }}>🌟</div>
              <div style={{
                position: 'absolute',
                top: '70%',
                left: '8%',
                fontSize: '31px',
                opacity: 0.15,
                animation: 'float 6.8s ease-in-out infinite 2.2s, fadeIn 1s ease-out 0.7s backwards'
              }}>🚀</div>
              <div style={{
                position: 'absolute',
                top: '25%',
                left: '25%',
                fontSize: '29px',
                opacity: 0.15,
                animation: 'float 5.5s ease-in-out infinite 1.2s, fadeIn 1s ease-out 0.9s backwards'
              }}>📖</div>
              
              <style>{`
                @keyframes float {
                  0%, 100% { transform: translateY(0px) rotate(0deg); }
                  50% { transform: translateY(-20px) rotate(5deg); }
                }
                @keyframes pulse {
                  0%, 100% { box-shadow: 0 0 0 0 rgba(212, 165, 116, 0.4); }
                  50% { box-shadow: 0 0 0 10px rgba(212, 165, 116, 0); }
                }
                @keyframes cardClick {
                  0% { transform: scale(1); }
                  30% { transform: scale(0.95) rotate(-2deg); }
                  60% { transform: scale(1.05) rotate(2deg); }
                  100% { transform: scale(1) rotate(0deg); }
                }
                @keyframes fadeInUp {
                  0% { 
                    opacity: 0;
                    transform: translateY(30px);
                  }
                  100% { 
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
                @keyframes fadeIn {
                  0% { 
                    opacity: 0;
                    transform: scale(0.8);
                  }
                  100% { 
                    opacity: 0.15;
                    transform: scale(1);
                  }
                }
              `}</style>

              <h2 style={{ 
                fontSize: 'clamp(32px, 6vw, 56px)', 
                fontWeight: '900', 
                margin: '0 0 24px 0', 
                background: 'linear-gradient(135deg, #d4a574 0%, #f5ebe0 100%)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-1px',
                lineHeight: '1.2',
                position: 'relative',
                zIndex: 1,
                animation: 'fadeInUp 0.8s ease-out'
              }}>
                Welcome to EduSphere
              </h2>
              <p style={{ 
                fontSize: 'clamp(18px, 4vw, 22px)', 
                color: '#a8a8a8', 
                maxWidth: '800px', 
                margin: '0 auto 48px',
                padding: '0 20px',
                lineHeight: '1.6',
                fontWeight: '500',
                position: 'relative',
                zIndex: 1,
                animation: 'fadeInUp 0.8s ease-out 0.2s backwards'
              }}>
                One Platform. Unified Education.
              </p>
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeInUp 0.8s ease-out 0.4s backwards' }}>
                <button onClick={() => setTab('pdf')} style={{
                  padding: '18px 36px',
                  background: 'rgba(245, 235, 224, 0.95)',
                  color: '#2e1f1a',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '17px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.5)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  letterSpacing: '0.3px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px) scale(1.02)'
                  e.target.style.boxShadow = '0 12px 30px rgba(245, 235, 224, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0) scale(1)'
                  e.target.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.5)'
                }}>
                  🚀 Get Started
                </button>
                <button onClick={() => setTab('chat')} style={{
                  padding: '18px 36px',
                  background: 'rgba(245, 235, 224, 0.95)',
                  color: '#2e1f1a',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '17px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.5)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  letterSpacing: '0.3px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px) scale(1.02)'
                  e.target.style.boxShadow = '0 12px 30px rgba(245, 235, 224, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0) scale(1)'
                  e.target.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.5)'
                }}>
                  💬 Try EduChat
                </button>
              </div>
            </div>

            {/* About Section */}
            <div ref={aboutRef} style={{
              background: 'rgba(255, 255, 255, 0.98)',
              borderRadius: '24px',
              padding: '60px 40px',
              marginBottom: '48px',
              boxShadow: '0 20px 60px rgba(92, 61, 46, 0.15)',
              border: '1px solid rgba(212, 165, 116, 0.3)',
            }}>
              <h2 style={{
                fontSize: '42px',
                fontWeight: '900',
                margin: '0 0 24px 0',
                background: 'linear-gradient(135deg, #5c3d2e 0%, #a07866 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textAlign: 'center'
              }}>
                About EduSphere
              </h2>
              <p style={{
                fontSize: '18px',
                color: '#64748b',
                lineHeight: '1.8',
                maxWidth: '900px',
                margin: '0 auto 32px',
                textAlign: 'center'
              }}>
                EduSphere is a comprehensive AI-powered education platform designed to revolutionize the way students learn, collaborate, and create. With 22 integrated modules covering everything from document processing to virtual classrooms, we provide all the tools needed for modern education in one seamless platform.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '24px',
                marginTop: '40px'
              }}>
                <div style={{ padding: '24px', background: 'rgba(92, 61, 46, 0.05)', borderRadius: '16px', border: '2px solid #5c3d2e' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎯</div>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#5c3d2e', marginBottom: '8px' }}>Our Mission</h3>
                  <p style={{ fontSize: '15px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
                    To eliminate educational fragmentation through innovative AI-powered tools accessible to everyone.
                  </p>
                </div>
                <div style={{ padding: '24px', background: 'rgba(92, 61, 46, 0.05)', borderRadius: '16px', border: '2px solid #5c3d2e' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>✨</div>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#5c3d2e', marginBottom: '8px' }}>Our Vision</h3>
                  <p style={{ fontSize: '15px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
                    A unified world where every learner has access to personalized, intelligent educational resources without fragmentation.
                  </p>
                </div>
                <div style={{ padding: '24px', background: 'rgba(92, 61, 46, 0.05)', borderRadius: '16px', border: '2px solid #5c3d2e' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>💡</div>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#5c3d2e', marginBottom: '8px' }}>Our Values</h3>
                  <p style={{ fontSize: '15px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
                    Innovation, accessibility, collaboration, and continuous improvement in education.
                  </p>
                </div>
              </div>
            </div>

            {/* Modules Section */}
            <div ref={modulesRef}>
              <h2 style={{
                fontSize: '42px',
                fontWeight: '900',
                margin: '0 0 32px 0',
                background: 'linear-gradient(135deg, #5c3d2e 0%, #a07866 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textAlign: 'center'
              }}>
                Our Modules
              </h2>
            </div>

            {/* Feature Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '28px',
              marginBottom: '60px'
            }}
            className="feature-grid">
              {tabs.slice(1).map(t => (
                <div key={t.id} style={{
                  background: 'rgba(255, 255, 255, 0.98)',
                  borderRadius: '18px',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  border: '2px solid rgba(212, 165, 116, 0.3)',
                  backdropFilter: 'blur(20px)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)'
                  e.currentTarget.style.boxShadow = '0 20px 60px rgba(212, 165, 116, 0.4)'
                  e.currentTarget.style.borderColor = '#d4a574'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.3)'
                }}
                onClick={() => {
                  const card = document.querySelector(`[data-module="${t.id}"]`);
                  if (card) {
                    card.style.animation = 'none';
                    setTimeout(() => {
                      card.style.animation = 'cardClick 0.6s ease-out';
                    }, 10);
                  }
                  setTab(t.id);
                }}>
                  <div 
                    data-module={t.id}
                    style={{ 
                      fontSize: '40px', 
                      marginBottom: '16px', 
                      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
                      transition: 'transform 0.3s'
                    }}
                  >{t.icon}</div>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '19px', fontWeight: '800', color: '#000000', letterSpacing: '-0.3px' }}>{t.label}</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#333333', lineHeight: '1.6', fontWeight: '500' }}>
                    {getFeatureDescription(t.id)}
                  </p>
                </div>
              ))}
            </div>

            {/* Contact Section */}
            <div ref={contactRef} style={{
              background: 'rgba(255, 255, 255, 0.98)',
              borderRadius: '24px',
              padding: '40px',
              marginTop: '48px',
              boxShadow: '0 20px 60px rgba(92, 61, 46, 0.15)',
              border: '1px solid rgba(212, 165, 116, 0.3)',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '380px 1fr',
                gap: '40px',
                alignItems: 'start'
              }}>
                {/* Contact Form - Left */}
                <div>
                  <h2 style={{
                    fontSize: '36px',
                    fontWeight: '900',
                    margin: '0 0 12px 0',
                    background: 'linear-gradient(135deg, #5c3d2e 0%, #a07866 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'left'
                  }}>
                    Contact Us
                  </h2>
                  <p style={{
                    fontSize: '16px',
                    color: '#64748b',
                    textAlign: 'left',
                    marginBottom: '40px'
                  }}>
                    Have questions? We'd love to hear from you!
                  </p>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#5c3d2e',
                      marginBottom: '5px'
                    }}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                      placeholder="Enter your name"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '2px solid #5c3d2e',
                        fontSize: '13px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box',
                        color: '#000000',
                        backgroundColor: '#ffffff'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#d4a574'}
                      onBlur={(e) => e.target.style.borderColor = '#5c3d2e'}
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#5c3d2e',
                      marginBottom: '5px'
                    }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                      placeholder="Enter your email"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '2px solid #5c3d2e',
                        fontSize: '13px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box',
                        color: '#000000',
                        backgroundColor: '#ffffff'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#d4a574'}
                      onBlur={(e) => e.target.style.borderColor = '#5c3d2e'}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#5c3d2e',
                      marginBottom: '5px'
                    }}>
                      Message
                    </label>
                    <textarea
                      value={contactForm.message}
                      onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                      placeholder="Tell us how we can help..."
                      rows="3"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '2px solid #5c3d2e',
                        fontSize: '13px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        color: '#000000',
                        backgroundColor: '#ffffff'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#d4a574'}
                      onBlur={(e) => e.target.style.borderColor = '#5c3d2e'}
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (!contactForm.name || !contactForm.email || !contactForm.message) {
                        alert('Please fill in all fields')
                        return
                      }
                      alert(`Thank you ${contactForm.name}! We'll get back to you at ${contactForm.email} soon.`)
                      setContactForm({ name: '', email: '', message: '' })
                    }}
                    style={{
                      width: '100%',
                      padding: '11px',
                      background: 'linear-gradient(135deg, #5c3d2e 0%, #a07866 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      boxShadow: '0 4px 12px rgba(92, 61, 46, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)'
                      e.target.style.boxShadow = '0 8px 20px rgba(92, 61, 46, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)'
                      e.target.style.boxShadow = '0 4px 12px rgba(92, 61, 46, 0.3)'
                    }}
                  >
                    Send Message
                  </button>

                  <div style={{
                    marginTop: '20px',
                    padding: '14px',
                    background: 'rgba(92, 61, 46, 0.05)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#64748b' }}>
                      Or reach us directly:
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '13px', color: '#5c3d2e', fontWeight: '600' }}>
                      📧 support@edusphere.com
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '13px', color: '#5c3d2e', fontWeight: '600' }}>
                      📞 +1 (555) 123-4567
                    </p>
                  </div>
                </div>

                {/* Reviews Section - Right */}
                <div>
                  <h3 style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    margin: '0 0 24px 0',
                    color: '#5c3d2e'
                  }}>
                    What Our Users Say
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Review 1 */}
                    <div style={{
                      padding: '20px',
                      background: 'rgba(92, 61, 46, 0.04)',
                      borderRadius: '12px',
                      border: '1px solid rgba(92, 61, 46, 0.5)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #d4a574 0%, #f5ebe0 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: '700',
                          fontSize: '16px',
                          marginRight: '12px'
                        }}>
                          SJ
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: '#5c3d2e' }}>Sarah Johnson</p>
                          <div style={{ color: '#d4a574', fontSize: '14px' }}>⭐⭐⭐⭐⭐</div>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                        "EduSphere has completely transformed how I study! The AI-powered tools make learning so much more efficient and engaging."
                      </p>
                    </div>

                    {/* Review 2 */}
                    <div style={{
                      padding: '20px',
                      background: 'rgba(92, 61, 46, 0.04)',
                      borderRadius: '12px',
                      border: '1px solid rgba(92, 61, 46, 0.5)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #d4a574 0%, #f5ebe0 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: '700',
                          fontSize: '16px',
                          marginRight: '12px'
                        }}>
                          MC
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: '#5c3d2e' }}>Michael Chen</p>
                          <div style={{ color: '#d4a574', fontSize: '14px' }}>⭐⭐⭐⭐⭐</div>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                        "The virtual classroom and collaboration features are amazing. It's like having all my study tools in one place!"
                      </p>
                    </div>

                    {/* Review 3 */}
                    <div style={{
                      padding: '20px',
                      background: 'rgba(92, 61, 46, 0.04)',
                      borderRadius: '12px',
                      border: '1px solid rgba(92, 61, 46, 0.5)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #d4a574 0%, #f5ebe0 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: '700',
                          fontSize: '16px',
                          marginRight: '12px'
                        }}>
                          EP
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: '#5c3d2e' }}>Emily Parker</p>
                          <div style={{ color: '#d4a574', fontSize: '14px' }}>⭐⭐⭐⭐⭐</div>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                        "As a teacher, EduSphere helps me create better lessons and track student progress effortlessly. Highly recommended!"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation (when not on home) */}
        {tab !== 'home' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.98)',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '28px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            border: '1px solid rgba(160, 120, 102, 0.2)',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <button onClick={() => setTab('home')} style={{
                padding: '10px 20px',
                background: 'transparent',
                color: '#a07866',
                border: '2px solid #a07866',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '700',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#a07866'
                e.target.style.color = '#fff'
                e.target.style.transform = 'translateX(-5px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = '#a07866'
                e.target.style.transform = 'translateX(0)'
              }}>← Back to Home</button>
            </div>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '8px', 
              justifyContent: 'center',
              maxWidth: '100%',
              overflowX: 'auto',
              padding: '12px 0'
            }}>
              {tabs.slice(1).map(t => (
                <Tab key={t.id} label={t.label} icon={t.icon} active={tab===t.id} onClick={() => setTab(t.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div style={{
          background: tab !== 'home' ? 'rgba(255, 255, 255, 0.98)' : 'transparent',
          borderRadius: tab !== 'home' ? '20px' : '0',
          padding: tab !== 'home' ? '28px' : '0',
          boxShadow: tab !== 'home' ? '0 10px 30px rgba(0,0,0,0.08)' : 'none',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden',
          border: tab !== 'home' ? '1px solid rgba(160, 120, 102, 0.2)' : 'none',
          backdropFilter: tab !== 'home' ? 'blur(20px)' : 'none'
        }}>
          {tab === 'pdf' && <PDF />}
          {tab === 'yt' && <YouTube />}
          {tab === 'excel' && <Excel />}
          {tab === 'present' && <Present />}
          {tab === 'notes' && <Notes />}
          {tab === 'chart' && <Chart />}
          {tab === 'doc' && <Doc />}
          {tab === 'chat' && <Chat />}
          {tab === 'whiteboard' && <Whiteboard />}
          {tab === 'attendance' && <Attendance />}
          {tab === 'blogs' && <Blogs />}
          {tab === 'tutor' && <Tutor />}
          {tab === 'trade' && <Trade />}
          {tab === 'intern' && <Intern />}
          {tab === 'lingo' && <Lingo />}
          {tab === 'meet' && <Meet />}
          {tab === 'talk' && <Talk />}
          {tab === 'vi' && <VI />}
          {tab === 'air' && <Air />}
          {tab === 'circuit' && <Circuit />}
          {tab === 'focus' && <Focus />}
        </div>
      </div>
      </div>
    </div>
  )
}

function getFeatureDescription(id) {
  const descriptions = {
    pdf: 'Analyze PDFs, extract text with OCR, generate summaries and study notes',
    yt: 'Get YouTube video transcripts, summaries, and key timestamps instantly',
    excel: 'Generate Excel files from CSV/JSON with automatic charts and insights',
    present: 'Create professional PowerPoint presentations from topics or outlines',
    notes: 'AI-powered structured notes generator with summaries and questions',
    chart: 'Generate beautiful charts, graphs, flowcharts, and mind maps',
    doc: 'Document management and AI resume builder with professional templates',
    chat: 'Intelligent AI chatbot for personalized learning assistance',
    whiteboard: 'Collaborative virtual whiteboard with real-time drawing tools',
    attendance: 'Smart attendance tracking with face recognition and analytics',
    blogs: 'Social learning platform to share knowledge and engage with peers',
    tutor: 'Find and connect with qualified tutors for personalized learning',
    trade: 'Buy and sell study materials, books, and educational resources',
    intern: 'Discover internship opportunities and manage applications',
    lingo: 'Master new languages with vocab tracking and interactive lessons',
    meet: 'Host virtual classrooms with video conferencing and screen sharing',
    talk: 'Create study groups and chat rooms for collaborative learning',
    vi: 'Transform text into stunning images and videos using AI',
    air: 'Draw in the air using finger tracking with MediaPipe technology',
    circuit: 'Design and simulate electronic circuits with sketch recognition',
    focus: 'Boost productivity with Pomodoro timer and app blocking'
  }
  return descriptions[id] || 'Powerful educational tool'
}
