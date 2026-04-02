import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../supabaseClient'

const C = {
  primaire: '#1B4332',
  bg: '#F5F5F4',
  bordure: '#E7E5E4',
  texteSecondaire: '#78716C',
  blanc: '#FFFFFF',
}

const TYPE_ICONE = {
  'église': '⛪',
  'sanctuaire': '🕍',
  'cathédrale': '🏛️',
}

function creerMarker(eglise) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background: ${eglise.statut === 'publié' ? '#1B4332' : '#9CA3AF'};
      color: white; border-radius: 50%; width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${TYPE_ICONE[eglise.type] || '⛪'}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

export default function TableauDeBord({ onEditer, onAjouter }) {
  const [eglises, setEglises] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [recherche, setRecherche] = useState('')
  const [egliseSelectionnee, setEgliseSelectionnee] = useState(null)
  const mapRef = useRef(null)

  useEffect(() => {
    const root = document.getElementById('root')
    const prev = root.style.maxWidth
    root.style.maxWidth = 'none'
    return () => { root.style.maxWidth = prev }
  }, [])

  useEffect(() => {
    chargerEglises()
  }, [])

  async function chargerEglises() {
    setChargement(true)
    const { data, error } = await supabase
      .from('eglises')
      .select('id, nom, ville, type, statut, position, photo_facade')
      .order('nom')
    if (error) setErreur(error.message)
    else setEglises(data || [])
    setChargement(false)
  }

  const eglisesFiltrees = eglises.filter(e =>
    e.nom.toLowerCase().includes(recherche.toLowerCase()) ||
    e.ville.toLowerCase().includes(recherche.toLowerCase())
  )

  const publieesAvecPosition = eglises.filter(e => e.position?.length === 2)

  const centreDefaut = publieesAvecPosition.length > 0
    ? [
        publieesAvecPosition.reduce((s, e) => s + e.position[0], 0) / publieesAvecPosition.length,
        publieesAvecPosition.reduce((s, e) => s + e.position[1], 0) / publieesAvecPosition.length,
      ]
    : [46.6, 2.3]

  function surSelectionEglise(eglise) {
    setEgliseSelectionnee(eglise.id)
    if (mapRef.current && eglise.position?.length === 2) {
      mapRef.current.setView(eglise.position, 14, { animate: true })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ background: C.primaire, color: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>✝</span>
          <span style={{ fontWeight: 700, letterSpacing: '1px', fontSize: 14 }}>VISITE+</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>|</span>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginLeft: 8 }}>Back Office</span>
        </div>
        <button
          onClick={onAjouter}
          style={{
            background: C.blanc, color: C.primaire,
            border: 'none', borderRadius: 6,
            padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Ajouter une église
        </button>
      </div>

      {/* Corps */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Colonne gauche — liste */}
        <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.bordure}`, background: C.blanc }}>

          {/* Barre de recherche */}
          <div style={{ padding: 16, borderBottom: `1px solid ${C.bordure}` }}>
            <input
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              placeholder="Rechercher une église…"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: `1px solid ${C.bordure}`, fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
                background: C.bg,
              }}
            />
          </div>

          {/* Compteur */}
          <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${C.bordure}` }}>
            <span style={{ fontSize: 12, color: C.texteSecondaire }}>
              {chargement ? 'Chargement…' : `${eglisesFiltrees.length} église${eglisesFiltrees.length > 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Liste */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {erreur && (
              <div style={{ padding: 16, color: '#DC2626', fontSize: 13 }}>{erreur}</div>
            )}
            {!chargement && eglisesFiltrees.map(eglise => (
              <LigneEglise
                key={eglise.id}
                eglise={eglise}
                selectionnee={egliseSelectionnee === eglise.id}
                onSelectionner={() => surSelectionEglise(eglise)}
                onEditer={() => onEditer(eglise.id)}
              />
            ))}
            {!chargement && eglisesFiltrees.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: C.texteSecondaire, fontSize: 14 }}>
                Aucune église trouvée
              </div>
            )}
          </div>

        </div>

        {/* Colonne droite — carte */}
        <div style={{ flex: 1, position: 'relative' }}>
          {!chargement && (
            <MapContainer
              center={centreDefaut}
              zoom={6}
              style={{ width: '100%', height: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
              />
              {publieesAvecPosition.map(eglise => (
                <Marker
                  key={eglise.id}
                  position={eglise.position}
                  icon={creerMarker(eglise)}
                  eventHandlers={{
                    click: () => setEgliseSelectionnee(eglise.id),
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      {eglise.photo_facade && (
                        <img
                          src={eglise.photo_facade}
                          alt={eglise.nom}
                          style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4, marginBottom: 8 }}
                        />
                      )}
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{eglise.nom}</div>
                      <div style={{ fontSize: 12, color: C.texteSecondaire, marginBottom: 8 }}>{eglise.ville}</div>
                      <button
                        onClick={() => onEditer(eglise.id)}
                        style={{
                          width: '100%', padding: '6px 0', background: C.primaire,
                          color: '#fff', border: 'none', borderRadius: 5,
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Modifier
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

      </div>
    </div>
  )
}

function LigneEglise({ eglise, selectionnee, onSelectionner, onEditer }) {
  const publie = eglise.statut === 'publié'
  return (
    <div
      onClick={onSelectionner}
      style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${C.bordure}`,
        background: selectionnee ? '#F0FDF4' : C.blanc,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'background 0.1s',
      }}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>{TYPE_ICONE[eglise.type] || '⛪'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {eglise.nom}
        </div>
        <div style={{ fontSize: 12, color: C.texteSecondaire, marginTop: 2 }}>
          {eglise.ville} · {eglise.type}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
          background: publie ? '#D1FAE5' : '#FEF3C7',
          color: publie ? '#059669' : '#D97706',
        }}>
          {publie ? 'Publié' : 'Brouillon'}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onEditer() }}
          style={{
            fontSize: 11, color: C.primaire, background: 'none',
            border: `1px solid ${C.primaire}`, borderRadius: 5,
            padding: '2px 8px', cursor: 'pointer', fontWeight: 500,
          }}
        >
          Modifier
        </button>
      </div>
    </div>
  )
}
