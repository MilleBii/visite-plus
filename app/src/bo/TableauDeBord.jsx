import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase, SUPABASE_URL } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
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
  orange: '#D97706',
  orangeClair: '#FEF3C7',
  bleu: '#2563EB',
  bleuClair: '#DBEAFE',
}

const TYPE_ICONE = {
  'église': '⛪',
  'sanctuaire': '🕍',
  'cathédrale': '🏛️',
}

const COULEUR_MARKER = { 'publié': '#1B4332', 'pause': '#2563EB' }

const BADGE_STATUT = {
  'publié':    { bg: '#D1FAE5', color: '#059669', label: 'Publié' },
  'pause':     { bg: '#DBEAFE', color: '#2563EB', label: 'En pause' },
  'brouillon': { bg: '#FEF3C7', color: '#D97706', label: 'Brouillon' },
  'archivé':   { bg: '#F3F4F6', color: '#6B7280', label: 'Archivé' },
}

const BADGE_ROLE = {
  'super_admin':      { bg: C.primaire,  color: '#fff',     label: 'Super admin' },
  'editeur_1visible': { bg: '#1D4ED8',   color: '#fff',     label: 'Éditeur 1visible' },
  'admin_client':     { bg: '#92400E',   color: '#fff',     label: 'Admin client' },
  'editeur_client':   { bg: '#374151',   color: '#fff',     label: 'Éditeur' },
}

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

const S_FILTRE = {
  fontSize: 12, borderRadius: 6, border: `1px solid #E7E5E4`,
  background: '#F5F5F4', padding: '5px 8px', color: '#374151', cursor: 'pointer', outline: 'none',
}
function trierEglises(liste) {
  return [...liste].sort((a, b) =>
    ((ORDRE_STATUT[a.statut] ?? 3) - (ORDRE_STATUT[b.statut] ?? 3)) ||
    a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
  )
}

