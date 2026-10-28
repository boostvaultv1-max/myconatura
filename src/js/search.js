// Offline-Suche und Filter über die lokale Pilzdatenbank.

import { norm } from './util.js';
import { EDIBILITY, COLORS, HYMENOPHORE, HABITATS, MONTHS_LONG, SMELLS, SPORE, CAP_SHAPES } from './vocab.js';

const labels = (keys = [], dict) => keys.map((k) => (typeof dict[k] === 'string' ? dict[k] : dict[k]?.label) || k);

/** Baut für jeden Pilz einen normalisierten Suchtext. Gewichtung über Felder. */
export function buildIndex(list) {
  return list.map((m) => {
    const primary = norm([m.name, m.scientific, ...(m.synonyms || [])].join(' '));
    const secondary = norm([
      m.family,
      EDIBILITY[m.edibility]?.label,
      HYMENOPHORE[m.hymenophore?.type],
      ...labels(m.cap?.colors, COLORS),
      ...labels(m.cap?.shape, CAP_SHAPES),
      ...labels(m.hymenophore?.colors, COLORS),
      ...labels(m.habitat?.tags, HABITATS),
      m.habitat?.text,
      ...(m.trees || []),
      ...(m.season?.months || []).map((n) => MONTHS_LONG[n - 1]),
      m.season?.text,
      ...labels(m.smell?.tags, SMELLS),
      ...labels(m.spore?.tags, SPORE),
      m.habitat?.substrate === 'holz' ? 'baumpilz holz' : 'bodenpilz',
    ].filter(Boolean).join(' '));
    return { m, primary, secondary };
  });
}

function hasAny(values, set) {
  if (!set || set.size === 0) return true;
  return (values || []).some((v) => set.has(v));
}

/**
 * @param {Array} index – Ergebnis von buildIndex
 * @param {object} st – { q, edibility, hymenophore, capColor, underColor, habitat, month, substrate } (Sets)
 */
export function runSearch(index, st) {
  const tokens = norm(st.q).split(' ').filter(Boolean);
  const out = [];
  for (const row of index) {
    const { m } = row;
    if (!hasAny([m.edibility], st.edibility)) continue;
    if (!hasAny([m.hymenophore?.type], st.hymenophore)) continue;
    if (!hasAny(m.cap?.colors, st.capColor)) continue;
    if (!hasAny(m.hymenophore?.colors, st.underColor)) continue;
    const hab = [...(m.habitat?.tags || [])];
    if (m.habitat?.substrate === 'holz' && !hab.includes('holz')) hab.push('holz');
    if (!hasAny(hab, st.habitat)) continue;
    if (st.substrate && m.habitat?.substrate !== st.substrate) continue;
    if (st.month && !(m.season?.months || []).includes(Number(st.month))) continue;

    let score = 0;
    if (tokens.length) {
      let all = true;
      for (const t of tokens) {
        if (row.primary.includes(t)) score += row.primary.split(' ').some((w) => w.startsWith(t)) ? 10 : 6;
        else if (row.secondary.includes(t)) score += 2;
        else { all = false; break; }
      }
      if (!all) continue;
      if (norm(m.name).startsWith(tokens.join(' '))) score += 20;
    }
    out.push({ m, score });
  }
  const sort = st.sort || 'relevanz';
  out.sort((a, b) => {
    if (sort === 'wissenschaftlich') return a.m.scientific.localeCompare(b.m.scientific);
    if (sort === 'essbarkeit') return (EDIBILITY[a.m.edibility]?.order ?? 9) - (EDIBILITY[b.m.edibility]?.order ?? 9) || a.m.name.localeCompare(b.m.name, 'de');
    if (sort === 'relevanz' && tokens.length) return b.score - a.score || a.m.name.localeCompare(b.m.name, 'de');
    return a.m.name.localeCompare(b.m.name, 'de');
  });
  return out.map((x) => x.m);
}
