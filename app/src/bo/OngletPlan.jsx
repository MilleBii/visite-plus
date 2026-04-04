// ─── Rose des vents ────────────────────────────────────────────────────────
function RoseDesVents({ modeRotation, onClick, angle = 0 }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        background: modeRotation ? 'rgba(255,243,199,0.98)' : 'rgba(255,255,255,0.95)',
        border: modeRotation ? '2px solid #B7881C' : '1px solid #E7E5E4',
        borderRadius: 8,
        width: 64,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        cursor: 'pointer',
        transition: 'background 0.2s, border 0.2s'
      }}
      title={modeRotation ? 'Mode rotation activé (molette = tourner)' : 'Activer le mode rotation'}
    >
      <svg
        width="44" height="44" viewBox="0 0 44 44"
        style={{
          transform: `rotate(${-angle}deg)`,
          transition: 'transform 0.2s',
        }}
      >
        <circle cx="22" cy="22" r="21" fill="#fff" stroke={modeRotation ? '#B7881C' : '#B7881C'} strokeWidth={modeRotation ? 3 : 2} />
        {/* Grandes pointes cardinales */}
        {/* Nord (rouge) */}
        <polygon points="22,5 25,22 22,13 19,22" fill="#D32F2F" />
        {/* Sud */}
        <polygon points="22,39 25,22 22,31 19,22" fill="#78716C" />
        {/* Ouest */}
        <polygon points="5,22 22,19 13,22 22,25" fill="#B7881C" />
        {/* Est */}
        <polygon points="39,22 22,19 31,22 22,25" fill="#78716C" />


        {modeRotation && (
          <circle cx="22" cy="22" r="16" fill="none" stroke="#B7881C" strokeWidth="2" strokeDasharray="4 4" />
        )}
      </svg>
    </div>
  );
}
// ─── Normalisation des polygones (rétrocompatibilité + GeoJSON) ─────────────
// Accepte :
// - [ [lat, lon], ... ] (ancien)
// - [ [ [lat, lon], ... ] ] (ancien multi)
// - GeoJSON Polygon : { type: 'Polygon', coordinates: [ [ [lon, lat], ... ] ] }
function normaliserPolygone(input) {
  if (!input) return [];
  // Cas GeoJSON
  if (input.type === 'Polygon' && Array.isArray(input.coordinates)) {
    // On inverse [lon, lat] -> [lat, lon]
    return input.coordinates.map(ring => ring.map(([lon, lat]) => [lat, lon]));
  }
  // Cas tableau de tableaux (multi-anneaux)
  if (Array.isArray(input) && Array.isArray(input[0]) && Array.isArray(input[0][0])) {
    // On vérifie si c'est [ [ [lat, lon], ... ] ] ou [ [ [lon, lat], ... ] ]
    // On suppose que si la première coordonnée est dans la zone France, c'est [lat, lon]
    const first = input[0][0];
    if (first[0] > 40 && first[0] < 52 && first[1] > -5 && first[1] < 10) {
      return input;
    } else {
      // Probablement [ [ [lon, lat], ... ] ]
      return input.map(ring => ring.map(([lon, lat]) => [lat, lon]));
    }
  }
  // Cas simple tableau de points
  if (Array.isArray(input) && Array.isArray(input[0]) && typeof input[0][0] === 'number') {
    // [ [lat, lon], ... ]
    return [input];
  }
  return [];
}
import { useState, useEffect, useRef } from 'react'
import { MapContainer, Marker, Pane, Polygon, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../supabaseClient'
import { typeConfig } from '../data/mockData'
import React from 'react'

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
  // TOUS LES HOOKS D'ABORD !
  // Suppression de la rotation et de la boussole
  const mapDivRef = useRef();

  const [eglise, setEglise] = useState(null)
  const [pois, setPois] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)

  // Ajout de l'état angle (toujours 0 par défaut)
  const [angle, setAngle] = useState(0)
  const [modeRotation, setModeRotation] = useState(false)

  // Sauvegarde l'angle en base quand on désactive le mode rotation
  useEffect(() => {
    // On ne sauvegarde et autozoom que lors du passage de true à false
    if (!modeRotation) {
      // Ne sauvegarder que si l'église est chargée
      if (eglise && egliseId != null) {
        (async () => {
          await supabase.from('eglises').update({
            osm_rotation_angle: angle ?? 0
          }).eq('id', egliseId)
        })();
      }
      // Autozoom sur le polygone
      if (mapRef.current && bounds && bounds[0] && bounds[1]) {
        try {
          mapRef.current.fitBounds(bounds, { padding: [40, 40] });
        } catch (e) {
          // ignore erreur
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeRotation]);

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

  // Chargement des données église + POI
  useEffect(() => {
    if (!egliseId) return;
    setChargement(true);
    setErreur(null);
    console.log('[OngletPlan] Chargement des données pour église', egliseId);
    Promise.all([
      supabase.from('eglises').select('*').eq('id', egliseId).single(),
      supabase.from('pois').select('*').eq('eglise_id', egliseId)
    ]).then(([egliseRes, poisRes]) => {
      console.log('[OngletPlan] Résultat église:', egliseRes);
      if (egliseRes.error) { setErreur(egliseRes.error.message); setChargement(false); return; }
      setEglise(egliseRes.data);
      // Correction : angle de rotation depuis la base
      const angleDb = egliseRes.data?.osm_rotation_angle ?? 0;
      console.log('[OngletPlan] Angle lu depuis la base:', angleDb);
      setAngle(angleDb);
      if (poisRes.error) { setErreur(poisRes.error.message); setChargement(false); return; }
      setPois(poisRes.data || []);
      setChargement(false);
    });
  }, [egliseId]);

  // Ajout d'un POI sur clic carte
  async function surClicCarte(positionVue) {
    if (!modePlacement) return;
    const position = positionVue;
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

  // ENSUITE SEULEMENT, LES RETOURS CONDITIONNELS
  if (!egliseId) {
    return <div style={{ padding: 32, textAlign: 'center', color: C.texteSecondaire, fontSize: 16 }}>
      Veuillez d'abord enregistrer l'église pour accéder au plan et aux POI.
    </div>;
  }

  if (chargement) return <Placeholder texte="Chargement du plan…" />
  if (erreur) return <Placeholder texte={`Erreur : ${erreur}`} erreur />

  // Récupération footprint, normalisé (rétrocompatibilité)
  const footprintGps = eglise?.osm_footprint_json ? normaliserPolygone(JSON.parse(eglise.osm_footprint_json)) : null;
  if ((!footprintGps || footprintGps.length === 0) && !osmPropose) {
    console.log('[OngletPlan] Aucun polygone OSM disponible pour cette église. footprintGps:', footprintGps, 'osmPropose:', osmPropose);
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ color: C.texteSecondaire, fontSize: 16 }}>Aucun plan OSM disponible pour cette église.</p>
        {osmErreur && <div style={{ color: C.danger, marginBottom: 12 }}>{osmErreur}</div>}
        <RechercheNominatim eglise={eglise} setOsmPropose={setOsmPropose} />
      </div>
    )
  }

  // Affichage du polygone proposé AVANT validation (osmPropose)
  if (osmPropose) {
    // On normalise la proposition (GeoJSON ou ancien format)
    const proposeNorm = normaliserPolygone(osmPropose);
    const allPoints = proposeNorm.flat().filter(([lat, lon]) =>
      typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)
    );
    const lats = allPoints.map(([lat, lon]) => lat);
    const lons = allPoints.map(([lat, lon]) => lon);
    const bounds = [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)]
    ];
    console.log('[OngletPlan] Affichage polygone proposé, bounds:', bounds, 'osmPropose:', osmPropose, 'angle:', angle);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 108px)', minHeight: 400, borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.bordure}` }}>
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }} ref={mapDivRef}>
          <MapContainer
            style={{ height: '100%', width: '100%', background: '#F0EDE8' }}
            bounds={bounds}
            scrollWheelZoom={true}
            zoomControl={true}
            attributionControl={false}
            crs={L.CRS.Simple}
          >
            <Pane name="planPreviewPane" style={{ zIndex: 300 }}>
              {proposeNorm.map((ring, i) => (
                <Polygon
                  key={i}
                  positions={ring}
                  pathOptions={{ color: '#B7881C', weight: 2, fillColor: '#FEF3C7', fillOpacity: 0.6, interactive: false }}
                />
              ))}
            </Pane>
          </MapContainer>
          {/* Boutons overlay */}
          <div style={{ position: 'absolute', bottom: 24, left: 0, width: '100%', display: 'flex', justifyContent: 'center', gap: 16, zIndex: 1000 }}>
            <button onClick={async () => {
              setOsmValide(true)
              console.log('[OngletPlan] Sauvegarde du polygone OSM, angle:', angle, 'osmPropose:', osmPropose);
              // On sauvegarde en GeoJSON (Polygon)
              const geojson = {
                type: 'Polygon',
                coordinates: proposeNorm.map(ring => ring.map(([lat, lon]) => [lon, lat]))
              };
              const { error } = await supabase.from('eglises').update({
                osm_footprint_json: JSON.stringify(geojson),
                osm_rotation_angle: angle ?? 0
              }).eq('id', egliseId)
              if (!error) {
                setEglise(e => ({ ...e, osm_footprint_json: JSON.stringify(geojson), osm_rotation_angle: angle ?? 0 }));
                setOsmPropose(null);
              } else {
                setErreur(error.message || 'Erreur lors de la sauvegarde');
              }
            }} style={{ background: C.primaire, color: '#fff', border: 'none', borderRadius: 6, padding: '14px 32px', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>Valider et enregistrer</button>
            <button onClick={() => setOsmPropose(null)} style={{ background: '#fff', color: C.danger, border: `2px solid ${C.danger}`, borderRadius: 6, padding: '14px 32px', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
          </div>
        </div>
      </div>
    )
  }


  // Affichage du polygone sauvegardé avec gestion de l'angle
  const { footprint, bounds } = (footprintGps && footprintGps.length > 0) ? buildLocal(footprintGps[0], angle) : { footprint: [], bounds: [[0,0],[0,0]] };
  console.log('[OngletPlan] Affichage polygone sauvegardé, bounds:', bounds, 'footprint:', footprint, 'angle:', angle);

  function positionVersVue(positionStockee) {
    return positionStockee;
  }

  function positionVersStockage(positionVue) {
    return positionVue;
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 108px)', gap: 0, borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.bordure}`, minHeight: 400 }}>

      {/* Carte */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', height: '100%', minHeight: 0 }}>

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
        <div style={{ flex: 1, position: 'relative', minHeight: 0, height: '100%' }}>
          {/* Rose des vents interactive en haut à droite */}
          {/* Rose des vents seule en haut à droite */}
          <div style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1300,
            pointerEvents: 'auto',
          }}>
            <RoseDesVents
              modeRotation={modeRotation}
              onClick={() => setModeRotation(m => !m)}
              angle={angle}
            />
          </div>

          {/* Angle en bas à droite */}
          <div style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 1300,
            minWidth: 44,
            background: 'rgba(255,255,255,0.98)',
            border: '1.5px solid #E7E5E4',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 16,
            fontWeight: 600,
            color: '#B7881C',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            textAlign: 'center',
            userSelect: 'none',
            pointerEvents: 'auto',
          }} title="Angle de rotation du plan">
            {Math.round((angle % 360 + 360) % 360)}°
          </div>
          <div style={{ height: '100%', minHeight: 0 }}>
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
              {/* Gestionnaire de rotation à la molette */}
              <GestionnaireRotation modeRotation={modeRotation} onRotation={delta => setAngle(a => a + delta * 2)} />
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

