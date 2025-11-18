import React from 'react'

export default function Page({ title, description, actions, children }){
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="section">
        <div className="row" style={{ justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h2 style={{ margin:'0 0 6px 0' }}>{title}</h2>
            {description ? <p style={{ margin:0, color:'var(--muted)' }}>{description}</p> : null}
          </div>
          {actions ? <div className="row">{actions}</div> : null}
        </div>
      </div>
      <div className="section">
        {children}
      </div>
    </div>
  )
}
