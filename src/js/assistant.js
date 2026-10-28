// MycoNatura – Pilz-Assistent
// Beantwortet Fragen ausschließlich aus der lokalen Datenbank (offline, kostenlos).
// Keine generative KI: Die Antworten werden aus den gespeicherten Angaben zusammengesetzt.
// Sicherheitsregel: Der Assistent gibt niemals eine Freigabe zum Verzehr.

import { esc, norm } from './util.js';
import { EDIBILITY, COLORS, HYMENOPHORE, HABITATS, MONTHS_LONG, STEM_BASE } from './vocab.js';
import { evaluate } from './identify.js';

const GENERIC = new Set(['gemeiner', 'gemeines', 'echter', 'echte', 'gruener', 'gruene', 'falscher', 'grauer', 'violetter', 'orangefuchsiger',
  'spitzgebuckelter', 'kahler', 'flockenstieliger', 'honiggelber', 'kegelhuetiger', 'spitzkegeliger', 'ziegelroter', 'gruenblaettriger', 'krause',
  'semmel', 'frauen', 'wiesen', 'fichten', 'schopf', 'austern', 'speise', 'riesen', 'karbol', 'tiger', 'mai', 'schmetterlings', 'fruehjahrs', 'pilz',
  'europaeische', 'gewoehnliches', 'gewoehnlicher', 'gefleckter', 'schwarzer', 'schwarze', 'blauer', 'roter', 'grosse', 'wilde', 'hunds',
  'roehrling', 'weisser', 'brauner', 'roter', 'gelber', 'gemeine', 'nackter', 'rotlicher', 'roetender', 'grosse', 'grosser']);

const MONTH_KEYS = MONTHS_LONG.map((m) => norm(m)); // januar … dezember (maerz)

const COLOR_ROOTS = { weiss: 'weiss', creme: 'creme', gelb: 'gelb', orange: 'orange', rot: 'rot', rosa: 'rosa', pink: 'rosa', braun: 'braun',
  oliv: 'oliv', gruen: 'gruen', grau: 'grau', violett: 'violett', lila: 'violett', schwarz: 'schwarz' };
const HYM_ROOTS = { lamelle: 'lamellen', roehre: 'roehren', roehrling: 'roehren', boletus: 'roehren', schwamm: 'roehren', pore: 'poren', leiste: 'leisten', stachel: 'stacheln' };
const HAB_ROOTS = { laubwald: 'laubwald', nadelwald: 'nadelwald', mischwald: 'laubwald', wiese: 'wiese', weide: 'wiese', rasen: 'wiese',
  park: 'park', garten: 'park', holz: 'holz', baumstumpf: 'holz', stumpf: 'holz', stamm: 'holz', totholz: 'holz', ast: 'holz',
  kompost: 'kompost', laubstreu: 'kompost', waldrand: 'waldrand', lichtung: 'waldrand', kalk: 'kalk', sand: 'sauer', sauer: 'sauer',
  moor: 'feucht', auwald: 'feucht', feucht: 'feucht' };
const TREE_ROOTS = { buche: 'Buche', eiche: 'Eiche', hainbuche: 'Hainbuche', birke: 'Birke', pappel: 'Pappel', esche: 'Esche', ulme: 'Ulme',
  holunder: 'Holunder', obstbaum: 'Obstbäume', robinie: 'Robinie', fichte: 'Fichte', kiefer: 'Kiefer', tanne: 'Tanne', laerche: 'Lärche' };
const SMELL_ROOTS = { mehl: 'mehlartig', gurke: 'mehlartig', rettich: 'rettich', anis: 'anis', mandel: 'anis', fruchtig: 'fruchtig', aprikose: 'fruchtig',
  karbol: 'phenol', tinte: 'phenol', phenol: 'phenol', aas: 'unangenehm', stink: 'unangenehm', unangenehm: 'unangenehm', honig: 'suesslich', suess: 'suesslich' };

