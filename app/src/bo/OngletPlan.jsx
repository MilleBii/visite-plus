import { useState, useEffect, useRef } from 'react'
import { MapContainer, Marker, Pane, Polygon, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../supabaseClient'
import { typeConfig } from '../data/mockData'

const C = {
  primaire: '#1B4332',
  bordure: '#E7E5E4',
  bg: '#F5F5F4',
  texteSecondaire: '#78716C',
  blanc: '#FFFFFF',
}

const LANGUES = ['fr', 'en']
const POI_PHOTOS_BUCKET = 'poi-photos'

// ─── Curseur personnalisé ─────────────────────────────────────────────────────

function curseurActif(modePlacement, modeRotation) {
  if (modeRotation) return 'grab'
  if (!modePlacement) return 'default'
  const icon = typeConfig[modePlacement]?.icon || '📍'
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><text y='28' font-size='26'>${icon}</text></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 16 28, crosshair`
}

// ─── Conversion GPS → CRS.Simple ─────────────────────────────────────────────

function buildLocal(footprintGps, angleDeg) {
  const latC = footprintGps.reduce((s, p) => s + p[0], 0) / footprintGps.length
  const lonC = footprintGps.reduce((s, p) => s + p[1], 0) / footprintGps.length
  const cosLat = Math.cos(latC * Math.PI / 180)
  const a = angleDeg * Math.PI / 180
  const toLocal = ([lat, lon]) => {
    const x = (lon - lonC) * cosLat * 111320
    const y = (lat - latC) * 111320
    return [x * Math.sin(a) + y * Math.cos(a), x * Math.cos(a) - y * Math.sin(a)]
  }
  const footprint = footprintGps.map(toLocal)
  const bounds = [
    [Math.min(...footprint.map(p => p[0])), Math.min(...footprint.map(p => p[1]))],
    [Math.max(...footprint.map(p => p[0])), Math.max(...footprint.map(p => p[1]))],
  ]
  return { footprint, bounds, toLocal }
}

function centreBounds(bounds) {
  return [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
  ]
}

function rotationPoint(point, centre, angleDeg) {
  const a = angleDeg * Math.PI / 180
  const dy = point[0] - centre[0]
  const dx = point[1] - centre[1]
  return [
    centre[0] + (dy * Math.cos(a) - dx * Math.sin(a)),
    centre[1] + (dy * Math.sin(a) + dx * Math.cos(a)),
  ]
}

// ─── Icônes markers ───────────────────────────────────────────────────────────

function creerIcone(type, actif = false) {
  const cfg = typeConfig[type] || { icon: '📍', color: '#666' }
  return L.divIcon({
    className: '',
    html: `<div style="
      background: white; border: ${actif ? '3px' : '2.5px'} solid ${actif ? C.primaire : cfg.color};
      border-radius: 50%; width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,${actif ? '0.35' : '0.2'});
      transform: ${actif ? 'scale(1.2)' : 'scale(1)'};
    ">${cfg.icon}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

// ─── Gestionnaires carte ──────────────────────────────────────────────────────

function GestionnaireClic({ modePlacement, onClic }) {
  useMapEvents({
    click(e) {
      if (modePlacement) onClic([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

function GestionnaireCurseur({ modePlacement, modeRotation }) {
  const map = useMap()
  useEffect(() => {
    map.getContainer().style.cursor = curseurActif(modePlacement, modeRotation)
  }, [modePlacement, modeRotation, map])
  return null
}

function GestionnaireRotation({ modeRotation, onRotation }) {
  const map = useMap()

  useEffect(() => {
    if (modeRotation) map.scrollWheelZoom.disable()
    else map.scrollWheelZoom.enable()
  }, [modeRotation, map])

  useEffect(() => {
    if (!modeRotation) return
    const container = map.getContainer()
    function onWheel(e) {
      e.preventDefault()
      e.stopPropagation()
      onRotation(e.deltaY > 0 ? 1 : -1)
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [modeRotation, map, onRotation])

  return null
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function OngletPlan({ egliseId }) {
      // Ajout d'un POI sur clic carte
      async function surClicCarte(positionVue) {
        if (!modePlacement) return;
        const position = positionVersStockage(positionVue);
        const indexType = pois.filter(p => p.type === modePlacement).length + 1;
        const titreDefaut = `${typeConfig[modePlacement]?.label || 'POI'} ${indexType}`;
        const donnees = {
          eglise_id: egliseId,
          type: modePlacement,
          position,
          titre: titreDefaut,
          photo: '',
          texte_resume: '',
          texte_comprendre: '',
          texte_historique: '',
          texte_bible: '',
        };
        const { data, error } = await supabase.from('pois').insert(donnees).select().single();
        if (error || !data) {
          setErreur(error?.message || 'Impossible de créer le POI');
          return;
        }
        setPois(ps => [...ps, data]);
        setPoiActif(data);
        setFormPoi({ ...data });
      }
    function basculerModeRotation() {
      setModeRotation(m => !m)
    }
  // Chargement des données église + POI
  useEffect(() => {
    if (!egliseId) return;
    setChargement(true);
    setErreur(null);
    Promise.all([
      supabase.from('eglises').select('*').eq('id', egliseId).single(),
      supabase.from('pois').select('*').eq('eglise_id', egliseId)
    ]).then(([egliseRes, poisRes]) => {
      if (egliseRes.error) { setErreur(egliseRes.error.message); setChargement(false); return; }
      setEglise(egliseRes.data);
      // Correction : angle de rotation depuis la base
      const angleDb = egliseRes.data?.osm_rotation_angle ?? 0;
      setAngle(angleDb);
      setAngleSauvegarde(angleDb);
      if (poisRes.error) { setErreur(poisRes.error.message); setChargement(false); return; }
      setPois(poisRes.data || []);
      setChargement(false);
    });
  }, [egliseId]);

  // TOUS LES HOOKS D'ABORD !
  const [eglise, setEglise] = useState(null)
  const [pois, setPois] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)

  const [angle, setAngle] = useState(0)
  const [angleSauvegarde, setAngleSauvegarde] = useState(0)
  const [sauvegardeAngle, setSauvegardeAngle] = useState(false)
  const [modeRotation, setModeRotation] = useState(false)

  const [modePlacement, setModePlacement] = useState(null)
  const [poiActif, setPoiActif] = useState(null)
  const [langue, setLangue] = useState('fr')
  const [formPoi, setFormPoi] = useState(null)
  const [sauvegarde, setSauvegarde] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')

  const mapRef = useRef(null)
  const photoPreviewRef = useRef('')

  const [osmPropose, setOsmPropose] = useState(null)
  const [osmRecherche, setOsmRecherche] = useState(false)
  const [osmErreur, setOsmErreur] = useState(null)
  const [osmValide, setOsmValide] = useState(false)

  // ENSUITE SEULEMENT, LES RETOURS CONDITIONNELS
  if (!egliseId) {
    return <div style={{ padding: 32, textAlign: 'center', color: C.texteSecondaire, fontSize: 16 }}>
      Veuillez d'abord enregistrer l'église pour accéder au plan et aux POI.
    </div>;
  }

  if (chargement) return <Placeholder texte="Chargement du plan…" />
  if (erreur) return <Placeholder texte={`Erreur : ${erreur}`} erreur />

  const footprintGps = eglise?.osm_footprint_json ? JSON.parse(eglise.osm_footprint_json) : null
  if (!footprintGps) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ color: C.texteSecondaire, fontSize: 16 }}>Aucun plan OSM disponible pour cette église.</p>
        {osmErreur && <div style={{ color: C.danger, marginBottom: 12 }}>{osmErreur}</div>}
        {osmPropose && (
          <>
            <p style={{ color: C.primaire, fontWeight: 500 }}>Polygone trouvé sur OpenStreetMap&nbsp;:</p>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
              <svg width="320" height="220" viewBox="0 0 320 220" style={{ border: '1px solid #ccc', background: '#f8fafc' }}>
                {osmPropose.map((ring, i) => (
                  <polygon key={i} points={ring.map(([lat, lon]) => `${160 + (lon - osmPropose[0][0][1]) * 10000},${110 - (lat - osmPropose[0][0][0]) * 10000}`).join(' ')} fill="#1B4332" fillOpacity="0.2" stroke="#1B4332" strokeWidth="2" />
                ))}
              </svg>
            </div>
            <button onClick={async () => {
              setOsmValide(true)
              await supabase.from('eglises').update({ osm_footprint_json: JSON.stringify(osmPropose) }).eq('id', egliseId)
              window.location.reload()
            }} style={{ background: C.primaire, color: '#fff', border: 'none', borderRadius: 6, padding: '10px 22px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginRight: 12 }}>Valider et enregistrer</button>
            <button onClick={() => setOsmPropose(null)} style={{ background: '#fff', color: C.danger, border: `1px solid ${C.danger}`, borderRadius: 6, padding: '10px 22px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
          </>
        )}
        {!osmPropose && (
          <button
            onClick={async () => {
              setOsmRecherche(true); setOsmErreur(null)
              try {
                // Recherche OSM via Overpass
                const nom = eglise?.nom || ''
                const ville = eglise?.ville || ''
                const query = `[out:json][timeout:25];area["name"="${ville}"][admin_level=8];(way["building"]["name"~"${nom}"](area);relation["building"]["name"~"${nom}"](area););out geom;`;
                const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
                const res = await fetch(url)
                const json = await res.json()
                const poly = (json.elements.find(e => e.type === 'way' && e.geometry) || json.elements.find(e => e.type === 'relation' && e.members?.[0]?.geometry))
                let rings = []
                if (poly?.geometry) rings = [[...poly.geometry.map(pt => [pt.lat, pt.lon])]]
                else if (poly?.members) rings = poly.members.filter(m => m.geometry).map(m => m.geometry.map(pt => [pt.lat, pt.lon]))
                if (rings.length === 0) throw new Error('Aucun polygone trouvé sur OSM')
                setOsmPropose(rings)
              } catch (e) {
                setOsmErreur('Aucun polygone trouvé sur OpenStreetMap pour cette église.')
              }
              setOsmRecherche(false)
            }}
            disabled={osmRecherche}
            style={{ background: C.primaire, color: '#fff', border: 'none', borderRadius: 6, padding: '10px 22px', fontSize: 15, fontWeight: 600, cursor: osmRecherche ? 'wait' : 'pointer' }}
          >
            {osmRecherche ? 'Recherche en cours…' : 'Chercher le plan sur OpenStreetMap'}
          </button>
        )}
      </div>
    )
  }

  const { footprint, bounds } = buildLocal(footprintGps, angle)
  const { bounds: boundsSauvegardes } = buildLocal(footprintGps, angleSauvegarde)
  const centreRotation = centreBounds(boundsSauvegardes)
  const deltaAngle = angle - angleSauvegarde

  function positionVersVue(positionStockee) {
    return rotationPoint(positionStockee, centreRotation, -deltaAngle)
  }

  function positionVersStockage(positionVue) {
    return rotationPoint(positionVue, centreRotation, deltaAngle)
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 108px)', gap: 0, borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.bordure}` }}>

      {/* Carte */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* Barre de types */}
        <div style={{ background: C.blanc, borderBottom: `1px solid ${C.bordure}`, padding: '10px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(typeConfig).map(([type, cfg]) => (
            <button
              key={type}
              onClick={() => setModePlacement(modePlacement === type ? null : type)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                border: `1px solid ${modePlacement === type ? C.primaire : C.bordure}`,
                background: modePlacement === type ? '#F0FDF4' : C.blanc,
                color: modePlacement === type ? C.primaire : '#374151',
                cursor: 'pointer',
              }}
            >
              <span>{cfg.icon}</span>
              <span>+ {cfg.label}</span>
            </button>
          ))}
          {modePlacement && (
            <span style={{ alignSelf: 'center', fontSize: 12, color: C.primaire, fontStyle: 'italic' }}>
              Cliquez sur le plan pour placer le POI
            </span>
          )}
        </div>

        {/* Plan Leaflet */}
        <div style={{ flex: 1, position: 'relative' }}>

          {/* Rose des vents */}
          <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <RoseDesVents
              angle={angle}
              actif={modeRotation}
              onClick={basculerModeRotation}
            />
            <span style={{ fontSize: 10, color: modeRotation ? C.primaire : C.texteSecondaire, fontWeight: modeRotation ? 600 : 400, background: C.blanc, padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.bordure}` }}>
              {modeRotation ? '↕ molette = rotation' : `${((angle % 360) + 360) % 360}°`}
            </span>
            {angle !== angleSauvegarde && (
              <button onClick={sauvegarderAngle} disabled={sauvegardeAngle} style={{
                padding: '4px 10px', borderRadius: 6, border: 'none',
                background: C.primaire, color: '#fff', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', opacity: sauvegardeAngle ? 0.6 : 1,
              }}>
                {sauvegardeAngle ? '…' : '💾 Enregistrer'}
              </button>
            )}
          </div>

          <div style={{ height: '100%' }}>
          <MapContainer
            key={0}
            crs={L.CRS.Simple}
            bounds={bounds}
            boundsOptions={{ padding: [40, 40] }}
            maxZoom={10}
            zoomSnap={0.25}
            zoomDelta={0.25}
            wheelPxPerZoomLevel={320}
            wheelDebounceTime={120}
            style={{ height: '100%', width: '100%', background: '#F0EDE8' }}
            zoomControl={false}
            attributionControl={false}
            ref={mapRef}
          >
            <ZoomControl position="topleft" />
            <GestionnaireClic modePlacement={modePlacement} onClic={surClicCarte} />
            <GestionnaireCurseur modePlacement={modePlacement} modeRotation={modeRotation} />
            <BoutonAutoFit bounds={bounds} />
            <GestionnaireRotation
              modeRotation={modeRotation}
              onRotation={delta => setAngle(a => a + delta)}
            />
            <Pane name="planPane" style={{ zIndex: 300 }}>
              <Polygon
                positions={footprint}
                pathOptions={{ color: '#B7881C', weight: 2, fillColor: '#FEF3C7', fillOpacity: 0.6, interactive: false }}
              />
            </Pane>

            <Pane name="poiPane" style={{ zIndex: 650 }}>
              {pois.map(poi => (
                <Marker
                  key={poi.id}
                  pane="poiPane"
                  position={positionVersVue(poi.position)}
                  icon={creerIcone(poi.type, poiActif?.id === poi.id)}
                  draggable={true}
                  bubblingMouseEvents={false}
                  autoPan={false}
                  autoPanOnFocus={false}
                  eventHandlers={{
                    click: (e) => {
                      e.originalEvent?.stopPropagation?.()
                      surClicPoi(poi)
                    },
                    dragstart: () => mapRef.current?.dragging?.disable(),
                    dragend(e) {
                      mapRef.current?.dragging?.enable()
                      surDeplacement(poi, [e.target.getLatLng().lat, e.target.getLatLng().lng])
                    },
                  }}
                />
              ))}
            </Pane>
          </MapContainer>
          </div>

        </div>
      </div>

      {/* Panneau formulaire POI */}
      {formPoi ? (
        <div style={{ width: 320, flexShrink: 0, background: C.blanc, borderLeft: `1px solid ${C.bordure}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* En-tête panneau */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.bordure}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{typeConfig[formPoi.type]?.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                {formPoi._nouveau ? `Nouveau ${typeConfig[formPoi.type]?.label}` : (formPoi.titre || typeConfig[formPoi.type]?.label)}
              </span>
            </div>
            <button onClick={() => { setPoiActif(null); setFormPoi(null); resetUploadPhoto() }} style={{ background: C.bg, border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>

          {/* Sélecteur de langue */}
          <div style={{ padding: '10px 16px 0', display: 'flex', gap: 4 }}>
            {LANGUES.map(l => (
              <button key={l} onClick={() => setLangue(l)} style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: `1px solid ${langue === l ? C.primaire : C.bordure}`,
                background: langue === l ? '#F0FDF4' : C.blanc,
                color: langue === l ? C.primaire : C.texteSecondaire,
                cursor: 'pointer', textTransform: 'uppercase',
              }}>
                {l}
              </button>
            ))}
            {langue === 'en' && (
              <span style={{ alignSelf: 'center', fontSize: 11, color: C.texteSecondaire, marginLeft: 4, fontStyle: 'italic' }}>
                i18n à venir
              </span>
            )}
          </div>

          {/* Champs */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

            <ChampForm label="Titre">
              <input
                value={formPoi.titre}
                onChange={e => champForm('titre', e.target.value)}
                placeholder="Nom du POI"
                style={styleInput}
              />
            </ChampForm>

            <ChampForm label="Photo">
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (photoPreviewRef.current?.startsWith('blob:')) {
                    URL.revokeObjectURL(photoPreviewRef.current)
                  }
                  setPhotoFile(file)
                  setPhotoPreview(URL.createObjectURL(file))
                }}
                style={styleInput}
              />
              <p style={{ margin: '6px 0 0', fontSize: 11, color: C.texteSecondaire }}>
                L'image sera uploadée au clic sur Enregistrer.
              </p>
              {(photoPreview || formPoi.photo) && (
                <img src={photoPreview || formPoi.photo} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6, marginTop: 6 }} />
              )}
            </ChampForm>

            <ChampForm label="Résumé">
              <textarea value={formPoi.texte_resume} onChange={e => champForm('texte_resume', e.target.value)} rows={3} style={styleTextarea} />
            </ChampForm>

            <ChampForm label="Comprendre l'œuvre">
              <textarea value={formPoi.texte_comprendre} onChange={e => champForm('texte_comprendre', e.target.value)} rows={3} style={styleTextarea} />
            </ChampForm>

            <ChampForm label="Contexte historique">
              <textarea value={formPoi.texte_historique} onChange={e => champForm('texte_historique', e.target.value)} rows={3} style={styleTextarea} />
            </ChampForm>

            <ChampForm label="Dans la Bible (facultatif)">
              <textarea value={formPoi.texte_bible} onChange={e => champForm('texte_bible', e.target.value)} rows={2} style={styleTextarea} />
            </ChampForm>

          </div>

          {/* Actions */}
          <div style={{ padding: 16, borderTop: `1px solid ${C.bordure}`, display: 'flex', gap: 8 }}>
            <button
              onClick={sauvegarderPoi}
              disabled={sauvegarde || !formPoi.titre}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 6, border: 'none',
                background: C.primaire, color: '#fff', fontWeight: 600, fontSize: 13,
                cursor: sauvegarde || !formPoi.titre ? 'not-allowed' : 'pointer',
                opacity: sauvegarde || !formPoi.titre ? 0.6 : 1,
              }}
            >
              {sauvegarde ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              onClick={supprimerPoi}
              style={{
                padding: '9px 14px', borderRadius: 6, border: `1px solid #FCA5A5`,
                background: '#FFF5F5', color: '#DC2626', fontSize: 13, cursor: 'pointer',
              }}
            >
              🗑
            </button>
          </div>

        </div>
      ) : (
        <div style={{ width: 260, flexShrink: 0, background: C.bg, borderLeft: `1px solid ${C.bordure}`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <p style={{ textAlign: 'center', color: C.texteSecondaire, fontSize: 13, lineHeight: 1.6 }}>
            Cliquez sur un POI existant pour l'éditer, ou utilisez les boutons ci-dessus pour en ajouter un.
          </p>
        </div>
      )}

    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Placeholder({ texte, erreur }) {
  return (
    <div style={{ background: C.blanc, borderRadius: 10, border: `1px solid ${C.bordure}`, padding: 60, textAlign: 'center', color: erreur ? '#DC2626' : C.texteSecondaire }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🗺️</div>
      <p style={{ margin: 0, fontSize: 14 }}>{texte}</p>
    </div>
  )
}

function BoutonAutoFit({ bounds }) {
  const map = useMap()
  return (
    <div style={{ position: 'absolute', top: 10, left: 46, zIndex: 1000 }}>
      <div className="leaflet-control leaflet-bar" style={{ margin: 0 }}>
        <a
          href="#"
          title="Ajuster la vue"
          role="button"
          onClick={e => { e.preventDefault(); map.fitBounds(bounds, { padding: [40, 40] }) }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, width: 30, height: 30, lineHeight: 1 }}
        >
          ⊡
        </a>
      </div>
    </div>
  )
}

function RoseDesVents({ angle, actif, onClick }) {
  return (
    <div
      onClick={onClick}
      title={actif ? 'Cliquer pour quitter le mode rotation' : 'Cliquer pour activer la rotation (molette)'}
      style={{
        width: 64, height: 64, cursor: 'pointer',
        borderRadius: '50%',
        background: actif ? '#F0FDF4' : C.blanc,
        border: `2px solid ${actif ? C.primaire : C.bordure}`,
        boxShadow: actif ? `0 0 0 3px rgba(27,67,50,0.15)` : '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
    >
      <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: `rotate(${angle}deg)`, transition: 'transform 0.05s', display: 'block' }}>
        {/* N - vert foncé */}
        <polygon points="26,3 29.5,24 26,21 22.5,24" fill={C.primaire} />
        {/* S - gris */}
        <polygon points="26,49 29.5,28 26,31 22.5,28" fill="#C0BDB9" />
        {/* E */}
        <polygon points="49,26 28,22.5 31,26 28,29.5" fill="#9CA3AF" />
        {/* W */}
        <polygon points="3,26 24,22.5 21,26 24,29.5" fill="#9CA3AF" />
        {/* NE */}
        <polygon points="44,8 30,24 28,22 30,20" fill="#D1D5DB" />
        {/* NW */}
        <polygon points="8,8 22,24 24,22 22,20" fill="#D1D5DB" />
        {/* SE */}
        <polygon points="44,44 30,28 28,30 30,32" fill="#D1D5DB" />
        {/* SW */}
        <polygon points="8,44 22,28 24,30 22,32" fill="#D1D5DB" />
        {/* Centre */}
        <circle cx="26" cy="26" r="4" fill="white" stroke={C.primaire} strokeWidth="1.5" />
        {/* N label — reste fixe visuellement via contre-rotation */}
      </svg>
    </div>
  )
}

function ChampForm({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const styleInput = {
  width: '100%', padding: '7px 10px', borderRadius: 6,
  border: `1px solid ${C.bordure}`, fontSize: 13,
  outline: 'none', boxSizing: 'border-box', color: '#111827',
}

const styleTextarea = {
  width: '100%', padding: '7px 10px', borderRadius: 6,
  border: `1px solid ${C.bordure}`, fontSize: 13,
  outline: 'none', resize: 'vertical', boxSizing: 'border-box',
  fontFamily: 'inherit', color: '#111827',
}