export default function TableauDeBord({ onEditer, onAjouter }) {
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()
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

  useEffect(() => { if (role) chargerDonnees() }, [role])

  async function chargerDonnees() {
    setChargement(true)
    let query = supabase
      .from('eglises')
      .select('id, nom, ville, type, statut, position, photo_facade, client_id, diocese_id, clients(nom, dioceses(nom)), dioceses(nom)')
      .neq('statut', 'archivé')
      .order('nom')

    if (['admin_client', 'editeur_client'].includes(role) && profile?.client_id) {
      query = query.eq('client_id', profile.client_id)
    }

    const { data, error } = await query
    if (error) { setErreur(error.message); setChargement(false); return }
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

    const { data: poisData } = await supabase
      .from('pois').select('id, eglise_id, type').in('eglise_id', ids)
    const poiVersEglise = {}
    for (const p of poisData || []) poiVersEglise[p.id] = { eglise_id: p.eglise_id, type: p.type }
    const poiIds = Object.keys(poiVersEglise).map(Number)

    const queries = [
      supabase.from('stats_vues').select('entite_id, count').eq('entite_type', 'eglise').in('entite_id', ids).gte('slot', il_y_a_28j),
      supabase.from('stats_vues').select('entite_id, count').eq('entite_type', 'eglise').in('entite_id', ids).gte('slot', il_y_a_56j).lt('slot', il_y_a_28j),
      poiIds.length
        ? supabase.from('stats_vues').select('entite_id, count').eq('entite_type', 'poi').in('entite_id', poiIds).gte('slot', il_y_a_28j)
        : Promise.resolve({ data: [] }),
      poiIds.length
        ? supabase.from('stats_vues').select('entite_id, count').eq('entite_type', 'poi').in('entite_id', poiIds).gte('slot', il_y_a_56j).lt('slot', il_y_a_28j)
        : Promise.resolve({ data: [] }),
    ]

    const [
      { data: egliseCourant },
      { data: eglisePrecedent },
      { data: poiCourant },
      { data: poiPrecedent },
    ] = await Promise.all(queries)

    function sommeParEglise(rows) {
      const acc = {}
      for (const row of rows || []) acc[row.entite_id] = (acc[row.entite_id] || 0) + (row.count || 0)
      return acc
    }
    function sommePoiParEgliseEtType(rows) {
      const acc = {}
      for (const row of rows || []) {
        const info = poiVersEglise[row.entite_id]
        if (!info) continue
        const { eglise_id, type } = info
        if (!acc[eglise_id]) acc[eglise_id] = {}
        acc[eglise_id][type] = (acc[eglise_id][type] || 0) + (row.count || 0)
      }
      return acc
    }

    const visites28j  = sommeParEglise(egliseCourant)
    const visitesPrec = sommeParEglise(eglisePrecedent)
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

  async function changerStatutEglise(id, nouveauStatut) {
    const { error } = await supabase.rpc('set_eglise_statut', {
      p_eglise_id: id,
      p_statut: nouveauStatut,
    })
    if (error) { alert('Erreur : ' + error.message); return }
    if (nouveauStatut === 'archivé') {
      setEglises(prev => prev.filter(e => e.id !== id))
    } else {
      setEglises(prev => prev.map(e => e.id === id ? { ...e, statut: nouveauStatut } : e))
    }
  }

  async function handleLogout() {
    await signOut()
    navigate('/bo/login', { replace: true })
  }

  const eglisesTriees   = trierEglises(eglises)
  const eglisesFiltrees = eglisesTriees.filter(e =>
    e.nom.toLowerCase().includes(recherche.toLowerCase()) ||
    (e.ville || '').toLowerCase().includes(recherche.toLowerCase())
  )
  const avecPosition = eglises.filter(e =>
    Array.isArray(e.position) && e.position.length === 2 &&
    typeof e.position[0] === 'number' && typeof e.position[1] === 'number'
  )
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

  const badgeRole = BADGE_ROLE[role] || BADGE_ROLE['editeur_client']
  const peutVoirEquipe   = ['super_admin', 'editeur_1visible', 'admin_client'].includes(role)
  const peutVoirClients  = ['super_admin', 'editeur_1visible'].includes(role)

  const TABS = [
    { id: 'carte',   label: '🗺 Carte' },
    { id: 'stats',   label: '📊 Stats' },
    ...(peutVoirClients  ? [{ id: 'clients', label: '🏛 Clients' }] : []),
    ...(peutVoirEquipe   ? [{ id: 'equipe',  label: '👥 Utilisateurs'  }] : []),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ background: C.primaire, color: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, flexShrink: 0 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>✝</span>
          <span style={{ fontWeight: 700, letterSpacing: '1px', fontSize: 14 }}>VISITE+</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>|</span>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginLeft: 8 }}>Back Office</span>
        </div>

        {/* Toggle tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: 3, gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setMode(t.id)} style={{
              background: mode === t.id ? C.blanc : 'transparent',
              color: mode === t.id ? C.primaire : 'rgba(255,255,255,0.75)',
              border: 'none', borderRadius: 6,
              padding: '5px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Utilisateur + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
              {profile?.prenom} {profile?.nom}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
              background: badgeRole.bg, color: badgeRole.color,
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              {badgeRole.label}
            </span>
          </div>
          <button onClick={handleLogout} style={{
            background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6,
            padding: '5px 12px', fontSize: 12, cursor: 'pointer',
          }}>
            Déconnexion
          </button>
        </div>
      </div>

      {/* Corps */}
      {mode === 'carte' && (
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
          onChangerStatut={changerStatutEglise}
          onAjouter={onAjouter}
          role={role}
        />
      )}
      {mode === 'stats' && (
        <VueStats
          eglises={eglises}
          stats={stats}
          chargement={chargement}
          onEditer={onEditer}
          onChangerStatut={changerStatutEglise}
          onAjouter={onAjouter}
          role={role}
        />
      )}
      {mode === 'clients' && (
        <VueClients role={role} />
      )}
      {mode === 'equipe' && (
        <VueEquipe role={role} />
      )}
    </div>
  )
}

