// ─── State ──────────────────────────────────────────────────
let allProjects = [];
let activeFilter = 'all';

// ─── DOM References ──────────────────────────────────────────
const grid      = document.getElementById('projectGrid');
const filterBar = document.getElementById('filterBar');
const yearSpan  = document.getElementById('year');

// ─── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
  loadProjects();
});

// ─── Fetch Projects ──────────────────────────────────────────
async function loadProjects() {
  try {
    const response = await fetch('projects.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    allProjects = await response.json();

    buildFilterButtons();
    renderProjects(allProjects);
  } catch (err) {
    showError();
    console.error('Could not load projects.json:', err);
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
  card.setAttribute('aria-label', `View project: ${project.title}`);

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
    img.alt   = project.title;
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
    <span class="project-year">${escapeHtml(project.year ?? '')}</span>
  `;

  // Title
  const title = document.createElement('h3');
  title.className = 'project-title';
  title.textContent = project.title;

  // Description
  const desc = document.createElement('p');
  desc.className = 'project-description';
  desc.textContent = project.description;

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

// ─── XSS Guard ───────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
