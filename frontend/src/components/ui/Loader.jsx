import React from 'react'
export default function Loader({ label='Loading...' }){
  return (
    <div className="row" style={{ gap:8 }}>
      <div className="spinner" style={{ borderColor:'var(--primary)', borderTopColor:'transparent' }} />
      <span>{label}</span>
    </div>
  )
}