function VueCarte({ eglises, eglisesFiltrees, egliseSelectionnee, recherche, setRecherche, chargement, erreur, avecPosition, centreDefaut, mapRef, surSelectionEglise, setEgliseSelectionnee, onEditer, onChangerStatut, onAjouter, role }) {
  const [filtreDiocese, setFiltreDiocese] = useState('')
  const [filtreClient, setFiltreClient]   = useState('')

  const nomDiocese = e => e.dioceses?.nom || e.clients?.dioceses?.nom
  const diocesesOptions = [...new Set(eglises.map(nomDiocese).filter(Boolean))].sort()
  const clientsOptions  = [...new Map(
    eglises
      .filter(e => !filtreDiocese || nomDiocese(e) === filtreDiocese)
      .filter(e => e.client_id && e.clients?.nom)
      .map(e => [e.client_id, e.clients.nom])
  ).entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr'))

  const liste = eglisesFiltrees
    .filter(e => !filtreDiocese || nomDiocese(e) === filtreDiocese)
    .filter(e => !filtreClient  || String(e.client_id) === filtreClient)

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.bordure}`, background: C.blanc }}>
        {['super_admin', 'editeur_1visible'].includes(role) && (
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.bordure}`, display: 'flex', gap: 8 }}>
            <select value={filtreDiocese} onChange={e => { setFiltreDiocese(e.target.value); setFiltreClient('') }} style={{ ...S_FILTRE, flex: 1, minWidth: 0 }}>
              <option value="">Diocèse</option>
              {diocesesOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={filtreClient} onChange={e => setFiltreClient(e.target.value)} style={{ ...S_FILTRE, flex: 1, minWidth: 0 }}>
              <option value="">Client</option>
              {clientsOptions.map(([id, n]) => <option key={id} value={String(id)}>{n}</option>)}
            </select>
          </div>
        )}
        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.bordure}` }}>
          <input
            value={recherche} onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher une église…"
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.bordure}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: C.bg }}
          />
        </div>
        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.bordure}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: C.texteSecondaire }}>
            {chargement ? 'Chargement…' : `${liste.length} église${liste.length > 1 ? 's' : ''}`}
          </span>
          {role === 'super_admin' && (
            <button onClick={onAjouter} style={{
              background: C.primaire, color: '#fff', border: 'none', borderRadius: 6,
              padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>+ Ajouter</button>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {erreur && <div style={{ padding: 16, color: C.rouge, fontSize: 13 }}>{erreur}</div>}
          {!chargement && liste.map(eglise => (
            <LigneEglise
              key={eglise.id}
              eglise={eglise}
              selectionnee={egliseSelectionnee === eglise.id}
              onSelectionner={() => surSelectionEglise(eglise)}
              onEditer={() => onEditer(eglise.id)}
              onChangerStatut={onChangerStatut}
              role={role}
            />
          ))}
          {!chargement && liste.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: C.texteSecondaire, fontSize: 14 }}>Aucune église trouvée</div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {!chargement && (
          <MapContainer center={centreDefaut} zoom={6} style={{ width: '100%', height: '100%' }} ref={mapRef}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>' />
            {liste.filter(e => Array.isArray(e.position) && e.position.length === 2 && typeof e.position[0] === 'number').map(eglise => (
              <Marker key={eglise.id} position={eglise.position} icon={creerMarker(eglise)} eventHandlers={{ click: () => setEgliseSelectionnee(eglise.id) }}>
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    {eglise.photo_facade && <img src={eglise.photo_facade} alt={eglise.nom} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4, marginBottom: 8 }} />}
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{eglise.nom}</div>
                    <div style={{ fontSize: 12, color: C.texteSecondaire, marginBottom: 8 }}>{eglise.ville}</div>
                    <button onClick={() => onEditer(eglise.id)} style={{ width: '100%', padding: '6px 0', background: C.primaire, color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
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

function VueStats({ eglises, stats, chargement, onEditer, onChangerStatut, onAjouter, role }) {
  const [recherche, setRecherche]       = useState('')
  const [filtreDiocese, setFiltreDiocese] = useState('')
  const [filtreClient, setFiltreClient]   = useState('')

  const nomDiocese = e => e.dioceses?.nom || e.clients?.dioceses?.nom
  const diocesesOptions = [...new Set(eglises.map(nomDiocese).filter(Boolean))].sort()
  const clientsOptions  = [...new Map(
    eglises
      .filter(e => !filtreDiocese || nomDiocese(e) === filtreDiocese)
      .filter(e => e.client_id && e.clients?.nom)
      .map(e => [e.client_id, e.clients.nom])
  ).entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr'))

  const eglisesTriees   = trierEglises(eglises)
  const eglisesFiltrees = eglisesTriees
    .filter(e =>
      e.nom.toLowerCase().includes(recherche.toLowerCase()) ||
      (e.ville || '').toLowerCase().includes(recherche.toLowerCase())
    )
    .filter(e => !filtreDiocese || nomDiocese(e) === filtreDiocese)
    .filter(e => !filtreClient  || String(e.client_id) === filtreClient)

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.bordure}`, background: C.blanc, flexShrink: 0 }}>
          {/* Colonne gauche : filtres + recherche + compte */}
          <div style={{ width: 380, flexShrink: 0, borderRight: `1px solid ${C.bordure}`, display: 'flex', flexDirection: 'column' }}>
            {['super_admin', 'editeur_1visible'].includes(role) && (
              <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.bordure}`, display: 'flex', gap: 8 }}>
                <select value={filtreDiocese} onChange={e => { setFiltreDiocese(e.target.value); setFiltreClient('') }} style={{ ...S_FILTRE, flex: 1, minWidth: 0 }}>
                  <option value="">Diocèse</option>
                  {diocesesOptions.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <select value={filtreClient} onChange={e => setFiltreClient(e.target.value)} style={{ ...S_FILTRE, flex: 1, minWidth: 0 }}>
                  <option value="">Client</option>
                  {clientsOptions.map(([id, n]) => <option key={id} value={String(id)}>{n}</option>)}
                </select>
              </div>
            )}
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.bordure}` }}>
              <input
                value={recherche} onChange={e => setRecherche(e.target.value)}
                placeholder="Rechercher une église…"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.bordure}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: C.bg }}
              />
            </div>
            <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: C.texteSecondaire }}>
                {chargement ? 'Chargement…' : `${eglisesFiltrees.length} église${eglisesFiltrees.length > 1 ? 's' : ''}`}
              </span>
              {role === 'super_admin' && (
                <button onClick={onAjouter} style={{
                  background: C.primaire, color: '#fff', border: 'none', borderRadius: 6,
                  padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>+ Ajouter</button>
              )}
            </div>
          </div>
          {/* Colonne droite : en-têtes colonnes stats */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 32px', gap: 32, borderBottom: `1px solid ${C.bordure}`, height: 48 }}>
              <ColHeader label="Visites" sub="28 derniers jours" />
              {TYPES_POI.map(t => (
                <ColHeader key={t} label={`${typeConfig[t].icon} ${typeConfig[t].label}`} sub="28 derniers jours" />
              ))}
            </div>
            <div style={{ padding: '8px 32px' }}>
              <span style={{ fontSize: 12, color: C.texteSecondaire }}>vs 28 jours précédents</span>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!chargement && eglisesFiltrees.map(eglise => (
            <LigneStats
              key={eglise.id}
              eglise={eglise}
              stat={stats[eglise.id] || { visites28j: 0, vuesPoi28j: {}, delta: null, deltaVues: {} }}
              onEditer={() => onEditer(eglise.id)}
              onChangerStatut={onChangerStatut}
              role={role}
            />
          ))}
          {!chargement && eglisesFiltrees.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: C.texteSecondaire, fontSize: 14 }}>Aucune église trouvée</div>
          )}
        </div>
      </div>
    </div>
  )
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

