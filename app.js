// ─── State ──────────────────────────────────────────────────
let allProjects = [];
let activeFilter = 'all';
let currentProject = null;

// ─── Three.js State ──────────────────────────────────────────
let renderer, scene, camera, treeGroup, clock;
let animationId = null;

// ─── i18n State ──────────────────────────────────────────────
// Translations are inlined here — no external fetch, no failure modes.
const TRANSLATIONS = {
  en: {
    'nav.work':               'Work',
    'nav.about':              'About',
    'nav.contact':            'Contact',
    'hero.label':             'Media & Interaction Designer',
    'hero.title':             'Challenging conventions.<br>Connecting insight and interaction.',
    'hero.sub':               'A graduate from UiB who believes good design bridges deep user insight with experimental code. I design to trigger curiosity and reflection, often by rethinking established digital patterns.',
    'work.heading':           'Selected Work',
    'filter.all':             'All',
    'about.heading':          'About Me',
    'about.p1':               'With a bachelor\'s degree in Media and Interaction Design from the University of Bergen, I focus on projects where user research and technical execution meet. I like to think outside the box — whether that means removing manipulative algorithms or intentionally using positive friction to make users stop and reflect.',
    'about.p2':               'Currently open to new opportunities in Bergen or remote.',
    'about.label.based':      'Based in',
    'about.label.experience': 'Core Focus',
    'about.label.tools':      'Tools & Tech',
    'about.value.based':      'Bergen, Norway',
    'about.value.experience': 'Interaction Design, UX Research, Positive Friction, Creative Code',
    'about.value.tools':      'Figma, Three.js, Spline, VS Code, Git',
    'lang.toggle':            'NO',
  },
  no: {
    'nav.work':               'Arbeid',
    'nav.about':              'Om meg',
    'nav.contact':            'Kontakt',
    'hero.label':             'Medie- og interaksjonsdesigner',
    'hero.title':             'Utfordrer konvensjoner.<br>Kobler innsikt og interaksjon.',
    'hero.sub':               'Utdannet fra UiB med en tro på at god design bygger bro mellom dyp brukerinnsikt og eksperimentell kode. Jeg designer for å trigge nysgjerrighet og refleksjon, ofte ved å utfordre etablerte digitale mønstre.',
    'work.heading':           'Utvalgte prosjekter',
    'filter.all':             'Alle',
    'about.heading':          'Om meg',
    'about.p1':               'Med en bachelorgrad i medie- og interaksjonsdesign fra Universitetet i Bergen, fokuserer jeg på prosjekter der brukerinnsikt og teknisk gjennomføring henger tett sammen. Jeg liker å tenke utenfor boksen – enten det betyr å fjerne manipulerende algoritmer, eller å bevisst bruke positiv friksjon for å gi brukeren rom til refleksjon.',
    'about.p2':               'Åpen for spennende stillinger og designsamarbeid.',
    'about.label.based':      'Basert i',
    'about.label.experience': 'Kjernefokus',
    'about.label.tools':      'Verktøy & Teknologi',
    'about.value.based':      'Bergen, Norge',
    'about.value.experience': 'Interaksjonsdesign, UX-Innsikt, Positiv Friksjon, Kreativ koding',
    'about.value.tools':      'Figma, Three.js, Spline, VS Code, Git',
    'lang.toggle':            'EN',
  },
};

let currentLang = localStorage.getItem('lang') || 'en';

// ─── DOM References ──────────────────────────────────────────
const grid        = document.getElementById('projectGrid');
const filterBar   = document.getElementById('filterBar');
const yearSpan    = document.getElementById('year');
const langToggle  = document.getElementById('langToggle');

// ─── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  applyLanguage(currentLang);   // synchronous — no fetch needed
  loadProjects();

  langToggle.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'no' : 'en';
    localStorage.setItem('lang', currentLang);
    applyLanguage(currentLang);
    if (currentProject) {
      renderCaseStudy(currentProject);
    } else {
      renderProjects(activeFilter === 'all'
        ? allProjects
        : allProjects.filter(p => p.category === activeFilter));
    }
  });
});

// ════════════════════════════════════════════════════════════
// INTERNATIONALISATION (i18n)
// ════════════════════════════════════════════════════════════

