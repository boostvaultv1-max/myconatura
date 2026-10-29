// MycoNatura – Notvorrat-Rechner
// Grundlage: Beispiel-Grundvorrat des Bundesamts für Bevölkerungsschutz und Katastrophenhilfe (BBK)
// für 1 Person und 10 Tage (ca. 2.200 kcal/Tag). Längere Zeiträume werden linear hochgerechnet.
// Eigenmarken nur, wo sie recherchiert sind – Sortimente und Preise ändern sich, daher keine Preise.

export const STORES = {
  edeka:    { name: 'Edeka',    url: 'https://www.edeka.de',          brand: 'Gut & Günstig' },
  rewe:     { name: 'Rewe',     url: 'https://www.rewe.de',           brand: 'ja!' },
  kaufland: { name: 'Kaufland', url: 'https://www.kaufland.de',       brand: 'K-Classic' },
  lidl:     { name: 'Lidl',     url: 'https://www.lidl.de',           brand: null },
  aldi:     { name: 'Aldi',     url: 'https://www.aldi-nord.de',      brand: null, url2: 'https://www.aldi-sued.de' },
  penny:    { name: 'Penny',    url: 'https://www.penny.de',          brand: null },
  netto:    { name: 'Netto',    url: 'https://www.netto-online.de',   brand: null },
};

// Recherchierte Eigenmarken je Produktgruppe (sonst allgemeiner Hinweis „Eigenmarke“)
const BRANDS = {
  lidl: { wasser: 'Saskia', saft: 'Solevita', milch: 'Milbona', nudeln: 'Combino', reis: 'Golden Sun', gemuesekonserve: 'Freshona', obstkonserve: 'Freshona', nuesse: 'Alesto' },
  aldi: { wasser: 'Quellbrunn', milch: 'Milsani' },
  penny: { bio: 'Naturgut', fertig: 'Penny Ready' },
};

export const SCENARIOS = {
  strom:  { label: 'Stromausfall' },
  wasser: { label: 'Wasserausfall' },
  beides: { label: 'Strom- und Wasserausfall' },
};

export const DURATIONS = {
  10:  '10 Tage (BBK-Empfehlung)',
  30:  '1 Monat',
  90:  '3 Monate',
  182: '½ Jahr',
  365: '1 Jahr',
};

// BBK-Mengen pro Person und 10 Tage
const BBK = { wasser: 20, getreide: 3.5, gemuese: 4.0, obst: 2.5, milch: 2.6, eiweiss: 1.5, fett: 0.357 };

const fmt = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('de-DE');
const ceil = (n) => Math.max(1, Math.ceil(n - 1e-9));

function brandFor(store, key) {
  const s = STORES[store];
  const b = BRANDS[store]?.[key];
  if (b) return `${s.name}: z. B. „${b}“`;
  if (s.brand) return `${s.name}: z. B. „${s.brand}“`;
  return `${s.name}: Eigenmarke im Regal`;
}

/**
 * Erstellt die Einkaufsliste.
 * @returns {{groups: Array<{title, items: Array<{id, name, amount, hint, brand}>}>, notes: string[]}}
 */