function LigneStats({ eglise, stat, onEditer, onChangerStatut, role }) {
  const { visites28j, vuesPoi28j, delta, deltaVues } = stat
  return (
    <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.bordure}`, background: C.blanc }}>
      <div style={{ width: 380, flexShrink: 0, borderRight: `1px solid ${C.bordure}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <MiniPhoto eglise={eglise} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{eglise.nom}</div>
          <div style={{ fontSize: 12, color: C.texteSecondaire, marginTop: 2 }}>{eglise.ville} · {eglise.type}</div>
          {(eglise.dioceses?.nom || eglise.clients?.dioceses?.nom) && (
            <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 1 }}>{eglise.dioceses?.nom || eglise.clients?.dioceses?.nom}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
          <BadgeStatut statut={eglise.statut} />
          <ActionBar eglise={eglise} onEditer={e => { e.stopPropagation(); onEditer() }} onChangerStatut={onChangerStatut} role={role} />
        </div>
      </div>
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
    <img src={eglise.photo_facade} alt={eglise.nom} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
      {TYPE_ICONE[eglise.type] || '⛪'}
    </div>
  )
}

function LigneEglise({ eglise, selectionnee, onSelectionner, onEditer, onChangerStatut, role }) {
  return (
    <div
      onClick={onSelectionner}
      style={{
        padding: '12px 16px', borderBottom: `1px solid ${C.bordure}`,
        background: selectionnee ? '#F0FDF4' : C.blanc,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      <MiniPhoto eglise={eglise} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{eglise.nom}</div>
        <div style={{ fontSize: 12, color: C.texteSecondaire, marginTop: 2 }}>{eglise.ville} · {eglise.type}</div>
        {eglise.clients?.dioceses?.nom && (
          <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 1 }}>{eglise.clients.dioceses.nom}</div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <BadgeStatut statut={eglise.statut} />
        <ActionBar eglise={eglise} onEditer={e => { e.stopPropagation(); onEditer() }} onChangerStatut={onChangerStatut} role={role} />
      </div>
    </div>
  )
}

function ActionBar({ eglise, onEditer, onChangerStatut, role }) {
  const peutPublier  = ['super_admin', 'editeur_1visible', 'admin_client'].includes(role)
  const peutPause    = role === 'super_admin'
  const peutArchiver = ['super_admin', 'editeur_1visible', 'admin_client'].includes(role)

  async function handleArchiver(e) {
    e.stopPropagation()
    if (!window.confirm(`Archiver « ${eglise.nom} » ?\nL'église ne sera plus visible mais reste restaurable par un administrateur.`)) return
    onChangerStatut(eglise.id, 'archivé')
  }

  async function handleTogglePause(e) {
    e.stopPropagation()
    const cible = eglise.statut === 'pause' ? 'publié' : 'pause'
    onChangerStatut(eglise.id, cible)
  }

  async function handleTogglePublier(e) {
    e.stopPropagation()
    const cible = eglise.statut === 'publié' ? 'brouillon' : 'publié'
    onChangerStatut(eglise.id, cible)
  }

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {/* Inspecter */}
      <BoutonAction onClick={onEditer} title="Modifier" color={C.primaire}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </BoutonAction>

      {/* Publier / Dépublier */}
      {peutPublier && eglise.statut !== 'pause' && (
        <BoutonAction
          onClick={handleTogglePublier}
          title={eglise.statut === 'publié' ? 'Dépublier' : 'Publier'}
          color={eglise.statut === 'publié' ? C.orange : C.vert}
        >
          {eglise.statut === 'publié' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          )}
        </BoutonAction>
      )}

      {/* Pause / Réactiver (super_admin) */}
      {peutPause && (eglise.statut === 'publié' || eglise.statut === 'pause') && (
        <BoutonAction
          onClick={handleTogglePause}
          title={eglise.statut === 'pause' ? 'Réactiver' : 'Mettre en pause'}
          color={C.bleu}
        >
          {eglise.statut === 'pause' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          )}
        </BoutonAction>
      )}

      {/* Archiver */}
      {peutArchiver && (
        <BoutonAction onClick={handleArchiver} title="Archiver" color="#6B7280">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
        </BoutonAction>
      )}
    </div>
  )
}

