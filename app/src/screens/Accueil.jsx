

import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function Accueil({ onNavigate, onBack }) {


  const [eglise, setEglise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    async function fetchEglise() {
      setLoading(true);
      const { data, error } = await supabase.from('eglises').select('*').limit(1).single();
      if (error) setError(error.message);
      else setEglise(data);
      setLoading(false);
    }
    fetchEglise();
  }, []);


  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error}</div>;
  if (!eglise) return <div>Aucune église trouvée.</div>;

  return (
    <div style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {onBack && (
        <button onClick={onBack} style={{
          position: 'absolute', top: '16px', left: '16px', zIndex: 10,
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(0,0,0,0.35)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
        }}>⌂</button>
      )}
      {/* Photo façade plein écran */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <img
          src={eglise.photo_facade}
          alt={eglise.nom}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.85) 100%)'
        }} />
      </div>

      {/* Contenu */}
      <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', padding: '32px 24px 40px' }}>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
          {eglise.ville}
        </p>
        <h1 style={{ color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '12px', lineHeight: 1.2 }}>
          {eglise.nom}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', marginBottom: '32px', lineHeight: 1.5 }}>
          {eglise.message_bienvenue}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <NavButton
            icon="✝️"
            label="Comprendre la religion chrétienne"
            onClick={() => onNavigate('comprendre')}
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
          />
          <NavButton
            icon="🗺️"
            label="Visiter cette église"
            onClick={() => onNavigate('plan')}
            style={{ background: 'white', color: '#1B4332', borderColor: 'white' }}
            primary
          />
          <NavButton
            icon="📅"
            label="Au programme"
            onClick={() => onNavigate('programme')}
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
          />
        </div>
      </div>
    </div>
  );
}

function NavButton({ icon, label, onClick, style, primary }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '15px',
        fontWeight: primary ? '600' : '500',
        textAlign: 'left',
        ...style
      }}
    >
      <span style={{ fontSize: '20px' }}>{icon}</span>
      {label}
    </button>
  )
}

export default Accueil;