const has = (q, re) => re.test(q);
const link = (m) => `<a href="#${m.type === 'pflanze' ? 'pflanze' : 'pilz'}-${esc(m.id)}">${esc(m.name)}</a>`;
const badge = (m) => `<span class="badge e-${esc(m.edibility)}">${esc(EDIBILITY[m.edibility]?.label || '')}</span>`;
const SAFETY = '<p class="small muted">Hinweis: Diese Antwort stammt aus der MycoNatura-Datenbank und ersetzt keine Pilzberatung. Verzehre nie einen Pilz, den nicht geprüfte Pilzsachverständige freigegeben haben.</p>';

/** Erstellt für jede Art eine Liste von Suchbegriffen (Name, Synonyme, Gattung, Wortteile). */
export function buildAliases(list) {
  return list.map((m) => {
    const set = new Set();
    const add = (s) => { const n = norm(s); if (n.length >= 4) set.add(n); };
    add(m.name); add(m.scientific);
    (m.synonyms || []).forEach(add);
    norm(m.name).split(' ').forEach((w) => { if (w.length >= 6 && !GENERIC.has(w)) set.add(w); });
    return { m, aliases: [...set].sort((a, b) => b.length - a.length) };
  });
}

function findSpecies(q, aliasIndex) {
  const hits = [];
  const padded = ` ${q} `;
  for (const { m, aliases } of aliasIndex) {
    for (const a of aliases) {
      // ganzes Wort oder Wortanfang (z. B. "steinpilze", "pfifferlinge")
      const re = new RegExp(`(^|\\s)${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(e|n|en|s|es)?(\\s|$)`);
      if (re.test(padded.trim()) || padded.includes(` ${a} `)) { hits.push({ m, alias: a }); break; }
    }
  }
  if (!hits.length) return [];
  // Präzisere Treffer bevorzugen: "echter pfifferling" verdrängt "pfifferling", aber
  // "steinpilz oder gallenroehrling" liefert beide Arten.
  const strong = hits.filter((h) => !hits.some((o) => o.alias !== h.alias && o.alias.includes(h.alias)));
  // Reihenfolge wie in der Frage
  strong.sort((x, y) => q.indexOf(x.alias) - q.indexOf(y.alias));
  return [...new Map(strong.map((h) => [h.m.id, h.m])).values()].slice(0, 4);
}

function parseFeatures(q) {
  const words = q.split(' ');
  const pick = (roots) => [...new Set(words.flatMap((w) => Object.entries(roots).filter(([r]) => w.startsWith(r)).map(([, v]) => v)))];
  // Farbe direkt vor Unterseite/Stiel gehört dorthin, nicht zum Hut ("rote Poren", "gelber Stiel")
  const under = []; const stem = []; const capWords = [];
  words.forEach((w, i) => {
    const c = Object.entries(COLOR_ROOTS).find(([r]) => w.startsWith(r));
    if (!c) return;
    const next = words[i + 1] || '';
    if (/^(lamelle|roehre|pore|leiste|stachel|unterseite)/.test(next)) under.push(c[1]);
    else if (/^stiel/.test(next)) stem.push(c[1]);
    else capWords.push(c[1]);
  });
  const f = {
    capColor: [...new Set(capWords)],
    underColor: [...new Set(under)],
    stemColor: [...new Set(stem)],
    hymenophore: pick(HYM_ROOTS),
    habitat: pick(HAB_ROOTS),
    trees: pick(TREE_ROOTS),
    smell: pick(SMELL_ROOTS),
  };
  if (/\b(ohne|kein|keinen) (ring|manschette)/.test(q)) f.ring = ['nein'];
  else if (/\b(ring|manschette)/.test(q)) f.ring = ['ja'];
  if (/\b(scheide|volva|hexenei)/.test(q)) f.stemBase = ['volva'];
  else if (/\bknolle/.test(q)) f.stemBase = ['knollig', 'volva', 'wulst'];
  if (f.hymenophore.includes('roehren')) f.hymenophore = f.hymenophore.filter((h) => h !== 'poren'); // Poren eines Röhrlings
  return f;
}

