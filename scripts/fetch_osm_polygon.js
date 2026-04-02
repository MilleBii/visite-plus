/**
 * Script de test : extraction du polygone OSM d'une église
 * Usage : node scripts/fetch_osm_polygon.js
 *
 * Résultat : affiche le way ID trouvé + les coordonnées GPS prêtes à coller dans Plan.jsx
 */

const LAT = 45.761975;
const LON = 4.822197;
const LABEL = "Basilique Notre-Dame de Fourvière";

async function overpassQuery(query) {
  const body = new URLSearchParams({ data: query });
  const res = await fetch("https://overpass.openstreetmap.fr/api/interpreter", {
    method: "POST",
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchByCoords(lat, lon) {
  console.log(`\n🔍 Recherche du bâtiment à proximité de (${lat}, ${lon})...`);
  // Tente [building] d'abord, puis [amenity=place_of_worship] si rien trouvé
  let data = await overpassQuery(`[out:json];way(around:100,${lat},${lon})[building];out geom;`);
  if (data.elements.length === 0) {
    console.log("  → Aucun [building] trouvé, essai avec [amenity=place_of_worship]...");
    data = await overpassQuery(`[out:json];way(around:100,${lat},${lon})[amenity=place_of_worship];out geom;`);
  }
  return data.elements;
}

async function fetchByWayId(wayId) {
  console.log(`\n🔍 Récupération du polygone pour way ${wayId}...`);
  const data = await overpassQuery(`[out:json];way(${wayId});out geom;`);
  return data.elements[0];
}

function formatCoordsForCode(element) {
  const coords = element.geometry.map((n) => [n.lat, n.lon]);
  const lines = [];
  for (let i = 0; i < coords.length; i += 3) {
    lines.push(
      coords
        .slice(i, i + 3)
        .map(([lat, lon]) => `[${lat}, ${lon}]`)
        .join(",")
    );
  }
  return "[\n  " + lines.join(",\n  ") + "\n]";
}

async function main() {
  console.log(`\n=== Extraction OSM : ${LABEL} ===`);

  const elements = await fetchByCoords(LAT, LON);

  if (elements.length === 0) {
    console.log("❌ Aucun bâtiment trouvé à 50m. Essaie avec un rayon plus large (100m) ou cherche le way ID manuellement sur openstreetmap.org");
    return;
  }

  console.log(`✅ ${elements.length} bâtiment(s) trouvé(s) :`);
  elements.forEach((el) => {
    const tags = el.tags || {};
    console.log(`  - way ${el.id} | name: "${tags.name || "(sans nom)"}" | nodes: ${el.geometry?.length || "?"}`);
  });

  // Prend le premier (ou le plus grand si plusieurs)
  const best = elements.reduce((a, b) =>
    (b.geometry?.length || 0) > (a.geometry?.length || 0) ? b : a
  );
  console.log(`\n➡️  Way ID retenu : ${best.id} (${best.geometry?.length} nœuds)`);

  if (!best.geometry || best.geometry.length === 0) {
    // Refetch with geom
    const full = await fetchByWayId(best.id);
    console.log(`\n📐 Polygone OSM (à coller dans Plan.jsx) :\nconst OSM_FOOTPRINT_GPS = ${formatCoordsForCode(full)}`);
    console.log(`\n// way ID : ${full.id}`);
    console.log(`// Centroïde estimé : [${LAT}, ${LON}]`);
  } else {
    console.log(`\n📐 Polygone OSM (à coller dans Plan.jsx) :\nconst OSM_FOOTPRINT_GPS = ${formatCoordsForCode(best)}`);
    console.log(`\n// way ID : ${best.id}`);
  }

  console.log(`\n💡 Prochaine étape : ajuste l'angle dans Plan.jsx avec les boutons +/− pour mettre l'entrée en bas.`);
}

main().catch(console.error);
