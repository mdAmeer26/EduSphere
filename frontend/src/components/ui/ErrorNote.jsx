import React from 'react'
export default function ErrorNote({ message='Something went wrong.' }){
  return <div className="item" style={{ borderColor:'#fecaca', background:'#fef2f2', color:'#991b1b' }}>{message}</div>
}
