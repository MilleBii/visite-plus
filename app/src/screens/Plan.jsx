// ...existing code...
import { MapContainer, Marker, Polygon } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { typeConfig } from '../data/mockData';
import FichePoi from '../components/FichePoi'

// GPS fixes associées aux POIs — démo Saint-Victor (remplacé en prod par coords locales du BO)
const POIS_GPS = [
  [47.22527, 6.11750],
  [47.22535, 6.11755],
  [47.22537, 6.11775],
  [47.22543, 6.11785],
];

function normaliserPolygone(input) {
  if (!input) return [];
  if (input.type === 'Polygon' && Array.isArray(input.coordinates)) {
    return input.coordinates.map(ring => ring.map(([lon, lat]) => [lat, lon]));
  }
  if (Array.isArray(input) && Array.isArray(input[0]) && Array.isArray(input[0][0])) {
    const first = input[0][0];
    if (first[0] > 40 && first[0] < 52 && first[1] > -5 && first[1] < 10) return input;
    return input.map(ring => ring.map(([lon, lat]) => [lat, lon]));
  }
  return [];
}

function buildLocal(footprintGps, angleDeg, poisArr) {
  const latC = footprintGps.reduce((s, p) => s + p[0], 0) / footprintGps.length;
  const lonC = footprintGps.reduce((s, p) => s + p[1], 0) / footprintGps.length;
  const cosLat = Math.cos(latC * Math.PI / 180);
  const a = angleDeg * Math.PI / 180;
  const toLocal = ([lat, lon]) => {
    const x = (lon - lonC) * cosLat * 111320;
    const y = (lat - latC) * 111320;
    return [x * Math.sin(a) + y * Math.cos(a), x * Math.cos(a) - y * Math.sin(a)];
  };
  const footprint = footprintGps.map(toLocal);
  const bounds = [
    [Math.min(...footprint.map(p => p[0])), Math.min(...footprint.map(p => p[1]))],
    [Math.max(...footprint.map(p => p[0])), Math.max(...footprint.map(p => p[1]))],
  ];
  const poisLocal = poisArr.map(p => ({ ...p, position: toLocal(p.gps) }));
  return { footprint, bounds, poisLocal };
}

