import React from 'react'
export function Field({ label, children }){
  return (
    <label style={{ display:'grid', gap:6 }}>
      <span className="label" style={{ color: '#000000', fontWeight: '600' }}>{label}</span>
      {children}
    </label>
  )
}
export const Input = (props) => <input className="input" {...props} />
export const Select = ({ options=[], ...props }) => (
  <select className="select" {...props}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
)
export const Textarea = (props) => <textarea className="textarea" {...props} />
