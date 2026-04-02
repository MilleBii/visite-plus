
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../supabaseClient';

function Carte({ onSelectEglise }) {

const MAP_CENTER = [45.7624, 4.8222] // Basilique de Fourvière, Lyon

const churchIcon = L.divIcon({
  html: `<div style="
    background: #1B4332;
    border: 3px solid white;
    border-radius: 50%;
    width: 44px; height: 44px;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    box-shadow: 0 3px 10px rgba(0,0,0,0.3);
  ">⛪</div>`,
  className: '',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
})


  const [selection, setSelection] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [eglises, setEglises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchEglises() {
      setLoading(true);
      const { data, error } = await supabase.from('eglises').select('*');
      if (error) setError(error.message);
      else setEglises(data || []);
      setLoading(false);
    }
    fetchEglises();
  }, []);


  const resultats = recherche.trim().length > 0
    ? eglises.filter(e =>
        e.nom.toLowerCase().includes(recherche.toLowerCase()) ||
        e.ville.toLowerCase().includes(recherche.toLowerCase())
      )
    : [];

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error}</div>;

  return (
    <div style={{ height: '100vh', position: 'relative' }}>

      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'white', borderBottom: '1px solid #E7E5E4',
        padding: '16px 20px 12px',
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1C1917', marginBottom: '10px' }}>Visite+</h1>

        {/* Barre de recherche */}
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '15px', pointerEvents: 'none',
          }}>🔍</span>
          <input
            type="text"
            placeholder="Rechercher une église..."
            value={recherche}
            onChange={e => { setRecherche(e.target.value); setSelection(null) }}
            style={{
              width: '100%', padding: '10px 36px 10px 36px',
              borderRadius: '10px', border: '1px solid #E7E5E4',
              background: '#F5F5F4', fontSize: '14px', color: '#1C1917',
              boxSizing: 'border-box',
            }}
          />
          {recherche.length > 0 && (
            <button
              onClick={() => setRecherche('')}
              style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                fontSize: '13px', color: '#78716C',
              }}
            >✕</button>
          )}
        </div>

        {/* Résultats de recherche */}
        {resultats.length > 0 && (
          <div style={{
            marginTop: '6px', background: 'white', borderRadius: '10px',
            border: '1px solid #E7E5E4', overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}>
            {resultats.map(e => (
              <button
                key={e.id}
                onClick={() => { setSelection(e); setRecherche('') }}
                style={{
                  width: '100%', padding: '12px 14px', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}
              >
                <span style={{ fontSize: '18px' }}>⛪</span>
                <div>
                  <p style={{ fontWeight: '600', color: '#1C1917' }}>{e.nom}</p>
                  <p style={{ fontSize: '12px', color: '#78716C' }}>{e.ville}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {recherche.trim().length > 0 && resultats.length === 0 && (
          <p style={{ marginTop: '8px', fontSize: '13px', color: '#78716C', paddingLeft: '4px' }}>
            Aucune église trouvée
          </p>
        )}
      </div>

    {/* Carte */}
    <div style={{ position: 'absolute', inset: '110px 0 0 0' }}>
      <MapContainer
        center={MAP_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {eglises.map(e => (
          <Marker
            key={e.id}
            position={e.position}
            icon={churchIcon}
            eventHandlers={{ click: () => { setSelection(e); setRecherche('') } }}
          />
        ))}
      </MapContainer>
    </div>

    {/* Panneau église sélectionnée */}
    {selection && (
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: 'white', borderRadius: '20px 20px 0 0',
        borderTop: '1px solid #E7E5E4', padding: '20px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
      }}>
        <div style={{ width: '40px', height: '4px', background: '#D6D3D1', borderRadius: '2px', margin: '0 auto 16px' }} />
        <button onClick={() => setSelection(null)} style={{
          position: 'absolute', top: '20px', right: '20px',
          width: '28px', height: '28px', borderRadius: '50%',
          background: '#F5F5F4', fontSize: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '16px' }}>
          <img
            src={selection.photo_facade}
            alt={selection.nom}
            style={{ width: '72px', height: '72px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
          />
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: '#F5F5F4', borderRadius: '6px',
              padding: '2px 8px', fontSize: '12px', color: '#78716C', marginBottom: '6px',
            }}>
              <span>⛪</span><span>Église</span>
            </div>
            <p style={{ fontWeight: '600', fontSize: '16px', color: '#1C1917', marginBottom: '2px' }}>{selection.nom}</p>
            <p style={{ fontSize: '13px', color: '#78716C' }}>{selection.ville}</p>
          </div>
        </div>
        <button
          onClick={() => onSelectEglise(selection)}
          style={{
            width: '100%', padding: '14px',
            background: '#1B4332', color: 'white',
            borderRadius: '12px', fontSize: '15px', fontWeight: '600',
          }}
        >
          Visiter cette église →
        </button>
      </div>
    )}
  </div>
  );
}

export default Carte;