function parseMonth(q) {
  const i = MONTH_KEYS.findIndex((m) => q.includes(m));
  if (i >= 0) return i + 1;
  if (/\b(jetzt|aktuell|gerade|derzeit|momentan|diesen monat|heute)\b/.test(q)) return new Date().getMonth() + 1;
  if (/\bfruehling|fruehjahr/.test(q)) return 4;
  if (/\bsommer/.test(q)) return 7;
  if (/\bherbst/.test(q)) return 10;
  if (/\bwinter/.test(q)) return 1;
  return null;
}

function listAnswer(title, items, more = '') {
  if (!items.length) return `<p>${title}</p><p>In der Datenbank habe ich dazu keine passende Art gefunden.</p>`;
  const shown = items.slice(0, 12);
  return `<p>${title}</p><ul class="clean">${shown.map((m) => `<li>${link(m)} ${badge(m)}</li>`).join('')}</ul>`
    + (items.length > shown.length ? `<p class="small muted">… und ${items.length - shown.length} weitere. Nutze das <a href="#lexikon">Lexikon</a> mit Filtern für die vollständige Liste.</p>` : '') + more;
}

function speciesAnswer(m, q) {
  const parts = [];
  const askEdible = has(q, /\b(ess|isst|gegessen|verzehr|giftig|gift|toedlich|gefaehrlich|kochen|zubereit|roh|schmeckt|lecker|speise)/);
  const askLook = has(q, /(verwechs|aehnlich|doppelgaenger|unterscheid|unterschied|erkenn|merkmal|bestimm)/);
  const askSeason = has(q, /\b(wann|saison|monat|jahreszeit|zeit)\b/);
  const askWhere = has(q, /\b(wo|waechst|wachsen|lebensraum|finde|finden|vorkommen|standort|baum|baeume|wald)\b/);
  const askSpore = has(q, /spore/);
  const askSmell = has(q, /(geruch|riecht|riechen|duft)/);
  const askCap = has(q, /\bhut/);
  const askStem = has(q, /\b(stiel|knolle|ring)/);
  const askGills = has(q, /(lamelle|roehre|leiste|pore|stachel|unterseite)/);
  const askFlesh = has(q, /\bfleisch/);
  const specific = askEdible || askLook || askSeason || askWhere || askSpore || askSmell || askCap || askStem || askGills || askFlesh;

  parts.push(`<p><b>${link(m)}</b> <i>(${esc(m.scientific)})</i> ${badge(m)}</p>`);
  if (!specific) parts.push(`<p>${esc(m.description)}</p>`);
  if (askEdible || !specific) parts.push(`<p><b>Essbarkeit:</b> ${esc(EDIBILITY[m.edibility]?.label)}. ${esc(m.edibilityNote || '')}</p>`);
  if (askSeason) parts.push(`<p><b>Saison:</b> ${esc(m.season?.text || 'unbekannt')}.</p>`);
  if (askWhere) parts.push(`<p><b>Lebensraum:</b> ${esc(m.habitat?.text || 'unbekannt')}${m.trees?.length ? ` <b>Begleitbäume:</b> ${esc(m.trees.join(', '))}.` : ''}</p>`);
  if (askCap) parts.push(`<p><b>Hut:</b> ${esc(m.cap?.text || 'unbekannt')}</p>`);
  if (askGills) parts.push(`<p><b>${esc(HYMENOPHORE[m.hymenophore?.type]?.split(' (')[0] || 'Unterseite')}:</b> ${esc(m.hymenophore?.text || 'unbekannt')}</p>`);
  if (askStem) parts.push(`<p><b>Stiel:</b> ${esc(m.stem?.text || 'unbekannt')} <b>Basis:</b> ${esc(m.stem?.baseText || STEM_BASE[m.stem?.base] || 'unbekannt')}</p>`);
  if (askFlesh) parts.push(`<p><b>Fleisch:</b> ${esc(m.flesh?.text || 'unbekannt')}</p>`);
  if (askSmell) parts.push(`<p><b>Geruch:</b> ${esc(m.smell?.text || 'unbekannt')}</p>`);
  if (askSpore) parts.push(`<p><b>Sporenpulver:</b> ${esc(m.spore?.text || 'unbekannt')}</p>`);
  if (askLook || askEdible || !specific) {
    if (m.keyFeatures?.length) parts.push(`<p><b>Wichtige Merkmale:</b></p><ul class="clean">${m.keyFeatures.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`);
    const look = m.lookalikes || [];
    if (look.length) {
      parts.push(`<p><b>Verwechslungsgefahr:</b></p><ul class="clean">${look.map((l) => `<li>${l.dangerous ? '⚠️ ' : ''}${l.id ? `<a href="#pilz-${esc(l.id)}">${esc(l.name)}</a>` : `<b>${esc(l.name)}</b>`}: ${esc(l.note)}</li>`).join('')}</ul>`);
    } else if (askLook) parts.push('<p>In der Datenbank sind keine Verwechslungspartner hinterlegt – das heißt nicht, dass es keine gibt.</p>');
  }
  parts.push(`<p><a href="#pilz-${esc(m.id)}">Alle Angaben zu ${esc(m.name)} ansehen →</a></p>`);
  if (askEdible || m.edibility === 'essbar' || m.edibility === 'bedingt') parts.push(SAFETY);
  return parts.join('');
}

