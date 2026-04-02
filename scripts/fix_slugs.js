import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lbksiotvnnpqkwslwjoq.supabase.co';
const supabaseAnonKey = 'sb_publishable_PHQ48k3UcTbs4ATRQWpwQw_B21GhzKO';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function toSlug(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

async function main() {
  const { data, error } = await supabase
    .from('eglises')
    .select('id, nom, slug')
    .order('id');

  if (error) {
    console.error('Erreur lecture eglises:', error.message);
    process.exit(1);
  }

  const usedSlugs = new Set(
    data
      .map((row) => (row.slug ?? '').trim())
      .filter((slug) => slug.length > 0),
  );

  let updated = 0;

  for (const row of data) {
    const current = (row.slug ?? '').trim();
    if (current.length > 0) {
      continue;
    }

    const base = toSlug(row.nom || `eglise-${row.id}`) || `eglise-${row.id}`;
    let candidate = base;
    let index = 2;

    while (usedSlugs.has(candidate)) {
      candidate = `${base}-${index}`;
      index += 1;
    }

    const { error: updateError } = await supabase
      .from('eglises')
      .update({ slug: candidate })
      .eq('id', row.id);

    if (updateError) {
      console.error(`Erreur update id=${row.id}:`, updateError.message);
      continue;
    }

    usedSlugs.add(candidate);
    updated += 1;
    console.log(`Mis a jour id=${row.id} slug=${candidate}`);
  }

  console.log(`Termine. ${updated} ligne(s) modifiee(s).`);
}

main().catch((error) => {
  console.error('Erreur inattendue:', error);
  process.exit(1);
});
