// Génère un fichier SQL de seed réaliste pour Fourvière (30 derniers jours)
// Usage : node scripts/seed_stats_fourviere.js
// → génère scripts/seed_stats_fourviere.sql à coller dans Supabase SQL Editor
//
// Hypothèses :
//   - Fourvière est eglise_id = 3
//   - POI ids : 5, 11, 7, 9 (récupérés depuis la BDD)
//   - Fréquentation : 80-300 visiteurs/jour, pic le week-end
//   - Horaires : 9h-19h avec pic 11h-12h et 14h-16h
//   - Les POI ont des popularités différentes (vitrail > statue > tableau > démarche)

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const EGLISE_ID = 3;
const POI_IDS   = [5, 11, 7, 9]; // ids réels dans la BDD
const JOURS     = 30;

const PROFIL_HORAIRE = {
   9: 0.02, 10: 0.10, 11: 0.14, 12: 0.12,
  13: 0.08, 14: 0.13, 15: 0.14, 16: 0.12, 17: 0.09, 18: 0.04, 19: 0.02,
};

// 0=dim, 1=lun … 6=sam
const COEFF_JOUR = [1.6, 0.7, 0.75, 0.8, 0.85, 1.2, 1.4];
const POPULARITE_POI = [0.40, 0.25, 0.20, 0.15];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function jitter(val, pct = 0.25) {
  return Math.max(0, Math.round(val * (1 + (Math.random() * 2 - 1) * pct)));
}

function slotISO(daysAgo, hour) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

const inserts = [];

for (let d = JOURS; d >= 1; d--) {
  const dateRef = new Date();
  dateRef.setUTCDate(dateRef.getUTCDate() - d);
  const jourSemaine = dateRef.getUTCDay();
  const visiteursDuJour = jitter(randInt(80, 300) * COEFF_JOUR[jourSemaine]);

  for (const [hStr, taux] of Object.entries(PROFIL_HORAIRE)) {
    const h = Number(hStr);
    if (taux === 0) continue;

    const vuesEglise = jitter(visiteursDuJour * taux);
    if (vuesEglise > 0) {
      inserts.push(`('eglise', ${EGLISE_ID}, '${slotISO(d, h)}', ${vuesEglise})`);
    }

    const totalVuesPoi = jitter(vuesEglise * 2);
    POI_IDS.forEach((poiId, idx) => {
      const pop = POPULARITE_POI[idx] ?? (1 / POI_IDS.length);
      const vuesPoi = jitter(totalVuesPoi * pop);
      if (vuesPoi > 0) {
        inserts.push(`('poi', ${poiId}, '${slotISO(d, h)}', ${vuesPoi})`);
      }
    });
  }
}

// Générer le SQL en blocs de 200 lignes (lisibilité + limites SQL Editor)
const CHUNK = 200;
const chunks = [];
for (let i = 0; i < inserts.length; i += CHUNK) {
  const vals = inserts.slice(i, i + CHUNK).join(',\n  ');
  chunks.push(
    `INSERT INTO stats_vues (entite_type, entite_id, slot, count) VALUES\n  ${vals}\n` +
    `ON CONFLICT (entite_type, entite_id, slot) DO UPDATE SET count = stats_vues.count + EXCLUDED.count;`
  );
}

const sql = chunks.join('\n\n');
const outPath = resolve(__dirname, 'seed_stats_fourviere.sql');
writeFileSync(outPath, sql, 'utf8');

console.log(`✓ ${inserts.length} lignes générées → ${outPath}`);

