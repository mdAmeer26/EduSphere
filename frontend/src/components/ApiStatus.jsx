import React, { useEffect, useState } from 'react'
import { apiUrl } from '../lib/api'

export default function ApiStatus() {
  const [status, setStatus] = useState('checking')
  const [name, setName] = useState('')

  useEffect(() => {
    let mounted = true
    fetch(apiUrl('/api/health'))
      .then(r => r.json())
      .then(d => { if (!mounted) return; setStatus('ok'); setName(d?.name || '') })
      .catch(() => { if (!mounted) return; setStatus('down') })
    return () => { mounted = false }
  }, [])

  const styles = {
    ok: { color: '#000000', fontSize: '14px', fontWeight: '600' },
    down: { color: '#b00020', fontSize: '14px', fontWeight: '600' },
    checking: { color: '#666666', fontSize: '14px', fontWeight: '600' }
  }

  const label = status === 'ok' ? `API online${name ? ` — ${name}` : ''}` :
                status === 'down' ? 'API offline (check backend on :8000)' :
                'Checking API...'

  return (
    <p style={{ marginTop: 24, ...styles[status] }}>{label}</p>
  )
}
