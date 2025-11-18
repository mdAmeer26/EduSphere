import React, { useState, useEffect } from 'react'

export default function SimpleChart() {
  const [labels, setLabels] = useState('Product A, Product B, Product C')
  const [values, setValues] = useState('30, 45, 25')

  useEffect(() => {
    console.log('Labels changed:', labels)
    console.log('Values changed:', values)
  }, [labels, values])

  return (
    <div style={{ padding: '20px' }}>
      <h1>Simple Chart Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>
          Labels:
        </label>
        <input 
          type="text"
          value={labels}
          onChange={(e) => {
            console.log('Input event fired:', e.target.value)
            setLabels(e.target.value)
          }}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>
          Values:
        </label>
        <input 
          type="text"
          value={values}
          onChange={(e) => {
            console.log('Values input event fired:', e.target.value)
            setValues(e.target.value)
          }}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px'
          }}
        />
      </div>

      <div style={{ 
        background: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h3>Current State:</h3>
        <p><strong>Labels:</strong> {labels}</p>
        <p><strong>Values:</strong> {values}</p>
      </div>
    </div>
  )
}