function BoutonAction({ onClick, title, color, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'none', border: 'none', padding: 0,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: '50%', color,
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  )
}

// ==============================================================================
// VUE CLIENTS
// ==============================================================================

const TYPE_CLIENT_LABEL = {
  diocese:    'Diocèse',
  paroisse:   'Paroisse',
  sanctuaire: 'Sanctuaire',
  autre:      'Autre',
}

const BADGE_STATUT_CLIENT = {
  actif:    { bg: '#D1FAE5', color: '#059669', label: 'Actif' },
  pause:    { bg: '#DBEAFE', color: '#2563EB', label: 'En pause' },
  résilié:  { bg: '#F3F4F6', color: '#6B7280', label: 'Résilié' },
}

function VueClients({ role }) {
  const [clients, setClients]             = useState([])
  const [dioceses, setDioceses]           = useState([])
  const [chargement, setChargement]       = useState(true)
  const [erreur, setErreur]               = useState(null)
  const [clientEnEdition, setClientEnEdition] = useState(null)
  const [filtreDiocese, setFiltreDiocese] = useState('')

  const clientsFiltres = filtreDiocese
    ? clients.filter(c => c.dioceses?.nom === filtreDiocese)
    : clients

  useEffect(() => { charger() }, [])

  async function charger() {
    setChargement(true)
    const [{ data: cls, error: cErr }, { data: diocs }] = await Promise.all([
      supabase.from('clients').select('id, nom, type, statut, diocese_id, email_contact, telephone, dioceses(nom)').order('nom'),
      supabase.from('dioceses').select('id, nom, region').order('region, nom'),
    ])
    if (cErr) { setErreur(cErr.message); setChargement(false); return }
    setClients(cls || [])
    setDioceses(diocs || [])
    setChargement(false)
  }

  async function handleSauvegarder(donnees, id) {
    const { error } = id
      ? await supabase.from('clients').update(donnees).eq('id', id)
      : await supabase.from('clients').insert(donnees)
    if (error) return error.message
    await charger()
    return null
  }

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Barre */}
      <div style={{ padding: '12px 24px', borderBottom: `1px solid ${C.bordure}`, background: C.blanc, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: C.texteSecondaire, marginRight: 'auto' }}>
          {chargement ? 'Chargement…' : `${clientsFiltres.length} client${clientsFiltres.length > 1 ? 's' : ''}`}
        </span>
        <select value={filtreDiocese} onChange={e => setFiltreDiocese(e.target.value)} style={S_FILTRE}>
          <option value="">Tous les diocèses</option>
          {dioceses.map(d => <option key={d.id} value={d.nom}>{d.nom}</option>)}
        </select>
        <button
          onClick={() => setClientEnEdition({})}
          style={{ background: C.primaire, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + Nouveau client
        </button>
      </div>

      {/* Liste */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {erreur && <div style={{ padding: 16, color: C.rouge, fontSize: 13 }}>{erreur}</div>}
        {!chargement && clientsFiltres.map(client => {
          const badge = BADGE_STATUT_CLIENT[client.statut] || BADGE_STATUT_CLIENT.actif
          return (
            <div key={client.id} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '14px 24px', borderBottom: `1px solid ${C.bordure}`,
              background: C.blanc,
            }}>
              {/* Icone type */}
              <div style={{
                width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>
                {client.type === 'diocese' ? '⛪' : client.type === 'sanctuaire' ? '🕍' : client.type === 'paroisse' ? '✝' : '🏢'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{client.nom}</div>
                <div style={{ fontSize: 12, color: C.texteSecondaire, marginTop: 2 }}>
                  {TYPE_CLIENT_LABEL[client.type] ?? client.type}
                  {client.dioceses?.nom && ` · ${client.dioceses.nom}`}
                </div>
              </div>

              {client.email_contact && (
                <span style={{ fontSize: 12, color: C.texteSecondaire }}>{client.email_contact}</span>
              )}

              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: badge.bg, color: badge.color }}>
                {badge.label}
              </span>

              <button
                onClick={() => setClientEnEdition(client)}
                title="Modifier"
                style={{ background: 'none', border: `1px solid ${C.bordure}`, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: '#374151' }}
              >
                Modifier
              </button>
            </div>
          )
        })}
        {!chargement && clientsFiltres.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center', color: C.texteSecondaire, fontSize: 14 }}>
            {filtreDiocese ? 'Aucun client pour ce diocèse.' : 'Aucun client — créez le premier avec "+ Nouveau client"'}
          </div>
        )}
      </div>

      {clientEnEdition !== null && (
        <ModalClient
          client={clientEnEdition}
          dioceses={dioceses}
          role={role}
          onFermer={() => setClientEnEdition(null)}
          onSauvegarder={handleSauvegarder}
        />
      )}
    </div>
  )
}

