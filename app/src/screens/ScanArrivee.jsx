import { eglise } from '../data/mockData'

export default function ScanArrivee({ onScan, onVoirCarte, onBO }) {
  return (
    <div
      onClick={onScan}
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Photo de l'église en fond plein écran */}
      <img
        src={eglise.photo_facade}
        alt={eglise.nom}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Overlay dégradé : léger en haut, très sombre en bas */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.88) 100%)',
      }} />

      {/* Logo Visite+ en haut */}
      <div style={{ position: 'relative', zIndex: 1, padding: '52px 32px 0', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.2)',
          padding: '7px 18px',
        }}>
          <span style={{ color: 'white', fontSize: '13px' }}>✝</span>
          <span style={{ color: 'white', fontSize: '13px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Visite+
          </span>
        </div>
      </div>

      {/* QR Code centré */}
      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '18px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}>
          <QRCodeSVG size={180} />
        </div>
      </div>

      {/* Contenu bas */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 28px 44px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>
          {eglise.ville}
        </p>
        <h1 style={{ color: 'white', fontSize: '26px', fontWeight: '700', lineHeight: 1.2, marginBottom: '20px' }}>
          {eglise.nom}
        </h1>

        {/* Proposition de valeur */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '28px',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          {[
            { icon: '🗺️', texte: 'Découvrez chaque œuvre et son histoire' },
            { icon: '✝️', texte: 'Comprenez les symboles et la foi chrétienne' },
            { icon: '📅', texte: 'Consultez les offices et événements à venir' },
          ].map(({ icon, texte }) => (
            <div key={texte} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', lineHeight: 1.4 }}>{texte}</span>
            </div>
          ))}
        </div>

      {onBO && (
        <button
          onClick={e => { e.stopPropagation(); onBO() }}
          style={{
            position: 'absolute', bottom: 16, right: 16, zIndex: 2,
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8, color: 'rgba(255,255,255,0.55)', fontSize: 11,
            padding: '5px 10px', cursor: 'pointer',
          }}
        >
          Back Office
        </button>
      )}
      </div>
    </div>
  )
}

/* QR code SVG illustratif */
function QRCodeSVG({ size }) {
  const cell = size / 21
  const pattern = [
    [1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,1,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,1,1,0,1,1,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,0,0,1,1,1,0,1,0,0],
    [1,0,0,0,0,0,1,0,0,1,1,1,0,0,0,0,0,0,1,1,0],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,0,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,0,1,0,0,0,0,0,1,0],
    [1,1,0,1,1,1,1,0,1,0,1,0,1,0,1,0,1,1,0,0,1],
    [0,1,0,0,0,1,0,1,0,1,0,1,1,1,0,1,0,0,1,1,0],
    [1,0,1,1,0,0,1,0,1,0,0,0,1,0,1,0,0,1,0,0,1],
    [0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
    [1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,0,1,0,1,0,1,0,1,0],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,0,1,0,0,0,0,0,1,0],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,0,1],
    [1,0,0,0,0,0,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,0,1],
  ]

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {pattern.map((row, r) =>
        row.map((val, c) =>
          val ? (
            <rect
              key={`${r}-${c}`}
              x={c * cell}
              y={r * cell}
              width={cell}
              height={cell}
              fill="#1B4332"
              rx={cell * 0.15}
            />
          ) : null
        )
      )}
    </svg>
  )
}