// ─── Recherche Nominatim (OpenStreetMap) ─────────────────────────────────────
function RechercheNominatim({ eglise, setOsmPropose }) {
  const [query, setQuery] = React.useState(eglise?.nom ? `${eglise.nom} ${eglise.ville || ''}` : '');
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const mapRef = React.useRef();

  // Récupère la référence de la carte Leaflet si possible
  React.useEffect(() => {
    // Cherche la carte dans la page (hack, car la ref n'est pas passée ici)
    const leafletMap = document.querySelector('.leaflet-container')?.__leaflet;
    if (leafletMap) mapRef.current = leafletMap;
  }, []);

  async function fetchNominatim(q) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'visiteplus/1.0 (contact@visiteplus.fr)'
      }
    });
    if (!response.ok) throw new Error('Erreur API Nominatim');
    return response.json();
  }

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const data = await fetchNominatim(query);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  function handleSelectGeojson(geojson) {
    let rings = [];
    let bounds = null;
    if (geojson?.type === 'Polygon') {
      rings = [geojson.coordinates[0].map(([lon, lat]) => [lat, lon])];
      bounds = geojson.coordinates[0].reduce((acc, [lon, lat]) => {
        if (!acc) return [[lat, lon], [lat, lon]];
        return [
          [Math.min(acc[0][0], lat), Math.min(acc[0][1], lon)],
          [Math.max(acc[1][0], lat), Math.max(acc[1][1], lon)]
        ];
      }, null);
    } else if (geojson?.type === 'MultiPolygon') {
      rings = geojson.coordinates[0].map(ring => ring.map(([lon, lat]) => [lat, lon]));
      const allPoints = geojson.coordinates[0][0];
      bounds = allPoints.reduce((acc, [lon, lat]) => {
        if (!acc) return [[lat, lon], [lat, lon]];
        return [
          [Math.min(acc[0][0], lat), Math.min(acc[0][1], lon)],
          [Math.max(acc[1][0], lat), Math.max(acc[1][1], lon)]
        ];
      }, null);
    }
    if (rings.length > 0) setOsmPropose(rings);
    // Autozoom sur le polygone sélectionné
    setTimeout(() => {
      const mapEl = document.querySelector('.leaflet-container');
      if (mapEl && mapEl._leaflet_map) {
        const map = mapEl._leaflet_map;
        if (bounds) map.fitBounds(bounds);
      }
    }, 300);
  }

  function handleZoomGeojson(geojson) {
    let bounds = null;
    if (geojson?.type === 'Polygon') {
      bounds = geojson.coordinates[0].reduce((acc, [lon, lat]) => {
        if (!acc) return [[lat, lon], [lat, lon]];
        return [
          [Math.min(acc[0][0], lat), Math.min(acc[0][1], lon)],
          [Math.max(acc[1][0], lat), Math.max(acc[1][1], lon)]
        ];
      }, null);
    } else if (geojson?.type === 'MultiPolygon') {
      const allPoints = geojson.coordinates[0][0];
      bounds = allPoints.reduce((acc, [lon, lat]) => {
        if (!acc) return [[lat, lon], [lat, lon]];
        return [
          [Math.min(acc[0][0], lat), Math.min(acc[0][1], lon)],
          [Math.max(acc[1][0], lat), Math.max(acc[1][1], lon)]
        ];
      }, null);
    }
    setTimeout(() => {
      const mapEl = document.querySelector('.leaflet-container');
      if (mapEl && mapEl._leaflet_map && bounds) {
        mapEl._leaflet_map.fitBounds(bounds);
      }
    }, 200);
  }

  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12, marginBottom: 18 }}>
      <form onSubmit={handleSearch} style={{ marginBottom: 10, display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher un lieu (OpenStreetMap)"
          style={{ flex: 1, padding: 6, borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 14 }}
        />
        <button type="submit" disabled={loading || !query.trim()} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#1B4332', color: '#fff', fontWeight: 600, fontSize: 14, cursor: loading ? 'wait' : 'pointer' }}>
          {loading ? "Recherche..." : "Nominatim"}
        </button>
      </form>
      {error && <div style={{ color: '#DC2626', fontSize: 13 }}>{error}</div>}
      {results.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Résultats Nominatim ({results.length})</div>
          <ul style={{ paddingLeft: 18 }}>
              {results.map((r, i) => (
                <li key={r.place_id} style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 500 }}>{r.display_name.split(',')[0]}</span><br />
                  <span style={{ color: '#374151', fontSize: 13 }}>{r.display_name}</span><br />
                  <span style={{ color: '#78716C', fontSize: 12 }}>
                    Nœuds geojson : {r.geojson && r.geojson.type === 'Polygon' && r.geojson.coordinates[0] ? r.geojson.coordinates[0].length :
                      r.geojson && r.geojson.type === 'MultiPolygon' && r.geojson.coordinates[0] && r.geojson.coordinates[0][0] ? r.geojson.coordinates[0][0].length :
                      'N/A'}
                  </span>
                  {r.geojson && (r.geojson.type === 'Polygon' || r.geojson.type === 'MultiPolygon') && (
                    <>
                      <button onClick={() => handleSelectGeojson(r.geojson)} style={{ marginLeft: 8, padding: '2px 10px', borderRadius: 6, border: '1px solid #1B4332', background: '#fff', color: '#1B4332', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Utiliser</button>
                    </>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}


