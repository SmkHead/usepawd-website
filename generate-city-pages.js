#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// generate-city-pages.js  —  creates a static SEO landing page per city/town
// Run:   node generate-city-pages.js
// Output: shelters/{city-slug}-{state}.html  (one file per unique city)
//         sitemap.xml  (updated with all new URLs)
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');

// ── Load shelter data ─────────────────────────────────────────────────────────
const vm = require('vm');
// `const` doesn't attach to global scope in vm — swap to `var` so ctx captures it
const dataCode = fs.readFileSync(path.join(__dirname, 'shelter-data.js'), 'utf8')
  .replace('const shelters', 'var shelters');
const ctx = {};
vm.runInNewContext(dataCode, ctx);
const shelters = ctx.shelters;

// ── State abbreviation → full name ────────────────────────────────────────────
const STATE_NAMES = {
  AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas',
  CA:'California', CO:'Colorado', CT:'Connecticut', DE:'Delaware',
  FL:'Florida', GA:'Georgia', HI:'Hawaii', ID:'Idaho',
  IL:'Illinois', IN:'Indiana', IA:'Iowa', KS:'Kansas',
  KY:'Kentucky', LA:'Louisiana', ME:'Maine', MD:'Maryland',
  MA:'Massachusetts', MI:'Michigan', MN:'Minnesota', MS:'Mississippi',
  MO:'Missouri', MT:'Montana', NE:'Nebraska', NV:'Nevada',
  NH:'New Hampshire', NJ:'New Jersey', NM:'New Mexico', NY:'New York',
  NC:'North Carolina', ND:'North Dakota', OH:'Ohio', OK:'Oklahoma',
  OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina',
  SD:'South Dakota', TN:'Tennessee', TX:'Texas', UT:'Utah',
  VT:'Vermont', VA:'Virginia', WA:'Washington', WV:'West Virginia',
  WI:'Wisconsin', WY:'Wyoming', DC:'Washington D.C.'
};

// ── Type display labels + colors ──────────────────────────────────────────────
const TYPE_META = {
  municipal : { label:'municipal',      color:'#7A9E7E', bg:'#EEF4EE', text:'#3D6B41' },
  humane    : { label:'humane society', color:'#FF5B3C', bg:'#FFF0ED', text:'#C04A2D' },
  rescue    : { label:'rescue',         color:'#8B6FD4', bg:'#F3F0FB', text:'#6248AA' }
};

// ── URL slug helper ───────────────────────────────────────────────────────────
function slug(city, state) {
  return city.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-') +
    '-' + state.toLowerCase();
}

