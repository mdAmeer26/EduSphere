import React from 'react'
export default function Empty({ children='Nothing here yet.' }){
  return <div className="item" style={{ textAlign:'center', color:'var(--muted)' }}>{children}</div>
}
