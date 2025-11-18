import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastCtx = createContext({ push: (msg) => {} })

export function useToast(){
  return useContext(ToastCtx)
}

export default function ToastProvider({ children }){
  const [toasts, setToasts] = useState([])
  const push = useCallback((message, ttl=2500) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ttl)
  }, [])
  const value = useMemo(() => ({ push }), [push])
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toast-wrap">
        {toasts.map(t => <div key={t.id} className="toast">{t.message}</div>)}
      </div>
    </ToastCtx.Provider>
  )
}
