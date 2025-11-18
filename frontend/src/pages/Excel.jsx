import React, { useState } from 'react'
import { apiUrl } from '../lib/api'
import Page from '../components/layout/Page'
import Button from '../components/ui/Button'
import { Field, Input, Textarea } from '../components/ui/Field'
import Dropzone from '../components/ui/Dropzone'
import Loader from '../components/ui/Loader'
import ErrorNote from '../components/ui/ErrorNote'

export default function Excel() {
  const [file, setFile] = useState(null)
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!file && !text.trim()) return
    setLoading(true); setResult(null); setError('')
    const form = new FormData()
    if (file) {
      form.append('file', file)
    } else {
      // create a CSV blob from text area content
      const blob = new Blob([text], { type: 'text/csv' })
      form.append('file', new File([blob], 'data.csv', { type: 'text/csv' }))
    }
    try {
      const res = await fetch(apiUrl('/api/eduexcel/generate'), { method: 'POST', body: form })
      const data = await res.json()
      setResult(data)
      if (data && data.download_url) {
        // auto-trigger download
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
    <Page title="EduExcel – Excel Generator & Analyzer" description="Upload CSV/JSON or paste data to generate an Excel file with basic insights.">
      <form onSubmit={onSubmit} className="grid" style={{ gap:12 }}>
        <Dropzone accept=".csv,application/json,text/csv" onFiles={(files)=> setFile(files[0])}>
          {file? `Selected: ${file.name}` : 'Drop CSV/JSON or choose a file'}
        </Dropzone>
        <Field label="Or paste CSV-like data">
          <Textarea placeholder={"Name, Age, Score\nJohn, 25, 90\nJane, 30, 95"} value={text} onChange={e => setText(e.target.value)} rows={5} />
        </Field>
        <Button type="submit" loading={loading} disabled={(!file && !text.trim())}>Generate</Button>
      </form>

      {loading && <div style={{ marginTop:12 }}><Loader label="Generating Excel..." /></div>}
      {error && <div style={{ marginTop:12 }}><ErrorNote message={error} /></div>}
      {result && (
        <div className="grid" style={{ gap:12, marginTop:12 }}>
          {result.rows != null && <div className="item">Rows: {result.rows} | Columns: {result.columns}</div>}
          {Array.isArray(result.insights) && result.insights.length > 0 && <div className="item">
            <h3>AI Insights (basic)</h3>
            <ul>
              {result.insights.map((i, idx) => (
                <li key={idx}><b>{i.column}:</b> mean {i.mean}, min {i.min}, max {i.max}</li>
              ))}
            </ul>
          </div>}
          {result.download_url && <div className="item">Download Excel: <a href={result.download_url} target="_blank" rel="noreferrer">{result.download_url}</a></div>}
        </div>
      )}
    </Page>
  )
}
