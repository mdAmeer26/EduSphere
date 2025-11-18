import React from 'react'
export default function Button({ children, variant='primary', loading=false, ...props }){
  return (
    <button className={`btn ${variant==='ghost'?'btn-ghost':'btn-primary'}`} disabled={loading} {...props}>
      {loading && <span className="spinner" />} {children}
    </button>
  )
}