// ── HTML escape ───────────────────────────────────────────────────────────────
function h(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Group shelters by city + state ────────────────────────────────────────────
const cityMap = new Map();
for (const s of shelters) {
  const key = `${s.city}|${s.state}`;
  if (!cityMap.has(key)) cityMap.set(key, { city:s.city, state:s.state, list:[] });
  cityMap.get(key).list.push(s);
}

// ── Build state → [city keys] for "other cities in this state" links ──────────
const stateMap = new Map();
for (const [key, data] of cityMap) {
  if (!stateMap.has(data.state)) stateMap.set(data.state, []);
  stateMap.get(data.state).push(key);
}

// ── Create output directory ───────────────────────────────────────────────────
const outDir = path.join(__dirname, 'shelters');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

// ── Generate one page ─────────────────────────────────────────────────────────
function generatePage(city, state, list) {
  const stateName  = STATE_NAMES[state] || state;
  const cityState  = `${city}, ${state}`;
  const pageSlug   = slug(city, state);
  const count      = list.length;
  const countWord  = count === 1 ? '1 shelter' : `${count} shelters`;

  // Shelter type breakdown for meta description
  const humane    = list.filter(s => s.type === 'humane').length;
  const municipal = list.filter(s => s.type === 'municipal').length;
  const rescue    = list.filter(s => s.type === 'rescue').length;

  // Other cities in same state (up to 8, excluding current)
  const otherCities = (stateMap.get(state) || [])
    .filter(k => k !== `${city}|${state}`)
    .slice(0, 8)
    .map(k => cityMap.get(k));

  // JSON-LD for each shelter
  const ldShelters = list.map(s => ({
    "@type"           : "AnimalShelter",
    "name"            : s.name,
    "address"         : {
      "@type"          : "PostalAddress",
      "streetAddress"  : s.address || undefined,
      "addressLocality": s.city,
      "addressRegion"  : s.state,
      "addressCountry" : "US"
    },
    ...(s.website ? { "url": s.website } : {}),
    "geo" : { "@type":"GeoCoordinates", "latitude":s.lat, "longitude":s.lng }
  }));

  const ld = JSON.stringify({
    "@context" : "https://schema.org",
    "@graph"   : [
      {
        "@type"    : "WebPage",
        "name"     : `Animal Shelters in ${cityState} | pawd.`,
        "url"      : `https://usepawd.com/shelters/${pageSlug}`,
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type":"ListItem", "position":1, "name":"Home",        "item":"https://usepawd.com" },
            { "@type":"ListItem", "position":2, "name":"Shelter Map", "item":"https://usepawd.com/shelters" },
            { "@type":"ListItem", "position":3, "name":cityState }
          ]
        }
      },
      ...ldShelters
    ]
  }, null, 2);

  // Shelter cards HTML
  const cards = list.map(s => {
    const tm = TYPE_META[s.type] || TYPE_META.rescue;
    const websiteLink = s.website
      ? `<a href="${h(s.website)}" target="_blank" rel="noopener" class="cp-shelter-link">visit website →</a>`
      : '';
    const addressLine = s.address
      ? `<div class="cp-shelter-addr">${h(s.address)}, ${h(s.city)}, ${h(s.state)}</div>`
      : `<div class="cp-shelter-addr">${h(s.city)}, ${h(s.state)}</div>`;
    return `
      <article class="cp-shelter-card">
        <div class="cp-shelter-top">
          <div class="cp-shelter-initials">${h(s.name.slice(0,2).toUpperCase())}</div>
          <div class="cp-shelter-info">
            <h3 class="cp-shelter-name">${h(s.name)}</h3>
            ${addressLine}
          </div>
          <span class="cp-shelter-badge" style="background:${tm.bg};color:${tm.text}">${tm.label}</span>
        </div>
        ${websiteLink}
      </article>`;
  }).join('');

  // Other cities links
  const otherLinks = otherCities.length ? `
  <section class="cp-other">
    <div class="cp-other-inner">
      <div class="section-label">more in ${h(stateName)}</div>
      <div class="cp-other-grid">
        ${otherCities.map(c =>
          `<a href="/shelters/${slug(c.city, c.state)}.html" class="cp-other-link">
            ${h(c.city)} <span>${c.list.length} shelter${c.list.length !== 1 ? 's' : ''}</span>
          </a>`
        ).join('')}
      </div>
    </div>
  </section>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Animal Shelters in ${h(cityState)} — Adopt a Pet | pawd.</title>
  <meta name="description" content="Find ${countWord} and rescues in ${h(cityState)}. Browse adoptable dogs, cats and more with pawd. — the personality-first pet adoption app coming to iOS 2026." />
  <meta name="theme-color" content="#FF5B3C" />
  <link rel="canonical" href="https://usepawd.com/shelters/${pageSlug}" />
  <link rel="icon" type="image/svg+xml" href="../favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="../style.css?v=10" />
  <link rel="stylesheet" href="../city-pages.css?v=1" />
  <meta name="robots" content="index, follow" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://usepawd.com/shelters/${pageSlug}" />
  <meta property="og:title" content="Animal Shelters in ${h(cityState)} | pawd." />
  <meta property="og:description" content="Find ${countWord} in ${h(cityState)}. Adopt a dog or cat near you with pawd." />
  <meta property="og:image" content="https://usepawd.com/og-image.svg" />
  <script type="application/ld+json">${ld}</script>
</head>
<body>

  <div class="bg-fx" aria-hidden="true">
    <div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>
  </div>
  <div class="grain" aria-hidden="true"></div>

  <nav>
    <div class="nav-inner">
      <a href="../index.html" class="wordmark magnetic" data-magnet="0.4">pawd<span class="dot"></span></a>
      <div class="nav-right">
        <a href="../shelters.html" class="nav-link" style="background:rgba(26,26,26,0.06);color:var(--ink)">shelter map</a>
        <a href="../for-shelters.html" class="nav-link">for shelters</a>
        <a href="../faq.html" class="nav-link">faq</a>
        <a href="../about.html" class="nav-link">about</a>
        <span class="nav-pill">coming to App Store</span>
      </div>
    </div>
  </nav>

  <section class="cp-hero">
    <div class="cp-hero-inner">
      <nav class="cp-breadcrumb" aria-label="breadcrumb">
        <a href="../index.html">home</a>
        <span>→</span>
        <a href="../shelters.html">shelter map</a>
        <span>→</span>
        <span>${h(cityState)}</span>
      </nav>
      <h1 class="cp-hero-title">Animal Shelters<br>in <em>${h(city)}, ${h(state)}</em></h1>
      <p class="cp-hero-sub">${count} shelter${count !== 1 ? 's' : ''} and rescue${count !== 1 ? 's' : ''} in ${h(cityState)}${humane || municipal ? ` — including ${[municipal ? `${municipal} municipal` : '', humane ? `${humane} humane society` : ''].filter(Boolean).join(' and ')}` : ''}. Find your perfect match and support local animals with pawd.</p>
    </div>
  </section>

  <section class="cp-list">
    <div class="cp-list-inner">
      <div class="section-label">${countWord} in ${h(cityState)}</div>
      <div class="cp-shelter-grid">${cards}
      </div>
    </div>
  </section>

  <section class="cp-cta">
    <div class="cp-cta-inner fade-up">
      <div class="section-label" style="justify-content:center;display:inline-flex">adopt in ${h(city)}</div>
      <h2>swipe through every animal<br>at these shelters — <em>free.</em></h2>
      <p>pawd. matches you with adoptable pets from shelters in ${h(cityState)} based on your lifestyle. fall in love. support the shelter in one gesture.</p>
      <span class="cp-cta-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 13.92 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/></svg>
        coming to App Store · iOS 2026
      </span>
    </div>
  </section>

  ${otherLinks}

  <footer>
    <div class="footer-inner">
      <div class="footer-big">pawd<span class="accent">.</span></div>
      <div class="footer-left">
        <nav class="footer-links">
          <a href="../shelters.html">shelters</a>
          <a href="../for-shelters.html">for shelters</a>
          <a href="../about.html">about</a>
          <a href="../privacy.html">privacy</a>
          <a href="../terms.html">terms</a>
        </nav>
      </div>
      <div class="footer-right"><a href="mailto:hello@usepawd.com">hello@usepawd.com</a></div>
      <div class="footer-meta">
        <span>© 2026 pawd. — made in new york</span>
        <span>shelter data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>, ODbL</span>
      </div>
    </div>
  </footer>

  <script src="../motion.js?v=6"></script>
</body>
</html>`;
}

// ── Write all pages ───────────────────────────────────────────────────────────
let count = 0;
const sitemapUrls = [];
const today = new Date().toISOString().split('T')[0];

for (const [, data] of cityMap) {
  const pageSlug = slug(data.city, data.state);
  const html     = generatePage(data.city, data.state, data.list);
  const filename = pageSlug + '.html';
  fs.writeFileSync(path.join(outDir, filename), html, 'utf8');
  sitemapUrls.push(`  <url>\n    <loc>https://usepawd.com/shelters/${pageSlug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`);
  count++;
  if (count % 50 === 0) process.stdout.write(`  ${count} pages written…\n`);
}

console.log(`\n✅  ${count} city pages written to shelters/\n`);

// ── Update sitemap.xml ────────────────────────────────────────────────────────
const existingSitemap = fs.readFileSync(path.join(__dirname, 'sitemap.xml'), 'utf8');
const newSitemap = existingSitemap.replace(
  '</urlset>',
  '\n' + sitemapUrls.join('\n') + '\n\n</urlset>'
);
fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), newSitemap, 'utf8');
console.log(`✅  sitemap.xml updated with ${count} new URLs`);
console.log(`\nTotal sitemap entries: ${(newSitemap.match(/<url>/g) || []).length}`);