// ─── Apply language to all data-i18n elements ────────────────
function applyLanguage(lang) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Set <html lang="…"> for screen readers and SEO
  document.documentElement.lang = lang;

  // Plain text nodes
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (dict[key] !== undefined) el.textContent = dict[key];
  });

  // HTML content (elements with <br> etc.)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.dataset.i18nHtml;
    if (dict[key] !== undefined) el.innerHTML = dict[key];
  });

  // Rebuild filter bar labels (dynamic buttons also need translating)
  const allBtn = filterBar.querySelector('[data-filter="all"]');
  if (allBtn && dict['filter.all']) allBtn.textContent = dict['filter.all'];
}

// ─── Helper: get translated project field ─────────────────────
// Handles both object form { no: "...", en: "..." }
// and plain string fallback for simple fields like category.
function t(project, field) {
  const val = project[field];
  if (val && typeof val === 'object') {
    return val[currentLang] || val.en || '';
  }
  return val ?? '';
}

// ─── Fetch Projects ──────────────────────────────────────────
async function loadProjects() {
  try {
    const response = await fetch('projects.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    allProjects = await response.json();

    buildFilterButtons();
    renderProjects(allProjects);
    initTree(allProjects.length);
    initRouter();                       // start hash router after data is ready
  } catch (err) {
    showError();
    console.error('Could not load projects.json:', err);
    initTree(2);                        // fallback if JSON fails
  }
}

// ─── Build Dynamic Filter Buttons ────────────────────────────
function buildFilterButtons() {
  const categories = [...new Set(allProjects.map(p => p.category))];

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className  = 'filter-btn';
    btn.dataset.filter = cat;
    btn.textContent = cat;
    btn.addEventListener('click', () => setFilter(cat, btn));
    filterBar.appendChild(btn);
  });

  // Attach listener to the existing "All" button
  const allBtn = filterBar.querySelector('[data-filter="all"]');
  allBtn.addEventListener('click', () => setFilter('all', allBtn));
}

// ─── Filter Logic ────────────────────────────────────────────
function setFilter(value, clickedBtn) {
  activeFilter = value;

  filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  clickedBtn.classList.add('active');

  const filtered = activeFilter === 'all'
    ? allProjects
    : allProjects.filter(p => p.category === activeFilter);

  renderProjects(filtered);
}

// ─── Render Cards ────────────────────────────────────────────
function renderProjects(projects) {
  grid.innerHTML = '';

  if (projects.length === 0) {
    grid.innerHTML = '<p class="empty-state">No projects found.</p>';
    return;
  }

  projects.forEach(project => {
    const card = createCard(project);
    grid.appendChild(card);
  });
}

// ─── Create Single Card ───────────────────────────────────────
function createCard(project) {
  const card = document.createElement('article');
  card.className = 'project-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `View project: ${t(project, 'title')}`);

  // Navigate: case study view if data exists, external link otherwise
  const navigate = () => {
    if (project.case) {
      window.location.hash = `project/${project.id}`;
    } else if (project.link) {
      window.location.href = project.link;
    }
  };
  card.addEventListener('click', navigate);
  card.addEventListener('keydown', e => { if (e.key === 'Enter') navigate(); });

  // Thumbnail
  const thumb = document.createElement('div');
  thumb.className = 'project-thumbnail';

  if (project.thumbnail) {
    const img = document.createElement('img');
    img.src   = project.thumbnail;
    img.alt   = t(project, 'title');
    img.loading = 'lazy';
    // Fallback if image missing
    img.onerror = () => {
      thumb.innerHTML = `<div class="thumb-placeholder">${project.category}</div>`;
    };
    thumb.appendChild(img);
  } else {
    thumb.innerHTML = `<div class="thumb-placeholder">${project.category}</div>`;
  }

  // Body
  const body = document.createElement('div');
  body.className = 'project-body';

  // Meta row
  const meta = document.createElement('div');
  meta.className = 'project-meta';
  meta.innerHTML = `
    <span class="project-category">${escapeHtml(project.category)}</span>
    <span class="project-year">${escapeHtml(t(project, 'card_label') || project.course || project.year || '')}</span>
  `;

  // Title — uses t() to pick localised variant if available in projects.json
  const title = document.createElement('h3');
  title.className = 'project-title';
  title.textContent = t(project, 'title');

  // Summary — supports object { no, en } or plain string
  const desc = document.createElement('p');
  desc.className = 'project-description';
  desc.textContent = t(project, 'summary');

  // Tagline badge — shown if project has a tagline (e.g. award)
  const tagsEl = document.createElement('div');
  tagsEl.className = 'project-tags';

  if (project.tagline) {
    const badge = document.createElement('span');
    badge.className = 'tag tag--award';
    badge.textContent = ls(project.tagline);
    tagsEl.appendChild(badge);
  }

  (project.tags ?? []).forEach(tag => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = tag;
    tagsEl.appendChild(span);
  });

  body.append(meta, title, desc, tagsEl);
  card.append(thumb, body);
  return card;
}

