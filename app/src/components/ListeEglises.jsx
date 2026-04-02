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

  return (
    <div>
      <h2>Liste des églises</h2>
      <ul>
        {eglises.map(e => (
          <li key={e.id}>
            <strong>{e.nom}</strong> — {e.ville}
          </li>
        ))}
      </ul>
    </div>
  );
}
