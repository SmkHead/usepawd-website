#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// fetch-shelters.js  —  pulls every US animal shelter from OpenStreetMap
// Run:   node fetch-shelters.js
// Output: shelter-data.js  (drop-in replacement for the shelters array)
// ─────────────────────────────────────────────────────────────────────────────

const https = require('https');
const fs    = require('fs');

// ── State name → 2-letter abbreviation ───────────────────────────────────────
const STATE_ABBR = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR',
  'California':'CA','Colorado':'CO','Connecticut':'CT','Delaware':'DE',
  'Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID',
  'Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS',
  'Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD',
  'Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS',
  'Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV',
  'New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY',
  'North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK',
  'Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC',
  'South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT',
  'Vermont':'VT','Virginia':'VA','Washington':'WA','West Virginia':'WV',
  'Wisconsin':'WI','Wyoming':'WY','District of Columbia':'DC','Washington DC':'DC',
  'Washington D.C.':'DC'
};

function normalizeState(s) {
  if (!s) return '';
  s = s.trim();
  if (s.length === 2) return s.toUpperCase();
  return STATE_ABBR[s] || '';
}

// ── Classify type from name / operator tags ───────────────────────────────────
function classifyType(tags) {
  const t = ((tags.name || '') + ' ' + (tags.operator || '')).toLowerCase();
  if (/animal control|animal services|animal care and control|county animal|city animal|municipal|dept of animal|department of animal/.test(t)) return 'municipal';
  if (/humane society|humane association|spca|aspca/.test(t)) return 'humane';
  return 'rescue';
}

// ── Build a clean address string ──────────────────────────────────────────────
function buildAddress(tags) {
  const num    = tags['addr:housenumber'] || '';
  const street = tags['addr:street']     || '';
  if (num && street) return `${num} ${street}`;
  return street;
}

// ── Best available website ────────────────────────────────────────────────────
function getWebsite(tags) {
  return tags.website        ||
         tags['contact:website'] ||
         tags['contact:url']     ||
         '';
}

// ── Escape for JS string literal ──────────────────────────────────────────────
function esc(s) {
  return (s || '').replace(/\\/g,'\\\\').replace(/"/g,'\\"').trim();
}

// ── Overpass QL query ─────────────────────────────────────────────────────────
const QUERY = `[out:json][timeout:180];
area["ISO3166-1"="US"][admin_level=2]->.us;
(
  node["amenity"="animal_shelter"](area.us);
  way["amenity"="animal_shelter"](area.us);
);
out center tags;`;

const encodedQuery = encodeURIComponent(QUERY);

const options = {
  hostname : 'overpass-api.de',
  path     : '/api/interpreter?data=' + encodedQuery,
  method   : 'GET',
  headers  : {
    'User-Agent': 'pawd-shelter-fetcher/1.0 (usepawd.com)'
  }
};

console.log('⏳  Querying OpenStreetMap Overpass API — this may take 30–60 seconds…\n');

const req = https.request(options, (res) => {
  let raw = '';
  res.on('data', chunk => { raw += chunk; process.stdout.write('.'); });
  res.on('end', () => {
    console.log('\n');
    try {
      const json     = JSON.parse(raw);
      const elements = json.elements || [];
      console.log(`Raw OSM results : ${elements.length}`);

      // ── Process each element ────────────────────────────────────────────────
      const shelters = [];

      for (const el of elements) {
        const tags = el.tags || {};

        // Must have a name
        const name = tags.name;
        if (!name) continue;

        // Coordinates (node → lat/lon, way → center)
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        if (!lat || !lng) continue;

        // State is required
        const state = normalizeState(tags['addr:state'] || '');
        if (!state) continue;

        // City / town / village
        const city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || '';
        if (!city) continue;

        shelters.push({
          name   : esc(name),
          city   : esc(city),
          state,
          address: esc(buildAddress(tags)),
          website: esc(getWebsite(tags)),
          lat    : Math.round(lat * 10000) / 10000,
          lng    : Math.round(lng * 10000) / 10000,
          type   : classifyType(tags)
        });
      }

      // ── Deduplicate: same name + state ──────────────────────────────────────
      const seen   = new Set();
      const deduped = shelters.filter(s => {
        const key = `${s.name.toLowerCase()}|${s.state}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // ── Re-number IDs ───────────────────────────────────────────────────────
      deduped.forEach((s, i) => s.id = i + 1);

      console.log(`After dedup      : ${deduped.length} shelters`);

      // ── Write shelter-data.js ───────────────────────────────────────────────
      const lines = deduped.map(s =>
        `  { id:${s.id}, name:"${s.name}", city:"${s.city}", state:"${s.state}", ` +
        `address:"${s.address}", website:"${s.website}", lat:${s.lat}, lng:${s.lng}, type:"${s.type}" }`
      );

      const output = [
        `// Auto-generated by fetch-shelters.js — ${new Date().toISOString().split('T')[0]}`,
        `// ${deduped.length} shelters sourced from OpenStreetMap (© OpenStreetMap contributors, ODbL)`,
        `const shelters = [`,
        lines.join(',\n'),
        `];`
      ].join('\n');

      fs.writeFileSync('shelter-data.js', output, 'utf8');
      console.log(`✅  shelter-data.js written  (${deduped.length} shelters)\n`);

      // ── Stats ───────────────────────────────────────────────────────────────
      const byState  = {};
      const cities   = new Set();
      deduped.forEach(s => {
        byState[s.state] = (byState[s.state] || 0) + 1;
        cities.add(`${s.city}|${s.state}`);
      });

      const top10 = Object.entries(byState).sort((a,b) => b[1]-a[1]).slice(0,10);
      console.log('Top 10 states:');
      top10.forEach(([st, n]) => console.log(`  ${st}: ${n} shelters`));
      console.log(`\nUnique cities/towns: ${cities.size}`);
      console.log(`\nNext step: replace the shelters array in shelters.html`);
      console.log(`           with the contents of shelter-data.js`);

    } catch (e) {
      console.error('\n❌  Parse error:', e.message);
      fs.writeFileSync('overpass-raw.json', raw, 'utf8');
      console.log('Raw response saved → overpass-raw.json (check for API error message)');
    }
  });
});

req.on('error', e => {
  console.error('\n❌  Network error:', e.message);
  console.log('Check your internet connection and try again.');
});

req.end();