// ─── Error State ─────────────────────────────────────────────
function showError() {
  grid.innerHTML = `
    <p style="color: var(--color-ink-muted); font-size: var(--text-sm); grid-column: 1/-1;">
      Could not load projects. Make sure <code>projects.json</code> is in the root folder.
    </p>
  `;
}

// ════════════════════════════════════════════════════════════
// THREE.JS — PROCEDURAL TREE
// ════════════════════════════════════════════════════════════

// ─── Animation state ─────────────────────────────────────────
let treeGrowth    = 0;    // 0 → 1, drives the draw-in animation
let restPositions = null; // Float32Array — base vertex positions (before sway)
let vertexDepths  = null; // Float32Array — branch depth per vertex

const MAX_DEPTH = 7;

// Ink and background colours in linear 0–1 space.
// Tips blend toward BG, which reads as both fading and thinning.
const INK = { r: 0.110, g: 0.102, b: 0.090 }; // #1C1A17
const BG  = { r: 0.976, g: 0.973, b: 0.965 }; // #F9F8F6

// ─── Setup ───────────────────────────────────────────────────
function initTree(projectCount) {
  const canvas = document.getElementById('tree-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const W = window.innerWidth;
  const H = window.innerHeight;

  scene  = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-W/2, W/2, H/2, -H/2, 1, 1000);
  camera.position.z = 100;
  clock  = new THREE.Clock();

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  treeGroup = new THREE.Group();
  scene.add(treeGroup);

  buildTree(projectCount);

  // ── TODO: Mouse interaction ───────────────────────────────
  // let targetRotZ = 0;
  // window.addEventListener('mousemove', e => {
  //   targetRotZ = ((e.clientX / window.innerWidth) - 0.5) * -0.10;
  // });
  // Inside tick(): treeGroup.rotation.z += (targetRotZ - treeGroup.rotation.z) * 0.04;
  // ─────────────────────────────────────────────────────────

  window.addEventListener('resize', handleResize);
  tick();
}

// ─── Seeded RNG ──────────────────────────────────────────────
// Deterministic: same seed → same tree every reload.
// Change the seed to explore different shapes.
function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ─── Tree Construction ────────────────────────────────────────
function buildTree(projectCount) {
  treeGrowth = 0;

  const rng    = makeRng(42);
  const pts    = []; // THREE.Vector3 pairs — each pair = one line segment
  const depths = []; // depth value mirroring pts, one entry per Vector3

  branch(pts, depths, rng,
    0, -window.innerHeight * 0.45, // trunk base: bottom-centre of viewport
    Math.PI / 2,                   // heading straight up
    window.innerHeight * 0.27,     // trunk length: 27 % of viewport height
    0, projectCount
  );

  const N = pts.length;

  // ── Store rest positions for per-vertex sway animation ───
  restPositions = new Float32Array(N * 3);
  pts.forEach((v, i) => {
    restPositions[i * 3]     = v.x;
    restPositions[i * 3 + 1] = v.y;
  });
  vertexDepths = new Float32Array(depths);

  // ── Vertex colours — depth-based fade ────────────────────
  // Trunk: ink-dark. Tips: close to paper background.
  // Effect reads as both increasing transparency and thinning lines —
  // elegant workaround since WebGL doesn't support linewidth > 1.
  const colorsArr = new Float32Array(N * 3);
  depths.forEach((d, i) => {
    const t = Math.pow(d / MAX_DEPTH, 1.8); // non-linear: tips fade faster
    colorsArr[i * 3]     = INK.r + (BG.r - INK.r) * t;
    colorsArr[i * 3 + 1] = INK.g + (BG.g - INK.g) * t;
    colorsArr[i * 3 + 2] = INK.b + (BG.b - INK.b) * t;
  });

  // ── Build geometry ────────────────────────────────────────
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(restPositions), 3));
  geometry.setAttribute('color',    new THREE.BufferAttribute(colorsArr, 3));
  geometry.setDrawRange(0, 0); // hidden at first; tick() reveals progressively

  treeGroup.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ vertexColors: true })));
  treeGroup.userData.totalVerts = N;
}

