import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { evenementConfig } from '../data/mockData';
import TopBar from '../components/TopBar'


export default function Programme({ onBack }) {
  const [evenements, setEvenements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchEvenements() {
      setLoading(true);
      const { data, error } = await supabase.from('evenements').select('*');
      if (error) setError(error.message);
      else setEvenements(data || []);
      setLoading(false);
    }
    fetchEvenements();
  }, []);

  const sorted = [...evenements].sort((a, b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure));

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  // Grouper par date
  const grouped = sorted.reduce((acc, evt) => {
    if (!acc[evt.date]) acc[evt.date] = []
    acc[evt.date].push(evt)
    return acc
  }, {})

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error}</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <TopBar titre="Au programme" onBack={onBack} />

      <div style={{ padding: '24px 20px' }}>
        {Object.entries(grouped).map(([date, evts]) => (
          <div key={date} style={{ marginBottom: '28px' }}>
            <p style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#78716C',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '12px',
            }}>
              {formatDate(date)}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {evts.map((evt) => {
                const cfg = evenementConfig[evt.type]
                return (
                  <div
                    key={evt.id}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      border: '1px solid #E7E5E4',
                      padding: '16px',
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{
                      background: cfg.bg,
                      color: cfg.color,
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: '600',
                      flexShrink: 0,
                      minWidth: '72px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '16px', fontWeight: '700' }}>{evt.heure}</div>
                      <div>{cfg.label}</div>
                    </div>
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '15px', color: '#1C1917', marginBottom: '4px' }}>
                        {evt.titre}
                      </p>
                      {evt.description && (
                        <p style={{ fontSize: '13px', color: '#78716C' }}>{evt.description}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
