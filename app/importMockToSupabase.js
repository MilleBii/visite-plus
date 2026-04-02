// Script d'injection des données mockées dans Supabase
// À lancer avec : node importMockToSupabase.js


import { createClient } from '@supabase/supabase-js';
import * as mock from './src/data/mockData.js';

const supabaseUrl = 'https://lbksiotvnnpqkwslwjoq.supabase.co';
const supabaseAnonKey = 'sb_publishable_PHQ48k3UcTbs4ATRQWpwQw_B21GhzKO';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function insertAll() {
  // Églises
  for (const eglise of mock.eglises) {
    await supabase.from('eglises').insert([
      {
        nom: eglise.nom,
        ville: eglise.ville,
        type: eglise.type,
        position: eglise.position,
        photo_facade: eglise.photo_facade,
        message_bienvenue: eglise.message_bienvenue,
      },
    ]);
  }

  // POIs
  for (const poi of mock.pois) {
    await supabase.from('pois').insert([
      {
        type: poi.type,
        titre: poi.titre,
        position: poi.position,
        photo: poi.photo,
        texte_resume: poi.texte_resume,
        texte_comprendre: poi.texte_comprendre,
        texte_historique: poi.texte_historique,
        texte_bible: poi.texte_bible,
      },
    ]);
  }

  // Événements
  for (const evt of mock.evenements) {
    await supabase.from('evenements').insert([
      {
        type: evt.type,
        titre: evt.titre,
        date: evt.date,
        heure: evt.heure,
        description: evt.description,
      },
    ]);
  }

  // Questions
  for (const q of mock.questions) {
    await supabase.from('questions').insert([
      {
        question: q.question,
        reponse: q.reponse,
      },
    ]);
  }

  console.log('Import terminé !');
}

insertAll();
