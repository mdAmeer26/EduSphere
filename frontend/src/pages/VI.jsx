import React, { useState, useEffect, useRef } from 'react'
import { apiUrl } from '../lib/api'
import Page from '../components/layout/Page'

export default function VI() {
  const [mode, setMode] = useState('image') // image, video, image-to-video, gallery
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('cinematic')
  const [styles, setStyles] = useState([])
  const [cameraMotions, setCameraMotions] = useState([])
  const [selectedCameraMotion, setSelectedCameraMotion] = useState('static')
  
  // Image settings
  const [imageSize, setImageSize] = useState('1024x1024')
  const [imageQuality, setImageQuality] = useState('hd')
  const [numImages, setNumImages] = useState(1)
  const [guidanceScale, setGuidanceScale] = useState(7.5)
  const [seed, setSeed] = useState('')
  
  // Video settings
  const [videoDuration, setVideoDuration] = useState(5)
  const [videoFps, setVideoFps] = useState(24)
  const [videoResolution, setVideoResolution] = useState('1080p')
  const [motionStrength, setMotionStrength] = useState(0.5)
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generations, setGenerations] = useState([])
  const [selectedGeneration, setSelectedGeneration] = useState(null)
  const [progress, setProgress] = useState(0)
  
  // Gallery
  const [galleryFilter, setGalleryFilter] = useState('all')
  const [stats, setStats] = useState(null)
  
  // Advanced settings panel
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    loadStyles()
    loadCameraMotions()
    loadGenerations()
    loadStats()
  }, [])

  async function loadStyles() {
    try {
      const res = await fetch(apiUrl('/api/eduvi/styles'))
      const data = await res.json()
      setStyles(data.styles || [])
    } catch (e) {
      console.error('Failed to load styles:', e)
    }
  }

  async function loadCameraMotions() {
    try {
      const res = await fetch(apiUrl('/api/eduvi/camera-motions'))
      const data = await res.json()
      setCameraMotions(data.motions || [])
    } catch (e) {
      console.error('Failed to load camera motions:', e)
    }
  }

  async function loadGenerations() {
    try {
      const res = await fetch(apiUrl('/api/eduvi/generations'))
      const data = await res.json()
      setGenerations(data.generations || [])
    } catch (e) {
      console.error('Failed to load generations:', e)
    }
  }

  async function loadStats() {
    try {
      const res = await fetch(apiUrl('/api/eduvi/stats'))
      const data = await res.json()
      setStats(data)
    } catch (e) {
      console.error('Failed to load stats:', e)
    }
  }

  async function generateImage() {
    if (!prompt.trim()) {
      alert('Please enter a prompt')
      return
    }

    setIsGenerating(true)
    setProgress(0)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90))
    }, 500)

    try {
      const res = await fetch(apiUrl('/api/eduvi/image/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style: selectedStyle,
          size: imageSize,
          quality: imageQuality,
          negative_prompt: negativePrompt || null,
          guidance_scale: guidanceScale,
          num_images: numImages,
          seed: seed ? parseInt(seed) : null
        })
      })
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const data = await res.json()
      
      clearInterval(progressInterval)
      setProgress(100)
      
      if (data.ok) {
        setTimeout(() => {
          setIsGenerating(false)
          setProgress(0)
          loadGenerations()
          setMode('gallery')
        }, 500)
      } else {
        alert(data.error || 'Generation failed')
        setIsGenerating(false)
        setProgress(0)
      }
    } catch (e) {
      clearInterval(progressInterval)
      console.error('Image generation failed:', e)
      alert('Unable to generate image: ' + e.message)
      setIsGenerating(false)
      setProgress(0)
    }
  }

  async function generateVideo() {
    if (!prompt.trim()) {
      alert('Please enter a prompt')
      return
    }

    setIsGenerating(true)
    setProgress(0)

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 5, 90))
    }, 1000)

    try {
      const res = await fetch(apiUrl('/api/eduvi/video/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          duration: videoDuration,
          fps: videoFps,
          resolution: videoResolution,
          style: selectedStyle,
          camera_motion: selectedCameraMotion,
          motion_strength: motionStrength,
          negative_prompt: negativePrompt || null,
          seed: seed ? parseInt(seed) : null
        })
      })
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const data = await res.json()
      
      clearInterval(progressInterval)
      setProgress(100)
      
      if (data.ok) {
        setTimeout(() => {
          setIsGenerating(false)
          setProgress(0)
          loadGenerations()
          setMode('gallery')
        }, 500)
      } else {
        alert(data.error || 'Generation failed')
        setIsGenerating(false)
        setProgress(0)
      }
    } catch (e) {
      clearInterval(progressInterval)
      console.error('Video generation failed:', e)
      alert('Unable to generate video: ' + e.message)
      setIsGenerating(false)
      setProgress(0)
    }
  }

  async function deleteGeneration(genId) {
    if (!confirm('Delete this generation?')) return
    
    try {
      await fetch(apiUrl(`/api/eduvi/generation/${genId}`), { method: 'DELETE' })
      loadGenerations()
      loadStats()
    } catch (e) {
      console.error('Delete failed:', e)
    }
  }

  const filteredGenerations = galleryFilter === 'all' 
    ? generations 
    : generations.filter(g => g.type === galleryFilter)

  return (
    <Page title="EduVI - AI Image & Video Generation" description="Create stunning images and videos with AI">
    <div style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'system-ui',
      borderRadius: 16,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '20px 30px', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: '0 0 5px 0', fontSize: 32, fontWeight: '700' }}>
              🎨 EduVI Studio
            </h1>
            <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>
              Advanced AI Image & Video Generation Platform
            </p>
          </div>
          {stats && (
            <div style={{ textAlign: 'right', fontSize: 13 }}>
              <div><strong>{stats.total_generations}</strong> Total Generations</div>
              <div><strong>{stats.images_generated}</strong> Images • <strong>{stats.videos_generated}</strong> Videos</div>
              <div>{stats.storage_formatted} Used</div>
            </div>
          )}
        </div>
      </div>

      {/* Mode Selector */}
      <div style={{ 
        padding: '15px 30px', 
        background: '#1a1a1a',
        borderBottom: '1px solid #333',
        display: 'flex',
        gap: 10
      }}>
        {[
          { id: 'image', label: 'Text to Image', icon: '🖼️' },
          { id: 'video', label: 'Text to Video', icon: '🎬' },
          { id: 'image-to-video', label: 'Image to Video', icon: '🎞️' },
          { id: 'gallery', label: 'Gallery', icon: '🗂️' }
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              padding: '10px 20px',
              background: mode === m.id ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#2a2a2a',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel - Controls */}
        {mode !== 'gallery' && (
          <div style={{ 
            width: 400, 
            background: '#1a1a1a',
            borderRight: '1px solid #333',
            overflowY: 'auto',
            padding: 25
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 18 }}>Generation Settings</h3>

            {/* Prompt */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>
                Prompt *
              </label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe what you want to create..."
                style={{
                  width: '100%',
                  minHeight: 100,
                  padding: 12,
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 14,
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Style Selection */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>
                Style
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {styles.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    style={{
                      padding: '10px',
                      background: selectedStyle === style.id ? '#667eea' : '#2a2a2a',
                      border: selectedStyle === style.id ? '2px solid #667eea' : '1px solid #444',
                      borderRadius: 8,
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: 24,
                      textAlign: 'center'
                    }}
                    title={style.description}
                  >
                    <div>{style.thumbnail}</div>
                    <div style={{ fontSize: 11, marginTop: 5 }}>{style.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Settings */}
            {mode === 'image' && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>
                    Image Size
                  </label>
                  <select
                    value={imageSize}
                    onChange={e => setImageSize(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 12,
                      background: '#2a2a2a',
                      border: '1px solid #444',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 14
                    }}
                  >
                    <option value="1024x1024">1024 × 1024 (Square)</option>
                    <option value="1024x1792">1024 × 1792 (Portrait)</option>
                    <option value="1792x1024">1792 × 1024 (Landscape)</option>
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>
                    Quality
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {['standard', 'hd'].map(q => (
                      <button
                        key={q}
                        onClick={() => setImageQuality(q)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: imageQuality === q ? '#667eea' : '#2a2a2a',
                          border: '1px solid #444',
                          borderRadius: 8,
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: 14,
                          textTransform: 'uppercase'
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>
                    Number of Images: {numImages}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    value={numImages}
                    onChange={e => setNumImages(parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            )}

            {/* Video Settings */}
            {(mode === 'video' || mode === 'image-to-video') && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>
                    Duration: {videoDuration}s
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="30"
                    value={videoDuration}
                    onChange={e => setVideoDuration(parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>
                    Camera Motion
                  </label>
                  <select
                    value={selectedCameraMotion}
                    onChange={e => setSelectedCameraMotion(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 12,
                      background: '#2a2a2a',
                      border: '1px solid #444',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 14
                    }}
                  >
                    {cameraMotions.map(motion => (
                      <option key={motion.id} value={motion.id}>
                        {motion.icon} {motion.name} - {motion.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>
                    Motion Strength: {motionStrength.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={motionStrength}
                    onChange={e => setMotionStrength(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>
                    Resolution
                  </label>
                  <select
                    value={videoResolution}
                    onChange={e => setVideoResolution(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 12,
                      background: '#2a2a2a',
                      border: '1px solid #444',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 14
                    }}
                  >
                    <option value="720p">HD (1280 × 720)</option>
                    <option value="1080p">Full HD (1920 × 1080)</option>
                    <option value="4k">4K (3840 × 2160)</option>
                  </select>
                </div>
              </>
            )}

            {/* Advanced Settings */}
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: 8,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>⚙️ Advanced Settings</span>
                <span>{showAdvanced ? '▼' : '▶'}</span>
              </button>

              {showAdvanced && (
                <div style={{ marginTop: 15, padding: 15, background: '#2a2a2a', borderRadius: 8 }}>
                  <div style={{ marginBottom: 15 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
                      Negative Prompt
                    </label>
                    <textarea
                      value={negativePrompt}
                      onChange={e => setNegativePrompt(e.target.value)}
                      placeholder="What to avoid..."
                      style={{
                        width: '100%',
                        minHeight: 60,
                        padding: 10,
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: 6,
                        color: '#fff',
                        fontSize: 13,
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 15 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
                      Guidance Scale: {guidanceScale}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={guidanceScale}
                      onChange={e => setGuidanceScale(parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                    <div style={{ fontSize: 11, color: '#888', marginTop: 5 }}>
                      Higher = More prompt adherence
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
                      Seed (Optional)
                    </label>
                    <input
                      type="number"
                      value={seed}
                      onChange={e => setSeed(e.target.value)}
                      placeholder="Random"
                      style={{
                        width: '100%',
                        padding: 10,
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: 6,
                        color: '#fff',
                        fontSize: 13
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={mode === 'image' ? generateImage : generateVideo}
              disabled={isGenerating || !prompt.trim()}
              style={{
                width: '100%',
                padding: '15px',
                background: isGenerating ? '#555' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 16,
                fontWeight: '700',
                cursor: isGenerating || !prompt.trim() ? 'not-allowed' : 'pointer',
                opacity: isGenerating || !prompt.trim() ? 0.5 : 1
              }}
            >
              {isGenerating ? `⏳ Generating... ${progress}%` : `✨ Generate ${mode === 'image' ? 'Image' : 'Video'}`}
            </button>

            {isGenerating && (
              <div style={{ marginTop: 15 }}>
                <div style={{
                  width: '100%',
                  height: 8,
                  background: '#2a2a2a',
                  borderRadius: 4,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                    transition: 'width 0.3s'
                  }} />
                </div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 8, textAlign: 'center' }}>
                  This may take 10-60 seconds...
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right Panel - Preview/Gallery */}
        <div style={{ flex: 1, background: '#0f0f0f', overflowY: 'auto', padding: 30 }}>
          {mode === 'gallery' ? (
            <>
              {/* Gallery Filters */}
              <div style={{ marginBottom: 25, display: 'flex', gap: 10 }}>
                {[
                  { id: 'all', label: 'All', icon: '🗂️' },
                  { id: 'image', label: 'Images', icon: '🖼️' },
                  { id: 'video', label: 'Videos', icon: '🎬' },
                  { id: 'image_to_video', label: 'Image-to-Video', icon: '🎞️' }
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setGalleryFilter(filter.id)}
                    style={{
                      padding: '10px 20px',
                      background: galleryFilter === filter.id ? '#667eea' : '#2a2a2a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    {filter.icon} {filter.label}
                  </button>
                ))}
              </div>

              {/* Gallery Grid */}
              {filteredGenerations.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '100px 20px',
                  color: '#666'
                }}>
                  <div style={{ fontSize: 64, marginBottom: 20 }}>🎨</div>
                  <h3 style={{ fontSize: 24, marginBottom: 10 }}>No Generations Yet</h3>
                  <p style={{ fontSize: 16 }}>Start creating amazing AI images and videos!</p>
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: 20
                }}>
                  {filteredGenerations.map(gen => (
                    <div
                      key={gen.id}
                      style={{
                        background: '#1a1a1a',
                        borderRadius: 12,
                        overflow: 'hidden',
                        border: '1px solid #333',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedGeneration(gen)}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)'
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {/* Preview */}
                      <div style={{ 
                        width: '100%', 
                        height: 200,
                        background: '#2a2a2a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                      }}>
                        {gen.type === 'image' && gen.images && gen.images[0] && (
                          <img 
                            src={apiUrl(gen.images[0].url)} 
                            alt="Generated"
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'cover' 
                            }}
                          />
                        )}
                        {(gen.type === 'video' || gen.type === 'image_to_video') && (
                          <div style={{ fontSize: 48 }}>🎬</div>
                        )}
                        <div style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          padding: '5px 10px',
                          background: 'rgba(0,0,0,0.7)',
                          borderRadius: 5,
                          fontSize: 12,
                          fontWeight: '600'
                        }}>
                          {gen.type === 'image' ? '🖼️ Image' : 
                           gen.type === 'video' ? '🎬 Video' : 
                           '🎞️ Image-to-Video'}
                        </div>
                      </div>

                      {/* Info */}
                      <div style={{ padding: 15 }}>
                        <div style={{ 
                          fontSize: 13, 
                          color: '#ccc',
                          marginBottom: 8,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {gen.prompt}
                        </div>
                        <div style={{ 
                          fontSize: 12, 
                          color: '#888',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>{gen.style}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteGeneration(gen.id)
                            }}
                            style={{
                              padding: '5px 10px',
                              background: '#ff4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 5,
                              fontSize: 11,
                              cursor: 'pointer'
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              flexDirection: 'column',
              color: '#666'
            }}>
              <div style={{ fontSize: 80, marginBottom: 20 }}>
                {mode === 'image' ? '🖼️' : mode === 'video' ? '🎬' : '🎞️'}
              </div>
              <h3 style={{ fontSize: 24, marginBottom: 10 }}>
                {mode === 'image' ? 'AI Image Generation' : 
                 mode === 'video' ? 'AI Video Generation' : 
                 'Image to Video Animation'}
              </h3>
              <p style={{ fontSize: 16, maxWidth: 500, textAlign: 'center' }}>
                {mode === 'image' ? 'Create stunning images from text descriptions using advanced AI models' :
                 mode === 'video' ? 'Generate cinematic videos with camera motion and style controls' :
                 'Bring your images to life with AI-powered motion and animation'}
              </p>
              <div style={{ marginTop: 30, fontSize: 14, color: '#888' }}>
                Configure settings on the left and click Generate to start →
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generation Detail Modal */}
      {selectedGeneration && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 40
          }}
          onClick={() => setSelectedGeneration(null)}
        >
          <div 
            style={{
              background: '#1a1a1a',
              borderRadius: 15,
              maxWidth: 1200,
              maxHeight: '90vh',
              overflow: 'auto',
              border: '1px solid #333'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ 
              padding: '20px 30px', 
              borderBottom: '1px solid #333',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: 20 }}>Generation Details</h3>
              <button
                onClick={() => setSelectedGeneration(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: 24,
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: 30 }}>
              {/* Images */}
              {selectedGeneration.type === 'image' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 30 }}>
                  {selectedGeneration.images.map((img, i) => (
                    <img 
                      key={i}
                      src={apiUrl(img.url)} 
                      alt="Generated"
                      style={{ 
                        width: '100%', 
                        borderRadius: 10,
                        border: '1px solid #333'
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Video */}
              {(selectedGeneration.type === 'video' || selectedGeneration.type === 'image_to_video') && (
                <div style={{ marginBottom: 30 }}>
                  <video 
                    src={apiUrl(selectedGeneration.url)} 
                    controls
                    style={{ 
                      width: '100%', 
                      borderRadius: 10,
                      border: '1px solid #333'
                    }}
                  />
                </div>
              )}

              {/* Details */}
              <div style={{ fontSize: 14 }}>
                <div style={{ marginBottom: 15 }}>
                  <div style={{ color: '#888', marginBottom: 5 }}>Prompt</div>
                  <div style={{ color: '#fff' }}>{selectedGeneration.prompt}</div>
                </div>
                <div style={{ marginBottom: 15 }}>
                  <div style={{ color: '#888', marginBottom: 5 }}>Style</div>
                  <div style={{ color: '#fff' }}>{selectedGeneration.style}</div>
                </div>
                {selectedGeneration.settings && (
                  <div style={{ marginBottom: 15 }}>
                    <div style={{ color: '#888', marginBottom: 5 }}>Settings</div>
                    <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: 12 }}>
                      {JSON.stringify(selectedGeneration.settings, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </Page>
  )
}
