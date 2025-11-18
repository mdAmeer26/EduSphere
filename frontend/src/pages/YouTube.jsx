import React, { useState } from 'react'
import { apiUrl } from '../lib/api'
import Page from '../components/layout/Page'
import Button from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import Loader from '../components/ui/Loader'
import ErrorNote from '../components/ui/ErrorNote'

export default function YouTube() {
  const [url, setUrl] = useState('')
  const [transcriptId, setTranscriptId] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [question, setQuestion] = useState('')

  const onAnalyze = async (e) => {
    e.preventDefault()
    if (!url) return
    setLoading(true); setResult(null); setError(''); setTranscriptId(null)
    try {
      const res = await fetch(apiUrl('/api/edutube/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error + (data.suggestion ? ` ${data.suggestion}` : ''))
        setResult(null)
      } else {
        setTranscriptId(data.transcript_id)
        setResult(data)
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const onAsk = async (e) => {
    e.preventDefault()
    if (!transcriptId || !question.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch(apiUrl('/api/edutube/qa'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript_id: transcriptId, question })
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setResult(prev => ({ ...prev, qa: data }))
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page title="EduTube – YouTube Analyzer" description="Fetch transcripts, generate summaries and ask questions about a YouTube video.">
      <form onSubmit={onAnalyze} className="grid" style={{ gap:12 }}>
        <Field label="YouTube URL"><Input placeholder="https://www.youtube.com/watch?v=..." value={url} onChange={e=> setUrl(e.target.value)} /></Field>
        <Button type="submit" loading={loading} disabled={!url}>Analyze Video</Button>
      </form>

      {result && result.message && (
        <div className="item" style={{ marginTop: 12 }}>
          <p>{result.message}</p>
          {result.text_length && <p>Transcript length: {result.text_length} characters</p>}
        </div>
      )}

      {transcriptId && (
        <div className="row" style={{ gap:12, marginTop:12 }}>
          <Input style={{ flex:1, minWidth:300 }} placeholder="Ask a question about this video" value={question} onChange={e=> setQuestion(e.target.value)} />
          <Button onClick={onAsk} variant="ghost" loading={loading} disabled={!question.trim()}>Ask</Button>
        </div>
      )}

      {loading && <div style={{ marginTop:12 }}><Loader label="Processing video..." /></div>}
      {error && <div style={{ marginTop:12 }}><ErrorNote message={error} /></div>}
      {result && (
        <div className="grid" style={{ gap:12, marginTop:12 }}>
          {result.qa && <div className="item"><h3>Answer</h3><p><b>Answer:</b> {result.qa.answer}</p><details><summary>Context</summary><p style={{ whiteSpace:'pre-wrap' }}>{result.qa.context}</p></details></div>}
          {result.summary && <div className="item"><h3>Summary</h3><p>{result.summary}</p></div>}
          {Array.isArray(result.notes) && result.notes.length>0 && <div className="item"><h3>Notes</h3><ul>{result.notes.map((n,i)=><li key={i}>{n}</li>)}</ul></div>}
          {Array.isArray(result.questions) && result.questions.length>0 && <div className="item"><h3>Questions</h3><ol>{result.questions.map((q,i)=><li key={i}>{q}</li>)}</ol></div>}
        </div>
      )}
    </Page>
  )
}
