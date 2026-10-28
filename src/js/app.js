// MycoNatura – Hauptanwendung
// Einfache, framework-freie Single-Page-App mit Hash-Routing (#start, #lexikon, #pilz-<id> …).

import { esc, norm, safeId, uid, formatDate, todayISO, debounce, orUnknown, resizeImage, isSafeImageDataUrl } from './util.js';
import { EDIBILITY, COLORS, CAP_SHAPES, HYMENOPHORE, STEM_SHAPES, STEM_BASE, SMELLS, SPORE, HABITATS, MONTHS, MONTHS_LONG, CATEGORIES, TREES } from './vocab.js';
import { ls, favorites, recent, finds, buildExport, importData, requestPersistence, storageEstimate } from './store.js';
import { buildIndex, runSearch } from './search.js';
import { STEPS, evaluate, labelFor } from './identify.js';
import { illustrate, heroArt } from './illustration.js';
import { DONATION } from './config.js';

const APP_VERSION = '1.2.0';
const $view = document.getElementById('view');
const state = {
  data: null,
  photos: {},
  byId: new Map(),
  index: [],
  lex: { q: '', edibility: new Set(), hymenophore: new Set(), capColor: new Set(), underColor: new Set(), habitat: new Set(), month: '', substrate: '', sort: 'name', showFilters: false },
  wizard: { step: 0, answers: {}, done: false },
  pendingFind: null,
  draftPhotos: [],
};

// ---------------------------------------------------------------- Icons
const ICON = {
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.5-4.6-9.5-9.3C1 8.2 3.3 4.5 7 4.5c2 0 3.6 1.1 5 2.9 1.4-1.8 3-2.9 5-2.9 3.7 0 6 3.7 4.5 7.2C19.5 16.4 12 21 12 21Z"/></svg>',
  heartO: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M12 20s-7-4.3-8.8-8.6C1.9 8.3 3.9 5.5 7 5.5c1.9 0 3.4 1.1 5 3 1.6-1.9 3.1-3 5-3 3.1 0 5.1 2.8 3.8 5.9C19 15.7 12 20 12 20Z"/></svg>',
  search: '<svg class="s-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  magnify: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m16 16 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 5h6M9 12h6"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/><path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  mush: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 32C8 18 19 10 32 10s24 8 24 22c0 2-2 4-4 4H12c-2 0-4-2-4-4Z" fill="currentColor"/><path d="M25 36h14l-2 18c0 2-2 3-5 3s-5-1-5-3Z" fill="currentColor" opacity=".55"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3" fill="currentColor"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"/></svg>',
};

// ---------------------------------------------------------------- UI-Helfer
let toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (type ? ' ' + type : '');
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, type === 'error' ? 6000 : 3200);
}