function compareAnswer(a, b) {
  const row = (label, fa, fb) => `<tr><th>${esc(label)}</th><td>${esc(fa || '–')}</td><td>${esc(fb || '–')}</td></tr>`;
  const aLook = (a.lookalikes || []).find((l) => l.id === b.id);
  const bLook = (b.lookalikes || []).find((l) => l.id === a.id);
  return `<p>So unterscheiden sich ${link(a)} ${badge(a)} und ${link(b)} ${badge(b)}:</p>
    <div class="table-wrap"><table class="cmp"><thead><tr><th></th><th>${esc(a.name)}</th><th>${esc(b.name)}</th></tr></thead><tbody>
    ${row('Hut', a.cap?.text, b.cap?.text)}
    ${row('Unterseite', a.hymenophore?.text, b.hymenophore?.text)}
    ${row('Stiel', a.stem?.text, b.stem?.text)}
    ${row('Stielbasis', a.stem?.baseText, b.stem?.baseText)}
    ${row('Geruch', a.smell?.text, b.smell?.text)}
    ${row('Sporenpulver', a.spore?.text, b.spore?.text)}
    ${row('Lebensraum', a.habitat?.text, b.habitat?.text)}
    ${row('Saison', a.season?.text, b.season?.text)}
    </tbody></table></div>
    ${aLook ? `<p><b>Laut Datenbank:</b> ${esc(aLook.note)}</p>` : ''}${!aLook && bLook ? `<p><b>Laut Datenbank:</b> ${esc(bLook.note)}</p>` : ''}
    ${SAFETY}`;
}

function plantAnswer(m, q) {
  const askEdible = has(q, /\b(ess|isst|verzehr|giftig|gift|toedlich|gefaehrlich|kochen|roh|sammeln|pfluecken)/);
  const askLook = has(q, /(verwechs|aehnlich|doppelgaenger|unterscheid|unterschied|erkenn|merkmal)/);
  const askSeason = has(q, /\b(wann|saison|monat|jahreszeit|zeit)\b/);
  const askWhere = has(q, /\b(wo|waechst|wachsen|lebensraum|finde|finden|standort)\b/);
  const specific = askEdible || askLook || askSeason || askWhere;
  const out = [`<p><b>${link(m)}</b> <i>(${esc(m.scientific)})</i> ${badge(m)}</p>`];
  if (!specific) out.push(`<p>${esc(m.description)}</p>`);
  if (askEdible || !specific) out.push(`<p><b>Essbarkeit:</b> ${esc(m.edibilityNote)}</p>`);
  if (askSeason) out.push(`<p><b>Saison:</b> ${esc(m.season?.text || 'unbekannt')}.</p>`);
  if (askWhere) out.push(`<p><b>Lebensraum:</b> ${esc(m.habitat || 'unbekannt')}</p>`);
  if (askLook || askEdible || !specific) {
    if (m.features?.length) out.push(`<p><b>Erkennungsmerkmale:</b></p><ul class="clean">${m.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`);
    if (m.lookalikes?.length) out.push(`<p><b>Verwechslungsgefahr:</b></p><ul class="clean">${m.lookalikes.map((l) => `<li>${l.dangerous ? '⚠️ ' : ''}${l.id ? `<a href="#pflanze-${esc(l.id)}">${esc(l.name)}</a>` : `<b>${esc(l.name)}</b>`}: ${esc(l.note)}</li>`).join('')}</ul>`);
  }
  out.push(`<p><a href="#pflanze-${esc(m.id)}">Alle Angaben zu ${esc(m.name)} ansehen →</a></p>`);
  out.push('<p class="small muted">Nur sammeln und essen, was du zu 100 % sicher bestimmt hast. Im Zweifel stehen lassen.</p>');
  return out.join('');
}

