import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../supabaseClient'
import { typeConfig } from '../data/mockData'

const TYPES_POI = Object.keys(typeConfig)

const C = {
  primaire: '#1B4332',
  bg: '#F5F5F4',
  bordure: '#E7E5E4',
  texteSecondaire: '#78716C',
  blanc: '#FFFFFF',
  vert: '#059669',
  rouge: '#DC2626',
  vertClair: '#D1FAE5',
  rougeClair: '#FEE2E2',
}

const TYPE_ICONE = {
  'église': '⛪',
  'sanctuaire': '🕍',
  'cathédrale': '🏛️',
}

const COULEUR_MARKER = { 'publié': '#1B4332', 'pause': '#2563EB' }

function creerMarker(eglise) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background: ${COULEUR_MARKER[eglise.statut] || '#9CA3AF'};
      color: white; border-radius: 50%; width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${TYPE_ICONE[eglise.type] || '⛪'}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const ORDRE_STATUT = { 'publié': 0, 'pause': 1, 'brouillon': 2 }
function trierEglises(liste) {
  return [...liste].sort((a, b) =>
    ((ORDRE_STATUT[a.statut] ?? 3) - (ORDRE_STATUT[b.statut] ?? 3)) ||
    a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
  )
}

export default function TableauDeBord({ onEditer, onAjouter }) {
  const [mode, setMode] = useState('stats')
  const [eglises, setEglises] = useState([])
  const [stats, setStats] = useState({})
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
    chargerDonnees()
  }, [])

  async function chargerDonnees() {
    setChargement(true)
    const { data, error } = await supabase
      .from('eglises')
      .select('id, nom, ville, type, statut, position, photo_facade')
      .order('nom')
    if (error) {
      setErreur(error.message)
      setChargement(false)
      return
    }
    const eglisesData = data || []
    setEglises(eglisesData)
    await chargerStats(eglisesData.map(e => e.id))
    setChargement(false)
  }

  async function chargerStats(ids) {
    if (!ids.length) return
    const maintenant = new Date()
    const il_y_a_28j = new Date(maintenant - 28 * 86400000).toISOString()
    const il_y_a_56j = new Date(maintenant - 56 * 86400000).toISOString()

    // Récupère le mapping poi_id → { eglise_id, type } pour les POIs de nos églises
    const { data: poisData } = await supabase
      .from('pois').select('id, eglise_id, type').in('eglise_id', ids)
    const poiVersEglise = {}
    for (const p of poisData || []) poiVersEglise[p.id] = { eglise_id: p.eglise_id, type: p.type }
    const poiIds = Object.keys(poiVersEglise).map(Number)

    const queries = [
      // Visites église (entite_type = 'eglise')
      supabase.from('stats_vues').select('entite_id, count').eq('entite_type', 'eglise').in('entite_id', ids).gte('slot', il_y_a_28j),
      supabase.from('stats_vues').select('entite_id, count').eq('entite_type', 'eglise').in('entite_id', ids).gte('slot', il_y_a_56j).lt('slot', il_y_a_28j),
      // Vues POI (entite_type = 'poi')
      poiIds.length
        ? supabase.from('stats_vues').select('entite_id, count').eq('entite_type', 'poi').in('entite_id', poiIds).gte('slot', il_y_a_28j)
        : Promise.resolve({ data: [] }),
      poiIds.length
        ? supabase.from('stats_vues').select('entite_id, count').eq('entite_type', 'poi').in('entite_id', poiIds).gte('slot', il_y_a_56j).lt('slot', il_y_a_28j)
        : Promise.resolve({ data: [] }),
    ]

    const [
      { data: egliseCourant, error: e1 },
      { data: eglisePrecedent, error: e2 },
      { data: poiCourant, error: e3 },
      { data: poiPrecedent, error: e4 },
    ] = await Promise.all(queries)

    if (e1) console.error('stats_vues eglise courant:', e1.message)
    if (e2) console.error('stats_vues eglise précédent:', e2.message)
    if (e3) console.error('stats_vues poi courant:', e3.message)
    if (e4) console.error('stats_vues poi précédent:', e4.message)

    function sommeVisitesParEglise(rows) {
      const acc = {}
      for (const row of rows || []) acc[row.entite_id] = (acc[row.entite_id] || 0) + (row.count || 0)
      return acc
    }

    // Agrège les vues POI par (eglise_id, type)
    function sommePoiParEgliseEtType(rows) {
      const acc = {}  // { eglise_id: { type: count } }
      for (const row of rows || []) {
        const info = poiVersEglise[row.entite_id]
        if (!info) continue
        const { eglise_id, type } = info
        if (!acc[eglise_id]) acc[eglise_id] = {}
        acc[eglise_id][type] = (acc[eglise_id][type] || 0) + (row.count || 0)
      }
      return acc
    }

    const visites28j  = sommeVisitesParEglise(egliseCourant)
    const visitesPrec = sommeVisitesParEglise(eglisePrecedent)
    const vuesPoi28j  = sommePoiParEgliseEtType(poiCourant)
    const vuesPoiPrec = sommePoiParEgliseEtType(poiPrecedent)

    const statsMap = {}
    for (const id of ids) {
      const v28 = visites28j[id] || 0
      const vPr = visitesPrec[id] || 0
      const vuesPar = {}
      const deltaVues = {}
      for (const t of TYPES_POI) {
        const c28 = vuesPoi28j[id]?.[t] || 0
        const cPr = vuesPoiPrec[id]?.[t] || 0
        vuesPar[t] = c28
        deltaVues[t] = cPr > 0 ? Math.round(((c28 - cPr) / cPr) * 100) : null
      }
      statsMap[id] = {
        visites28j: v28,
        delta: vPr > 0 ? Math.round(((v28 - vPr) / vPr) * 100) : null,
        vuesPoi28j: vuesPar,
        deltaVues,
      }
    }
    setStats(statsMap)
  }

  async function togglePauseEglise(id, statutActuel) {
    const nouveauStatut = statutActuel === 'publié' ? 'pause' : 'publié'
    const { error } = await supabase.from('eglises').update({ statut: nouveauStatut }).eq('id', id)
    if (error) { alert('Erreur : ' + error.message); return }
    setEglises(prev => prev.map(e => e.id === id ? { ...e, statut: nouveauStatut } : e))
  }

  const eglisesTriees = trierEglises(eglises)

  const eglisesFiltrees = eglisesTriees.filter(e =>
    e.nom.toLowerCase().includes(recherche.toLowerCase()) ||
    e.ville.toLowerCase().includes(recherche.toLowerCase())
  )

  const avecPosition = eglises.filter(e => e.position?.length === 2)
  const centreDefaut = avecPosition.length > 0
    ? [
        avecPosition.reduce((s, e) => s + e.position[0], 0) / avecPosition.length,
        avecPosition.reduce((s, e) => s + e.position[1], 0) / avecPosition.length,
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

        {/* Toggle Carte / Stats */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: 3, gap: 2 }}>
          {['carte', 'stats'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                background: mode === m ? C.blanc : 'transparent',
                color: mode === m ? C.primaire : 'rgba(255,255,255,0.75)',
                border: 'none', borderRadius: 6,
                padding: '5px 16px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {m === 'carte' ? '🗺 Carte' : '📊 Stats'}
            </button>
          ))}
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
      {mode === 'carte' ? (
        <VueCarte
          eglises={eglises}
          eglisesFiltrees={eglisesFiltrees}
          egliseSelectionnee={egliseSelectionnee}
          recherche={recherche}
          setRecherche={setRecherche}
          chargement={chargement}
          erreur={erreur}
          avecPosition={avecPosition}
          centreDefaut={centreDefaut}
          mapRef={mapRef}
          surSelectionEglise={surSelectionEglise}
          setEgliseSelectionnee={setEgliseSelectionnee}
          onEditer={onEditer}
          onTogglePause={togglePauseEglise}
        />
      ) : (
        <VueStats
          eglises={eglises}
          stats={stats}
          chargement={chargement}
          onEditer={onEditer}
          onTogglePause={togglePauseEglise}
        />
      )}
    </div>
  )
}

