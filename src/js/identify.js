// Bestimmungshilfe: vergleicht gewählte Merkmale transparent mit der Datenbank.
// Es werden bewusst KEINE Wahrscheinlichkeiten berechnet – nur gezählt,
// welche Angaben übereinstimmen, welche widersprechen und welche unbekannt sind.

import {
  CAP_SHAPES, COLORS, HYMENOPHORE, STEM_SHAPES, STEM_BASE, RING, SMELLS, SPORE, HABITATS, TREES, MONTHS_LONG,
} from './vocab.js';

const colorOpts = Object.fromEntries(Object.entries(COLORS).map(([k, v]) => [k, v.label]));

export const STEPS = [
  { key: 'capShape',   title: 'Hutform',               hint: 'Wie sieht der Hut von der Seite aus?', options: CAP_SHAPES,
    get: (m) => m.cap?.shape },
  { key: 'capColor',   title: 'Hutfarbe',              hint: 'Grundfarbe der Hutoberseite (Mehrfachauswahl möglich).', options: colorOpts, colors: true,
    get: (m) => m.cap?.colors },
  { key: 'hymenophore', title: 'Unterseite: Lamellen oder Röhren?', hint: 'Was befindet sich unter dem Hut?', options: HYMENOPHORE,
    get: (m) => (m.hymenophore?.type ? [m.hymenophore.type] : []) },
  { key: 'underColor', title: 'Farbe der Unterseite',  hint: 'Farbe der Lamellen, Röhren, Poren oder Leisten.', options: colorOpts, colors: true,
    get: (m) => m.hymenophore?.colors },
  { key: 'stemColor',  title: 'Stielfarbe',            hint: 'Grundfarbe des Stiels.', options: colorOpts, colors: true,
    get: (m) => m.stem?.colors },
  { key: 'stemShape',  title: 'Stielform',             hint: 'Gesamtform des Stiels.', options: STEM_SHAPES,
    get: (m) => m.stem?.shape },
  { key: 'stemBase',   title: 'Stielbasis',            hint: 'Pilz vorsichtig ganz aus dem Boden lösen – die Basis ist bei Knollenblätterpilzen entscheidend!', options: STEM_BASE,
    get: (m) => (m.stem?.base ? [m.stem.base] : []) },
  { key: 'ring',       title: 'Ring am Stiel',         hint: 'Gibt es einen Ring oder eine Manschette (auch Reste)?', options: RING,
    get: (m) => (typeof m.stem?.ring === 'boolean' ? [m.stem.ring ? 'ja' : 'nein'] : []) },
  { key: 'smell',      title: 'Geruch',                hint: 'An frischem Fleisch riechen (nicht kosten!).', options: SMELLS,
    get: (m) => m.smell?.tags },
  { key: 'spore',      title: 'Sporenpulverfarbe',     hint: 'Hut über Nacht mit der Unterseite auf Papier/Glas legen.', options: SPORE,
    get: (m) => m.spore?.tags },
  { key: 'habitat',    title: 'Fundort & Lebensraum',  hint: 'Wo wuchs der Pilz?', options: HABITATS,
    get: (m) => { const t = [...(m.habitat?.tags || [])]; if (m.habitat?.substrate === 'holz' && !t.includes('holz')) t.push('holz'); return t; } },
  { key: 'trees',      title: 'Begleitbäume',          hint: 'Welche Bäume standen in der Nähe?', options: Object.fromEntries(TREES.map((t) => [t, t])),
    get: (m) => m.trees },
  { key: 'month',      title: 'Fundmonat',             hint: 'Optional: In welchem Monat wurde er gefunden?', options: Object.fromEntries(MONTHS_LONG.map((n, i) => [String(i + 1), n])),
    get: (m) => (m.season?.months || []).map(String) },
];

export function labelFor(stepKey, value) {
  const step = STEPS.find((s) => s.key === stepKey);
  return step?.options?.[value] || value;
}

/**
 * @param {Array} list – alle Pilze
 * @param {object} answers – { stepKey: string[] }
 * @returns {Array<{m, pros:[], cons:[], unknown:[], answered:number}>}
 */
export function evaluate(list, answers) {
  const active = STEPS.filter((s) => (answers[s.key] || []).length > 0);
  const results = list.map((m) => {
    const pros = []; const cons = []; const unknown = [];
    for (const s of active) {
      const chosen = answers[s.key];
      const vals = s.get(m) || [];
      if (!vals.length) { unknown.push(s.title); continue; }
      const hit = chosen.filter((c) => vals.includes(c));
      if (hit.length) pros.push({ step: s.title, text: hit.map((h) => labelFor(s.key, h)).join(', ') });
      else cons.push({ step: s.title, text: `bei dieser Art: ${vals.map((v) => labelFor(s.key, v)).join(', ')}` });
    }
    return { m, pros, cons, unknown, answered: active.length };
  });
  return results
    .filter((r) => r.pros.length > 0)
    .sort((a, b) => (b.pros.length - b.cons.length) - (a.pros.length - a.cons.length) || b.pros.length - a.pros.length || a.m.name.localeCompare(b.m.name, 'de'));
}