function plantCompare(a, b) {
  const la = (a.lookalikes || []).find((l) => l.id === b.id);
  const lb = (b.lookalikes || []).find((l) => l.id === a.id);
  const col = (m) => `<td><ul class="clean">${(m.features || []).map((f) => `<li>${esc(f)}</li>`).join('')}</ul></td>`;
  return `<p>So unterscheiden sich ${link(a)} ${badge(a)} und ${link(b)} ${badge(b)}:</p>
    <div class="table-wrap"><table class="cmp"><thead><tr><th>${esc(a.name)}</th><th>${esc(b.name)}</th></tr></thead>
    <tbody><tr>${col(a)}${col(b)}</tr>
    <tr><td>${esc(a.habitat || '')}</td><td>${esc(b.habitat || '')}</td></tr>
    <tr><td>${esc(a.season?.text || '')}</td><td>${esc(b.season?.text || '')}</td></tr></tbody></table></div>
    ${la ? `<p><b>Wichtig:</b> ${esc(la.note)}</p>` : ''}${lb ? `<p><b>Wichtig:</b> ${esc(lb.note)}</p>` : ''}
    <p class="small muted">Nur sammeln, was du zu 100 % sicher bestimmt hast.</p>`;
}

function guideAnswer(g) {
  return `<p><b>${esc(g.title)}</b></p><p>${esc(g.summary)}</p>
    <ol class="steps">${g.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
    ${g.warnings?.length ? `<p><b>Wichtig:</b> ${g.warnings.map(esc).join(' ')}</p>` : ''}
    <p><a href="#ratgeber-${esc(g.id)}">Ratgeber öffnen →</a> · Im Notfall: <b>112</b></p>`;
}

function findGuide(q, guides) {
  const words = q.split(' ');
  let best = null; let bestScore = 0;
  for (const g of guides || []) {
    const score = g.tags.reduce((n, t) => n + (words.some((w) => w.startsWith(t) || (t.length > 5 && w.includes(t))) ? 1 : 0), 0);
    if (score > bestScore) { best = g; bestScore = score; }
  }
  return best;
}

function emergencyAnswer() {
  return `<div class="notice danger card"><strong>Bei Verdacht auf eine Pilzvergiftung sofort handeln:</strong>
    <ul class="clean"><li>Notruf <b>112</b> wählen oder den Giftnotruf deiner Region anrufen (z. B. Berlin 030 19240, München 089 19240; Österreich +43 1 406 43 43; Schweiz 145).</li>
    <li>Auch ohne Beschwerden anrufen – viele tödliche Gifte wirken erst nach Stunden oder Tagen.</li>
    <li>Pilzreste, Putzabfälle und ggf. Erbrochenes aufbewahren.</li>
    <li>Kein Erbrechen herbeiführen, keine Milch oder Salzwasser ohne ärztliche Anweisung.</li></ul></div>
    <p><a href="#sicherheit">Alle Sicherheitshinweise →</a></p>`;
}

