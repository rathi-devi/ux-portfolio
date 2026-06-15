// ─── State ──────────────────────────────────────────────────
let allProjects = [];
let activeFilter = 'all';

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
    // Re-render cards so localised project text updates instantly
    renderProjects(activeFilter === 'all'
      ? allProjects
      : allProjects.filter(p => p.category === activeFilter));
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
    initTree(allProjects.length);       // branches = number of projects
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

  // Navigate on click or Enter key
  const navigate = () => {
    if (project.link) window.location.href = project.link;
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
    <span class="project-year">${escapeHtml(project.course ?? project.year ?? '')}</span>
  `;

  // Title — uses t() to pick localised variant if available in projects.json
  const title = document.createElement('h3');
  title.className = 'project-title';
  title.textContent = t(project, 'title');

  // Summary — supports object { no, en } or plain string
  const desc = document.createElement('p');
  desc.className = 'project-description';
  desc.textContent = t(project, 'summary');

  // Tags
  const tagsEl = document.createElement('div');
  tagsEl.className = 'project-tags';
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

// ─── Setup ───────────────────────────────────────────────────
function initTree(projectCount) {
  const canvas = document.getElementById('tree-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  // Orthographic camera: 1 unit = 1 pixel, origin at viewport center
  const W = window.innerWidth;
  const H = window.innerHeight;

  scene    = new THREE.Scene();
  camera   = new THREE.OrthographicCamera(-W/2, W/2, H/2, -H/2, 1, 1000);
  camera.position.z = 100;

  clock    = new THREE.Clock();

  // Alpha: true → renderer background is transparent, CSS colour shows through
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Tree lives inside a Group so we can sway the whole thing from the root
  treeGroup = new THREE.Group();
  scene.add(treeGroup);

  buildTree(projectCount);

  // ── TODO: Mouse interaction ───────────────────────────────
  // Add a mousemove listener here and map cursor position to a small
  // treeGroup.rotation.z / treeGroup.rotation.x offset so the tree
  // leans subtly toward the pointer.
  //
  // window.addEventListener('mousemove', (e) => {
  //   const nx = (e.clientX / window.innerWidth  - 0.5) * 2; // –1 … +1
  //   const ny = (e.clientY / window.innerHeight - 0.5) * 2;
  //   targetRotX = ny *  0.04;
  //   targetRotZ = nx * -0.06;
  // });
  // Then lerp treeGroup.rotation toward target values in tick().
  // ─────────────────────────────────────────────────────────

  window.addEventListener('resize', handleResize);
  tick();
}

// ─── Seeded RNG ───────────────────────────────────────────────
// Same seed → same tree shape on every page load (no randomness surprises).
// Change the number passed to makeRng() to explore different shapes.
function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ─── Tree Construction ────────────────────────────────────────
function buildTree(projectCount) {
  const rng      = makeRng(42);
  const segments = []; // flat Vector3 pairs consumed by LineSegments

  // Trunk base: bottom-center of viewport, slightly below mid-screen
  const baseX      = 0;
  const baseY      = -window.innerHeight * 0.46;
  const trunkLen   = window.innerHeight * 0.27;

  branch(segments, rng, baseX, baseY, Math.PI / 2, trunkLen, 0, 6, projectCount);

  const geometry = new THREE.BufferGeometry().setFromPoints(segments);

  // Dark ink colour, low opacity — reads as delicate on the warm background
  const material = new THREE.LineBasicMaterial({
    color:       0x1C1A17,
    transparent: true,
    opacity:     0.20,
  });

  treeGroup.add(new THREE.LineSegments(geometry, material));
}

// ─── Recursive Branch ─────────────────────────────────────────
// Each call draws one straight segment then spawns child branches.
//
// segments    – accumulator array of THREE.Vector3 (pairs = one segment)
// rng         – seeded random function
// x, y        – start point of this segment
// angle       – direction in radians (0 = right, π/2 = up)
// length      – pixel length of this segment
// depth       – current recursion depth (0 = trunk base)
// maxDepth    – stop recursing beyond this
// projectCount– how many main branches to split into at the first fork
function branch(segments, rng, x, y, angle, length, depth, maxDepth, projectCount) {
  if (depth > maxDepth || length < 5) return;

  const ex = x + Math.cos(angle) * length;
  const ey = y + Math.sin(angle) * length;

  segments.push(new THREE.Vector3(x,  y,  0));
  segments.push(new THREE.Vector3(ex, ey, 0));

  // First fork uses project count; all deeper forks split in two
  const splits = depth === 0 ? Math.max(2, projectCount) : 2;
  const spread = depth === 0 ? Math.PI * 0.62 : Math.PI * 0.44;

  for (let i = 0; i < splits; i++) {
    const t          = splits === 1 ? 0.5 : i / (splits - 1);
    const childAngle = angle + (t - 0.5) * spread + (rng() - 0.5) * 0.28;
    const childLen   = length * (0.60 + rng() * 0.12);

    branch(segments, rng, ex, ey, childAngle, childLen, depth + 1, maxDepth, projectCount);
  }
}

// ─── Animation Loop ───────────────────────────────────────────
// One draw call per frame — very cheap. The only motion is a gentle sway
// applied to the whole treeGroup around its trunk base.
function tick() {
  animationId = requestAnimationFrame(tick);

  const t = clock.getElapsedTime();

  // Slow organic sway — barely perceptible, just enough to feel alive
  treeGroup.rotation.z = Math.sin(t * 0.22) * 0.011
                       + Math.sin(t * 0.37) * 0.005; // second harmonic for realism

  // ── TODO: Scroll parallax ─────────────────────────────────
  // Uncomment to make the tree drift upward as the user scrolls:
  // treeGroup.position.y = -window.scrollY * 0.12;
  // ─────────────────────────────────────────────────────────

  renderer.render(scene, camera);
}

// ─── Resize Handler ───────────────────────────────────────────
function handleResize() {
  const W = window.innerWidth;
  const H = window.innerHeight;

  // Update camera frustum to match new viewport
  camera.left   = -W / 2;
  camera.right  =  W / 2;
  camera.top    =  H / 2;
  camera.bottom = -H / 2;
  camera.updateProjectionMatrix();

  renderer.setSize(W, H);

  // Rebuild geometry — branch lengths are viewport-relative
  treeGroup.clear();
  buildTree(allProjects.length || 2);
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
