#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// generate-state-pages.js  —  creates a static SEO landing page per US state
// Run:   node generate-state-pages.js
// Output: shelters/{state-slug}.html  (one file per state)
//         Also updates city pages to use v=12 style
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

// ── Load shelter data ─────────────────────────────────────────────────────────
const dataCode = fs.readFileSync(path.join(__dirname, 'shelter-data.js'), 'utf8')
  .replace('const shelters', 'var shelters');
const ctx = {};
vm.runInNewContext(dataCode, ctx);
const shelters = ctx.shelters;

// ── State maps ────────────────────────────────────────────────────────────────
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

const TYPE_META = {
  municipal : { label:'municipal',      color:'#7A9E7E', bg:'#EEF4EE', text:'#3D6B41' },
  humane    : { label:'humane society', color:'#FF5B3C', bg:'#FFF0ED', text:'#C04A2D' },
  rescue    : { label:'rescue',         color:'#8B6FD4', bg:'#F3F0FB', text:'#6248AA' }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function citySlug(city, state) {
  return city.toLowerCase().replace(/[^a-z0-9\s]/g,'').trim().replace(/\s+/g,'-') + '-' + state.toLowerCase();
}
function stateSlug(stateName) {
  return stateName.toLowerCase().replace(/[^a-z0-9\s]/g,'').trim().replace(/\s+/g,'-');
}
function h(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Group by state → cities → shelters ────────────────────────────────────────
const stateData = new Map(); // state abbr → { name, cities: Map(city → shelters[]) }
for (const s of shelters) {
  if (!stateData.has(s.state)) {
    stateData.set(s.state, { abbr: s.state, name: STATE_NAMES[s.state]||s.state, cities: new Map() });
  }
  const st = stateData.get(s.state);
  if (!st.cities.has(s.city)) st.cities.set(s.city, []);
  st.cities.get(s.city).push(s);
}

// ── All states list for "browse other states" ─────────────────────────────────
const allStates = [...stateData.values()].sort((a,b) => a.name.localeCompare(b.name));

// ── Output dir ────────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, 'shelters');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const today = new Date().toISOString().split('T')[0];
const sitemapUrls = [];

// ── Generate one state page ───────────────────────────────────────────────────
function generateStatePage(stAbbr, stName, cities) {
  const slug      = stateSlug(stName);
  const totalShelters = [...cities.values()].reduce((n, list) => n + list.length, 0);
  const totalCities   = cities.size;
  const humane    = [...cities.values()].flat().filter(s => s.type==='humane').length;
  const municipal = [...cities.values()].flat().filter(s => s.type==='municipal').length;

  // Other states (up to 12, random sample for variety)
  const otherStates = allStates
    .filter(st => st.abbr !== stAbbr)
    .slice(0, 12);

  // City cards (sorted alphabetically)
  const sortedCities = [...cities.entries()].sort((a,b) => a[0].localeCompare(b[0]));

  const cityCards = sortedCities.map(([city, list]) => {
    const cSlug = citySlug(city, stAbbr);
    const count = list.length;
    const types = [...new Set(list.map(s=>s.type))];
    const typePills = types.map(t => {
      const tm = TYPE_META[t] || TYPE_META.rescue;
      return `<span class="sp-type-pill" style="background:${tm.bg};color:${tm.text}">${tm.label}</span>`;
    }).join('');
    return `
    <a href="/shelters/${h(cSlug)}.html" class="sp-city-card">
      <div class="sp-city-name">${h(city)}</div>
      <div class="sp-city-meta">
        <span class="sp-city-count">${count} shelter${count!==1?'s':''}</span>
        <div class="sp-city-types">${typePills}</div>
      </div>
    </a>`;
  }).join('');

  // Other states links
  const otherLinks = otherStates.map(st => {
    const stCount = [...st.cities.values()].reduce((n,l)=>n+l.length,0);
    return `<a href="/shelters/${stateSlug(st.name)}.html" class="sp-state-link">${h(st.name)} <span>${stCount}</span></a>`;
  }).join('');

  // Meta type breakdown string
  const typeParts = [
    municipal ? `${municipal} municipal` : '',
    humane    ? `${humane} humane society` : ''
  ].filter(Boolean).join(' and ');

  const metaDesc = `Find ${totalShelters} animal shelters and rescues across ${totalCities} cities in ${stName}${typeParts ? ` — including ${typeParts}` : ''}. Browse adoptable dogs, cats and more with pawd.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Animal Shelters in ${h(stName)} — ${totalShelters} Shelters Across ${totalCities} Cities | pawd.</title>
  <meta name="description" content="${h(metaDesc)}" />
  <meta name="theme-color" content="#FF5B3C" />
  <link rel="canonical" href="https://usepawd.com/shelters/${slug}" />
  <link rel="icon" type="image/svg+xml" href="../favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="../style.css?v=12" />
  <link rel="stylesheet" href="../city-pages.css?v=1" />
  <link rel="stylesheet" href="../state-pages.css?v=1" />
  <meta name="robots" content="index, follow" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://usepawd.com/shelters/${slug}" />
  <meta property="og:title" content="Animal Shelters in ${h(stName)} | pawd." />
  <meta property="og:description" content="${h(metaDesc)}" />
  <meta property="og:image" content="https://usepawd.com/og-image.svg" />
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "name": `Animal Shelters in ${stName} | pawd.`,
        "url": `https://usepawd.com/shelters/${slug}`,
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type":"ListItem", "position":1, "name":"Home", "item":"https://usepawd.com" },
            { "@type":"ListItem", "position":2, "name":"Shelter Map", "item":"https://usepawd.com/shelters" },
            { "@type":"ListItem", "position":3, "name":stName }
          ]
        }
      },
      {
        "@type": "ItemList",
        "name": `Animal Shelters in ${stName}`,
        "numberOfItems": totalCities,
        "itemListElement": sortedCities.map(([city, list], i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "url": `https://usepawd.com/shelters/${citySlug(city, stAbbr)}`
        }))
      }
    ]
  })}</script>
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
        <span>${h(stName)}</span>
      </nav>
      <h1 class="cp-hero-title">Animal Shelters<br>in <em>${h(stName)}</em></h1>
      <p class="cp-hero-sub">${totalShelters} shelter${totalShelters!==1?'s':''} and rescue${totalShelters!==1?'s':''} across ${totalCities} ${totalCities!==1?'cities':'city'} in ${h(stName)}${typeParts ? ` — including ${typeParts}` : ''}. Find your perfect match and support local animals with pawd.</p>
    </div>
  </section>

  <section class="sp-cities">
    <div class="sp-cities-inner">
      <div class="section-label">${totalCities} ${totalCities!==1?'cities':'city'} in ${h(stName)}</div>
      <div class="sp-city-grid">
        ${cityCards}
      </div>
    </div>
  </section>

  <section class="cp-cta">
    <div class="cp-cta-inner fade-up">
      <div class="section-label" style="justify-content:center;display:inline-flex">adopt in ${h(stName)}</div>
      <h2>swipe through every animal<br>at these shelters — <em>free.</em></h2>
      <p>pawd. matches you with adoptable pets from shelters across ${h(stName)} based on your lifestyle. fall in love. support the shelter in one gesture.</p>
      <span class="cp-cta-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 13.92 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/></svg>
        coming to App Store · iOS 2026
      </span>
    </div>
  </section>

  <section class="sp-other-states">
    <div class="sp-other-states-inner">
      <div class="section-label">more states</div>
      <div class="sp-states-grid">
        ${otherLinks}
      </div>
      <a href="../shelters.html" class="sp-all-link">view all shelters on the map →</a>
    </div>
  </section>

  <footer>
    <div class="footer-inner">
      <div class="footer-big">pawd<span class="accent">.</span></div>
      <div class="footer-left">
        <nav class="footer-links">
          <a href="../index.html">home</a>
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

// ── Write all state pages ─────────────────────────────────────────────────────
let count = 0;
for (const [abbr, data] of stateData) {
  const slug = stateSlug(data.name);
  const html = generateStatePage(abbr, data.name, data.cities);
  fs.writeFileSync(path.join(outDir, slug + '.html'), html, 'utf8');
  sitemapUrls.push(`  <url>\n    <loc>https://usepawd.com/shelters/${slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
  count++;
}

console.log(`✅  ${count} state pages written to shelters/`);

// ── Update sitemap ─────────────────────────────────────────────────────────────
const existingSitemap = fs.readFileSync(path.join(__dirname, 'sitemap.xml'), 'utf8');
const newSitemap = existingSitemap.replace(
  '</urlset>',
  '\n' + sitemapUrls.join('\n') + '\n\n</urlset>'
);
fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), newSitemap, 'utf8');
console.log(`✅  sitemap.xml updated with ${count} state page URLs`);
console.log(`\nTotal sitemap entries: ${(newSitemap.match(/<url>/g)||[]).length}`);
