import React, { useCallback, useState } from 'react'

export default function Dropzone({ onFiles, accept, children }){
  const [drag, setDrag] = useState(false)
  const onDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setDrag(false)
    const files = Array.from(e.dataTransfer?.files || [])
    if (files.length) onFiles?.(files)
  }, [onFiles])
  const onPick = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length) onFiles?.(files)
  }
  return (
    <div
      onDragOver={(e)=>{e.preventDefault(); setDrag(true)}}
      onDragLeave={()=>setDrag(false)}
      onDrop={onDrop}
      className="item"
      style={{ textAlign:'center', padding:24, borderStyle:'dashed', borderColor: drag? 'var(--primary)':'var(--border)' }}
    >
      <input type="file" style={{ display:'none' }} id="__dz" onChange={onPick} accept={accept} />
      <label htmlFor="__dz" className="btn btn-ghost">Choose file</label>
      <div style={{ marginTop:8, color:'var(--muted)' }}>{children || 'or drag & drop here'}</div>
    </div>
  )
}
