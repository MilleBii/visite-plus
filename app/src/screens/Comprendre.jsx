import { useState } from 'react'
import { questions } from '../data/mockData'
import TopBar from '../components/TopBar'

export default function Comprendre({ onBack }) {
  const [ouvert, setOuvert] = useState(null)

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <TopBar titre="Comprendre la religion" onBack={onBack} />

      <div style={{ padding: '24px 20px' }}>
        <p style={{ color: '#78716C', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
          Quelques clés pour comprendre ce que vous voyez et la foi chrétienne.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {questions.map((q) => (
            <div
              key={q.id}
              style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #E7E5E4',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setOuvert(ouvert === q.id ? null : q.id)}
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#1C1917',
                }}
              >
                <span>{q.question}</span>
                <span style={{
                  fontSize: '20px',
                  transform: ouvert === q.id ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                  flexShrink: 0,
                }}>
                  ↓
                </span>
              </button>
              {ouvert === q.id && (
                <div style={{
                  padding: '0 20px 20px',
                  fontSize: '14px',
                  lineHeight: 1.7,
                  color: '#44403C',
                  borderTop: '1px solid #F5F5F4',
                  paddingTop: '16px',
                }}>
                  {q.reponse}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