// ==============================================================================
// MODAL CLIENT
// ==============================================================================

function ModalClient({ client, dioceses, role, onFermer, onSauvegarder }) {
  const estNouveau = !client.id
  const [nom, setNom]           = useState(client.nom ?? '')
  const [type, setType]         = useState(client.type ?? 'paroisse')
  const [dioceseId, setDioceseId] = useState(client.diocese_id ?? '')
  const [statut, setStatut]     = useState(client.statut ?? 'actif')
  const [email, setEmail]       = useState(client.email_contact ?? '')
  const [telephone, setTelephone] = useState(client.telephone ?? '')
  const [adresse, setAdresse]   = useState(client.adresse ?? '')
  const [envoi, setEnvoi]       = useState(false)
  const [erreur, setErreur]     = useState(null)

  // Grouper les diocèses par région pour le select
  const diocesesParRegion = dioceses.reduce((acc, d) => {
    if (!acc[d.region]) acc[d.region] = []
    acc[d.region].push(d)
    return acc
  }, {})

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nom.trim()) { setErreur('Le nom est requis.'); return }
    setErreur(null)
    setEnvoi(true)
    const err = await onSauvegarder({
      nom: nom.trim(),
      type,
      diocese_id: dioceseId ? Number(dioceseId) : null,
      statut,
      email_contact: email.trim() || null,
      telephone: telephone.trim() || null,
      adresse: adresse.trim() || null,
    }, client.id)
    setEnvoi(false)
    if (err) { setErreur(err); return }
    onFermer()
  }

  const champStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.bordure}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: '100%', maxWidth: 480, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 20 }}>
          {estNouveau ? 'Nouveau client' : `Modifier — ${client.nom}`}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Nom *</label>
            <input value={nom} onChange={e => setNom(e.target.value)} required placeholder="Ex : Diocèse de Besançon" style={champStyle} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Type *</label>
              <select value={type} onChange={e => setType(e.target.value)} style={champStyle}>
                <option value="diocese">Diocèse</option>
                <option value="paroisse">Paroisse</option>
                <option value="sanctuaire">Sanctuaire</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Statut</label>
              <select value={statut} onChange={e => setStatut(e.target.value)} style={champStyle}>
                <option value="actif">Actif</option>
                <option value="pause">En pause</option>
                {!estNouveau && <option value="résilié">Résilié</option>}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Diocèse de rattachement</label>
            <select value={dioceseId} onChange={e => setDioceseId(e.target.value)} style={champStyle}>
              <option value="">— Aucun —</option>
              {Object.entries(diocesesParRegion).sort(([a], [b]) => a.localeCompare(b, 'fr')).map(([region, diocs]) => (
                <optgroup key={region} label={region}>
                  {diocs.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Email de contact</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@diocese.fr" style={champStyle} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Téléphone</label>
              <input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="03 81 XX XX XX" style={champStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Adresse</label>
            <input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="1 rue de l'Église, 25000 Besançon" style={champStyle} />
          </div>

          {erreur && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: C.rouge, fontSize: 13, border: '1px solid #FECACA' }}>
              {erreur}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onFermer} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${C.bordure}`, background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
              Annuler
            </button>
            <button type="submit" disabled={envoi} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: envoi ? '#9CA3AF' : C.primaire, color: '#fff', fontSize: 14, fontWeight: 600, cursor: envoi ? 'wait' : 'pointer' }}>
              {envoi ? 'Enregistrement…' : estNouveau ? 'Créer le client' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ==============================================================================
// VUE ÉQUIPE
// ==============================================================================

const ROLES_INVITABLES = {
  super_admin:      ['super_admin', 'editeur_1visible', 'admin_client', 'editeur_client'],
  editeur_1visible: ['admin_client', 'editeur_client'],
  admin_client:     ['admin_client', 'editeur_client'],
}

const LABEL_ROLE = {
  super_admin:      'Super admin',
  editeur_1visible: 'Éditeur 1visible',
  admin_client:     'Admin client',
  editeur_client:   'Éditeur',
}

function VueEquipe({ role }) {
  const { clientId } = useAuth()
  const [utilisateurs, setUtilisateurs] = useState([])
  const [clients, setClients]           = useState([])
  const [dioceses, setDioceses]         = useState([])
  const [chargement, setChargement]     = useState(true)
  const [erreur, setErreur]             = useState(null)
  const [modal, setModal]               = useState(false)
  const [filtreDiocese, setFiltreDiocese] = useState('')
  const [filtreClient, setFiltreClient]   = useState('')

  useEffect(() => { charger() }, [])

  async function charger() {
    setChargement(true)
    const [{ data: users, error: uErr }, { data: cls }, { data: diocs }] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('user_id, prenom, nom, role, client_id, actif, cgu_accepte, clients(nom, diocese_id)')
        .order('nom'),
      ['super_admin', 'editeur_1visible'].includes(role)
        ? supabase.from('clients').select('id, nom, diocese_id').eq('statut', 'actif').order('nom')
        : Promise.resolve({ data: [] }),
      ['super_admin', 'editeur_1visible'].includes(role)
        ? supabase.from('dioceses').select('id, nom').order('nom')
        : Promise.resolve({ data: [] }),
    ])
    if (uErr) { setErreur(uErr.message); setChargement(false); return }
    setUtilisateurs(users || [])
    setClients(cls || [])
    setDioceses(diocs || [])
    setChargement(false)
  }

  const clientsFiltresDiocese = filtreDiocese
    ? clients.filter(c => c.diocese_id === Number(filtreDiocese))
    : clients
  const clientIdsValides = new Set(clientsFiltresDiocese.map(c => c.id))

  const utilisateursFiltres = utilisateurs
    .filter(u => !filtreDiocese || u.client_id == null || clientIdsValides.has(u.client_id))
    .filter(u => !filtreClient  || String(u.client_id) === filtreClient)

  async function handleDesactiver(userId, nomComplet) {
    if (!window.confirm(`Désactiver ${nomComplet} ?\nCet utilisateur ne pourra plus se connecter.`)) return
    const { error } = await supabase.rpc('desactiver_utilisateur', { p_user_id: userId })
    if (error) { alert('Erreur : ' + error.message); return }
    setUtilisateurs(prev => prev.map(u => u.user_id === userId ? { ...u, actif: false } : u))
  }

  async function handleRenvoyer(userId) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        resend: true,
        user_id: userId,
        redirect_to: `${window.location.origin}/bo/invite`,
      }),
    })
    const json = await res.json()
    if (!json.ok) { alert('Erreur : ' + json.error); return }
    alert('Invitation renvoyée.')
  }

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Barre */}
      <div style={{ padding: '12px 24px', borderBottom: `1px solid ${C.bordure}`, background: C.blanc, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: C.texteSecondaire, marginRight: 'auto' }}>
          {chargement ? 'Chargement…' : `${utilisateursFiltres.length} utilisateur${utilisateursFiltres.length > 1 ? 's' : ''}`}
        </span>
        {['super_admin', 'editeur_1visible'].includes(role) && (<>
          <select value={filtreDiocese} onChange={e => { setFiltreDiocese(e.target.value); setFiltreClient('') }} style={S_FILTRE}>
            <option value="">Tous les diocèses</option>
            {dioceses.map(d => <option key={d.id} value={String(d.id)}>{d.nom}</option>)}
          </select>
          <select value={filtreClient} onChange={e => setFiltreClient(e.target.value)} style={S_FILTRE}>
            <option value="">Tous les clients</option>
            {clientsFiltresDiocese.map(c => <option key={c.id} value={String(c.id)}>{c.nom}</option>)}
          </select>
        </>)}
        <button
          onClick={() => setModal(true)}
          style={{ background: C.primaire, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + Inviter
        </button>
      </div>

      {/* Liste */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px' }}>
        {erreur && <div style={{ color: C.rouge, padding: 16, fontSize: 13 }}>{erreur}</div>}
        {!chargement && utilisateursFiltres.map(u => {
          const nomComplet = [u.prenom, u.nom].filter(Boolean).join(' ') || '—'
          const badge = BADGE_ROLE[u.role] || BADGE_ROLE['editeur_client']
          return (
            <div key={u.user_id} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '12px 0', borderBottom: `1px solid ${C.bordure}`,
              opacity: u.actif ? 1 : 0.45,
            }}>
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: badge.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: badge.color,
              }}>
                {(u.prenom?.[0] ?? u.nom?.[0] ?? '?').toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{nomComplet}</div>
                {u.clients?.nom && (
                  <div style={{ fontSize: 12, color: C.texteSecondaire, marginTop: 1 }}>{u.clients.nom}</div>
                )}
              </div>

              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                background: badge.bg, color: badge.color,
              }}>
                {LABEL_ROLE[u.role] ?? u.role}
              </span>

              {u.actif
                ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: C.vertClair, color: C.vert, fontWeight: 600 }}>Actif</span>
                : !u.cgu_accepte
                  ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: C.orangeClair, color: C.orange, fontWeight: 600 }}>Invitation envoyée</span>
                  : <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#F3F4F6', color: '#6B7280', fontWeight: 600 }}>Désactivé</span>
              }

              {!u.actif && !u.cgu_accepte && (
                <button
                  onClick={() => handleRenvoyer(u.user_id)}
                  title="Renvoyer l'invitation"
                  style={{ background: 'none', border: `1px solid ${C.bordure}`, borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', color: C.orange }}
                >
                  Renvoyer
                </button>
              )}
              {u.actif && (
                <button
                  onClick={() => handleDesactiver(u.user_id, nomComplet)}
                  title="Désactiver"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {modal && (
        <ModalInvitation
          role={role}
          clientId={clientId}
          clients={clients}
          onFermer={() => setModal(false)}
          onSuccess={() => { setModal(false); charger() }}
        />
      )}
    </div>
  )
}

// ==============================================================================
// MODAL INVITATION
// ==============================================================================

function ModalInvitation({ role, clientId, clients, onFermer, onSuccess }) {
  const [email, setEmail]       = useState('')
  const [prenom, setPrenom]     = useState('')
  const [nom, setNom]           = useState('')
  const [roleInvite, setRoleInvite] = useState(ROLES_INVITABLES[role]?.[0] ?? 'editeur_client')
  const [clientCible, setClientCible] = useState(clientId ?? '')
  const [envoi, setEnvoi]       = useState(false)
  const [erreur, setErreur]     = useState(null)

  const rolesDisponibles = ROLES_INVITABLES[role] ?? []
  const ROLES_CLIENT = ['admin_client', 'editeur_client']
  const besoinClient = ROLES_CLIENT.includes(roleInvite)

  async function handleSubmit(e) {
    e.preventDefault()
    setErreur(null)
    if (besoinClient && !clientCible) { setErreur('Sélectionnez un client.'); return }

    setEnvoi(true)
    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/invite-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          email,
          role: roleInvite,
          client_id: besoinClient ? Number(clientCible) : undefined,
          prenom: prenom || undefined,
          nom: nom || undefined,
          redirect_to: `${window.location.origin}/bo/invite`,
        }),
      }
    )
    const json = await res.json()
    setEnvoi(false)

    if (!json.ok) { setErreur(json.error); return }
    onSuccess()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 32, width: '100%', maxWidth: 440,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 20 }}>Inviter un utilisateur</div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Champ label="Prénom" value={prenom} onChange={setPrenom} placeholder="Marie" />
            <Champ label="Nom" value={nom} onChange={setNom} placeholder="Dupont" />
          </div>

          <Champ label="Email *" value={email} onChange={setEmail} type="email" placeholder="marie@paroisse.fr" required />

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Rôle *</label>
            <select
              value={roleInvite}
              onChange={e => setRoleInvite(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.bordure}`, fontSize: 14, background: '#fff', outline: 'none' }}
            >
              {rolesDisponibles.map(r => (
                <option key={r} value={r}>{LABEL_ROLE[r]}</option>
              ))}
            </select>
          </div>

          {besoinClient && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Client *</label>
              {role === 'super_admin' ? (
                <select
                  value={clientCible}
                  onChange={e => setClientCible(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.bordure}`, fontSize: 14, background: '#fff', outline: 'none' }}
                >
                  <option value="">— Sélectionner —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              ) : (
                <input
                  value={clients.find(c => c.id === clientId)?.nom ?? `Client #${clientId}`}
                  disabled
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.bordure}`, fontSize: 14, background: C.bg, boxSizing: 'border-box' }}
                />
              )}
            </div>
          )}

          {erreur && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: C.rouge, fontSize: 13, border: '1px solid #FECACA' }}>
              {erreur}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={onFermer}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${C.bordure}`, background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={envoi}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: envoi ? '#9CA3AF' : C.primaire, color: '#fff', fontSize: 14, fontWeight: 600, cursor: envoi ? 'wait' : 'pointer' }}
            >
              {envoi ? 'Envoi…' : 'Envoyer l\'invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Champ({ label, value, onChange, type = 'text', placeholder, required }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.bordure}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  )
}
