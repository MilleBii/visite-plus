import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import OngletPlan from './OngletPlan'

const C = {
  primaire: '#1B4332',
  bg: '#F5F5F4',
  bordure: '#E7E5E4',
  texteSecondaire: '#78716C',
  blanc: '#FFFFFF',
  danger: '#DC2626',
  succes: '#059669',
}

const ONGLETS = [
  { id: 'informations', label: 'Informations' },
  { id: 'plan', label: 'Plan & POI' },
  { id: 'statistiques', label: 'Statistiques' },
  { id: 'evenements', label: 'Événements' },
  { id: 'qrcode', label: 'QR Code' },
]

const STATS_RANGES = {
  '24h': { label: '24h', hours: 24, granularity: 'hour' },
  '7j': { label: '7 jours', hours: 24 * 7, granularity: 'hour' },
  '30j': { label: '30 jours', hours: 24 * 30, granularity: 'day' },
  '90j': { label: '90 jours', hours: 24 * 90, granularity: 'day' },
}

function slotKey(dateValue, granularity) {
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return 'invalide'
  if (granularity === 'hour') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function EditeurEglise({ egliseId, onRetour }) {
  const [onglet, setOnglet] = useState('informations')
  const [recherche, setRecherche] = useState('')
  const [resultats, setResultats] = useState([])
  const [rechercheActive, setRechercheActive] = useState(false)
  const [resultatsExternes, setResultatsExternes] = useState([])
  const [rechercheExterneActive, setRechercheExterneActive] = useState(false)
  const [egliseSelectionnee, setEgliseSelectionnee] = useState(egliseId || null)

  useEffect(() => {
    const root = document.getElementById('root')
    const prev = root.style.maxWidth
    root.style.maxWidth = 'none'
    return () => { root.style.maxWidth = prev }
  }, [])
  const [chargement, setChargement] = useState(true)
  const [sauvegarde, setSauvegarde] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [succes, setSucces] = useState(false)
  const [recherchePhoto, setRecherchePhoto] = useState(false)
  const [statsRange, setStatsRange] = useState('30j')
  const [stats, setStats] = useState({
    pois: 0,
    evenements: 0,
    poiIndex: {},
    chargement: false,
    indisponible: false,
    viewsEglise: 0,
    viewsPoi: 0,
    serie: [],
    topPois: [],
  })

  const [form, setForm] = useState({
    nom: '',
    type: 'église',
    ville: '',
    lat: '',
    lon: '',
    message_bienvenue: 'Croyant ou non, bienvenue dans cette église !',
    photo_facade: '',
    google_calendar_id: '',
    slug: '',
    statut: 'brouillon',
  })


  useEffect(() => {
    if (egliseSelectionnee) chargerEglise(egliseSelectionnee)
    else setChargement(false)
  }, [egliseSelectionnee])

  // Recherche dynamique interne (Supabase)
  useEffect(() => {
    if (recherche.length < 2) {
      setResultats([])
      setResultatsExternes([])
      return
    }
    let actif = true
    setRechercheActive(true)
    supabase
      .from('eglises')
      .select('id, nom, ville')
      .ilike('nom', `%${recherche}%`)
      .order('nom')
      .then(({ data }) => {
        if (actif) setResultats(data || [])
      })
      .finally(() => { if (actif) setRechercheActive(false) })

    // Recherche externe (Wikidata/Wikipedia)
    setRechercheExterneActive(true)
    fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(recherche)}&language=fr&type=item&format=json&origin=*`)
      .then(r => r.json())
      .then(json => {
        if (!actif) return
        const ids = (json.search || []).map(e => e.id)
        if (ids.length === 0) { setResultatsExternes([]); setRechercheExterneActive(false); return }
        // Pour chaque résultat, récupérer les infos détaillées
        fetch(`https://www.wikidata.org/wiki/Special:EntityData/${ids[0]}.json`)
          .then(r2 => r2.json())
          .then(data => {
            if (!actif) return
            // On ne prend que le premier résultat pour simplicité
            const entity = data.entities[ids[0]]
            // Extraction des infos utiles
            const label = entity.labels?.fr?.value || entity.labels?.en?.value || ''
            const ville = entity.claims?.P131?.[0]?.mainsnak?.datavalue?.value?.id || ''
            const coord = entity.claims?.P625?.[0]?.mainsnak?.datavalue?.value || null
            const image = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value || ''
            setResultatsExternes([{
              id: ids[0],
              nom: label,
              ville,
              coord,
              image,
              url: `https://www.wikidata.org/wiki/${ids[0]}`
            }])
            setRechercheExterneActive(false)
          })
          .catch(() => { setResultatsExternes([]); setRechercheExterneActive(false) })
      })
      .catch(() => { setResultatsExternes([]); setRechercheExterneActive(false) })
    return () => { actif = false }
  }, [recherche])

  useEffect(() => {
    if (onglet !== 'statistiques' || !egliseId) return
    chargerStats(statsRange)
  }, [onglet, egliseId, statsRange])

  async function chargerEglise(id) {
    setChargement(true)
    const [{ data, error }, { data: poisRows, error: poisErr }, { count: eventsCount }] = await Promise.all([
      supabase
        .from('eglises')
        .select('*')
        .eq('id', id)
        .single(),
      supabase
        .from('pois')
        .select('id, titre')
        .eq('eglise_id', id),
      supabase
        .from('evenements')
        .select('id', { count: 'exact', head: true })
        .eq('eglise_id', id),
    ])

    if (error) {
      setErreur(error.message)
    } else if (data) {
      setForm({
        nom: data.nom || '',
        type: data.type || 'église',
        ville: data.ville || '',
        lat: data.position?.[0] ?? '',
        lon: data.position?.[1] ?? '',
        message_bienvenue: data.message_bienvenue || '',
        photo_facade: data.photo_facade || '',
        google_calendar_id: data.google_calendar_id || '',
        slug: data.slug || '',
        statut: data.statut || 'brouillon',
      })

      const poisList = Array.isArray(poisRows) && !poisErr ? poisRows : []
      const poiIndex = Object.fromEntries(poisList.map(p => [String(p.id), p.titre || `POI ${p.id}`]))
      setStats(prev => ({
        ...prev,
        pois: poisList.length,
        evenements: eventsCount || 0,
        poiIndex,
        chargement: false,
      }))
    }
    setChargement(false)
  }

  async function chargerStats(rangeKey) {
    const range = STATS_RANGES[rangeKey] || STATS_RANGES['30j']
    const since = new Date(Date.now() - range.hours * 60 * 60 * 1000).toISOString()

    setStats(prev => ({ ...prev, chargement: true }))

    const poiIds = Object.keys(stats.poiIndex)
    const [egliseStatsRes, poiStatsRes] = await Promise.all([
      supabase
        .from('stats_vues')
        .select('slot, count')
        .eq('entite_type', 'eglise')
        .eq('entite_id', egliseId)
        .gte('slot', since)
        .order('slot', { ascending: true }),
      poiIds.length
        ? supabase
          .from('stats_vues')
          .select('entite_id, count')
          .eq('entite_type', 'poi')
          .in('entite_id', poiIds)
          .gte('slot', since)
        : Promise.resolve({ data: [], error: null }),
    ])

    const statsError = egliseStatsRes.error || poiStatsRes.error
    if (statsError) {
      const msg = (statsError.message || '').toLowerCase()
      if (msg.includes('stats_vues') || msg.includes('does not exist') || msg.includes('relation')) {
        setStats(prev => ({
          ...prev,
          chargement: false,
          indisponible: true,
          viewsEglise: 0,
          viewsPoi: 0,
          serie: [],
          topPois: [],
        }))
        return
      }
      setErreur(statsError.message)
      setStats(prev => ({ ...prev, chargement: false }))
      return
    }

    const egliseRows = egliseStatsRes.data || []
    const poiRows = poiStatsRes.data || []

    const grouped = new Map()
    for (const row of egliseRows) {
      const key = slotKey(row.slot, range.granularity)
      grouped.set(key, (grouped.get(key) || 0) + (row.count || 0))
    }

    const serie = Array.from(grouped.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label))

    const topMap = new Map()
    for (const row of poiRows) {
      const id = String(row.entite_id)
      topMap.set(id, (topMap.get(id) || 0) + (row.count || 0))
    }

    const topPois = Array.from(topMap.entries())
      .map(([id, value]) => ({ id, titre: stats.poiIndex[id] || `POI ${id}`, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)

    setStats(prev => ({
      ...prev,
      chargement: false,
      indisponible: false,
      viewsEglise: egliseRows.reduce((s, r) => s + (r.count || 0), 0),
      viewsPoi: poiRows.reduce((s, r) => s + (r.count || 0), 0),
      serie,
      topPois,
    }))
  }

  function champ(cle, valeur) {
    setForm(f => ({ ...f, [cle]: valeur }))
  }

  async function sauvegarder(publier = false) {
    setSauvegarde(true)
    setErreur(null)
    const donnees = {
      nom: form.nom,
      type: form.type,
      ville: form.ville,
      position: [parseFloat(form.lat), parseFloat(form.lon)],
      message_bienvenue: form.message_bienvenue,
      photo_facade: form.photo_facade,
      google_calendar_id: form.google_calendar_id,
      slug: form.slug,
      statut: publier ? 'publié' : form.statut,
    }

    const { error } = egliseId
      ? await supabase.from('eglises').update(donnees).eq('id', egliseId)
      : await supabase.from('eglises').insert(donnees)

    if (error) {
      setErreur(error.message)
    } else {
      if (publier) champ('statut', 'publié')
      setSucces(true)
      setTimeout(() => setSucces(false), 2500)
    }
    setSauvegarde(false)
  }

  async function rechercherPhotoWikimedia() {
    if (!form.nom && !form.ville) return
    setRecherchePhoto(true)
    try {
      const q = encodeURIComponent(`${form.nom} ${form.ville}`)
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&prop=imageinfo&iiprop=url&format=json&origin=*`
      const res = await fetch(url)
      const json = await res.json()
      const pages = Object.values(json?.query?.pages || {})
      const photo = pages.find(p => p.imageinfo?.[0]?.url)
      if (photo) {
        champ('photo_facade', photo.imageinfo[0].url)
      } else {
        setErreur('Aucune photo trouvée sur Wikimedia Commons pour cette église.')
        setTimeout(() => setErreur(null), 3000)
      }
    } catch {
      setErreur('Erreur lors de la recherche Wikimedia.')
    }
    setRecherchePhoto(false)
  }

  if (chargement) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg }}>
        <p style={{ color: C.texteSecondaire }}>Chargement…</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Barre de recherche d'église : visible uniquement si création */}
      {!egliseId && (
        <div style={{ background: C.blanc, borderBottom: `1px solid ${C.bordure}`, padding: '18px 24px 10px', display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
          <input
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher une église par nom..."
            style={{ width: 320, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.bordure}`, fontSize: 14, background: C.bg }}
          />
          {rechercheActive && <span style={{ fontSize: 13, color: C.texteSecondaire }}>Recherche locale…</span>}
          {rechercheExterneActive && <span style={{ fontSize: 13, color: C.texteSecondaire }}>Recherche internet…</span>}
          {(resultats.length > 0 || resultatsExternes.length > 0) && (
            <div style={{ background: C.bg, border: `1px solid ${C.bordure}`, borderRadius: 8, position: 'absolute', top: 44, left: 0, zIndex: 10, minWidth: 320, maxHeight: 260, overflowY: 'auto' }}>
              {resultats.map(e => (
                <div
                  key={e.id}
                  onClick={() => { setEgliseSelectionnee(e.id); setRecherche(''); setResultats([]); setResultatsExternes([]) }}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: `1px solid ${C.bordure}`, fontSize: 14, background: e.id === egliseSelectionnee ? C.primaire : 'inherit', color: e.id === egliseSelectionnee ? '#fff' : '#111827' }}
                >
                  {e.nom} <span style={{ color: C.texteSecondaire, fontSize: 12 }}>({e.ville})</span>
                </div>
              ))}
              {resultatsExternes.map(e => (
                <div
                  key={e.id}
                  onClick={() => {
                    setRecherche(''); setResultats([]); setResultatsExternes([]);
                    // Remplir le formulaire avec les infos externes
                    setForm(f => ({
                      ...f,
                      nom: e.nom || '',
                      ville: e.ville || '',
                      lat: e.coord ? e.coord.latitude : '',
                      lon: e.coord ? e.coord.longitude : '',
                      photo_facade: e.image ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(e.image)}` : '',
                    }))
                  }}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: `1px solid ${C.bordure}`, fontSize: 14, background: '#e0f2fe', color: '#111827' }}
                >
                  🌐 {e.nom} {e.ville && <span style={{ color: C.texteSecondaire, fontSize: 12 }}>({e.ville})</span>}
                  {e.image && <span style={{ marginLeft: 8, fontSize: 12, color: C.texteSecondaire }}>🖼️</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ background: C.primaire, color: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <button onClick={onRetour} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>←</button>
          <button onClick={onRetour} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14, padding: 0, textDecoration: 'underline' }}>Tableau de bord</button>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>/</span>
          <span style={{ fontWeight: 600 }}>{form.nom || 'Nouvelle église'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Badge statut={form.statut} />
          {succes && <span style={{ color: '#6EE7B7', fontSize: 13, fontWeight: 500 }}>✓ Enregistré</span>}
          {onglet === 'qrcode' && (
            <BoutonHeader onClick={() => window.print()} variante="secondaire">
              Imprimer
            </BoutonHeader>
          )}
          <BoutonHeader onClick={() => sauvegarder(false)} disabled={sauvegarde} variante="secondaire">
            Enregistrer
          </BoutonHeader>
          {form.statut !== 'publié' && (
            <BoutonHeader onClick={() => sauvegarder(true)} disabled={sauvegarde} variante="primaire">
              Publier
            </BoutonHeader>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div style={{ background: C.blanc, borderBottom: `1px solid ${C.bordure}`, display: 'flex', paddingLeft: 24, gap: 0 }}>
        {ONGLETS.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} style={{
            padding: '13px 18px',
            background: 'none', border: 'none',
            borderBottom: onglet === o.id ? `2px solid ${C.primaire}` : '2px solid transparent',
            color: onglet === o.id ? C.primaire : C.texteSecondaire,
            cursor: 'pointer',
            fontWeight: onglet === o.id ? 600 : 400,
            fontSize: 14,
            transition: 'color 0.15s',
          }}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Notifications */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        {erreur && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginTop: 16, color: C.danger, fontSize: 13 }}>
            {erreur}
          </div>
        )}
      </div>

      {/* Contenu */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 60px' }}>
        {onglet === 'informations' && (
          <OngletInformations
            form={form}
            onChange={champ}
            onRechercherPhoto={rechercherPhotoWikimedia}
            recherchePhoto={recherchePhoto}
          />
        )}
        {onglet === 'plan' && <OngletPlan egliseId={egliseId} />}
        {onglet === 'statistiques' && (
          <OngletStatistiques
            form={form}
            stats={stats}
            statsRange={statsRange}
            onChangeRange={setStatsRange}
          />
        )}
        {onglet === 'evenements' && (
          <OngletEvenements
            form={form}
            onChange={champ}
          />
        )}
        {onglet === 'qrcode' && (
          <OngletQRCode
            nom={form.nom}
            ville={form.ville}
            slug={form.slug}
            photoFacade={form.photo_facade}
            egliseId={egliseId}
          />
        )}
      </div>
    </div>
  )
}

// ─── Onglet Informations ──────────────────────────────────────────────────────

function OngletInformations({ form, onChange, onRechercherPhoto, recherchePhoto }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

      {/* Colonne gauche */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <Carte titre="Identité">
          <Champ label="Nom de l'église">
            <Input valeur={form.nom} onChange={v => onChange('nom', v)} placeholder="Ex : Église Saint-Sulpice" />
          </Champ>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Champ label="Type">
              <Select valeur={form.type} onChange={v => onChange('type', v)} options={[
                { value: 'église', label: 'Église' },
                { value: 'basilique', label: 'Basilique' },
                { value: 'sanctuaire', label: 'Sanctuaire' },
                { value: 'cathédrale', label: 'Cathédrale' },
              ]} />
            </Champ>
            <Champ label="Ville">
              <Input valeur={form.ville} onChange={v => onChange('ville', v)} placeholder="Ex : Paris" />
            </Champ>
          </div>
          <Champ label="Slug URL" hint={`visite-plus.fr/eglise/${form.slug || '{slug}'}`}>
            <Input valeur={form.slug} onChange={v => onChange('slug', v)} placeholder="ex : saint-sulpice-paris" />
          </Champ>
        </Carte>

        <Carte titre="Localisation">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Champ label="Latitude">
              <Input valeur={form.lat} onChange={v => onChange('lat', v)} placeholder="Ex : 48.8502" type="number" />
            </Champ>
            <Champ label="Longitude">
              <Input valeur={form.lon} onChange={v => onChange('lon', v)} placeholder="Ex : 2.3348" type="number" />
            </Champ>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>
            Les coordonnées GPS sont utilisées pour afficher l'église sur la carte et récupérer le plan OSM.
          </p>
        </Carte>

        <Carte titre="Contenu">
          <Champ label="Message de bienvenue">
            <Textarea valeur={form.message_bienvenue} onChange={v => onChange('message_bienvenue', v)} rows={3} />
          </Champ>
        </Carte>


      </div>

      {/* Colonne droite — Photo */}
      <div>
        <Carte titre="Photo de façade">
          <div style={{
            width: '100%', aspectRatio: '3/4',
            background: '#F3F4F6', borderRadius: 8,
            overflow: 'hidden', marginBottom: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {form.photo_facade
              ? <img src={form.photo_facade} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: '#9CA3AF', fontSize: 13 }}>Aucune photo</span>
            }
          </div>

          <button
            onClick={onRechercherPhoto}
            disabled={recherchePhoto}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 6,
              border: `1px solid ${C.bordure}`, background: C.blanc,
              cursor: recherchePhoto ? 'wait' : 'pointer',
              fontSize: 13, color: '#374151', marginBottom: 8,
              opacity: recherchePhoto ? 0.6 : 1,
            }}
          >
            {recherchePhoto ? 'Recherche en cours…' : '🔍 Rechercher sur Wikimedia Commons'}
          </button>

          <button style={{
            width: '100%', padding: '8px 0', borderRadius: 6,
            border: `1px solid ${C.bordure}`, background: C.blanc,
            cursor: 'pointer', fontSize: 13, color: '#374151',
          }}>
            ⬆️ Uploader une photo
          </button>

          {form.photo_facade && (
            <button
              onClick={() => onChange('photo_facade', '')}
              style={{
                width: '100%', padding: '8px 0', borderRadius: 6,
                border: `1px solid #FCA5A5`, background: '#FFF5F5',
                cursor: 'pointer', fontSize: 13, color: C.danger, marginTop: 8,
              }}
            >
              Supprimer la photo
            </button>
          )}
        </Carte>
      </div>

    </div>
  )
}

// ─── Stub onglets ─────────────────────────────────────────────────────────────

function OngletStub({ icone, label }) {
  return (
    <div style={{
      background: C.blanc, borderRadius: 10, border: `1px solid ${C.bordure}`,
      padding: 60, textAlign: 'center', color: C.texteSecondaire,
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icone}</div>
      <p style={{ margin: 0, fontWeight: 500 }}>{label} — à venir</p>
    </div>
  )
}

function OngletEvenements({ form, onChange }) {
  const calendarId = (form.google_calendar_id || '').trim();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Carte titre="Intégration Google Calendar">
        <Champ label="ID Google Calendar" hint="Calendrier public de l'église — pour la section « Au programme »">
          <Input
            valeur={form.google_calendar_id}
            onChange={v => onChange('google_calendar_id', v)}
            placeholder="Ex : abc123@group.calendar.google.com"
          />
        </Champ>
      </Carte>

      {!calendarId && (
        <div style={{
          background: C.blanc, borderRadius: 10, border: `1px solid ${C.bordure}`,
          padding: 40, textAlign: 'center', color: C.texteSecondaire,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>Aucun Google Calendar configuré</p>
          <p style={{ margin: '8px 0 16px', fontSize: 13 }}>
            Pour afficher les prochains événements ici, renseignez un ID Google Calendar public ci-dessus.
          </p>
        </div>
      )}

      {calendarId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            background: C.blanc, borderRadius: 10, border: `1px solid ${C.bordure}`,
            padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: '#111827', fontSize: 14 }}>Prochains événements</p>
              <p style={{ margin: '4px 0 0', color: C.texteSecondaire, fontSize: 12 }}>
                Source: Google Calendar ({calendarId})
              </p>
            </div>
            <a
              href={`https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarId)}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12, color: C.primaire, textDecoration: 'underline', whiteSpace: 'nowrap' }}
            >
              Ouvrir dans Google Calendar
            </a>
          </div>
          <div style={{
            background: C.blanc, borderRadius: 10, border: `1px solid ${C.bordure}`,
            overflow: 'hidden',
          }}>
            <iframe
              title="Agenda Google Calendar"
              src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&mode=AGENDA&showTitle=0&showDate=1&showNav=0&showPrint=0&showTz=0&showCalendars=0&hl=fr&wkst=2`}
              style={{ width: '100%', height: 640, border: 0, display: 'block' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function OngletStatistiques({ form, stats, statsRange, onChangeRange }) {
  const calendarConfigured = !!(form.google_calendar_id || '').trim()
  const publie = form.statut === 'publié'
  const maxValue = Math.max(...stats.serie.map(p => p.value), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
        <Carte>
          <p style={{ margin: 0, fontSize: 12, color: C.texteSecondaire }}>Vues église</p>
          <p style={{ margin: '8px 0 0', fontSize: 36, fontWeight: 700, color: '#111827' }}>{stats.viewsEglise}</p>
        </Carte>

        <Carte>
          <p style={{ margin: 0, fontSize: 12, color: C.texteSecondaire }}>Vues POI</p>
          <p style={{ margin: '8px 0 0', fontSize: 36, fontWeight: 700, color: '#111827' }}>{stats.viewsPoi}</p>
        </Carte>

        <Carte>
          <p style={{ margin: 0, fontSize: 12, color: C.texteSecondaire }}>Publication</p>
          <p style={{ margin: '12px 0 0', fontSize: 18, fontWeight: 700, color: publie ? '#059669' : '#D97706' }}>
            {publie ? 'Publié' : 'Brouillon'}
          </p>
        </Carte>

        <Carte>
          <p style={{ margin: 0, fontSize: 12, color: C.texteSecondaire }}>Google Calendar</p>
          <p style={{ margin: '12px 0 0', fontSize: 18, fontWeight: 700, color: calendarConfigured ? '#059669' : '#D97706' }}>
            {calendarConfigured ? 'Configuré' : 'À configurer'}
          </p>
        </Carte>
      </div>

      <Carte titre="Fréquentation">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <p style={{ margin: 0, color: C.texteSecondaire, fontSize: 12 }}>
            Courbe des vues d'église ({STATS_RANGES[statsRange]?.granularity === 'hour' ? 'granularité 1h' : 'granularité jour'})
          </p>
          <select
            value={statsRange}
            onChange={e => onChangeRange(e.target.value)}
            style={{ borderRadius: 6, border: `1px solid ${C.bordure}`, padding: '6px 10px', fontSize: 12 }}
          >
            {Object.entries(STATS_RANGES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {stats.chargement && <p style={{ margin: 0, color: C.texteSecondaire, fontSize: 12 }}>Chargement des statistiques...</p>}

        {!stats.chargement && stats.indisponible && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, padding: 12, fontSize: 12, color: '#92400E' }}>
            Table stats_vues introuvable. Les cartes techniques sont prêtes, mais il faut brancher l'endpoint POST /stats/view et la table d'agrégation.
          </div>
        )}

        {!stats.chargement && !stats.indisponible && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 180, borderBottom: `1px solid ${C.bordure}`, paddingBottom: 8 }}>
            {stats.serie.length === 0 && <p style={{ margin: 0, color: C.texteSecondaire, fontSize: 12 }}>Aucune vue sur la période.</p>}
            {stats.serie.map((point, idx) => (
              <div key={`${point.label}-${idx}`} title={`${point.label}: ${point.value}`} style={{ flex: 1, minWidth: 6, display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: '#1B4332', height: `${Math.max((point.value / maxValue) * 160, point.value > 0 ? 3 : 0)}px` }} />
              </div>
            ))}
          </div>
        )}
      </Carte>

      <Carte titre="POI les plus vus">
        {stats.chargement && <p style={{ margin: 0, color: C.texteSecondaire, fontSize: 12 }}>Chargement...</p>}
        {!stats.chargement && stats.topPois.length === 0 && (
          <p style={{ margin: 0, color: C.texteSecondaire, fontSize: 12 }}>Pas encore de données de consultation POI.</p>
        )}
        {!stats.chargement && stats.topPois.map((poi, index) => (
          <div key={poi.id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.texteSecondaire }}>#{index + 1}</span>
            <span style={{ fontSize: 13, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{poi.titre}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{poi.value} vues</span>
          </div>
        ))}
      </Carte>
    </div>
  )
}

function OngletQRCode({ nom, ville, slug, photoFacade, egliseId }) {
  const destination = slug
    ? `https://visite-plus.fr/eglise/${slug}`
    : `https://visite-plus.fr/eglise/${egliseId || ''}`
  const qrSrc = `https://quickchart.io/qr?size=700&margin=1&text=${encodeURIComponent(destination)}`

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .qrcode-print-root,
          .qrcode-print-root * {
            visibility: visible !important;
          }
          .qrcode-print-root {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            border: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      <div
        className="qrcode-print-root"
        style={{
          background: C.blanc,
          borderRadius: 12,
          border: `1px solid ${C.bordure}`,
          overflow: 'hidden',
          aspectRatio: '210 / 297',
          maxHeight: 'calc(100vh - 180px)',
          margin: '0 auto',
          position: 'relative',
          backgroundImage: photoFacade
            ? `linear-gradient(180deg, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0.68) 62%), url(${photoFacade})`
            : 'linear-gradient(165deg, #3f7c6b 0%, #20493d 45%, #122e26 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '42px 38px',
        }}
      >
        <div>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 16, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Visite +</p>
          <h2 style={{ margin: '10px 0 0', fontSize: 46, lineHeight: 1.05, maxWidth: 650 }}>
            {nom || 'Visite immersive'}
          </h2>
          {ville && <p style={{ margin: '10px 0 0', fontSize: 20, opacity: 0.9 }}>{ville}</p>}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <div style={{
            background: 'rgba(255,255,255,0.96)',
            color: '#1f2937',
            borderRadius: 18,
            padding: 16,
            boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
            width: 300,
            flexShrink: 0,
          }}>
            <img src={qrSrc} alt="QR Code Visite Plus" style={{ width: '100%', borderRadius: 10, display: 'block' }} />
            <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.35, color: '#4b5563' }}>
              Scannez pour ouvrir la visite sur mobile.
            </p>
          </div>

          <div style={{ textAlign: 'right', maxWidth: 440 }}>
            <p style={{ margin: 0, fontSize: 33, fontWeight: 700, lineHeight: 1.1 }}>
              Scannez et commencez la visite
            </p>
            <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 14, wordBreak: 'break-all' }}>{destination}</p>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Composants UI ────────────────────────────────────────────────────────────

function Carte({ titre, children }) {
  return (
    <div style={{ background: C.blanc, borderRadius: 10, border: `1px solid ${C.bordure}`, padding: 20 }}>
      {titre && <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{titre}</h3>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  )
}

function Champ({ label, hint, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <p style={{ margin: '4px 0 0', fontSize: 11, color: C.texteSecondaire }}>{hint}</p>}
    </div>
  )
}

function Input({ valeur, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={valeur}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '8px 10px', borderRadius: 6,
        border: `1px solid ${C.bordure}`, fontSize: 14,
        outline: 'none', boxSizing: 'border-box', color: '#111827',
      }}
    />
  )
}

