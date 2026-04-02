import { useState } from 'react'
import { typeConfig } from '../data/mockData'

const sections = [
  { key: 'texte_resume', label: 'Résumé' },
  { key: 'texte_comprendre', label: "Comprendre l'œuvre" },
  { key: 'texte_historique', label: 'Contexte historique' },
  { key: 'texte_bible', label: 'Dans la Bible' },
]

export default function FichePoi({ poi, onBack }) {
  const [enLecture, setEnLecture] = useState(false)
  const cfg = typeConfig[poi.type] || {}

  const sectionsVisibles = sections.filter(
    (s) => s.key !== 'texte_bible' || poi[s.key]
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', flexDirection: 'column' }}>
      {/* Grande photo */}
      <div style={{ position: 'relative', height: '280px', flexShrink: 0 }}>
        <img
          src={poi.photo}
          alt={poi.titre}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 50%)',
        }} />
        <button
          onClick={onBack}
          style={{
            position: 'absolute', top: '16px', left: '16px',
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.4)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}
        >←</button>
      </div>

      {/* En-tête : picto + titre + TTS */}
      <div style={{ padding: '20px 20px 16px', background: 'white', borderBottom: '1px solid #E7E5E4' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: '#F5F5F4', borderRadius: '8px',
          padding: '4px 10px', fontSize: '13px', color: '#78716C',
          marginBottom: '10px',
        }}>
          <span>{cfg.icon}</span>
          <span>{cfg.label}</span>
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1C1917', marginBottom: '14px', lineHeight: 1.2 }}>
          {poi.titre}
        </h1>

        {/* Bouton TTS */}
        <button
          onClick={() => setEnLecture(!enLecture)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '20px',
            background: enLecture ? '#1B4332' : '#F0FDF4',
            color: enLecture ? 'white' : '#1B4332',
            border: '1px solid #BBF7D0',
            fontSize: '14px', fontWeight: '500',
          }}
        >
          <span style={{ fontSize: '16px' }}>{enLecture ? '⏹' : '▶'}</span>
          {enLecture ? 'Arrêter' : 'Écouter'}
        </button>
      </div>

      {/* Sections scrollables */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sectionsVisibles.map((s, i) => (
          <div
            key={s.key}
            style={{
              padding: '20px',
              borderBottom: i < sectionsVisibles.length - 1 ? '1px solid #E7E5E4' : 'none',
              background: 'white',
              marginBottom: i < sectionsVisibles.length - 1 ? '8px' : 0,
            }}
          >
            <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
              {s.label}
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#44403C' }}>
              {poi[s.key]}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