function helpAnswer() {
  return `<p>Ich beantworte Fragen mit den Angaben aus der MycoNatura-Datenbank. Zum Beispiel:</p>
    <ul class="clean">
      <li>„Ist der Perlpilz giftig?“</li>
      <li>„Wie unterscheide ich Steinpilz und Gallenröhrling?“</li>
      <li>„Welche Pilze wachsen im Oktober unter Buchen?“</li>
      <li>„Welche tödlichen Pilze gibt es?“</li>
      <li>„Ich habe einen braunen Pilz mit Röhren unter Fichten gefunden“</li>
      <li>„Bärlauch oder Maiglöckchen?“ · „Welche Beeren sind giftig?“</li>
      <li>„Wie entferne ich eine Zecke?“ · „Ich habe mich verlaufen“ · „Wasser trinkbar machen“</li>
    </ul>
    <p class="small muted">Ich bin keine KI im eigentlichen Sinn und antworte nur mit Inhalten aus MycoNatura (${'{{count}}'} Pilzarten, Wildpflanzen und Ratgeber).</p>`;
}

/**
 * @returns {string} HTML-Antwort (alle Inhalte escaped)
 */
export function answer(question, data, aliasIndex, wild = null) {
  const raw = String(question || '').slice(0, 500);
  const q = norm(raw);
  const all = data.mushrooms;
  if (!q) return helpAnswer().replace('{{count}}', all.length);

  // 1) Notfall hat immer Vorrang
  if (has(q, /(vergift|notruf|notfall|uebel|erbrech|bauchschmerz|durchfall|symptom|krank|klinik|arzt|giftnotruf)/)
    || (has(q, /\b(gegessen|verzehrt|probiert|gekostet)\b/) && !has(q, /\bwann\b/))) {
    return emergencyAnswer();
  }

  // 2) Hilfe / Begrüßung
  if (has(q, /^(hallo|hi|hey|moin|servus|guten (tag|morgen|abend)|hilfe|help|was kannst du)/) || q.split(' ').length === 1 && q.length < 4) {
    return helpAnswer().replace('{{count}}', all.length);
  }

  const plants = wild ? findSpecies(q, wild.plantAliases) : [];
  const isPlantTopic = has(q, /(pflanze|kraut|kraeuter|beere|wildpflanz|wildkraut|blaetter|blatt|bluete|strauch)/);

  // Pflanzen
  if (plants.length >= 2 && has(q, /(unterscheid|unterschied|vergleich|verwechs| oder | vs |und)/)) return plantCompare(plants[0], plants[1]);
  if (plants.length === 1) return plantAnswer(plants[0], q);
  if (plants.length > 1) return `<p>Dazu passen mehrere Pflanzen:</p><ul class="clean">${plants.map((m) => `<li>${link(m)} ${badge(m)}</li>`).join('')}</ul>`;

  // Ratgeber (Erste Hilfe, Orientierung, Wasser …)
  const species0 = findSpecies(q, aliasIndex);
  const guide = wild && !species0.length ? findGuide(q, wild.guides) : null;
  if (guide && !(isPlantTopic && has(q, /\b(welche|liste|alle|essbar|giftig)/))) return guideAnswer(guide);

  // Pflanzen-Listen
  if (wild && isPlantTopic && !species0.length) {
    let list = wild.plants;
    const d = [];
    if (has(q, /toedlich/)) { list = list.filter((m) => m.edibility === 'toedlich'); d.push('tödlich giftig'); }
    else if (has(q, /\b(giftig|gift)/)) { list = list.filter((m) => m.edibility === 'giftig' || m.edibility === 'toedlich'); d.push('giftig'); }
    else if (has(q, /\b(essbar|essen|sammeln|lecker)/)) { list = list.filter((m) => m.edibility === 'essbar' || m.edibility === 'bedingt'); d.push('essbar oder bedingt essbar'); }
    if (has(q, /beere/)) { list = list.filter((m) => m.group === 'Beeren & Nüsse' || /beere/i.test((m.features || []).join(' ') + m.description)); d.push('mit Beeren'); }
    const mo = parseMonth(q);
    if (mo) { list = list.filter((m) => m.season?.months?.includes(mo)); d.push(`Saison im ${MONTHS_LONG[mo - 1]}`); }
    return listAnswer(`${list.length} Wildpflanzen${d.length ? ': ' + esc(d.join(', ')) : ''}.`, list,
      '<p class="small muted">Nur sammeln und essen, was du zu 100 % sicher bestimmt hast.</p>');
  }

  const species = species0;

  // 3) Vergleich zweier Arten
  if (species.length >= 2 && has(q, /(unterscheid|unterschied|vergleich|verwechs| oder | vs |und)/)) {
    return compareAnswer(species[0], species[1]);
  }
  // 4) Frage zu einer bestimmten Art
  if (species.length === 1) return speciesAnswer(species[0], q);
  if (species.length > 1) {
    return `<p>Dazu passen mehrere Arten. Meinst du eine davon?</p><ul class="clean">${species.map((m) => `<li>${link(m)} ${badge(m)}</li>`).join('')}</ul>`;
  }

  // 5) Listen- und Filterfragen
  const month = parseMonth(q);
  const f = parseFeatures(q);
  const wantDeadly = has(q, /toedlich/);
  const wantToxic = has(q, /\b(giftig|giftpilz|gift)/) && !wantDeadly;
  const wantEdible = has(q, /\b(essbar|speisepilz|essen|lecker|sammeln)/);
  const wantTree = has(q, /\b(baumpilz|an baeumen|am baum)/);
  const isFind = has(q, /(gefunden|entdeckt|bestimm|was ist das|welcher pilz|welche art|sieht aus)/)
    || (f.capColor.length + f.underColor.length + f.stemColor.length + f.hymenophore.length + (f.ring ? 1 : 0) + (f.stemBase ? 1 : 0) + f.smell.length >= 2);

  // 5a) Bestimmungsversuch aus Beschreibung
  if (isFind && (f.capColor.length || f.underColor.length || f.stemColor.length || f.hymenophore.length || f.smell.length || f.ring || f.stemBase)) {
    const answers = { capColor: f.capColor, underColor: f.underColor, stemColor: f.stemColor, hymenophore: f.hymenophore, habitat: f.habitat, trees: f.trees, smell: f.smell, ring: f.ring || [], stemBase: f.stemBase || [] };
    if (month) answers.month = [String(month)];
    const res = evaluate(all, answers).slice(0, 6);
    const understood = [
      f.capColor.length && `Hutfarbe: ${f.capColor.map((c) => COLORS[c].label).join(', ')}`,
      f.underColor.length && `Farbe Unterseite: ${f.underColor.map((c) => COLORS[c].label).join(', ')}`,
      f.stemColor.length && `Stielfarbe: ${f.stemColor.map((c) => COLORS[c].label).join(', ')}`,
      f.hymenophore.length && `Unterseite: ${f.hymenophore.map((h) => HYMENOPHORE[h].split(' (')[0]).join(', ')}`,
      f.habitat.length && `Lebensraum: ${f.habitat.map((h) => HABITATS[h]).join(', ')}`,
      f.trees.length && `Bäume: ${f.trees.join(', ')}`,
      f.smell.length && `Geruch: ${f.smell.join(', ')}`,
      f.ring && `Ring: ${f.ring[0]}`,
      f.stemBase && 'Knolle/Scheide',
      month && `Monat: ${MONTHS_LONG[month - 1]}`,
    ].filter(Boolean);
    return `<div class="notice danger card"><strong>Keine Bestimmung!</strong> Ich kann nur Arten der Datenbank nennen, deren Angaben zu deiner Beschreibung passen. Ähnliche Arten können tödlich giftig sein.</div>
      <p class="small muted">Verstanden: ${esc(understood.join(' · ') || '–')}</p>
      ${res.length ? `<p>Diese Arten passen am ehesten zu deinen Angaben:</p><ul class="clean">${res.map((r) => `<li>${link(r.m)} ${badge(r.m)} – ${r.pros.length} passen, ${r.cons.length} dagegen</li>`).join('')}</ul>` : '<p>Keine Art der Datenbank passt dazu.</p>'}
      <p>Genauer geht es mit der <a href="#bestimmen">Bestimmungshilfe</a> Schritt für Schritt.</p>${SAFETY}`;
  }

  // 5b) Gefilterte Liste
  let list = all;
  const desc = [];
  if (wantDeadly) { list = list.filter((m) => m.edibility === 'toedlich'); desc.push('tödlich giftig'); }
  else if (wantToxic) { list = list.filter((m) => m.edibility === 'giftig' || m.edibility === 'toedlich'); desc.push('giftig'); }
  else if (wantEdible) { list = list.filter((m) => m.edibility === 'essbar' || m.edibility === 'bedingt'); desc.push('essbar oder bedingt essbar'); }
  if (wantTree) { list = list.filter((m) => m.habitat?.substrate === 'holz'); desc.push('wachsen an Holz'); }
  if (f.trees.length) { list = list.filter((m) => f.trees.some((t) => m.trees?.includes(t))); desc.push(`bei ${f.trees.join('/')}`); }
  if (f.habitat.length) {
    list = list.filter((m) => { const t = [...(m.habitat?.tags || [])]; if (m.habitat?.substrate === 'holz') t.push('holz'); return f.habitat.some((h) => t.includes(h)); });
    desc.push(f.habitat.map((h) => HABITATS[h]).join('/'));
  }
  if (f.hymenophore.length) { list = list.filter((m) => f.hymenophore.includes(m.hymenophore?.type)); desc.push(f.hymenophore.map((h) => HYMENOPHORE[h].split(' (')[0]).join('/')); }
  if (f.capColor.length) { list = list.filter((m) => f.capColor.some((c) => m.cap?.colors?.includes(c))); desc.push(`Hutfarbe ${f.capColor.map((c) => COLORS[c].label).join('/')}`); }
  if (f.underColor.length) { list = list.filter((m) => f.underColor.some((c) => m.hymenophore?.colors?.includes(c))); desc.push(`Unterseite ${f.underColor.map((c) => COLORS[c].label).join('/')}`); }
  if (month) { list = list.filter((m) => m.season?.months?.includes(month)); desc.push(`Saison im ${MONTHS_LONG[month - 1]}`); }

  if (desc.length) {
    list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    const title = `${list.length} ${list.length === 1 ? 'Art' : 'Arten'} in der Datenbank: ${esc(desc.join(', '))}.`;
    return listAnswer(title, list, wantEdible ? SAFETY : '');
  }

  // 6) Allgemeinwissen aus den Sicherheitshinweisen
  if (has(q, /(silberloeffel|schnecke|faustregel|regel|zwiebel|test)/)) {
    return '<p>Es gibt <b>keine</b> verlässlichen Faustregeln. Silberlöffel, Zwiebeltest, Schneckenfraß oder „schmeckt mild“ sagen nichts über die Giftigkeit aus. Nur die sichere Bestimmung aller Merkmale durch Pilzsachverständige zählt.</p>' + SAFETY;
  }
  if (has(q, /(sporenpulver|sporenabdruck)/)) {
    return '<p>Für das Sporenpulver den Hut ohne Stiel mit der Unterseite nach unten über Nacht auf weißes und dunkles Papier (oder Glas) legen und abdecken. Die Farbe des Pulvers ist ein wichtiges Bestimmungsmerkmal – z. B. weiß bei Knollenblätterpilzen, rosa bei Rötlingen, rostbraun bei Schleierlingen.</p>';
  }
  if (has(q, /(pilzberat|sachverstaendig|pruefen lassen|kontrollier)/)) {
    return '<p>Geprüfte Pilzsachverständige findest du z. B. über die Suche der Deutschen Gesellschaft für Mykologie (DGfM, dgfm-ev.de). Viele Städte bieten in der Saison kostenlose Pilzberatungen an.</p>';
  }

  return `<p>Dazu habe ich in der Datenbank leider nichts gefunden. Ich kenne nur die ${all.length} Arten von MycoNatura und ihre Merkmale.</p>`
    + helpAnswer().replace('{{count}}', all.length).replace('<p>Ich beantworte', '<p>Versuch es zum Beispiel so – ich beantworte');
}
