import React, { useState } from 'react'
import { apiUrl } from '../lib/api'
import Page from '../components/layout/Page'
import Button from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import Dropzone from '../components/ui/Dropzone'
import Loader from '../components/ui/Loader'
import ErrorNote from '../components/ui/ErrorNote'

export default function PDF() {
  const [file, setFile] = useState(null)
  const [pdfId, setPdfId] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [question, setQuestion] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)

  const onAnalyze = async (e) => {
    e.preventDefault()
    if (!file) return
    setLoading(true); setError('')
    setResult(null); setPdfId(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(apiUrl('/api/edupdf/analyze'), { method: 'POST', body: form })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setResult(null)
      } else {
        setPdfId(data.id)
        setResult({ message: data.message, filename: data.filename, ocr_used: data.ocr_used, text_length: data.text_length })
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const onGetSummary = async () => {
    if (!pdfId) return
    setSummaryLoading(true); setError('')
    const form = new FormData()
    form.append('pdf_id', pdfId)
    form.append('max_sentences', '5')
    try {
      const res = await fetch(apiUrl('/api/edupdf/summary'), { method: 'POST', body: form })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setResult(prev => ({ ...prev, ...data }))
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setSummaryLoading(false)
    }
  }

  const onAsk = async (e) => {
    e.preventDefault()
    if (!pdfId || !question.trim()) return
    setLoading(true); setError('')
    const form = new FormData()
    form.append('pdf_id', pdfId)
    form.append('question', question)
    try {
      const res = await fetch(apiUrl('/api/edupdf/qa'), { method: 'POST', body: form })
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
    <Page title="EduPDF – PDF Analyzer" description="Upload a PDF or PowerPoint to extract text with OCR fallback, generate summaries, and ask questions about its content.">
      <form onSubmit={onAnalyze} className="grid" style={{ gap: 12 }}>
        <Dropzone accept="application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" onFiles={(files)=> setFile(files[0])}>
          {file? `Selected: ${file.name}` : 'Drop a PDF or PowerPoint file, or choose a file'}
        </Dropzone>
        <Button type="submit" loading={loading} disabled={!file}>Analyze Document</Button>
      </form>

      {result && result.message && (
        <div className="item" style={{ marginTop: 12 }}>
          <p>{result.message}</p>
          {result.text_length && <p>Extracted {result.text_length} characters of text.</p>}
          {result.ocr_used && <p>OCR was used for text extraction.</p>}
          <div className="row" style={{ gap: 12, marginTop: 12 }}>
            <Button onClick={onGetSummary} loading={summaryLoading} disabled={!pdfId}>Get Summary</Button>
          </div>
        </div>
      )}

      {pdfId && (
        <div className="row" style={{ gap: 12, marginTop: 12 }}>
          <Input style={{ flex:1, minWidth:300 }} placeholder="Ask a question about this PDF" value={question} onChange={e=> setQuestion(e.target.value)} />
          <Button onClick={onAsk} variant="ghost" loading={loading} disabled={!question.trim()}>Ask</Button>
        </div>
      )}

      {loading && <div style={{ marginTop:12 }}><Loader label="Processing..." /></div>}
      {error && <div style={{ marginTop:12 }}><ErrorNote message={error} /></div>}
      {result && (
        <div className="grid" style={{ gap: 12, marginTop: 12 }}>
          {result.qa && <div className="item">
            <h3>Answer</h3>
            <p><b>Answer:</b> {result.qa.answer}</p>
            <details><summary>Context</summary><p style={{ whiteSpace: 'pre-wrap' }}>{result.qa.context}</p></details>
          </div>}
          {result.summary && <div className="item"><h3>Summary</h3><p>{result.summary}</p></div>}
          {Array.isArray(result.notes) && result.notes.length > 0 && <div className="item"><h3>Notes</h3><ul>{result.notes.map((n, i) => <li key={i}>{n}</li>)}</ul></div>}
          {Array.isArray(result.questions) && result.questions.length > 0 && <div className="item"><h3>Questions</h3><ol>{result.questions.map((q, i) => <li key={i}>{q}</li>)}</ol></div>}
          {result.download_url && <div className="item"><p>Saved: <a href={result.download_url} target="_blank" rel="noreferrer">{result.download_url}</a></p></div>}
        </div>
      )}
    </Page>
  )
}
