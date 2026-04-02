export default function TopBar({ titre, onBack }) {
  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 10,
      background: 'white',
      borderBottom: '1px solid #E7E5E4',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <button
        onClick={onBack}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: '#F5F5F4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          flexShrink: 0,
        }}
      >
        ←
      </button>
      <h2 style={{ fontSize: '17px', fontWeight: '600', color: '#1C1917' }}>{titre}</h2>
    </div>
  )
}
