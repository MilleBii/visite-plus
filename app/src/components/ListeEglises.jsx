import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function ListeEglises() {
  const [eglises, setEglises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchEglises() {
      setLoading(true);
      const { data, error } = await supabase
        .from('eglises')
        .select('*');
      if (error) setError(error.message);
      else setEglises(data);
      setLoading(false);
    }
    fetchEglises();
  }, []);

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error}</div>;

  // Tri : publié d'abord, puis brouillon, puis ordre alpha
  const eglisesTriees = [...eglises].sort((a, b) => {
    // Publié avant brouillon
    if (a.statut === b.statut) {
      // Ordre alpha nom
      return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
    }
    return a.statut === 'publié' ? -1 : 1;
  });

  return (
    <div>
      <h2>Liste des églises</h2>
      <ul>
        {eglisesTriees.map(e => (
          <li key={e.id}>
            <strong>{e.nom}</strong> — {e.ville} <span style={{fontSize:12, color:'#888'}}>({e.statut})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