function VueCarte({ eglises, eglisesFiltrees, egliseSelectionnee, recherche, setRecherche, chargement, erreur, avecPosition, centreDefaut, mapRef, surSelectionEglise, setEgliseSelectionnee, onEditer, onTogglePause }) {
  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Colonne gauche — liste */}
      <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.bordure}`, background: C.blanc }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${C.bordure}` }}>
          <input
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher une église…"
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              border: `1px solid ${C.bordure}`, fontSize: 14,
              outline: 'none', boxSizing: 'border-box', background: C.bg,
            }}
          />
        </div>
        <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${C.bordure}` }}>
          <span style={{ fontSize: 12, color: C.texteSecondaire }}>
            {chargement ? 'Chargement…' : `${eglisesFiltrees.length} église${eglisesFiltrees.length > 1 ? 's' : ''}`}
          </span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {erreur && <div style={{ padding: 16, color: C.rouge, fontSize: 13 }}>{erreur}</div>}
          {!chargement && eglisesFiltrees.map(eglise => (
            <LigneEglise
              key={eglise.id}
              eglise={eglise}
              selectionnee={egliseSelectionnee === eglise.id}
              onSelectionner={() => surSelectionEglise(eglise)}
              onEditer={() => onEditer(eglise.id)}
              onTogglePause={onTogglePause}
            />
          ))}
          {!chargement && eglisesFiltrees.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: C.texteSecondaire, fontSize: 14 }}>
              Aucune église trouvée
            </div>
          )}
        </div>
      </div>

      {/* Carte */}
      <div style={{ flex: 1, position: 'relative' }}>
        {!chargement && (
          <MapContainer center={centreDefaut} zoom={6} style={{ width: '100%', height: '100%' }} ref={mapRef}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />
            {avecPosition.map(eglise => (
              <Marker
                key={eglise.id}
                position={eglise.position}
                icon={creerMarker(eglise)}
                eventHandlers={{ click: () => setEgliseSelectionnee(eglise.id) }}
              >
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    {eglise.photo_facade && (
                      <img src={eglise.photo_facade} alt={eglise.nom} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4, marginBottom: 8 }} />
                    )}
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{eglise.nom}</div>
                    <div style={{ fontSize: 12, color: C.texteSecondaire, marginBottom: 8 }}>{eglise.ville}</div>
                      <button
                        onClick={() => onEditer(eglise.id)}
                        style={{ width: '100%', padding: '6px 0', background: C.primaire, color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Voir
                      </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  )
}

function VueStats({ eglises, stats, chargement, onEditer, onTogglePause }) {
  const [recherche, setRecherche] = useState('')
  const eglisesTriees = trierEglises(eglises)
  const eglisesFiltrees = eglisesTriees.filter(e =>
    e.nom.toLowerCase().includes(recherche.toLowerCase()) ||
    e.ville.toLowerCase().includes(recherche.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* En-tête colonnes fixe */}
      <div style={{ position: 'absolute', display: 'none' }} />

      {/* Liste scrollable pleine largeur */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Barre recherche + headers stats */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.bordure}`, background: C.blanc, flexShrink: 0 }}>
          <div style={{ width: 380, flexShrink: 0, padding: 16, borderRight: `1px solid ${C.bordure}` }}>
            <input
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              placeholder="Rechercher une église…"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: `1px solid ${C.bordure}`, fontSize: 14,
                outline: 'none', boxSizing: 'border-box', background: C.bg,
              }}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 32 }}>
            <ColHeader label="Visites" sub="28 derniers jours" />
            {TYPES_POI.map(t => (
              <ColHeader key={t} label={`${typeConfig[t].icon} ${typeConfig[t].label}`} sub="28 derniers jours" />
            ))}
          </div>
        </div>

        {/* Compteur */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.bordure}`, background: C.blanc, flexShrink: 0 }}>
          <div style={{ width: 380, flexShrink: 0, padding: '8px 16px', borderRight: `1px solid ${C.bordure}` }}>
            <span style={{ fontSize: 12, color: C.texteSecondaire }}>
              {chargement ? 'Chargement…' : `${eglisesFiltrees.length} église${eglisesFiltrees.length > 1 ? 's' : ''}`}
            </span>
          </div>
          <div style={{ flex: 1, padding: '8px 32px' }}>
            <span style={{ fontSize: 12, color: C.texteSecondaire }}>vs 28 jours précédents</span>
          </div>
        </div>

        {/* Lignes */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!chargement && eglisesFiltrees.map(eglise => (
            <LigneStats
              key={eglise.id}
              eglise={eglise}
              stat={stats[eglise.id] || { visites28j: 0, vuesPoi28j: {}, delta: null, deltaVues: {} }}
              onEditer={() => onEditer(eglise.id)}
              onTogglePause={onTogglePause}
            />
          ))}
          {!chargement && eglisesFiltrees.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: C.texteSecondaire, fontSize: 14 }}>
              Aucune église trouvée
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const BADGE_STATUT = {
  'publié':    { bg: '#D1FAE5', color: '#059669', label: 'Publié' },
  'pause':     { bg: '#DBEAFE', color: '#2563EB', label: 'En pause' },
  'brouillon': { bg: '#FEF3C7', color: '#D97706', label: 'Brouillon' },
}

function BadgeStatut({ statut }) {
  const s = BADGE_STATUT[statut] || BADGE_STATUT['brouillon']
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function ColHeader({ label, sub }) {
  return (
    <div style={{ minWidth: 140 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{label}</div>
      <div style={{ fontSize: 11, color: C.texteSecondaire }}>{sub}</div>
    </div>
  )
}

function LigneStats({ eglise, stat, onEditer, onTogglePause }) {
  const { visites28j, vuesPoi28j, delta, deltaVues } = stat
  const [enSuppression, setEnSuppression] = useState(false)

  async function supprimerEglise(e) {
    e.stopPropagation()
    if (!window.confirm(`Supprimer définitivement « ${eglise.nom} » ? Cette action est irréversible.`)) return
    setEnSuppression(true)
    const { error } = await supabase.from('eglises').delete().eq('id', eglise.id)
    setEnSuppression(false)
    if (error) {
      alert('Erreur lors de la suppression : ' + error.message)
    } else {
      window.location.reload()
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      borderBottom: `1px solid ${C.bordure}`,
      background: C.blanc,
    }}>
      {/* Partie gauche — identique à LigneEglise */}
      <div style={{
        width: 380, flexShrink: 0, borderRight: `1px solid ${C.bordure}`,
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <MiniPhoto eglise={eglise} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {eglise.nom}
          </div>
          <div style={{ fontSize: 12, color: C.texteSecondaire, marginTop: 2 }}>
            {eglise.ville} · {eglise.type}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
          <BadgeStatut statut={eglise.statut} />
          <ActionBarEglise
            onInspecter={e => { e.stopPropagation(); onEditer() }}
            onSupprimer={supprimerEglise}
            enSuppression={enSuppression}
            onTogglePause={eglise.statut !== 'brouillon' ? e => { e.stopPropagation(); onTogglePause(eglise.id, eglise.statut) } : null}
            estEnPause={eglise.statut === 'pause'}
          />
        </div>
      </div>

      {/* Partie droite — stats alignées */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 32 }}>
        <StatChiffre valeur={visites28j} delta={delta} />
        {TYPES_POI.map(t => (
          <StatChiffre key={t} valeur={vuesPoi28j?.[t] || 0} delta={deltaVues?.[t] ?? null} />
        ))}
      </div>
    </div>
  )
}

function StatChiffre({ valeur, delta }) {
  const hausse = delta !== null && delta > 0
  const baisse = delta !== null && delta < 0

  return (
    <div style={{ minWidth: 140, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 24, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{valeur}</span>
      {delta !== null ? (
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: hausse ? C.vert : baisse ? C.rouge : C.texteSecondaire,
          background: hausse ? C.vertClair : baisse ? C.rougeClair : C.bg,
          padding: '2px 7px', borderRadius: 20,
        }}>
          {hausse ? '▲' : baisse ? '▼' : '—'} {Math.abs(delta)} %
        </span>
      ) : (
        <span style={{ fontSize: 12, color: C.texteSecondaire }}>—</span>
      )}
    </div>
  )
}

function MiniPhoto({ eglise }) {
  return eglise.photo_facade ? (
    <img
      src={eglise.photo_facade}
      alt={eglise.nom}
      style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
    />
  ) : (
    <div style={{
      width: 40, height: 40, borderRadius: 8, flexShrink: 0,
      background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
    }}>
      {TYPE_ICONE[eglise.type] || '⛪'}
    </div>
  )
}

function LigneEglise({ eglise, selectionnee, onSelectionner, onEditer, onTogglePause }) {
  const [enSuppression, setEnSuppression] = useState(false)

  async function supprimerEglise(e) {
    e.stopPropagation()
    if (!window.confirm(`Supprimer définitivement « ${eglise.nom} » ? Cette action est irréversible.`)) return
    setEnSuppression(true)
    const { error } = await supabase.from('eglises').delete().eq('id', eglise.id)
    setEnSuppression(false)
    if (error) {
      alert('Erreur lors de la suppression : ' + error.message)
    } else {
      window.location.reload()
    }
  }

  return (
    <div
      onClick={onSelectionner}
      style={{
        padding: '12px 16px', borderBottom: `1px solid ${C.bordure}`,
        background: selectionnee ? '#F0FDF4' : C.blanc,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
        transition: 'background 0.1s',
      }}
    >
      <MiniPhoto eglise={eglise} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {eglise.nom}
        </div>
        <div style={{ fontSize: 12, color: C.texteSecondaire, marginTop: 2 }}>
          {eglise.ville} · {eglise.type}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <BadgeStatut statut={eglise.statut} />
        <ActionBarEglise
          onInspecter={e => { e.stopPropagation(); onEditer() }}
          onSupprimer={supprimerEglise}
          enSuppression={enSuppression}
          onTogglePause={eglise.statut !== 'brouillon' ? e => { e.stopPropagation(); onTogglePause(eglise.id, eglise.statut) } : null}
          estEnPause={eglise.statut === 'pause'}
        />
      </div>
    </div>
  )
}

// Action bar réutilisable pour stats/carte
function ActionBarEglise({ onInspecter, onSupprimer, enSuppression, onTogglePause, estEnPause, colorInspect = C.primaire, colorDelete = '#dc2626' }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
      <button
        onClick={onInspecter}
        title="Inspecter"
        style={{
          background: 'none', border: 'none', padding: 0, margin: 0,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: '50%', color: colorInspect,
          transition: 'background 0.15s', fontSize: 18,
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </button>
      {onTogglePause && (
        <button
          onClick={onTogglePause}
          title={estEnPause ? 'Republier' : 'Mettre en pause'}
          style={{
            background: 'none', border: 'none', padding: 0, margin: 0,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: '50%', color: '#2563EB',
            transition: 'background 0.15s',
          }}
        >
          {estEnPause ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          )}
        </button>
      )}
      <button
        onClick={onSupprimer}
        disabled={enSuppression}
        title="Supprimer l'église"
        style={{
          background: 'none', border: 'none', padding: 0, margin: 0,
          cursor: enSuppression ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: '50%', color: colorDelete,
          opacity: enSuppression ? 0.6 : 1, fontSize: 18,
          transition: 'background 0.15s',
        }}
      >
        {enSuppression ? '…' : (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        )}
      </button>
    </div>
  )
}
