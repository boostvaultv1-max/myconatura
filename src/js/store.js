// Lokale Speicherung: LocalStorage für kleine Einstellungen, IndexedDB für Funde (inkl. Fotos).
// Alle Zugriffe sind abgesichert – fällt ein Speicher aus, läuft die App trotzdem weiter.

import { safeId, isSafeImageDataUrl, uid } from './util.js';

const PREFIX = 'myconatura.';
const memory = new Map(); // Fallback, falls LocalStorage blockiert ist

export const ls = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return memory.has(key) ? memory.get(key) : fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
    catch { memory.set(key, value); return false; }
  },
  remove(key) {
    try { localStorage.removeItem(PREFIX + key); } catch { /* ignorieren */ }
    memory.delete(key);
  },
};

// ---------- Favoriten & zuletzt angesehen ----------
export const favorites = {
  all() { return ls.get('favorites', []).filter((x) => typeof x === 'string'); },
  has(id) { return this.all().includes(id); },
  toggle(id) {
    const list = this.all();
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.unshift(id);
    ls.set('favorites', list);
    return i < 0;
  },
};

export const recent = {
  all() { return ls.get('recent', []).filter((x) => typeof x === 'string'); },
  add(id) {
    const list = this.all().filter((x) => x !== id);
    list.unshift(id);
    ls.set('recent', list.slice(0, 12));
  },
  clear() { ls.set('recent', []); },
};

// ---------- IndexedDB für das Fundbuch ----------
const DB_NAME = 'myconatura';
const DB_VERSION = 1;
const STORE = 'finds';
let dbPromise = null;
let useFallback = false;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) { reject(new Error('IndexedDB nicht verfügbar')); return; }
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { reject(e); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('date', 'date');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Datenbank konnte nicht geöffnet werden'));
    req.onblocked = () => reject(new Error('Datenbank ist blockiert – bitte andere Tabs schließen.'));
  }).catch((err) => {
    console.warn('[MycoNatura] IndexedDB-Fallback auf LocalStorage:', err);
    useFallback = true;
    return null;
  });
  return dbPromise;
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const os = t.objectStore(STORE);
    let result;
    Promise.resolve(fn(os)).then((r) => { result = r; });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error || new Error('Speichervorgang fehlgeschlagen'));
    t.onabort = () => reject(t.error || new Error('Speichervorgang abgebrochen (Speicher evtl. voll)'));
  });
}

function reqP(r) {
  return new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}

/** Bereinigt und validiert einen Fund-Datensatz (auch beim Import). */
export function sanitizeFind(input) {
  if (!input || typeof input !== 'object') throw new Error('Ungültiger Datensatz');
  const str = (v, max = 2000) => (typeof v === 'string' ? v.slice(0, max) : '');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : '';
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const photos = Array.isArray(input.photos) ? input.photos.filter(isSafeImageDataUrl).slice(0, 12) : [];
  const traits = {};
  if (input.traits && typeof input.traits === 'object') {
    for (const [k, v] of Object.entries(input.traits)) {
      const key = safeId(k);
      if (key) traits[key] = str(v, 200);
    }
  }
  return {
    id: safeId(input.id) || uid(),
    title: str(input.title, 120) || 'Unbenannter Fund',
    speciesId: safeId(input.speciesId),
    date,
    place: str(input.place, 200),
    lat: num(input.lat),
    lon: num(input.lon),
    notes: str(input.notes, 5000),
    traits,
    photos,
    favorite: Boolean(input.favorite),
    createdAt: str(input.createdAt, 40) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const finds = {
  async all() {
    const db = await openDB();
    let list;
    if (!db || useFallback) list = ls.get('finds', []);
    else list = await tx(db, 'readonly', (os) => reqP(os.getAll()));
    return (list || []).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
  },
  async get(id) {
    const db = await openDB();
    if (!db || useFallback) return ls.get('finds', []).find((f) => f.id === id) || null;
    return (await tx(db, 'readonly', (os) => reqP(os.get(id)))) || null;
  },
  async put(find) {
    const clean = sanitizeFind(find);
    const db = await openDB();
    if (!db || useFallback) {
      const list = ls.get('finds', []).filter((f) => f.id !== clean.id);
      list.push(clean);
      if (!ls.set('finds', list)) throw new Error('Speicher voll oder nicht verfügbar. Bitte Fotos reduzieren.');
      return clean;
    }
    await tx(db, 'readwrite', (os) => reqP(os.put(clean)));
    return clean;
  },
  async remove(id) {
    const db = await openDB();
    if (!db || useFallback) { ls.set('finds', ls.get('finds', []).filter((f) => f.id !== id)); return; }
    await tx(db, 'readwrite', (os) => reqP(os.delete(id)));
  },
  async clear() {
    const db = await openDB();
    if (!db || useFallback) { ls.set('finds', []); return; }
    await tx(db, 'readwrite', (os) => reqP(os.clear()));
  },
  get usingFallback() { return useFallback; },
};

/** Erstellt das Export-Objekt (Funde, Favoriten). */
export async function buildExport() {
  return {
    app: 'MycoNatura',
    format: 1,
    exportedAt: new Date().toISOString(),
    favorites: favorites.all(),
    finds: await finds.all(),
  };
}

/** Importiert eine Export-Datei. Vorhandene Funde mit gleicher ID werden überschrieben. */
export async function importData(json) {
  let data;
  try { data = typeof json === 'string' ? JSON.parse(json) : json; }
  catch { throw new Error('Die Datei ist kein gültiges JSON.'); }
  if (!data || data.app !== 'MycoNatura' || !Array.isArray(data.finds)) {
    throw new Error('Das ist keine MycoNatura-Exportdatei.');
  }
  let ok = 0; let failed = 0;
  for (const f of data.finds.slice(0, 5000)) {
    try { await finds.put({ ...f, createdAt: f.createdAt }); ok++; } catch { failed++; }
  }
  if (Array.isArray(data.favorites)) {
    const merged = [...new Set([...favorites.all(), ...data.favorites.map(safeId).filter(Boolean)])];
    ls.set('favorites', merged);
  }
  return { ok, failed };
}

/** Bittet den Browser, die Daten dauerhaft zu behalten (wird nicht überall unterstützt). */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch { /* ignorieren */ }
  return false;
}

export async function storageEstimate() {
  try {
    if (navigator.storage?.estimate) return await navigator.storage.estimate();
  } catch { /* ignorieren */ }
  return null;
}