function Textarea({ valeur, onChange, rows = 4 }) {
  return (
    <textarea
      value={valeur}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      style={{
        width: '100%', padding: '8px 10px', borderRadius: 6,
        border: `1px solid ${C.bordure}`, fontSize: 14,
        outline: 'none', resize: 'vertical',
        boxSizing: 'border-box', fontFamily: 'inherit', color: '#111827',
      }}
    />
  )
}

function Select({ valeur, onChange, options }) {
  return (
    <select
      value={valeur}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '8px 10px', borderRadius: 6,
        border: `1px solid ${C.bordure}`, fontSize: 14,
        outline: 'none', background: C.blanc, boxSizing: 'border-box', color: '#111827',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Badge({ statut }) {
  const publie = statut === 'publié'
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: publie ? '#D1FAE5' : '#FEF3C7',
      color: publie ? '#059669' : '#D97706',
    }}>
      {publie ? '● Publié' : '○ Brouillon'}
    </span>
  )
}

function BoutonHeader({ children, onClick, disabled, variante }) {
  const estPrimaire = variante === 'primaire'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
        cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.6 : 1,
        border: estPrimaire ? 'none' : '1px solid rgba(255,255,255,0.35)',
        background: estPrimaire ? C.blanc : 'transparent',
        color: estPrimaire ? C.primaire : C.blanc,
      }}
    >
      {children}
    </button>
  )
}