// ─── Recursive Branch ─────────────────────────────────────────
// Draws one branch as several sub-segments with increasing angular wobble,
// producing organic curvature. Stores depth alongside each vertex so
// tick() can scale the sway amplitude per vertex.
function branch(pts, depths, rng, x, y, angle, length, depth, projectCount) {
  if (depth > MAX_DEPTH || length < 4) return;

  const steps  = depth < 2 ? 7 : depth < 4 ? 4 : 2; // smoother near trunk
  const segLen = length / steps;
  let cx = x, cy = y, cAngle = angle;

  for (let s = 0; s < steps; s++) {
    // Wobble grows with depth: trunk is nearly straight, tips curve freely
    cAngle += (rng() - 0.5) * (0.06 + depth * 0.055);

    const nx = cx + Math.cos(cAngle) * segLen;
    const ny = cy + Math.sin(cAngle) * segLen;

    pts.push(new THREE.Vector3(cx, cy, 0));
    pts.push(new THREE.Vector3(nx, ny, 0));
    depths.push(depth, depth); // both endpoints share the branch depth

    cx = nx;
    cy = ny;
  }

  const splits = depth === 0 ? Math.max(2, projectCount) : 2;
  const spread = depth === 0 ? Math.PI * 0.56 : Math.PI * 0.40;

  for (let i = 0; i < splits; i++) {
    const t          = splits === 1 ? 0.5 : i / (splits - 1);
    const childAngle = cAngle + (t - 0.5) * spread + (rng() - 0.5) * 0.18;
    const childLen   = length * (0.60 + rng() * 0.12);

    branch(pts, depths, rng, cx, cy, childAngle, childLen, depth + 1, projectCount);
  }
}

// ─── Animation Loop ───────────────────────────────────────────
// Each frame does two things:
//   1. Reveal more of the tree (growth draw-in, first ~3 s)
//   2. Displace every vertex with layered sine noise scaled by depth —
//      trunk barely moves, tips sway gently like branches in a soft breeze
function tick() {
  animationId = requestAnimationFrame(tick);

  const elapsed = clock.getElapsedTime();
  const lines   = treeGroup.children[0];
  if (!lines) { renderer.render(scene, camera); return; }

  // ── 1. Growth draw-in ─────────────────────────────────────
  if (treeGrowth < 1) {
    treeGrowth += 0.005; // ~200 frames = 3.3 s at 60 fps
    const show = Math.floor(treeGrowth * treeGroup.userData.totalVerts);
    lines.geometry.setDrawRange(0, show - (show % 2)); // always keep pairs
  }

  // ── 2. Per-vertex sway ────────────────────────────────────
  // amplitude = (depth/MAX_DEPTH)² × 8 px
  //   → depth 0 (trunk): 0 px movement
  //   → depth 4 (mid):   ~2.6 px
  //   → depth 7 (tips):  ~8 px
  //
  // phase is derived from rest position so nearby vertices stay coherent
  // (they share similar phase → they move together, not chaotically).
  // Two sine layers at different frequencies avoid mechanical regularity.
  const pos = lines.geometry.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const rx = restPositions[i * 3];
    const ry = restPositions[i * 3 + 1];
    const d  = vertexDepths[i];

    const amp   = Math.pow(d / MAX_DEPTH, 2) * 8;
    const phase = rx * 0.0014 + ry * 0.0009;

    const dx = Math.sin(elapsed * 0.35 + phase)       * amp
             + Math.sin(elapsed * 0.81 + phase * 2.3) * amp * 0.28;
    const dy = Math.cos(elapsed * 0.27 + phase * 0.7) * amp * 0.18;

    pos.setXY(i, rx + dx, ry + dy);
  }
  pos.needsUpdate = true;

  // ── TODO: Scroll parallax ────────────────────────────────
  // treeGroup.position.y = -window.scrollY * 0.12;
  // ─────────────────────────────────────────────────────────

  renderer.render(scene, camera);
}