function createIcon(type) {
  const cfg = typeConfig[type] || { icon: '📍', color: '#666' }
  const inner = cfg.image
    ? `<img src="${cfg.image}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" />`
    : `<span style="font-size:16px">${cfg.icon}</span>`
  return L.divIcon({
    html: `<div style="
      background: ${cfg.image ? cfg.color : 'white'};
      border: 1.5px solid ${cfg.color};
      border-radius: 50%;
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    ">${inner}</div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

export default function Plan({ onBack }) {
  const [poiSelectionne, setPoiSelectionne] = useState(null);
  const [ficheComplete, setFicheComplete] = useState(false);
  const [angle, setAngle] = useState(0);
  const [footprintGps, setFootprintGps] = useState(null);
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [{ data: egliseData, error: egliseError }, { data: poisData, error: poisError }] = await Promise.all([
        supabase.from('eglises').select('osm_footprint_json, osm_rotation_angle').limit(1).single(),
        supabase.from('pois').select('*'),
      ]);
      if (egliseError || poisError) {
        setError((egliseError || poisError).message);
      } else {
        const parsed = egliseData?.osm_footprint_json ? JSON.parse(egliseData.osm_footprint_json) : null;
        setFootprintGps(parsed);
        setAngle(egliseData?.osm_rotation_angle ?? 0);
        setPois(poisData || []);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const poisWithGps = pois.map((p, i) => ({ ...p, gps: POIS_GPS[i] || [0, 0] }));

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error}</div>;
  if (!footprintGps) return <div>Polygone OSM manquant pour cette église.</div>;

  const rings = normaliserPolygone(footprintGps);
  const { footprint, bounds, poisLocal } = buildLocal(rings[0] || [], angle, poisWithGps);
  const fermer = () => { setPoiSelectionne(null); setFicheComplete(false); };

  if (ficheComplete && poiSelectionne) {
    return <FichePoi poi={poiSelectionne} onBack={() => setFicheComplete(false)} />;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'white', borderBottom: '1px solid #E7E5E4',
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button onClick={onBack} style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: '#F5F5F4', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '18px', flexShrink: 0,
        }}>←</button>
        <div>
          <h2 style={{ fontSize: '17px', fontWeight: '600', color: '#1C1917' }}>Plan de l'église</h2>
          <p style={{ fontSize: '11px', color: '#78716C' }}>Église Saint-Victor · Source OpenStreetMap</p>
        </div>
      </div>

      {/* Légende */}
      {!poiSelectionne && (
        <div style={{
          position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          background: 'white', borderRadius: '10px', padding: '8px 12px',
          border: '1px solid #E7E5E4', display: 'flex', flexDirection: 'row', gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', whiteSpace: 'nowrap',
        }}>
          {Object.entries(typeConfig).map(([type, cfg]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#44403C' }}>
              <span style={{
                width: '24px', height: '24px', borderRadius: '50%',
                border: `1px solid ${cfg.color}`,
                background: cfg.image ? cfg.color : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {cfg.image
                  ? <img src={cfg.image} style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '10px' }}>{cfg.icon}</span>
                }
              </span>
              {cfg.label}
            </div>
          ))}
        </div>
      )}

      {/* Contrôle angle — démo uniquement */}
      <div style={{
        position: 'absolute', top: '80px', right: '12px', zIndex: 1000,
        background: 'white', borderRadius: '10px', padding: '8px 10px',
        border: '1px solid #E7E5E4', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#78716C',
      }}>
        <button onClick={() => setAngle(a => a - 1)} style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#F5F5F4', fontWeight: '700' }}>−</button>
        <span style={{ minWidth: '36px', textAlign: 'center' }}>{angle}°</span>
        <button onClick={() => setAngle(a => a + 1)} style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#F5F5F4', fontWeight: '700' }}>+</button>
      </div>

      {/* Plan CRS.Simple */}
      <div style={{ flex: 1, marginTop: '69px' }}>
        <MapContainer
          key={angle}
          crs={L.CRS.Simple}
          bounds={bounds}
          boundsOptions={{ padding: [40, 40] }}
          maxZoom={10}
          style={{ height: '100%', width: '100%', background: '#F0EDE8' }}
          zoomControl={false}
          attributionControl={false}
        >
          <Polygon
            positions={footprint}
            pathOptions={{ color: '#B7881C', weight: 2, fillColor: '#FEF3C7', fillOpacity: 0.6 }}
          />
          {poisLocal.map((poi) => (
            <Marker
              key={poi.id}
              position={poi.position}
              icon={createIcon(poi.type)}
              eventHandlers={{ click: () => setPoiSelectionne(poi) }}
            />
          ))}
        </MapContainer>
      </div>

      {/* Panneau POI bas */}
      {poiSelectionne && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
          background: 'white', borderRadius: '20px 20px 0 0',
          borderTop: '1px solid #E7E5E4', padding: '20px',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
        }}>
          <div style={{ width: '40px', height: '4px', background: '#D6D3D1', borderRadius: '2px', margin: '0 auto 16px' }} />
          <button onClick={fermer} style={{
            position: 'absolute', top: '20px', right: '20px',
            width: '28px', height: '28px', borderRadius: '50%',
            background: '#F5F5F4', fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
          <button onClick={() => setFicheComplete(true)} style={{ width: '100%', textAlign: 'left' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <img
                src={poiSelectionne.photo}
                alt={poiSelectionne.titre}
                style={{ width: '72px', height: '72px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
              />
              <div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  background: '#F5F5F4', borderRadius: '6px',
                  padding: '2px 8px', fontSize: '12px', color: '#78716C', marginBottom: '6px',
                }}>
                  {typeConfig[poiSelectionne.type]?.image
                    ? <img src={typeConfig[poiSelectionne.type].image} style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover', pointerEvents: 'none' }} />
                    : <span>{typeConfig[poiSelectionne.type]?.icon}</span>
                  }
                  <span>{typeConfig[poiSelectionne.type]?.label}</span>
                </div>
                <p style={{ fontWeight: '600', fontSize: '16px', color: '#1C1917', marginBottom: '4px' }}>
                  {poiSelectionne.titre}
                </p>
                <p style={{ fontSize: '13px', color: '#78716C' }}>Appuyer pour en savoir plus →</p>
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
