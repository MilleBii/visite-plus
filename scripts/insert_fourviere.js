// Insère uniquement la Basilique de Fourvière dans Supabase
// Usage : node scripts/insert_fourviere.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lbksiotvnnpqkwslwjoq.supabase.co';
const supabaseAnonKey = 'sb_publishable_PHQ48k3UcTbs4ATRQWpwQw_B21GhzKO';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const fourviere = {
  nom: "Basilique Notre-Dame de Fourvière",
  ville: "Lyon",
  type: "basilique",
  position: [45.761975, 4.822197],
  photo_facade: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/BasiliqueFourviere.jpg/640px-BasiliqueFourviere.jpg",
  message_bienvenue: "Bienvenue à la basilique Notre-Dame de Fourvière, sanctuaire marial dominant Lyon depuis 1896.",
  osm_rotation_angle: 0,
};

const { data, error } = await supabase.from('eglises').insert([fourviere]).select();
if (error) {
  console.error('Erreur :', error.message);
} else {
  console.log('Fourvière insérée :', data[0]);
}