/** Eigener Dialog (statt alert/confirm, die in manchen Umgebungen blockiert sind). */
function dialog({ title, html = '', actions = [{ label: 'OK', value: true, primary: true }] }) {
  return new Promise((resolve) => {
    const back = document.getElementById('dialog');
    document.getElementById('dialog-title').textContent = title;
    document.getElementById('dialog-body').innerHTML = html;
    const act = document.getElementById('dialog-actions');
    act.innerHTML = '';
    const close = (v) => { back.hidden = true; document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    actions.forEach((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (a.primary ? '' : a.danger ? 'danger' : 'secondary');
      b.textContent = a.label;
      b.addEventListener('click', () => close(a.value));
      act.appendChild(b);
    });
    back.hidden = false;
    back.onclick = (e) => { if (e.target === back) close(null); };
    document.addEventListener('keydown', onKey);
    act.querySelector('.btn')?.focus();
  });
}
const confirmDialog = (title, text, okLabel = 'Löschen') => dialog({
  title, html: `<p>${esc(text)}</p>`,
  actions: [{ label: 'Abbrechen', value: false }, { label: okLabel, value: true, danger: true }],
});

function badge(m) {
  const e = EDIBILITY[m.edibility] || { label: 'Unbekannt' };
  return `<span class="badge e-${esc(m.edibility)}">${esc(e.label)}</span>`;
}

/** Foto (falls vorhanden, frei lizenziert) oder eigene Illustration. */
function photoOf(m) {
  const p = state.photos[m.id];
  return p && typeof p.src === 'string' && /^assets\/photos\/[a-z0-9-]+\.(jpg|png)$/.test(p.src) ? p : null;
}
function picture(m, { title = true, eager = false } = {}) {
  const p = photoOf(m);
  if (p) return `<img src="${esc(p.src)}" alt="${title ? 'Foto: ' + esc(m.name) : ''}" ${eager ? '' : 'loading="lazy"'} decoding="async" data-mid="${esc(m.id)}">`;
  return illustrate(m, { title });
}
function photoCredit(m) {
  const p = photoOf(m);
  if (!p) return 'Schematische Illustration (eigene Grafik) – kein Foto, nicht zur Bestimmung geeignet.';
  const lic = p.licenseUrl && /^https:\/\//.test(p.licenseUrl) ? `<a href="${esc(p.licenseUrl)}" target="_blank" rel="noopener">${esc(p.license)}</a>` : esc(p.license);
  const src = p.sourceUrl && /^https:\/\//.test(p.sourceUrl) ? ` · <a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener">Wikimedia Commons</a>` : '';
  return `Foto: ${esc(p.author)} · ${lic}${src}`;
}

function donationCard() {
  if (!/^https:\/\/[^\s"'<>]+$/.test(DONATION.url || '')) return '';
  return `<section class="card donate">
    <h2>MycoNatura unterstützen</h2>
    <p>${esc(DONATION.text)}</p>
    <a class="btn" href="${esc(DONATION.url)}" target="_blank" rel="noopener">${ICON.heart} ${esc(DONATION.buttonLabel || 'Spenden')}</a>
    <p class="small muted" style="margin:10px 0 0">${DONATION.creator ? `Spende an ${esc(DONATION.creator)} · ` : ''}Freiwillig – alle Funktionen bleiben kostenlos. Externer Link: ${esc(DONATION.url.replace('https://', ''))}</p>
  </section>`;
}

function card(m) {
  const fav = favorites.has(m.id);
  return `<a class="m-card" href="#pilz-${esc(m.id)}">
    <div class="m-img">${picture(m, { title: false })}</div>
    ${fav ? `<span class="fav-dot" aria-label="Favorit">${ICON.heart}</span>` : ''}
    <div class="m-body">
      <span class="m-name">${esc(m.name)}</span>
      <span class="m-sci">${esc(m.scientific)}</span>
      ${badge(m)}
    </div>
  </a>`;
}

function emptyState(text, actionHtml = '') {
  return `<div class="card empty">${ICON.mush}<p>${text}</p>${actionHtml}</div>`;
}

function safetyNotice(compact = false) {
  return `<div class="card notice danger" role="note">
    <strong>Wichtiger Sicherheitshinweis</strong>
    ${compact
      ? 'Iss niemals einen Pilz allein auf Grundlage dieser Website. Lass jeden Fund von geprüften Pilzsachverständigen kontrollieren.'
      : 'MycoNatura ist ein Lern- und Nachschlagewerk. Eine sichere Pilzbestimmung ist nur am frischen Fund durch geprüfte Pilzsachverständige möglich. Verzehre niemals Pilze allein aufgrund von Bildern, Texten oder der Bestimmungshilfe dieser Website. Bei Verdacht auf Vergiftung: Notruf 112 bzw. Giftnotruf.'}
    <div style="margin-top:8px"><a href="#sicherheit">Giftnotruf &amp; Hinweise</a></div>
  </div>`;
}

function setTab(name) {
  document.querySelectorAll('.tabbar a').forEach((a) => {
    if (a.dataset.tab === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

const FOOTER = `<footer class="made-by">Made with <span class="love" aria-label="Liebe">♥</span> by Finn</footer>`;
function render(html, tab, title) {
  $view.innerHTML = html + FOOTER;
  $view.style.animation = 'none'; void $view.offsetWidth; $view.style.animation = '';
  setTab(tab);
  document.title = title ? `${title} – MycoNatura` : 'MycoNatura – Digitales Pilzlexikon';
}

// ---------------------------------------------------------------- Theme
function applyTheme() {
  const pref = ls.get('theme', 'system');
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
function setTheme(pref) { ls.set('theme', pref); applyTheme(); }
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
document.getElementById('theme-toggle').addEventListener('click', () => {
  const isDark = document.documentElement.dataset.theme === 'dark';
  setTheme(isDark ? 'light' : 'dark');
  toast(isDark ? 'Helles Design aktiv' : 'Dunkles Design aktiv');
});

// ---------------------------------------------------------------- Netzwerkstatus
function updateNet() {
  const pill = document.getElementById('net-status');
  pill.hidden = navigator.onLine;
}
addEventListener('online', () => { updateNet(); toast('Wieder online.'); });
addEventListener('offline', () => { updateNet(); toast('Offline – Lexikon, Suche, Bestimmung und Fundbuch funktionieren weiter.'); });

// ================================================================ VIEWS

// ---------------------------------------------------------------- Startseite
function viewHome() {
  const all = state.data.mushrooms;
  const month = new Date().getMonth() + 1;
  const seasonal = all.filter((m) => m.season?.months?.includes(month))
    .sort((a, b) => Number(b.popular) - Number(a.popular) || a.name.localeCompare(b.name, 'de')).slice(0, 12);
  const popular = all.filter((m) => m.popular);
  const rec = recent.all().map((id) => state.byId.get(id)).filter(Boolean);
  const favs = favorites.all().map((id) => state.byId.get(id)).filter(Boolean);
  const catCount = (k) => all.filter(CATEGORIES[k].test).length;

  const html = `
  <section class="hero">
        <div class="hero-content">
      <div class="eyebrow">Pilzlexikon für Mitteleuropa</div>
      <h1>Pilze bestimmen, verstehen und sicher unterscheiden.</h1>
      <p>${all.length} Arten mit Merkmalen, Verwechslungspartnern und Bestimmungshilfe. Funktioniert auch offline.</p>
      <form class="searchbox" id="home-search" role="search">
        <label class="visually-hidden" for="home-q">Pilz suchen</label>
        ${ICON.search}
        <input id="home-q" type="search" placeholder="Pilz suchen, z. B. Steinpilz, Boletus, Fichte …" autocomplete="off" enterkeyhint="search">
      </form>
    </div>
  </section>

  <div class="quick-grid">
    <a class="quick" href="#bestimmen"><span class="q-ico">${ICON.magnify}</span><span><strong>Bestimmen</strong><span>Merkmale wählen</span></span></a>
    <a class="quick" href="#fundbuch"><span class="q-ico">${ICON.book}</span><span><strong>Fundbuch</strong><span>Eigene Funde</span></span></a>
    <a class="quick" href="#favoriten"><span class="q-ico">${ICON.heartO}</span><span><strong>Favoriten</strong><span>${favs.length} gemerkt</span></span></a>
    <a class="quick" href="#sicherheit"><span class="q-ico">${ICON.shield}</span><span><strong>Sicherheit</strong><span>Giftnotruf</span></span></a>
  </div>

  <section class="section">
    <div class="section-head"><h2>Jetzt in Saison · ${esc(MONTHS_LONG[month - 1])}</h2><a href="#saison">Alle anzeigen</a></div>
    ${seasonal.length ? `<div class="hscroll">${seasonal.map(card).join('')}</div>` : emptyState('In diesem Monat sind kaum Arten aus der Datenbank aktiv.')}
  </section>

  <section class="section">
    <div class="section-head"><h2>Kategorien</h2><a href="#lexikon">Lexikon</a></div>
    <div class="cat-grid">
      ${Object.entries(CATEGORIES).map(([k, c]) => `
        <a class="cat ${c.cls}" href="#kategorie-${k}">
          <svg class="cat-art" viewBox="0 0 64 64" aria-hidden="true"><path d="M8 32C8 18 19 10 32 10s24 8 24 22c0 2-2 4-4 4H12c-2 0-4-2-4-4Z" fill="#fff" opacity=".16"/><path d="M25 36h14l-2 18c0 2-2 3-5 3s-5-1-5-3Z" fill="#fff" opacity=".12"/></svg>
          <strong>${esc(c.label)}</strong><span>${catCount(k)} Arten · ${esc(c.desc)}</span>
        </a>`).join('')}
    </div>
  </section>

  <section class="section">
    <div class="section-head"><h2>Beliebte Pilze</h2></div>
    <div class="hscroll">${popular.map(card).join('')}</div>
  </section>

  <section class="section">
    <div class="section-head"><h2>Zuletzt angesehen</h2>${rec.length ? '<button class="btn ghost small" data-action="clear-recent" type="button">Leeren</button>' : ''}</div>
    ${rec.length ? `<div class="hscroll">${rec.map(card).join('')}</div>` : emptyState('Noch nichts angesehen. Öffne eine Art im <a href="#lexikon">Lexikon</a>.')}
  </section>

  <section class="section">
    <div class="section-head"><h2>Deine Favoriten</h2>${favs.length ? '<a href="#favoriten">Alle</a>' : ''}</div>
    ${favs.length ? `<div class="hscroll">${favs.map(card).join('')}</div>` : emptyState('Tippe auf einer Detailseite auf „Merken“, um Arten hier zu sammeln.')}
  </section>

  <section class="section">${safetyNotice()}</section>
  ${donationCard() ? `<div class="section">${donationCard()}</div>` : ''}`;
  render(html, 'start');

  document.getElementById('home-search').addEventListener('submit', (e) => {
    e.preventDefault();
    state.lex.q = document.getElementById('home-q').value.trim();
    location.hash = 'lexikon';
  });
}

// ---------------------------------------------------------------- Lexikon
function chip(group, value, label, pressed, swatch) {
  return `<button type="button" class="chip" data-filter="${esc(group)}" data-value="${esc(value)}" aria-pressed="${pressed}">
    ${swatch ? `<span class="sw" style="background:${esc(swatch)}"></span>` : ''}${esc(label)}</button>`;
}

function viewLexikon(preset) {
  const L = state.lex;
  if (preset) {
    // Kategorie- oder Saisonvoreinstellung
    L.q = ''; L.edibility = new Set(); L.hymenophore = new Set(); L.capColor = new Set(); L.underColor = new Set(); L.habitat = new Set(); L.month = ''; L.substrate = '';
    if (preset === 'speisepilze') L.edibility = new Set(['essbar', 'bedingt']);
    if (preset === 'giftpilze') L.edibility = new Set(['giftig', 'toedlich']);
    if (preset === 'ungeniessbar') L.edibility = new Set(['ungeniessbar']);
    if (preset === 'baumpilze') L.substrate = 'holz';
    if (preset === 'roehrlinge') L.hymenophore = new Set(['roehren']);
    if (preset === 'lamellenpilze') L.hymenophore = new Set(['lamellen']);
    if (preset === 'saison') L.month = String(new Date().getMonth() + 1);
    L.showFilters = true;
  }
  const colorChips = (group) => Object.entries(COLORS).map(([k, v]) => chip(group, k, v.label, L[group].has(k), v.hex)).join('');
  const html = `
    <h1>Pilzlexikon</h1>
    <form class="searchbox inline" role="search" id="lex-form">
      <label class="visually-hidden" for="lex-q">Suche im Lexikon</label>
      ${ICON.search}
      <input id="lex-q" type="search" value="${esc(L.q)}" placeholder="Name, lateinisch, Synonym, Baum, Farbe …" autocomplete="off" enterkeyhint="search">
    </form>
    <div class="toolbar">
      <button type="button" class="btn secondary small" id="toggle-filters" aria-expanded="${L.showFilters}" aria-controls="filters">Filter <span id="filter-count"></span></button>
      <span class="result-count" id="result-count" aria-live="polite"></span>
      <label class="small">Sortieren
        <select class="sel" id="lex-sort">
          <option value="name" ${L.sort === 'name' ? 'selected' : ''}>A–Z</option>
          <option value="wissenschaftlich" ${L.sort === 'wissenschaftlich' ? 'selected' : ''}>Wissenschaftlich</option>
          <option value="essbarkeit" ${L.sort === 'essbarkeit' ? 'selected' : ''}>Essbarkeit</option>
          <option value="relevanz" ${L.sort === 'relevanz' ? 'selected' : ''}>Relevanz (Suche)</option>
        </select>
      </label>
    </div>
    <div id="filters" class="card filter-panel" ${L.showFilters ? '' : 'hidden'}>
      <div class="filter-group"><h3>Essbarkeit &amp; Giftigkeit</h3><div class="chips">
        ${Object.entries(EDIBILITY).map(([k, v]) => chip('edibility', k, v.label, L.edibility.has(k))).join('')}
      </div></div>
      <div class="filter-group"><h3>Unterseite</h3><div class="chips">
        ${Object.entries(HYMENOPHORE).map(([k, v]) => chip('hymenophore', k, v.split(' (')[0], L.hymenophore.has(k))).join('')}
      </div></div>
      <div class="filter-group"><h3>Hutfarbe</h3><div class="chips">${colorChips('capColor')}</div></div>
      <div class="filter-group"><h3>Lamellen- / Röhrenfarbe</h3><div class="chips">${colorChips('underColor')}</div></div>
      <div class="filter-group"><h3>Lebensraum</h3><div class="chips">
        ${Object.entries(HABITATS).map(([k, v]) => chip('habitat', k, v, L.habitat.has(k))).join('')}
      </div></div>
      <div class="filter-group"><h3>Saison</h3>
        <select class="sel" id="lex-month" aria-label="Monat">
          <option value="">Alle Monate</option>
          ${MONTHS_LONG.map((n, i) => `<option value="${i + 1}" ${String(i + 1) === L.month ? 'selected' : ''}>${n}</option>`).join('')}
        </select>
      </div>
      <div><button type="button" class="btn ghost small" id="reset-filters">Alle Filter zurücksetzen</button></div>
    </div>
    <p id="substrate-note" class="small muted" hidden>Nur Baumpilze (Fruchtkörper direkt an Holz). <button type="button" class="btn ghost small" id="clear-substrate">Aufheben</button></p>
    <div id="results" class="grid" style="margin-top:14px"></div>`;
  render(html, 'lexikon', 'Lexikon');

  const $q = document.getElementById('lex-q');
  const $res = document.getElementById('results');
  const update = () => {
    const list = runSearch(state.index, { ...L, sort: L.q && L.sort === 'name' ? 'relevanz' : L.sort });
    document.getElementById('result-count').textContent = `${list.length} ${list.length === 1 ? 'Art' : 'Arten'}`;
    const n = L.edibility.size + L.hymenophore.size + L.capColor.size + L.underColor.size + L.habitat.size + (L.month ? 1 : 0) + (L.substrate ? 1 : 0);
    document.getElementById('substrate-note').hidden = !L.substrate;
    document.getElementById('filter-count').textContent = n ? `(${n})` : '';
    $res.innerHTML = list.length ? list.map(card).join('')
      : `<div style="grid-column:1/-1">${emptyState('Keine Art passt zu Suche und Filtern.', '<button class="btn secondary" type="button" id="reset-2">Filter zurücksetzen</button>')}</div>`;
    document.getElementById('reset-2')?.addEventListener('click', reset);
  };
  const reset = () => {
    L.q = ''; L.edibility.clear(); L.hymenophore.clear(); L.capColor.clear(); L.underColor.clear(); L.habitat.clear(); L.month = ''; L.substrate = '';
    viewLexikon();
  };
  $q.addEventListener('input', debounce(() => { L.q = $q.value; update(); }, 60));
  document.getElementById('lex-form').addEventListener('submit', (e) => { e.preventDefault(); $q.blur(); });
  document.getElementById('lex-sort').addEventListener('change', (e) => { L.sort = e.target.value; update(); });
  document.getElementById('lex-month').addEventListener('change', (e) => { L.month = e.target.value; update(); });
  document.getElementById('reset-filters').addEventListener('click', reset);
  document.getElementById('clear-substrate').addEventListener('click', () => { L.substrate = ''; update(); });
  document.getElementById('toggle-filters').addEventListener('click', (e) => {
    L.showFilters = !L.showFilters;
    document.getElementById('filters').hidden = !L.showFilters;
    e.currentTarget.setAttribute('aria-expanded', String(L.showFilters));
  });
  document.getElementById('filters').addEventListener('click', (e) => {
    const b = e.target.closest('.chip[data-filter]');
    if (!b) return;
    const set = L[b.dataset.filter];
    if (set.has(b.dataset.value)) set.delete(b.dataset.value); else set.add(b.dataset.value);
    b.setAttribute('aria-pressed', String(set.has(b.dataset.value)));
    update();
  });
  update();
  if (!preset && L.q) $q.focus();
}

// ---------------------------------------------------------------- Detailseite
function monthsBar(months = []) {
  const now = new Date().getMonth() + 1;
  return `<div class="months" aria-label="Saison">${MONTHS.map((n, i) =>
    `<span class="${months.includes(i + 1) ? 'on' : ''} ${now === i + 1 ? 'now' : ''}" title="${MONTHS_LONG[i]}${months.includes(i + 1) ? ': Saison' : ''}">${n.slice(0, 1)}</span>`).join('')}</div>`;
}
const listLabels = (keys, dict) => (keys && keys.length ? keys.map((k) => (typeof dict[k] === 'string' ? dict[k] : dict[k]?.label) || k) : []);
function fact(label, value) { return `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`; }
function textOr(t) { return t ? esc(t) : '<span class="unknown">Unbekannt / nicht angegeben</span>'; }

function viewDetail(id) {
  const m = state.byId.get(id);
  if (!m) { viewNotFound('Diese Pilzart gibt es in der Datenbank nicht.'); return; }
  recent.add(m.id);
  const fav = favorites.has(m.id);
  const dangerous = m.edibility === 'giftig' || m.edibility === 'toedlich';
  const src = (m.sources || []).map((k) => state.data.sources[k]).filter(Boolean);

  const html = `
  <p><a href="#lexikon" class="btn ghost small">${ICON.back} Lexikon</a></p>
  <div class="detail-layout">
    <div class="detail-hero">
      <div class="d-img">${picture(m, { eager: true })}</div>
      <p class="img-caption">${photoCredit(m)}</p>
      <div class="d-head">
        <h1>${esc(m.name)}</h1>
        <p class="d-sci">${esc(m.scientific)}</p>
        ${badge(m)}
        <p style="margin-top:12px">${esc(m.description)}</p>
        <div class="d-actions">
          <button type="button" class="btn ${fav ? '' : 'secondary'}" id="fav-btn" aria-pressed="${fav}">${fav ? ICON.heart : ICON.heartO}<span>${fav ? 'Gemerkt' : 'Merken'}</span></button>
          <button type="button" class="btn secondary" id="as-find">${ICON.plus}<span>Als Fund eintragen</span></button>
        </div>
      </div>
    </div>

    <div class="facts">
      <div class="card notice ${dangerous ? 'danger' : m.edibility === 'bedingt' ? 'warn' : ''}">
        <strong>Essbarkeit: ${esc(EDIBILITY[m.edibility]?.label || 'Unbekannt')}</strong>
        ${textOr(m.edibilityNote)}
        ${m.edibility === 'essbar' || m.edibility === 'bedingt' ? '<p class="small" style="margin:8px 0 0">Wildpilze grundsätzlich nur sicher bestimmt, frisch und gut durchgegart verzehren. Im Zweifel: Pilzberatung aufsuchen.</p>' : ''}
      </div>

      <section class="card fact-sec"><h2>Namen</h2><dl class="fact-list">
        ${fact('Deutscher Name', esc(m.name))}
        ${fact('Wissenschaftlicher Name', `<i>${esc(m.scientific)}</i>`)}
        ${fact('Synonyme & weitere Namen', orUnknown(m.synonyms))}
        ${fact('Familie', textOr(m.family))}
      </dl></section>

      <section class="card fact-sec"><h2>Merkmale</h2><dl class="fact-list">
        ${fact('Hut', `${textOr(m.cap?.text)}<div class="tag-list" style="margin-top:6px">${listLabels(m.cap?.shape, CAP_SHAPES).concat(listLabels(m.cap?.colors, COLORS)).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>`)}
        ${fact(HYMENOPHORE[m.hymenophore?.type]?.split(' (')[0] || 'Unterseite', textOr(m.hymenophore?.text))}
        ${fact('Stiel', textOr(m.stem?.text) + (typeof m.stem?.ring === 'boolean' ? `<br><span class="small muted">${m.stem.ring ? 'Ring / Ringzone vorhanden' : 'Kein Ring'}</span>` : ''))}
        ${fact('Stielbasis', textOr(m.stem?.baseText || STEM_BASE[m.stem?.base]))}
        ${fact('Fleisch', textOr(m.flesh?.text))}
        ${fact('Geruch & Geschmack', textOr(m.smell?.text))}
        ${fact('Sporenpulver', textOr(m.spore?.text))}
      </dl></section>

      <section class="card fact-sec"><h2>Vorkommen</h2><dl class="fact-list">
        ${fact('Lebensraum', textOr(m.habitat?.text))}
        ${fact('Typische Begleitbäume', orUnknown(m.trees?.length ? m.trees : (m.habitat?.substrate === 'boden' && ['wiese', 'park'].some((t) => m.habitat?.tags?.includes(t)) ? ['Nicht an bestimmte Baumarten gebunden'] : [])))}
        ${fact('Verbreitung', textOr(m.distribution))}
        ${fact('Saison', `${textOr(m.season?.text)}${monthsBar(m.season?.months)}`)}
      </dl></section>

      <section class="card fact-sec"><h2>Wichtige Unterscheidungsmerkmale</h2>
        ${m.keyFeatures?.length ? `<ul class="clean">${m.keyFeatures.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : '<p class="unknown">Unbekannt / nicht angegeben</p>'}
      </section>

      <section class="card fact-sec"><h2>Ähnliche Arten &amp; Verwechslungspartner</h2>
        ${m.lookalikes?.length ? m.lookalikes.map((l) => {
          const t = l.id && state.byId.get(l.id);
          return `<div class="look ${l.dangerous ? 'dangerous' : ''}">
            <span class="l-ico" aria-hidden="true">${l.dangerous ? '!' : '≈'}</span>
            <div>${t ? `<a href="#pilz-${esc(t.id)}">${esc(l.name)}</a>` : `<strong>${esc(l.name)}</strong>`}
              ${l.dangerous ? ' <span class="badge e-toedlich">Gefährlich</span>' : ''}
              <div class="small">${esc(l.note)}</div></div>
          </div>`;
        }).join('') : '<p class="muted">Keine nennenswerten Verwechslungspartner in der Datenbank hinterlegt. Das bedeutet nicht, dass keine existieren.</p>'}
      </section>

      <section class="card fact-sec"><h2>Quellen &amp; Stand der Angaben</h2>
        <ul class="clean small">${src.map((s) => `<li>${esc(s.title)}${s.url ? ` – <a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.url.replace('https://', ''))}</a>` : ''}</li>`).join('')}</ul>
        <p class="small muted" style="margin-top:10px">Stand: ${esc(m.updated || 'unbekannt')}. ${esc(state.data.meta.sourceNote)}</p>
      </section>

      ${safetyNotice(true)}
    </div>
  </div>`;
  render(html, 'lexikon', m.name);

  document.getElementById('fav-btn').addEventListener('click', (e) => {
    const on = favorites.toggle(m.id);
    const b = e.currentTarget;
    b.className = 'btn ' + (on ? '' : 'secondary');
    b.setAttribute('aria-pressed', String(on));
    b.innerHTML = `${on ? ICON.heart : ICON.heartO}<span>${on ? 'Gemerkt' : 'Merken'}</span>`;
    toast(on ? `${m.name} gemerkt` : `${m.name} aus Favoriten entfernt`);
  });
  document.getElementById('as-find').addEventListener('click', () => {
    state.pendingFind = { speciesId: m.id, title: m.name };
    location.hash = 'fund-neu';
  });
}

// ---------------------------------------------------------------- Favoriten
function viewFavorites() {
  const favs = favorites.all().map((id) => state.byId.get(id)).filter(Boolean);
  render(`<h1>Favoriten</h1>
    <p class="muted">Gemerkte Arten werden lokal auf diesem Gerät gespeichert.</p>
    ${favs.length ? `<div class="grid">${favs.map(card).join('')}</div>` : emptyState('Noch keine Favoriten.', '<a class="btn" href="#lexikon">Lexikon öffnen</a>')}`,
  'mehr', 'Favoriten');
}

// ---------------------------------------------------------------- Bestimmungshilfe
function viewIdentify() {
  const W = state.wizard;
  if (W.done) { viewIdentifyResults(); return; }
  const step = STEPS[W.step];
  const chosen = new Set(W.answers[step.key] || []);
  const totalAnswered = Object.values(W.answers).filter((a) => a.length).length;
  const live = totalAnswered ? evaluate(state.data.mushrooms, W.answers).length : state.data.mushrooms.length;
  const summary = STEPS.filter((s) => (W.answers[s.key] || []).length).map((s) =>
    `<span class="tag">${esc(s.title)}: ${esc(W.answers[s.key].map((v) => labelFor(s.key, v)).join(', '))} <button type="button" data-clear="${esc(s.key)}" aria-label="${esc(s.title)} entfernen">×</button></span>`).join('');

  const html = `
    <h1>Bestimmungshilfe</h1>
    ${W.step === 0 && !totalAnswered ? `<div class="card notice warn" style="margin-bottom:14px"><strong>Bitte beachten</strong>
      Die Bestimmungshilfe vergleicht deine Angaben nur mit den ${state.data.mushrooms.length} Arten dieser Datenbank. In der Natur gibt es tausende Arten – dein Pilz ist eventuell gar nicht enthalten. Das Ergebnis ist <b>keine Bestimmung</b> und niemals eine Freigabe zum Verzehr.</div>` : ''}
    <div class="card">
      <div class="step-head"><span class="small muted">Schritt ${W.step + 1} von ${STEPS.length}</span><span class="small muted">${live} passende Kandidaten</span></div>
      <div class="wizard-progress" aria-hidden="true"><div style="width:${((W.step) / STEPS.length) * 100}%"></div></div>
      <h2 id="step-title">${esc(step.title)}</h2>
      <p class="muted small">${esc(step.hint)} Mehrfachauswahl möglich – oder Schritt überspringen.</p>
      <div class="chips" role="group" aria-labelledby="step-title" id="step-options">
        ${Object.entries(step.options).map(([k, label]) => `
          <button type="button" class="chip" data-v="${esc(k)}" aria-pressed="${chosen.has(k)}">
            ${step.colors ? `<span class="sw" style="background:${esc(COLORS[k].hex)}"></span>` : ''}${esc(label)}</button>`).join('')}
      </div>
      <div class="step-nav">
        <button type="button" class="btn secondary" id="w-back" ${W.step === 0 ? 'disabled' : ''}>${ICON.back} Zurück</button>
        <div class="btn-row">
          <button type="button" class="btn ghost" id="w-results" ${totalAnswered ? '' : 'disabled'}>Ergebnisse</button>
          <button type="button" class="btn" id="w-next">${W.step === STEPS.length - 1 ? 'Auswerten' : chosen.size ? 'Weiter' : 'Überspringen'}</button>
        </div>
      </div>
    </div>
    ${summary ? `<div class="section"><h3>Deine Angaben</h3><div class="summary-chips" id="summary">${summary}</div>
      <button type="button" class="btn ghost small" id="w-reset" style="margin-top:10px">Alles zurücksetzen</button></div>` : ''}`;
  render(html, 'bestimmen', 'Bestimmungshilfe');

  document.getElementById('step-options').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    const arr = new Set(W.answers[step.key] || []);
    if (arr.has(b.dataset.v)) arr.delete(b.dataset.v); else arr.add(b.dataset.v);
    W.answers[step.key] = [...arr];
    viewIdentify();
  });
  document.getElementById('w-back').addEventListener('click', () => { W.step = Math.max(0, W.step - 1); viewIdentify(); });
  document.getElementById('w-next').addEventListener('click', () => {
    if (W.step < STEPS.length - 1) { W.step++; viewIdentify(); }
    else { W.done = true; viewIdentify(); }
    scrollTo({ top: 0 });
  });
  document.getElementById('w-results').addEventListener('click', () => { W.done = true; viewIdentify(); scrollTo({ top: 0 }); });
  document.getElementById('w-reset')?.addEventListener('click', () => { state.wizard = { step: 0, answers: {}, done: false }; viewIdentify(); });
  document.getElementById('summary')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-clear]'); if (!b) return;
    delete W.answers[b.dataset.clear]; viewIdentify();
  });
}

function viewIdentifyResults() {
  const W = state.wizard;
  const res = evaluate(state.data.mushrooms, W.answers);
  const answered = STEPS.filter((s) => (W.answers[s.key] || []).length).length;
  const top = res.slice(0, 15);
  const html = `
    <h1>Mögliche Kandidaten</h1>
    <div class="card notice danger"><strong>Keine sichere Bestimmung!</strong>
      Die Liste zeigt nur, welche Arten der Datenbank mit deinen ${answered} Angaben übereinstimmen – ohne Wahrscheinlichkeiten. Ähnlich aussehende Arten können tödlich giftig sein. Iss keinen Pilz auf Grundlage dieses Ergebnisses; lass ihn von Pilzsachverständigen prüfen.</div>
    <div class="toolbar"><span class="result-count">${res.length} Arten mit mindestens einer Übereinstimmung${res.length > 15 ? ' (Top 15 angezeigt)' : ''}</span>
      <div class="btn-row"><button type="button" class="btn secondary small" id="r-edit">Angaben ändern</button>
      <button type="button" class="btn ghost small" id="r-new">Neu starten</button></div></div>
    ${top.length ? top.map((r) => {
      const bars = Array.from({ length: r.answered }, (_, i) => `<i class="${i < r.pros.length ? 'p' : i < r.pros.length + r.cons.length ? 'c' : ''}"></i>`).join('');
      return `<div class="card cand">
        <a class="c-img" href="#pilz-${esc(r.m.id)}" aria-hidden="true" tabindex="-1">${picture(r.m, { title: false })}</a>
        <div>
          <h3><a href="#pilz-${esc(r.m.id)}">${esc(r.m.name)}</a></h3>
          <div class="m-sci small muted"><i>${esc(r.m.scientific)}</i></div>
          ${badge(r.m)}
          <div class="score-bar" aria-hidden="true">${bars}</div>
          <p class="match-line"><span class="pro">${r.pros.length} passen</span> · <span class="con">${r.cons.length} sprechen dagegen</span>${r.unknown.length ? ` · ${r.unknown.length} ohne Angabe` : ''}</p>
          ${r.pros.length ? `<p class="match-line"><span class="pro">✓ Passt:</span> ${r.pros.map((p) => `${esc(p.step)} (${esc(p.text)})`).join('; ')}</p>` : ''}
          ${r.cons.length ? `<p class="match-line"><span class="con">✗ Dagegen:</span> ${r.cons.map((p) => `${esc(p.step)} – ${esc(p.text)}`).join('; ')}</p>` : ''}
          ${r.m.lookalikes?.some((l) => l.dangerous) ? `<p class="match-line"><span class="con">⚠ Gefährliche Verwechslung:</span> ${r.m.lookalikes.filter((l) => l.dangerous).map((l) => esc(l.name)).join(', ')}</p>` : ''}
        </div>
      </div>`;
    }).join('') : emptyState('Keine Art der Datenbank passt zu deinen Angaben. Prüfe die Merkmale oder lass Schritte aus.')}`;
  render(html, 'bestimmen', 'Kandidaten');
  document.getElementById('r-edit').addEventListener('click', () => { W.done = false; viewIdentify(); });
  document.getElementById('r-new').addEventListener('click', () => { state.wizard = { step: 0, answers: {}, done: false }; viewIdentify(); });
}

// ---------------------------------------------------------------- Fundbuch
async function viewFundbuch() {
  render(`<h1>Fundbuch</h1><div class="loading"><div class="spinner"></div></div>`, 'fundbuch', 'Fundbuch');
  let list = [];
  try { list = await finds.all(); }
  catch (e) { render(`<h1>Fundbuch</h1><div class="card notice danger"><strong>Fundbuch konnte nicht geladen werden</strong>${esc(e.message)}</div>`, 'fundbuch'); return; }
  const filter = ls.get('finds.onlyFav', false);
  const shown = filter ? list.filter((f) => f.favorite) : list;
  const html = `
    <h1>Fundbuch</h1>
    <p class="muted">Deine Funde bleiben ausschließlich in diesem Browser auf diesem Gerät gespeichert.${finds.usingFallback ? ' <b>Hinweis:</b> IndexedDB ist nicht verfügbar, es wird der kleinere LocalStorage genutzt – speichere nur wenige Fotos.' : ''}</p>
    <div class="btn-row" style="margin:14px 0">
      <a class="btn" href="#fund-neu">${ICON.plus} Neuer Fund</a>
      <button type="button" class="btn secondary" id="f-export">Exportieren</button>
      <label class="btn secondary" for="f-import" style="position:relative">Importieren<input id="f-import" type="file" accept="application/json,.json" class="visually-hidden"></label>
    </div>
    <div class="toolbar"><span class="result-count">${shown.length} ${shown.length === 1 ? 'Fund' : 'Funde'}</span>
      <div class="seg" role="group" aria-label="Anzeige">
        <button type="button" data-fav="0" aria-pressed="${!filter}">Alle</button>
        <button type="button" data-fav="1" aria-pressed="${filter}">Favoriten</button>
      </div></div>
    ${shown.length ? `<div class="card">${shown.map((f) => {
      const sp = f.speciesId && state.byId.get(f.speciesId);
      return `<a class="find-item" href="#fund-${esc(f.id)}">
        <span class="f-img">${f.photos?.[0] && isSafeImageDataUrl(f.photos[0]) ? `<img src="${esc(f.photos[0])}" alt="" loading="lazy">` : ICON.mush}</span>
        <span><strong>${f.favorite ? '★ ' : ''}${esc(f.title)}</strong>
          <span class="small muted">${f.date ? esc(formatDate(f.date)) : 'Ohne Datum'}${f.place ? ' · ' + esc(f.place) : ''}</span>
          ${sp ? `<br>${badge(sp)}` : ''}</span>
        <span class="chev" aria-hidden="true">›</span></a>`;
    }).join('')}</div>` : emptyState(filter ? 'Keine favorisierten Funde.' : 'Noch keine Funde eingetragen.', '<a class="btn" href="#fund-neu">Ersten Fund eintragen</a>')}`;
  render(html, 'fundbuch', 'Fundbuch');

  document.querySelectorAll('[data-fav]').forEach((b) => b.addEventListener('click', () => { ls.set('finds.onlyFav', b.dataset.fav === '1'); viewFundbuch(); }));
  document.getElementById('f-export').addEventListener('click', exportData);
  document.getElementById('f-import').addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      if (file.size > 200 * 1024 * 1024) throw new Error('Datei ist zu groß.');
      const res = await importData(await file.text());
      toast(`${res.ok} Funde importiert${res.failed ? `, ${res.failed} fehlerhaft übersprungen` : ''}.`);
      viewFundbuch();
    } catch (err) { toast('Import fehlgeschlagen: ' + err.message, 'error'); }
  });
}

async function exportData() {
  try {
    const data = await buildExport();
    const text = JSON.stringify(data, null, 1);
    const name = `myconatura-export-${todayISO()}.json`;
    let downloaded = false;
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      downloaded = true;
    } catch { downloaded = false; }
    const choice = await dialog({
      title: 'Export erstellt',
      html: `<p>${downloaded ? `Die Datei <b>${esc(name)}</b> wurde zum Download angeboten. Auf dem iPhone findest du sie in der Dateien-App unter „Downloads“.` : 'Der Download ist hier nicht möglich.'}</p>
             <p class="small muted">Falls kein Download erschienen ist, kannst du die Daten auch als Text kopieren und z. B. in einer Notiz sichern (${data.finds.length} Funde, ${Math.round(text.length / 1024)} KB).</p>`,
      actions: [{ label: 'Als Text kopieren', value: 'copy' }, { label: 'Fertig', value: 'ok', primary: true }],
    });
    if (choice === 'copy') {
      try { await navigator.clipboard.writeText(text); toast('Exportdaten in die Zwischenablage kopiert.'); }
      catch {
        await dialog({ title: 'Exportdaten', html: `<p class="small">Text markieren und kopieren:</p><textarea class="code" readonly>${esc(text.slice(0, 2_000_000))}</textarea>` });
      }
    }
  } catch (e) { toast('Export fehlgeschlagen: ' + e.message, 'error'); }
}

async function viewFindDetail(id) {
  const f = await finds.get(id).catch(() => null);
  if (!f) { viewNotFound('Dieser Fund wurde nicht gefunden (evtl. gelöscht).'); return; }
  const sp = f.speciesId && state.byId.get(f.speciesId);
  const traitLabels = { capColor: 'Hutfarbe', hymenophore: 'Unterseite', smell: 'Geruch', habitat: 'Lebensraum', tree: 'Begleitbaum', spore: 'Sporenpulver', size: 'Größe' };
  const traitText = (k, v) => ({ capcolor: COLORS[v]?.label, hymenophore: HYMENOPHORE[v]?.split(' (')[0], smell: SMELLS[v], habitat: HABITATS[v], spore: SPORE[v] }[k.toLowerCase()] || v);
  const html = `
    <p><a href="#fundbuch" class="btn ghost small">${ICON.back} Fundbuch</a></p>
    <div class="card">
      <h1>${f.favorite ? '★ ' : ''}${esc(f.title)}</h1>
      <p class="muted">${f.date ? esc(formatDate(f.date)) : 'Ohne Datum'}${f.place ? ' · ' + esc(f.place) : ''}</p>
      ${sp ? `<p>Zugeordnete Art: <a href="#pilz-${esc(sp.id)}">${esc(sp.name)}</a> ${badge(sp)}</p><p class="small muted">Die Zuordnung ist deine eigene Einschätzung, keine geprüfte Bestimmung.</p>` : '<p class="muted">Keiner Art zugeordnet.</p>'}
      ${f.photos?.length ? `<div class="gallery">${f.photos.filter(isSafeImageDataUrl).map((p, i) => `<img src="${esc(p)}" alt="Foto ${i + 1} von ${esc(f.title)}">`).join('')}</div>` : ''}
      <dl class="fact-list" style="margin-top:16px">
        ${f.lat !== null && f.lon !== null ? fact('Koordinaten', `${esc(f.lat.toFixed(5))}, ${esc(f.lon.toFixed(5))}`) : ''}
        ${Object.entries(f.traits || {}).filter(([, v]) => v).map(([k, v]) => fact(traitLabels[k] || traitLabels[Object.keys(traitLabels).find((x) => x.toLowerCase() === k)] || k, esc(traitText(k, v)))).join('')}
        ${fact('Notizen', f.notes ? esc(f.notes).replace(/\n/g, '<br>') : '<span class="unknown">Keine Notizen</span>')}
      </dl>
      <div class="btn-row" style="margin-top:16px">
        <a class="btn" href="#fund-bearbeiten-${esc(f.id)}">Bearbeiten</a>
        <button type="button" class="btn secondary" id="fd-fav">${f.favorite ? 'Favorit entfernen' : 'Als Favorit markieren'}</button>
        <button type="button" class="btn danger" id="fd-del">Löschen</button>
      </div>
    </div>`;
  render(html, 'fundbuch', f.title);
  document.getElementById('fd-fav').addEventListener('click', async () => {
    try { await finds.put({ ...f, favorite: !f.favorite }); viewFindDetail(f.id); } catch (e) { toast(e.message, 'error'); }
  });
  document.getElementById('fd-del').addEventListener('click', async () => {
    if (!(await confirmDialog('Fund löschen?', `„${f.title}“ wird inklusive Fotos dauerhaft von diesem Gerät gelöscht.`))) return;
    try { await finds.remove(f.id); toast('Fund gelöscht.'); location.hash = 'fundbuch'; } catch (e) { toast(e.message, 'error'); }
  });
}

async function viewFindForm(id) {
  let f = null;
  if (id) {
    f = await finds.get(id).catch(() => null);
    if (!f) { viewNotFound('Dieser Fund wurde nicht gefunden.'); return; }
  }
  const pre = !f && state.pendingFind ? state.pendingFind : {};
  state.pendingFind = null;
  const v = f || { title: pre.title || '', speciesId: pre.speciesId || '', date: todayISO(), place: '', lat: null, lon: null, notes: '', traits: {}, photos: [], favorite: false };
  state.draftPhotos = [...(v.photos || [])];
  const opt = (dict, sel) => `<option value="">– nicht angegeben –</option>` + Object.entries(dict).map(([k, l]) => `<option value="${esc(k)}" ${sel === k ? 'selected' : ''}>${esc(typeof l === 'string' ? l : l.label)}</option>`).join('');
  const t = v.traits || {};
  const species = [...state.data.mushrooms].sort((a, b) => a.name.localeCompare(b.name, 'de'));

  const html = `
    <p><a href="${f ? `#fund-${esc(f.id)}` : '#fundbuch'}" class="btn ghost small">${ICON.back} Abbrechen</a></p>
    <h1>${f ? 'Fund bearbeiten' : 'Neuer Fund'}</h1>
    <form class="form card" id="find-form" novalidate>
      <div class="field"><label for="ff-title">Bezeichnung *</label>
        <input class="input" id="ff-title" maxlength="120" required value="${esc(v.title)}" placeholder="z. B. Brauner Röhrling am Waldweg"></div>
      <div class="field"><label for="ff-species">Vermutete Art</label>
        <select id="ff-species"><option value="">Unbestimmt</option>${species.map((m) => `<option value="${esc(m.id)}" ${v.speciesId === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>
        <div class="hint">Nur deine Vermutung – keine Bestimmung.</div></div>
      <div class="field"><label for="ff-date">Funddatum</label>
        <input class="input" id="ff-date" type="date" value="${esc(v.date)}"></div>
      <div class="field"><label for="ff-place">Fundort (optional)</label>
        <input class="input" id="ff-place" maxlength="200" value="${esc(v.place)}" placeholder="z. B. Buchenwald am Nordhang">
        <div class="btn-row" style="margin-top:8px">
          <button type="button" class="btn secondary small" id="ff-geo">${ICON.pin} Standort übernehmen</button>
          <button type="button" class="btn ghost small" id="ff-geo-clear" ${v.lat === null ? 'hidden' : ''}>Koordinaten entfernen</button>
        </div>
        <div class="hint" id="ff-geo-info">${v.lat !== null && v.lat !== undefined ? `Gespeichert: ${Number(v.lat).toFixed(5)}, ${Number(v.lon).toFixed(5)}` : 'Koordinaten werden nur lokal gespeichert.'}</div>
        <input type="hidden" id="ff-lat" value="${v.lat ?? ''}"><input type="hidden" id="ff-lon" value="${v.lon ?? ''}"></div>
      <div class="field"><span class="label">Fotos</span>
        <div class="photo-grid" id="ff-photos"></div>
        <div class="hint">Fotos werden verkleinert (max. 1280 px) und nur auf diesem Gerät gespeichert. Max. 12 Fotos.</div></div>
      <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label">Merkmale</legend>
        <div class="form" style="gap:10px">
          <label class="small">Hutfarbe<select id="ff-t-capColor">${opt(COLORS, t.capcolor)}</select></label>
          <label class="small">Unterseite<select id="ff-t-hymenophore">${opt(HYMENOPHORE, t.hymenophore)}</select></label>
          <label class="small">Geruch<select id="ff-t-smell">${opt(SMELLS, t.smell)}</select></label>
          <label class="small">Sporenpulver<select id="ff-t-spore">${opt(SPORE, t.spore)}</select></label>
          <label class="small">Lebensraum<select id="ff-t-habitat">${opt(HABITATS, t.habitat)}</select></label>
          <label class="small">Begleitbaum<select id="ff-t-tree">${opt(Object.fromEntries(TREES.map((x) => [x, x])), t.tree)}</select></label>
          <label class="small">Größe / Hutdurchmesser<input class="input" id="ff-t-size" maxlength="60" value="${esc(t.size || '')}" placeholder="z. B. 8 cm"></label>
        </div></fieldset>
      <div class="field"><label for="ff-notes">Notizen</label>
        <textarea class="textarea" id="ff-notes" maxlength="5000" placeholder="Beobachtungen, Begleitpflanzen, Wetter …">${esc(v.notes)}</textarea></div>
      <label class="field" style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="ff-fav" ${v.favorite ? 'checked' : ''} style="width:22px;height:22px"> <span>Als Favorit markieren</span></label>
      <p class="small muted" id="ff-error" role="alert"></p>
      <button class="btn block" type="submit" id="ff-save">Speichern</button>
    </form>`;
  render(html, 'fundbuch', f ? 'Fund bearbeiten' : 'Neuer Fund');
  renderPhotos();

  const $geoInfo = document.getElementById('ff-geo-info');
  document.getElementById('ff-geo').addEventListener('click', () => {
    if (!('geolocation' in navigator)) { $geoInfo.textContent = 'Standortbestimmung wird von diesem Browser nicht unterstützt.'; return; }
    if (!isSecureContext) { $geoInfo.textContent = 'Standort ist nur über HTTPS oder localhost verfügbar. Trage den Fundort stattdessen als Text ein.'; return; }
    $geoInfo.textContent = 'Standort wird ermittelt …';
    navigator.geolocation.getCurrentPosition((pos) => {
      document.getElementById('ff-lat').value = pos.coords.latitude;
      document.getElementById('ff-lon').value = pos.coords.longitude;
      $geoInfo.textContent = `Übernommen: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} (±${Math.round(pos.coords.accuracy)} m)`;
      document.getElementById('ff-geo-clear').hidden = false;
    }, (err) => {
      $geoInfo.textContent = err.code === 1 ? 'Zugriff auf den Standort wurde verweigert (Einstellungen › Datenschutz › Ortungsdienste).' : 'Standort konnte nicht ermittelt werden. Trage den Fundort als Text ein.';
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });
  document.getElementById('ff-geo-clear').addEventListener('click', (e) => {
    document.getElementById('ff-lat').value = ''; document.getElementById('ff-lon').value = '';
    $geoInfo.textContent = 'Koordinaten entfernt.'; e.currentTarget.hidden = true;
  });

  document.getElementById('find-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('ff-error');
    const title = document.getElementById('ff-title').value.trim();
    if (!title) { err.textContent = 'Bitte gib eine Bezeichnung ein.'; document.getElementById('ff-title').focus(); return; }
    const lat = parseFloat(document.getElementById('ff-lat').value);
    const lon = parseFloat(document.getElementById('ff-lon').value);
    const traits = {};
    ['capColor', 'hymenophore', 'smell', 'spore', 'habitat', 'tree', 'size'].forEach((k) => {
      const val = document.getElementById('ff-t-' + k).value.trim(); if (val) traits[k] = val;
    });
    const btn = document.getElementById('ff-save'); btn.disabled = true; btn.textContent = 'Speichern …';
    try {
      const saved = await finds.put({
        id: f?.id || uid(), createdAt: f?.createdAt, title,
        speciesId: document.getElementById('ff-species').value,
        date: document.getElementById('ff-date').value,
        place: document.getElementById('ff-place').value.trim(),
        lat: Number.isFinite(lat) ? lat : null, lon: Number.isFinite(lon) ? lon : null,
        notes: document.getElementById('ff-notes').value,
        traits, photos: state.draftPhotos, favorite: document.getElementById('ff-fav').checked,
      });
      requestPersistence();
      toast('Fund gespeichert.');
      location.hash = 'fund-' + saved.id;
    } catch (ex) {
      err.textContent = 'Speichern fehlgeschlagen: ' + ex.message;
      btn.disabled = false; btn.textContent = 'Speichern';
    }
  });
}

function renderPhotos() {
  const box = document.getElementById('ff-photos'); if (!box) return;
  box.innerHTML = state.draftPhotos.map((p, i) => `<div class="ph"><img src="${esc(p)}" alt="Foto ${i + 1}"><button type="button" data-rm="${i}" aria-label="Foto ${i + 1} entfernen">×</button></div>`).join('')
    + (state.draftPhotos.length < 12 ? `<label class="photo-add">${ICON.plus}<span>Foto hinzufügen</span><input type="file" accept="image/*" multiple id="ff-file"></label>` : '');
  box.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { state.draftPhotos.splice(Number(b.dataset.rm), 1); renderPhotos(); }));
  document.getElementById('ff-file')?.addEventListener('change', async (e) => {
    const files = [...(e.target.files || [])].slice(0, 12 - state.draftPhotos.length);
    for (const file of files) {
      try { state.draftPhotos.push(await resizeImage(file)); }
      catch (ex) { toast(ex.message, 'error'); }
    }
    renderPhotos();
  });
}

// ---------------------------------------------------------------- Mehr & Info-Seiten
async function viewMore() {
  const pref = ls.get('theme', 'system');
  const est = await storageEstimate();
  const persisted = navigator.storage?.persisted ? await navigator.storage.persisted().catch(() => false) : false;
  const swState = !('serviceWorker' in navigator) ? 'Nicht unterstützt'
    : navigator.serviceWorker.controller ? 'Aktiv – App ist offline verfügbar' : 'Nicht aktiv (nur über HTTPS oder localhost)';
  const html = `
    <h1>Mehr</h1>
    <div class="card menu-list">
      <a href="#favoriten"><span>Favoriten</span><span class="muted">${favorites.all().length} ›</span></a>
      <a href="#sicherheit"><span>Sicherheit &amp; Giftnotruf</span><span class="muted">›</span></a>
      <a href="#installieren"><span>Auf dem iPhone installieren</span><span class="muted">›</span></a>
      <a href="#quellen"><span>Quellen, Bilder &amp; Lizenzen</span><span class="muted">›</span></a>
      <a href="#ueber"><span>Über MycoNatura</span><span class="muted">›</span></a>
    </div>
    ${donationCard() ? `<div class="section">${donationCard()}</div>` : ''}
    <section class="section card">
      <h2>Darstellung</h2>
      <div class="seg" role="group" aria-label="Farbschema">
        ${[['system', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([k, l]) => `<button type="button" data-theme-set="${k}" aria-pressed="${pref === k}">${l}</button>`).join('')}
      </div>
    </section>
    <section class="section card">
      <h2>Offline &amp; Speicher</h2>
      <dl class="fact-list">
        ${fact('Verbindung', navigator.onLine ? 'Online' : 'Offline')}
        ${fact('Offline-Modus (Service Worker)', esc(swState))}
        ${fact('Dauerhafte Speicherung', persisted ? 'Vom Browser zugesichert' : 'Nicht zugesichert – Safari kann Daten bei Speichermangel oder nach langer Nichtnutzung löschen. Exportiere regelmäßig!')}
        ${est ? fact('Belegter Speicher', `${(est.usage / 1048576).toFixed(1)} MB${est.quota ? ` von ca. ${(est.quota / 1048576).toFixed(0)} MB` : ''}`) : ''}
      </dl>
      <div class="btn-row" style="margin-top:12px">
        <button type="button" class="btn secondary small" id="m-export">Daten exportieren</button>
        <button type="button" class="btn danger small" id="m-wipe">Alle eigenen Daten löschen</button>
      </div>
    </section>
    <p class="small muted" style="text-align:center;margin-top:20px">MycoNatura ${APP_VERSION} · Datenbank ${esc(state.data.meta.version)} (${esc(state.data.meta.updated)}) · ${state.data.mushrooms.length} Arten</p>`;
  render(html, 'mehr', 'Mehr');
  document.querySelectorAll('[data-theme-set]').forEach((b) => b.addEventListener('click', () => { setTheme(b.dataset.themeSet); viewMore(); }));
  document.getElementById('m-export').addEventListener('click', exportData);
  document.getElementById('m-wipe').addEventListener('click', async () => {
    if (!(await confirmDialog('Alle eigenen Daten löschen?', 'Fundbuch (inkl. Fotos), Favoriten, Verlauf und Einstellungen werden von diesem Gerät gelöscht. Das kann nicht rückgängig gemacht werden.', 'Alles löschen'))) return;
    try { await finds.clear(); ls.set('favorites', []); recent.clear(); ls.remove('theme'); applyTheme(); toast('Alle eigenen Daten wurden gelöscht.'); viewMore(); }
    catch (e) { toast('Löschen fehlgeschlagen: ' + e.message, 'error'); }
  });
}

function viewSafety() {
  render(`<p><a href="#mehr" class="btn ghost small">${ICON.back} Mehr</a></p>
    <div class="prose">
    <h1>Sicherheit &amp; Giftnotruf</h1>
    <div class="card notice danger"><strong>Notfall</strong>
      Bei Verdacht auf eine Pilzvergiftung sofort den <b>Notruf 112</b> wählen oder ein Giftinformationszentrum anrufen – auch wenn (noch) keine Beschwerden bestehen. Viele tödliche Gifte wirken erst nach Stunden oder Tagen.</div>
    <section class="card section"><h2>Giftinformationszentren (Auswahl)</h2>
      <ul class="clean">
        <li>Deutschland: regionale Giftnotrufe, z. B. Berlin <b>030 19240</b>, München <b>089 19240</b></li>
        <li>Österreich: Vergiftungsinformationszentrale <b>+43 1 406 43 43</b></li>
        <li>Schweiz: Tox Info Suisse <b>145</b></li>
      </ul>
      <p class="small muted">Nummern ohne Gewähr – Stand ${esc(state.data.meta.updated)}. Prüfe sie vor der Pilzsaison und speichere die für deine Region gültige Nummer in deinen Kontakten.</p>
    </section>
    <section class="card section"><h2>Im Verdachtsfall</h2>
      <ul class="clean">
        <li>Pilzreste, Putzabfälle und ggf. Erbrochenes aufbewahren – sie helfen bei der Identifizierung.</li>
        <li>Kein Salzwasser, keine Milch, kein selbst herbeigeführtes Erbrechen ohne ärztliche Anweisung.</li>
        <li>Alle Personen informieren, die mitgegessen haben.</li>
      </ul></section>
    <section class="card section"><h2>Goldene Regeln</h2>
      <ul class="clean">
        <li>Nur Pilze essen, die eindeutig und sicher bestimmt sind – im Zweifel: wegwerfen.</li>
        <li>Pilzsachverständige prüfen lassen (z. B. über die Pilzsachverständigen-Suche der DGfM).</li>
        <li>Bilder und Apps sind keine Bestimmung. Es gibt keine einfachen Faustregeln (Silberlöffel, Schneckenfraß usw. sind falsch).</li>
        <li>Pilze immer vollständig mit Stielbasis entnehmen – wichtig zum Erkennen von Knollenblätterpilzen.</li>
        <li>Wildpilze gut durchgaren, nur frische Exemplare verwenden, keine überalterten Fruchtkörper.</li>
        <li>Örtliche Sammelregeln und Naturschutzgesetze beachten.</li>
      </ul></section>
    </div>`, 'mehr', 'Sicherheit');
}

function viewSources() {
  const s = state.data.sources;
  const photoList = state.data.mushrooms.filter(photoOf);
  render(`<p><a href="#mehr" class="btn ghost small">${ICON.back} Mehr</a></p>
    <div class="prose"><h1>Quellen, Bilder &amp; Lizenzen</h1>
    <section class="card section"><h2>Referenzliteratur</h2>
      <ul class="clean">${Object.values(s).map((x) => `<li>${esc(x.title)}${x.url ? ` – <a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url.replace('https://', ''))}</a>` : ''}</li>`).join('')}</ul>
      <p class="small muted" style="margin-top:10px">${esc(state.data.meta.sourceNote)}</p></section>
    <section class="card section"><h2>Bilder</h2>
      <p>${esc(state.data.meta.imageNote)}</p>
      ${photoList.length ? `<ul class="clean small">${photoList.map((m) => `<li><a href="#pilz-${esc(m.id)}">${esc(m.name)}</a>: ${photoCredit(m)}</li>`).join('')}</ul>`
        : '<p class="small muted">Noch keine Fotos geladen – es werden die eigenen Illustrationen angezeigt. Fotos lassen sich mit dem Skript tools/fetch_photos.py bzw. dem GitHub-Workflow „Pilzfotos laden“ ergänzen (siehe README).</p>'}
      <p class="small muted">Eigene Fundfotos verbleiben auf deinem Gerät.</p></section>
    <section class="card section"><h2>Software</h2>
      <p class="small">MycoNatura nutzt keine externen Bibliotheken, Schriften, APIs oder Tracking-Dienste. Logo, Name, Texte und Design sind eigenständig.</p></section>
    </div>`, 'mehr', 'Quellen');
}

function viewInstall() {
  render(`<p><a href="#mehr" class="btn ghost small">${ICON.back} Mehr</a></p>
    <div class="prose"><h1>Auf dem iPhone installieren</h1>
    <div class="card"><ol>
      <li>Öffne MycoNatura in <b>Safari</b> über eine <b>HTTPS-Adresse</b> (z. B. GitHub Pages) oder über <b>localhost</b>.</li>
      <li>Tippe auf das <b>Teilen-Symbol</b> (Quadrat mit Pfeil).</li>
      <li>Wähle <b>„Zum Home-Bildschirm“</b> und bestätige mit „Hinzufügen“.</li>
      <li>Starte MycoNatura einmal mit Internet – danach sind alle Inhalte zwischengespeichert und funktionieren offline.</li>
    </ol>
    <p class="small muted">Über eine einfache LAN-Adresse wie http://192.168.x.x funktioniert der Offline-Modus nicht, weil Safari Service Worker nur bei HTTPS oder localhost erlaubt.</p></div></div>`, 'mehr', 'Installieren');
}

function viewAbout() {
  render(`<p><a href="#mehr" class="btn ghost small">${ICON.back} Mehr</a></p>
    <div class="prose"><h1>Über MycoNatura</h1>
    <div class="card">
      <p>MycoNatura ist ein kostenloses, werbefreies und offlinefähiges Pilzlexikon für Mitteleuropa. Es braucht keine Registrierung und sendet keine Daten an Server – Favoriten und Fundbuch bleiben auf deinem Gerät.</p>
      <p>Die Datenbank umfasst derzeit ${state.data.mushrooms.length} ausgewählte Arten mit Schwerpunkt auf bekannten Speisepilzen und ihren gefährlichen Doppelgängern. Sie lässt sich über die Datei <code>src/data/mushrooms.json</code> erweitern.</p>
      ${safetyNotice(true)}
    </div>${donationCard() ? `<div class="section">${donationCard()}</div>` : ''}</div>`, 'mehr', 'Über');
}

function viewNotFound(msg = 'Diese Seite gibt es nicht.') {
  render(`<h1>Nicht gefunden</h1>${emptyState(esc(msg), '<a class="btn" href="#start">Zur Startseite</a>')}`, '', 'Nicht gefunden');
}

// ---------------------------------------------------------------- Router
function route() {
  const h = decodeURIComponent((location.hash || '#start').slice(1)) || 'start';
  try {
    if (h === 'start' || h === 'main') return viewHome();
    if (h === 'lexikon') return viewLexikon();
    if (h === 'saison') return viewLexikon('saison');
    if (h.startsWith('kategorie-')) { const k = safeId(h.slice(10)); return CATEGORIES[k] ? viewLexikon(k) : viewNotFound(); }
    if (h.startsWith('pilz-')) return viewDetail(safeId(h.slice(5)));
    if (h === 'bestimmen') return viewIdentify();
    if (h === 'fundbuch') return viewFundbuch();
    if (h === 'fund-neu') return viewFindForm(null);
    if (h.startsWith('fund-bearbeiten-')) return viewFindForm(safeId(h.slice(16)));
    if (h.startsWith('fund-')) return viewFindDetail(safeId(h.slice(5)));
    if (h === 'favoriten') return viewFavorites();
    if (h === 'mehr') return viewMore();
    if (h === 'sicherheit') return viewSafety();
    if (h === 'quellen') return viewSources();
    if (h === 'installieren') return viewInstall();
    if (h === 'ueber') return viewAbout();
    return viewNotFound();
  } catch (e) {
    console.error(e);
    render(`<div class="card notice danger"><strong>Ein Fehler ist aufgetreten</strong>${esc(e.message)}<p><a class="btn" href="#start" style="margin-top:10px">Zur Startseite</a></p></div>`, '');
  }
}

let lastHash = location.hash;
addEventListener('hashchange', () => {
  // Fokus und Scrollposition für Barrierefreiheit zurücksetzen
  const stayInWizard = lastHash === '#bestimmen' && location.hash === '#bestimmen';
  lastHash = location.hash;
  route();
  if (!stayInWizard) { scrollTo({ top: 0 }); document.getElementById('main').focus({ preventScroll: true }); }
});

// Globale Aktionen per Event-Delegation
$view.addEventListener('click', (e) => {
  const a = e.target.closest('[data-action]');
  if (!a) return;
  if (a.dataset.action === 'clear-recent') { recent.clear(); viewHome(); }
});

// Fehlt ein Foto (z. B. offline nicht im Cache), stattdessen die Illustration zeigen
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img?.tagName !== 'IMG' || !img.dataset.mid) return;
  const m = state.byId.get(img.dataset.mid);
  if (!m) return;
  const t = document.createElement('template');
  t.innerHTML = illustrate(m);
  img.replaceWith(t.content.firstElementChild);
}, true);

// ---------------------------------------------------------------- Start
async function loadData() {
  const res = await fetch('src/data/mushrooms.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data || !Array.isArray(data.mushrooms)) throw new Error('Unerwartetes Datenformat');
  return data;
}

async function init() {
  applyTheme();
  updateNet();
  try {
    state.data = await loadData();
  } catch (e) {
    const fileProto = location.protocol === 'file:';
    $view.innerHTML = `<div class="card notice danger"><strong>Die Pilzdatenbank konnte nicht geladen werden.</strong>
      ${fileProto ? 'Du hast die Datei direkt geöffnet (file://). Browser blockieren dabei das Laden der Datenbank. Starte bitte einen lokalen Server (siehe README) und öffne <b>http://localhost:8000</b>.'
        : navigator.onLine ? `Fehler: ${esc(e.message)}` : 'Du bist offline und die App wurde noch nie online geladen. Öffne MycoNatura einmal mit Internetverbindung.'}
      <p style="margin-top:12px"><button class="btn" type="button" onclick="location.reload()">Erneut versuchen</button></p></div>`;
    return;
  }
  try {
    const r = await fetch('src/data/photos.json', { cache: 'no-cache' });
    if (r.ok) { const pj = await r.json(); state.photos = pj && typeof pj.photos === 'object' ? pj.photos : {}; }
  } catch { state.photos = {}; } // Fotos sind optional
  state.byId = new Map(state.data.mushrooms.map((m) => [m.id, m]));
  state.index = buildIndex(state.data.mushrooms);
  route();
  registerSW();
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  const okOrigin = location.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (!okOrigin) return;
  navigator.serviceWorker.register('service-worker.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          toast('Neue Version verfügbar – App neu öffnen, um sie zu laden.');
        } else if (nw.state === 'activated' && !navigator.serviceWorker.controller) {
          toast('MycoNatura ist jetzt offline verfügbar.');
        }
      });
    });
  }).catch((err) => console.info('[MycoNatura] Service Worker nicht verfügbar:', err?.message));
}

init();