export function buildList({ store = 'edeka', scenario = 'strom', days = 10, persons = 1 }) {
  const f = (days / 10) * persons; // Faktor gegenüber BBK-Basis
  const B = (key) => brandFor(store, key);
  const groups = [];

  // ---------- Getränke ----------
  const liter = BBK.wasser * f;
  groups.push({ title: 'Getränke', items: [
    { id: 'wasser', name: 'Mineralwasser still (1,5-l-Flaschen)', amount: `${fmt(liter * 0.85, 0)} l ≈ ${ceil(liter * 0.85 / 9)} Packungen à 6 × 1,5 l`, hint: 'BBK: 2 l pro Person und Tag inkl. Wasser zum Kochen', brand: B('wasser') },
    { id: 'saft', name: 'Fruchtsaft / haltbare Getränke', amount: `${fmt(liter * 0.15, 0)} l ≈ ${ceil(liter * 0.15)} Packungen à 1 l`, hint: 'Abwechslung, Vitamine', brand: B('saft') },
  ] });

  // ---------- Lebensmittel (BBK-Gruppen mit Beispielaufteilung) ----------
  const g = BBK.getreide * f;
  const ge = BBK.gemuese * f;
  const o = BBK.obst * f;
  const m = BBK.milch * f;
  const e = BBK.eiweiss * f;
  groups.push({ title: 'Getreide, Nudeln, Reis', items: [
    { id: 'nudeln', name: 'Nudeln', amount: `${fmt(g * 0.35)} kg ≈ ${ceil(g * 0.35 / 0.5)} × 500 g`, hint: 'Braucht Wasser und Kocher', brand: B('nudeln') },
    { id: 'reis', name: 'Reis', amount: `${fmt(g * 0.25)} kg ≈ ${ceil(g * 0.25)} × 1 kg`, hint: '', brand: B('reis') },
    { id: 'haferflocken', name: 'Haferflocken', amount: `${fmt(g * 0.2)} kg ≈ ${ceil(g * 0.2 / 0.5)} × 500 g`, hint: 'Auch ohne Kochen essbar', brand: B('haferflocken') },
    { id: 'knaecke', name: 'Knäckebrot / Zwieback', amount: `${fmt(g * 0.2)} kg ≈ ${ceil(g * 0.2 / 0.25)} × 250 g`, hint: 'Brotersatz, ohne Kochen', brand: B('knaecke') },
  ] });
  groups.push({ title: 'Gemüse & Hülsenfrüchte', items: [
    { id: 'gemuesekonserve', name: 'Gemüsekonserven (Erbsen, Möhren, Mais …)', amount: `${fmt(ge * 0.5)} kg ≈ ${ceil(ge * 0.5 / 0.4)} Dosen à ca. 400 g`, hint: 'Bereits gekocht – auch kalt essbar', brand: B('gemuesekonserve') },
    { id: 'huelsen', name: 'Bohnen, Linsen, Kichererbsen (Dose/Glas)', amount: `${fmt(ge * 0.35)} kg ≈ ${ceil(ge * 0.35 / 0.4)} Dosen`, hint: 'Getrocknete Hülsenfrüchte brauchen viel Wasser', brand: B('gemuesekonserve') },
    { id: 'tomaten', name: 'Passierte / gehackte Tomaten', amount: `${fmt(ge * 0.15)} kg ≈ ${ceil(ge * 0.15 / 0.5)} × 500 g`, hint: 'Für Nudeln und Eintöpfe', brand: B('tomaten') },
  ] });
  groups.push({ title: 'Obst & Nüsse', items: [
    { id: 'obstkonserve', name: 'Obstkonserven (Pfirsiche, Mandarinen …)', amount: `${fmt(o * 0.6)} kg ≈ ${ceil(o * 0.6 / 0.4)} Dosen`, hint: '', brand: B('obstkonserve') },
    { id: 'nuesse', name: 'Nüsse & Trockenobst', amount: `${fmt(o * 0.4)} kg ≈ ${ceil(o * 0.4 / 0.2)} × 200 g`, hint: 'Viel Energie auf wenig Platz', brand: B('nuesse') },
  ] });
  groups.push({ title: 'Milch & Eiweiß', items: [
    { id: 'hmilch', name: 'H-Milch', amount: `${fmt(m * 0.8)} l ≈ ${ceil(m * 0.8)} × 1 l`, hint: 'Ungeöffnet ohne Kühlung haltbar', brand: B('milch') },
    { id: 'kaese', name: 'Hartkäse am Stück / Milchpulver', amount: `${fmt(m * 0.2)} kg`, hint: 'Milchpulver hält deutlich länger', brand: B('milch') },
    { id: 'fisch', name: 'Fischkonserven (Thunfisch, Makrele …)', amount: `${fmt(e * 0.5)} kg ≈ ${ceil(e * 0.5 / 0.15)} Dosen`, hint: '', brand: B('fisch') },
    { id: 'fleisch', name: 'Fleisch-/Wurstkonserven oder vegane Alternative', amount: `${fmt(e * 0.5)} kg ≈ ${ceil(e * 0.5 / 0.2)} Dosen`, hint: 'Frische Eier nur begrenzt lagerfähig, Volleipulver hält Jahre', brand: B('fleisch') },
  ] });
  groups.push({ title: 'Fette & Sonstiges', items: [
    { id: 'oel', name: 'Speiseöl', amount: `${fmt(BBK.fett * f * 1.1, 1)} l ≈ ${ceil(BBK.fett * f * 1.1 / 0.75)} × 750 ml`, hint: '', brand: B('oel') },
    { id: 'fertig', name: 'Fertiggerichte in Dosen (Eintopf, Ravioli)', amount: `${ceil(days / 5 * persons)} Dosen`, hint: 'Notfalls auch kalt essbar', brand: B('fertig') },
    { id: 'suess', name: 'Zucker, Honig, Marmelade, Schokolade', amount: 'nach Bedarf', hint: 'Gute Laune hilft', brand: B('suess') },
    { id: 'salz', name: 'Salz, Gewürze, Instantbrühe', amount: '1 × je Sorte', hint: '', brand: B('salz') },
  ] });

  // ---------- Strom ----------
  if (scenario === 'strom' || scenario === 'beides') {
    groups.push({ title: 'Für den Stromausfall', items: [
      { id: 'radio', name: 'Radio mit Batterie oder Kurbel', amount: '1 Stück', hint: 'Informationen der Behörden empfangen', brand: '' },
      { id: 'lampe', name: 'Taschenlampe / Stirnlampe', amount: `${persons} Stück`, hint: '', brand: '' },
      { id: 'batterien', name: 'Ersatzbatterien (passend zu Radio & Lampen)', amount: `${ceil(days / 10 * 2)} Packungen`, hint: '', brand: '' },
      { id: 'powerbank', name: 'Powerbank (geladen halten)', amount: '1–2 Stück', hint: '', brand: '' },
      { id: 'kerzen', name: 'Kerzen / Teelichter, Feuerzeug, Streichhölzer', amount: `${ceil(days / 10)} Packungen`, hint: 'Nie unbeaufsichtigt brennen lassen', brand: '' },
      { id: 'kocher', name: 'Campingkocher + Kartuschen', amount: `1 Kocher, ${ceil(days / 5)} Kartuschen`, hint: 'Nur im Freien oder bei guter Lüftung – Kohlenmonoxid-Gefahr!', brand: '' },
      { id: 'decken', name: 'Warme Decken / Schlafsack', amount: `${persons} Stück`, hint: 'Heizung fällt meist mit aus', brand: '' },
      { id: 'bargeld', name: 'Bargeld in kleinen Scheinen', amount: 'für einige Tage', hint: 'Kartenzahlung funktioniert nicht', brand: '' },
    ] });
  }
  // ---------- Wasser ----------
  if (scenario === 'wasser' || scenario === 'beides') {
    groups.push({ title: 'Für den Wasserausfall', items: [
      { id: 'kanister', name: 'Wasserkanister (faltbar, 10–20 l)', amount: `${ceil(persons)} Stück`, hint: 'Bei Vorwarnung Badewanne und Kanister als Brauchwasser füllen', brand: '' },
      { id: 'feuchttuecher', name: 'Feuchttücher', amount: `${ceil(days / 7 * persons)} Packungen`, hint: 'Körperpflege ohne Wasser', brand: '' },
      { id: 'desinfektion', name: 'Hände-Desinfektionsmittel', amount: `${ceil(days / 30 * persons)} Flaschen`, hint: '', brand: '' },
      { id: 'einweg', name: 'Einweggeschirr / Küchenrolle', amount: 'nach Bedarf', hint: 'Spart Spülwasser', brand: '' },
      { id: 'toilette', name: 'Toilettenbeutel / Notfall-Toilette, Müllbeutel', amount: `${ceil(days / 10)} Packungen`, hint: 'Ohne Wasser funktioniert die Spülung nicht', brand: '' },
      { id: 'filter', name: 'Wasserfilter oder Entkeimungstabletten', amount: '1 Stück / 1 Packung', hint: 'Zusätzlich zum Vorrat, nach Herstellerangabe', brand: '' },
    ] });
  }
  // ---------- Immer ----------
  groups.push({ title: 'Hygiene, Gesundheit, Dokumente', items: [
    { id: 'klopapier', name: 'Toilettenpapier', amount: `ca. ${ceil(days / 4 * persons)} Rollen`, hint: 'Grober Richtwert', brand: '' },
    { id: 'hygiene', name: 'Seife, Zahnpasta, Hygieneartikel', amount: 'nach Bedarf', hint: '', brand: '' },
    { id: 'ersthilfe', name: 'Erste-Hilfe-Kasten', amount: '1 Stück', hint: '', brand: '' },
    { id: 'medikamente', name: 'Persönliche Medikamente', amount: `für ${days} Tage`, hint: 'Mit Arzt/Apotheke absprechen', brand: '' },
    { id: 'dokumente', name: 'Dokumentenmappe (Ausweise, Versicherungen, Kopien)', amount: '1 Mappe', hint: 'Wasserdicht aufbewahren', brand: '' },
  ] });

  const notes = [];
  if (days > 10) notes.push(`Das BBK empfiehlt einen Vorrat für 10 Tage. Für ${DURATIONS[days] || days + ' Tage'} wurden die Mengen hochgerechnet – achte besonders auf Mindesthaltbarkeit, Lagerplatz und regelmäßiges Aufbrauchen und Nachkaufen („rollierender Vorrat“).`);
  if (days >= 90) notes.push(`Allein das Trinkwasser ergibt ${fmt(BBK.wasser * f, 0)} Liter – das braucht sehr viel Platz. Ein guter Wasserfilter ist für lange Zeiträume sinnvoller als nur gelagerte Flaschen.`);
  return { groups, notes };
}
