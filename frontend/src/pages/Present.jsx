import React, { useState } from 'react'
import { apiUrl } from '../lib/api'
import Page from '../components/layout/Page'
import Button from '../components/ui/Button'
import { Field, Input, Textarea } from '../components/ui/Field'
import Loader from '../components/ui/Loader'
import ErrorNote from '../components/ui/ErrorNote'

export default function Present() {
  const [topic, setTopic] = useState('C Programming')
  const [slides, setSlides] = useState(8)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [download, setDownload] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!topic.trim()) return
    setLoading(true); setError('')
    setDownload('')
    try {
      const res = await fetch(apiUrl('/api/edupresent/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, content, slides: Number(slides) })
      })
      const data = await res.json()
      if (data.download_url) {
        setDownload(data.download_url)
        // auto download
        const a = document.createElement('a')
        a.href = apiUrl(data.download_url)
        a.download = ''
        document.body.appendChild(a)
        a.click()
        a.remove()
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page title="EduPresent – Generate PPT" description="Create a polished PowerPoint from a topic or outline with AI.">
      <form onSubmit={onSubmit} className="grid" style={{ gap:12 }}>
        <Field label="Topic"><Input value={topic} onChange={e=> setTopic(e.target.value)} placeholder="e.g. C Programming" /></Field>
        <Field label="Optional outline"><Textarea rows={5} value={content} onChange={e=> setContent(e.target.value)} placeholder="Add bullet points or paste content" /></Field>
        <div className="row" style={{ gap:12 }}>
          <Field label="Slides"><Input type="number" min={3} max={20} value={slides} onChange={e=> setSlides(e.target.value)} style={{ width:100 }} /></Field>
          <Button type="submit" loading={loading} disabled={!topic.trim()}>Generate PPT</Button>
        </div>
      </form>
      {loading && <div style={{ marginTop:12 }}><Loader label="Generating presentation..." /></div>}
      {error && <div style={{ marginTop:12 }}><ErrorNote message={error} /></div>}
      {download && <div className="item" style={{ marginTop:12 }}>Download: <a href={download} target="_blank" rel="noreferrer">{download}</a></div>}
    </Page>
  )
}