// ─── Resize Handler ───────────────────────────────────────────
function handleResize() {
  const W = window.innerWidth;
  const H = window.innerHeight;

  camera.left   = -W / 2;
  camera.right  =  W / 2;
  camera.top    =  H / 2;
  camera.bottom = -H / 2;
  camera.updateProjectionMatrix();

  renderer.setSize(W, H);
  treeGroup.clear();
  buildTree(allProjects.length || 2);
}

// ════════════════════════════════════════════════════════════
// HASH ROUTER & CASE STUDY RENDERER
// ════════════════════════════════════════════════════════════

// ─── Router ──────────────────────────────────────────────────
function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

function handleRoute() {
  const match = window.location.hash.match(/^#project\/(.+)$/);
  if (match) {
    const project = allProjects.find(p => p.id === match[1]);
    if (project?.case) { showCaseStudy(project); return; }
  }
  showHome();
}

function showHome() {
  currentProject = null;
  document.getElementById('home-view').hidden = false;
  document.getElementById('case-view').hidden = true;
}

function showCaseStudy(project) {
  currentProject = project;
  document.getElementById('home-view').hidden = true;
  renderCaseStudy(project);
  document.getElementById('case-view').hidden = false;
  window.scrollTo(0, 0);
}

// ─── Localised string helper ──────────────────────────────────
// Resolves { no, en } objects or returns plain strings as-is.
function ls(val) {
  if (!val) return '';
  if (typeof val === 'object') return val[currentLang] || val.en || '';
  return String(val);
}

// ─── Image / placeholder renderer ────────────────────────────
function renderFigure(img) {
  if (!img) return '';
  const caption = img.caption
    ? `<figcaption>${escapeHtml(ls(img.caption))}</figcaption>` : '';

  if (img.src) {
    return `<figure class="case-figure">
      <img src="${escapeHtml(img.src)}" alt="${escapeHtml(ls(img.placeholder || ''))}" loading="lazy">
      ${caption}
    </figure>`;
  }

  // Placeholder shown until real image is added
  return `<figure class="case-figure">
    <div class="img-placeholder" style="aspect-ratio:${img.ratio || '16/9'}">
      <span>${escapeHtml(ls(img.placeholder))}</span>
    </div>
    ${caption}
  </figure>`;
}

// ─── Case study page renderer ─────────────────────────────────
function renderCaseStudy(project) {
  const c   = project.case;
  const lng = currentLang;

  // ── Labels ───────────────────────────────────────────────────
  const L = {
    back:     lng === 'no' ? '← Tilbake til portefølje' : '← Back to portfolio',
    context:  lng === 'no' ? 'Kontekst' : 'Context',
    process:  lng === 'no' ? 'Prosess' : 'Process',
    diamond:  lng === 'no' ? 'Vi fulgte Dobbeldiamanten som overordnet rammeverk.' : 'We followed the Double Diamond as our overarching framework.',
    insights: lng === 'no' ? 'Nøkkelfunn' : 'Key Insights',
    pivot:    lng === 'no' ? 'Den strategiske pivoten' : 'The Strategic Pivot',
    choices:  lng === 'no' ? 'Designvalg' : 'Design Choices',
    screens:  lng === 'no' ? 'Hi-Fi-skjermer' : 'Hi-Fi Screens',
    outcome:  lng === 'no' ? 'Resultat' : 'Outcome',
  };

  // ── Meta row ────────────────────────────────────────────────
  const metaLabels = {
    course:   { no: 'Emne',     en: 'Course' },
    role:     { no: 'Rolle',    en: 'Role' },
    team:     { no: 'Team',     en: 'Team' },
    duration: { no: 'Varighet', en: 'Duration' },
    tools:    { no: 'Verktøy',  en: 'Tools' },
  };
  const metaHtml = [
    ['course',   ls(c.meta.course)],
    ['duration', ls(c.meta.duration)],
    ['role',     ls(c.meta.role)],
    ['team',     ls(c.meta.team)],
    ['tools',    (c.meta.tools || []).join(', ')],
  ].filter(([, val]) => val).map(([key, val]) => `
    <div class="case-meta-item">
      <dt>${escapeHtml(ls(metaLabels[key]))}</dt>
      <dd>${escapeHtml(String(val))}</dd>
    </div>`).join('');

  // ── Context (new field, replaces overview) ───────────────────
  const contextHtml = project.context ? `
    <section class="case-section case-context">
      <h2>${L.context}</h2>
      <p class="context-text">${escapeHtml(ls(project.context))}</p>
    </section>` : '';

  // ── Double Diamond phases ────────────────────────────────────
  const processHtml = (c.process || []).map((p, i) => `
    <div class="case-phase">
      <div class="phase-label">
        <span class="phase-number">0${i + 1}</span>
        <span class="phase-name">${escapeHtml(ls(p.label))}</span>
      </div>
      <div class="phase-content">
        <p>${escapeHtml(ls(p.body))}</p>
        ${(p.images || []).map(renderFigure).join('')}
      </div>
    </div>`).join('');

  // ── Insights ─────────────────────────────────────────────────
  const insightsHtml = (c.insights || []).map(ins => `
    <div class="case-insight">
      <span class="insight-number">${escapeHtml(ins.number)}</span>
      <div>
        <h4>${escapeHtml(ls(ins.heading))}</h4>
        <p>${escapeHtml(ls(ins.body))}</p>
      </div>
    </div>`).join('');

  // ── Pivot — uses project.pivot (simple text) + case.pivot_image ──
  const pivotText  = project.pivot ? ls(project.pivot) : '';
  const pivotImage = c.pivot_image ? renderFigure(c.pivot_image) : '';
  const pivotHtml  = pivotText ? `
    <section class="case-section case-pivot">
      <h2>${L.pivot}</h2>
      <div class="pivot-inner">
        <p>${escapeHtml(pivotText)}</p>
        ${pivotImage}
      </div>
    </section>` : '';

  // ── Design choices (new field) ───────────────────────────────
  // Falls back to case.solutions if design_choices is absent
  const choicesHtml = project.design_choices
    ? project.design_choices.map((ch, i) => `
        <div class="choice-card">
          <span class="choice-number">0${i + 1}</span>
          <div class="choice-body">
            <h4>${escapeHtml(ls(ch.title))}</h4>
            <p>${escapeHtml(ls(ch.desc))}</p>
          </div>
        </div>`).join('')
    : (c.solutions || []).map(s => `
        <div class="choice-card">
          <div class="choice-body">
            <h4>${escapeHtml(ls(s.heading))}</h4>
            <p>${escapeHtml(ls(s.body))}</p>
          </div>
        </div>`).join('');

  // ── Hi-Fi screens ────────────────────────────────────────────
  const screensHtml = (c.screens || []).map(renderFigure).join('');

  // ── Outcome ──────────────────────────────────────────────────
  const outcomeHtml = c.outcome ? `
    <section class="case-section">
      <h2>${L.outcome}</h2>
      <p class="outcome-text">${escapeHtml(ls(c.outcome))}</p>
    </section>` : '';

  // ── Assemble page ────────────────────────────────────────────
  document.getElementById('case-view').innerHTML = `
    <div class="case-study">

      <nav class="case-nav">
        <a href="#" class="case-back">${L.back}</a>
      </nav>

      <header class="case-hero">
        <p class="case-category">${escapeHtml(project.category)}</p>
        <h1 class="case-title">${escapeHtml(ls(project.title))}</h1>
        ${project.tagline
          ? `<p class="case-tagline">${escapeHtml(ls(project.tagline))}</p>`
          : ''}
      </header>

      <dl class="case-meta">${metaHtml}</dl>

      ${project.hero_image ? `
      <figure class="case-hero-image">
        <img src="${escapeHtml(project.hero_image.src)}" alt="${escapeHtml(ls(project.hero_image.caption))}" loading="lazy">
        ${project.hero_image.caption ? `<figcaption>${escapeHtml(ls(project.hero_image.caption))}</figcaption>` : ''}
      </figure>` : ''}

      ${contextHtml}

      ${outcomeHtml}

      <section class="case-section case-screens">
        <h2>${L.screens}</h2>
        <div class="screens-grid">${screensHtml}</div>
      </section>

      ${pivotHtml}

      <section class="case-section case-process">
        <h2>${L.process}</h2>
        <p class="section-intro">${L.diamond}</p>
        ${processHtml}
      </section>

      <section class="case-section case-insights">
        <h2>${L.insights}</h2>
        <div class="insights-grid">${insightsHtml}</div>
      </section>

      <section class="case-section case-choices">
        <h2>${L.choices}</h2>
        <div class="choices-grid">${choicesHtml}</div>
      </section>

    </div>`;
}

// ─── XSS Guard ───────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
