import './style.css';
import {
  parseClippings,
  groupByBook,
  groupByDate,
  groupByTimelineHierarchy,
  groupByPageRanges,
  searchHighlights,
  formatTimeFromDate
} from './parser.js';
import { icons } from './icons.js';

/* ============================================================
   Application State
   ============================================================ */
let state = {
  highlights: [],
  books: new Map(),
  view: 'books',                 // 'books' | 'timeline'
  selectedBook: null,             // book title string or null (all)
  bookFilterQuery: '',           // filter books in sidebar
  bookSortBy: 'recent',          // 'recent' | 'az' | 'count'
  searchQuery: '',               // search across highlight text/title/author
  selectedYear: 'all',           // timeline year quick filter
  selectedPageRange: 'all',      // book view 50-page range quick filter
  collapsedSections: new Set(),  // IDs of sections currently collapsed by user
  theme: localStorage.getItem('kho-theme') || 'light',
};

const app = document.getElementById('app');

/* ============================================================
   Theme Management
   ============================================================ */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('kho-theme', state.theme);
}
applyTheme();

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme();
  // Update toggle button icon across landing or main view
  const btns = document.querySelectorAll('.theme-toggle-btn');
  btns.forEach(btn => {
    btn.innerHTML = state.theme === 'light' ? icons.moon : icons.sun;
    btn.setAttribute('data-tooltip', state.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  });
}

/* ============================================================
   Toast Notification
   ============================================================ */
let toastTimeout;
function showToast(message) {
  clearTimeout(toastTimeout);
  const existing = document.getElementById('kho-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'kho-toast';
  toast.className = 'toast-msg';
  toast.innerHTML = `${icons.check} <span>${escapeHTML(message)}</span>`;
  document.body.appendChild(toast);

  toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 2200);
}

/* ============================================================
   Landing Page — Natural, Editorial, Human-Crafted Hero
   ============================================================ */
function renderLanding() {
  app.innerHTML = `
    <div class="landing-view">
      <header class="landing-navbar">
        <div class="landing-brand">
          ${icons.bookOpen}
          <span>Kindle Highlight Organizer</span>
        </div>
        <button class="icon-btn theme-toggle-btn" id="landing-theme-toggle" data-tooltip="${state.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}">
          ${state.theme === 'light' ? icons.moon : icons.sun}
        </button>
      </header>

      <div class="landing-container">
        <div class="landing-hero">
          <div class="landing-badge">
            ${icons.sparkles} Personal Reading Archive
          </div>
          <h1 class="landing-title">Rediscover the wisdom in your margins.</h1>
          <p class="landing-subtitle">
            Transform your Kindle's <strong>My Clippings.txt</strong> into a serene, searchable personal library.
            Organized chronologically, indexed by book, and runs 100% privately in your browser.
          </p>
        </div>

        <div class="landing-grid">
          <!-- Drop & Browse Studio Card -->
          <div class="landing-card drop-card" id="drop-zone">
            <div class="drop-icon-wrapper">
              ${icons.bookOpen}
            </div>
            <div class="drop-content">
              <div class="drop-heading">Import Your Clippings</div>
              <p class="drop-desc">
                Drag and drop your <strong>My Clippings.txt</strong> here,<br/>or browse from your computer.
              </p>
            </div>
            <button class="btn-primary" id="upload-btn">
              ${icons.upload} Select Clippings File
            </button>
            <div class="drop-hint">
              ${icons.location} Kindle Drive &gt; <code>documents</code> &gt; <code>My Clippings.txt</code>
            </div>
          </div>

          <!-- Instant Demo Library Card -->
          <div class="landing-card demo-card">
            <div class="demo-header">
              <span class="demo-pill">Instant Demo</span>
              <span class="demo-stats">4 Books · 14 Highlights</span>
            </div>
            <div class="demo-body">
              <div class="demo-title">Explore Sample Library</div>
              <p class="demo-desc">
                Don't have your Kindle nearby? Test all sorting, search, timeline, and 50-page navigation features instantly.
              </p>
              <div class="demo-tags">
                <span class="demo-tag">Atomic Habits</span>
                <span class="demo-tag">The Great Gatsby</span>
                <span class="demo-tag">Sapiens</span>
                <span class="demo-tag">1984</span>
              </div>
            </div>
            <button class="btn-secondary" id="sample-btn">
              ${icons.sparkles} Explore Demo Library ${icons.arrowRight}
            </button>
          </div>
        </div>

        <!-- Trust & Features Strip -->
        <div class="landing-features">
          <div class="feature-item">
            <div class="feature-icon">${icons.shieldCheck}</div>
            <div class="feature-text">
              <div class="feature-title">100% Client-Side Privacy</div>
              <div class="feature-desc">Your personal notes never leave your computer. No cloud servers, no account required.</div>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">${icons.search}</div>
            <div class="feature-text">
              <div class="feature-title">Lightning Fast Search</div>
              <div class="feature-desc">Instant real-time search across hundreds of quotes with live text highlighting.</div>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">${icons.layers}</div>
            <div class="feature-text">
              <div class="feature-title">Deep Inter-Navigation</div>
              <div class="feature-desc">Collapsible years/months timeline, 50-page reading sections, and exact timestamps.</div>
            </div>
          </div>
        </div>
      </div>

      <input type="file" id="file-input" accept=".txt" hidden />
    </div>
  `;

  // Bind Events
  document.getElementById('landing-theme-toggle').addEventListener('click', toggleTheme);

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadBtn = document.getElementById('upload-btn');
  const sampleBtn = document.getElementById('sample-btn');

  uploadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropZone.addEventListener('click', (e) => {
    if (e.target !== uploadBtn && !uploadBtn.contains(e.target)) fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  sampleBtn.addEventListener('click', loadSampleData);

  // Drag and drop handlers
  ['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
}

/* ============================================================
   File Handling & Data Loader
   ============================================================ */
function handleFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    loadRaw(e.target.result);
  };
  reader.readAsText(file);
}

function loadRaw(raw) {
  state.highlights = parseClippings(raw);
  state.books = groupByBook(state.highlights);
  state.selectedBook = null;
  state.bookFilterQuery = '';
  state.bookSortBy = 'recent';
  state.searchQuery = '';
  state.selectedYear = 'all';
  state.selectedPageRange = 'all';
  state.collapsedSections.clear();
  renderMain();
}

async function loadSampleData() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}sample-clippings.txt`);
    const raw = await res.text();
    loadRaw(raw);
  } catch (err) {
    console.error('Failed to load sample clippings:', err);
  }
}

/* ============================================================
   Main Application Layout
   ============================================================ */
function renderMain() {
  app.innerHTML = `
    <div class="main-layout">
      <aside class="sidebar" id="sidebar"></aside>
      <main class="content" id="content"></main>
    </div>
  `;
  renderSidebar();
  renderContent();
}

/* ============================================================
   Book Filtering & Sorting for Avid Readers (100+ Books)
   ============================================================ */
function getSortedFilteredBooks() {
  let list = [...state.books.values()];

  // Filter books by title or author
  if (state.bookFilterQuery.trim()) {
    const q = state.bookFilterQuery.toLowerCase();
    list = list.filter(b =>
      b.title.toLowerCase().includes(q) ||
      (b.author && b.author.toLowerCase().includes(q))
    );
  }

  // Sort
  if (state.bookSortBy === 'recent') {
    list.sort((a, b) => {
      const timeA = a.latestDate ? a.latestDate.getTime() : 0;
      const timeB = b.latestDate ? b.latestDate.getTime() : 0;
      return timeB - timeA;
    });
  } else if (state.bookSortBy === 'count') {
    list.sort((a, b) => b.totalCount - a.totalCount);
  } else {
    // Alphabetical
    list.sort((a, b) => a.title.localeCompare(b.title));
  }

  return list;
}

/* ============================================================
   Sidebar Rendering
   ============================================================ */
function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const booksArr = getSortedFilteredBooks();
  const totalBooksCount = state.books.size;

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="app-brand">
        ${icons.bookOpen}
        <span>Kindle Highlights</span>
      </div>

      <!-- View Switcher -->
      <div class="sidebar-controls">
        <button id="view-books" class="${state.view === 'books' ? 'active' : ''}">Books</button>
        <button id="view-timeline" class="${state.view === 'timeline' ? 'active' : ''}">Timeline</button>
      </div>

      <!-- Quick Book Filter Search (for 100+ books) -->
      <div class="sidebar-search-box">
        <span class="search-icon">${icons.search}</span>
        <input type="text" class="sidebar-search-input" id="sidebar-book-filter"
               placeholder="Filter books or authors…" value="${escapeAttr(state.bookFilterQuery)}" />
        ${state.bookFilterQuery ? `
          <button class="clear-search-btn" id="clear-book-filter" title="Clear filter">${icons.x}</button>
        ` : ''}
      </div>

      <!-- Book Sort Options -->
      <div class="sidebar-sort-bar">
        <span>${booksArr.length}${booksArr.length !== totalBooksCount ? ' of ' + totalBooksCount : ''} books</span>
        <div class="sort-options">
          <button class="sort-btn ${state.bookSortBy === 'recent' ? 'active' : ''}" data-sort="recent" title="Recently read/highlighted">Recent</button>
          <button class="sort-btn ${state.bookSortBy === 'az' ? 'active' : ''}" data-sort="az" title="Alphabetical">A–Z</button>
          <button class="sort-btn ${state.bookSortBy === 'count' ? 'active' : ''}" data-sort="count" title="Most highlights">Count</button>
        </div>
      </div>
    </div>

    <!-- Scrollable Book List -->
    <div class="book-list" id="book-list">
      <div class="book-item ${state.selectedBook === null ? 'active' : ''}" data-book="__all__">
        <span class="book-icon">${icons.book}</span>
        <div class="book-info">
          <div class="book-title-text">All Books</div>
        </div>
        <span class="book-count">${state.highlights.length}</span>
      </div>

      ${booksArr.map(b => `
        <div class="book-item ${state.selectedBook === b.title ? 'active' : ''}" data-book="${escapeAttr(b.title)}">
          <span class="book-icon">${icons.page}</span>
          <div class="book-info">
            <div class="book-title-text" title="${escapeAttr(b.title)}">${escapeHTML(b.title)}</div>
            ${b.author ? `<div class="book-author" title="${escapeAttr(b.author)}">${escapeHTML(b.author)}</div>` : ''}
          </div>
          <span class="book-count">${b.highlights.length}</span>
        </div>
      `).join('')}

      ${booksArr.length === 0 ? `
        <div style="padding: 1.5rem 1rem; text-align: center; color: var(--text-tertiary); font-size: 0.8rem;">
          No books found matching "${escapeHTML(state.bookFilterQuery)}"
        </div>
      ` : ''}
    </div>

    <!-- Sidebar Footer -->
    <div class="sidebar-footer">
      <span class="total-count">${state.highlights.length} clips · ${totalBooksCount} books</span>
      <div class="sidebar-actions">
        <button class="icon-btn theme-toggle-btn" id="theme-toggle" data-tooltip="${state.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}">
          ${state.theme === 'light' ? icons.moon : icons.sun}
        </button>
        <button class="icon-btn" id="new-file-btn" data-tooltip="Open another clippings file">
          ${icons.refresh}
        </button>
      </div>
    </div>
  `;

  // Bind Sidebar Events
  document.getElementById('view-books').addEventListener('click', () => {
    state.view = 'books';
    state.selectedPageRange = 'all';
    renderSidebar();
    renderContent();
  });

  document.getElementById('view-timeline').addEventListener('click', () => {
    state.view = 'timeline';
    state.selectedYear = 'all';
    renderSidebar();
    renderContent();
  });

  // Book filter typing (with debounce)
  const bookFilterInput = document.getElementById('sidebar-book-filter');
  let filterDebounce;
  bookFilterInput.addEventListener('input', () => {
    clearTimeout(filterDebounce);
    filterDebounce = setTimeout(() => {
      state.bookFilterQuery = bookFilterInput.value;
      renderSidebar();
    }, 120);
  });

  const clearFilterBtn = document.getElementById('clear-book-filter');
  if (clearFilterBtn) {
    clearFilterBtn.addEventListener('click', () => {
      state.bookFilterQuery = '';
      renderSidebar();
    });
  }

  // Book sorting buttons
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.bookSortBy = btn.dataset.sort;
      renderSidebar();
    });
  });

  // Book selection
  document.getElementById('book-list').addEventListener('click', (e) => {
    const item = e.target.closest('.book-item');
    if (!item) return;
    const bookKey = item.dataset.book;
    state.selectedBook = bookKey === '__all__' ? null : bookKey;
    state.selectedPageRange = 'all';
    document.querySelectorAll('.book-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    renderContent();
  });

  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // New file / reset
  document.getElementById('new-file-btn').addEventListener('click', () => {
    state.highlights = [];
    state.books = new Map();
    state.selectedBook = null;
    state.searchQuery = '';
    state.bookFilterQuery = '';
    state.collapsedSections.clear();
    renderLanding();
  });
}

/* ============================================================
   Content Area & Inter-Navigation Rendering
   ============================================================ */
function renderContent() {
  const content = document.getElementById('content');
  if (!content) return;

  // Determine active highlights by selected book
  let list = state.selectedBook
    ? (state.books.get(state.selectedBook)?.highlights || [])
    : state.highlights;

  // Filter by search query across text, book title, and author
  if (state.searchQuery.trim()) {
    list = searchHighlights(list, state.searchQuery);
  }

  // Header Details
  const title = state.view === 'timeline'
    ? (state.selectedBook ? `${state.selectedBook} — Timeline` : 'Timeline')
    : (state.selectedBook || 'All Highlights');

  const subtitle = state.view === 'timeline'
    ? 'Chronological reading journey with exact timestamps'
    : (state.selectedBook ? (state.books.get(state.selectedBook)?.author || 'Selected book highlights') : 'Showing all highlights across your library');

  content.innerHTML = `
    <div class="content-header">
      <div class="content-title-area">
        <h1 class="content-title" title="${escapeAttr(title)}">${escapeHTML(title)}</h1>
        <div class="content-subtitle">${escapeHTML(subtitle)}</div>
      </div>

      <div class="content-header-actions">
        <!-- Live Highlight Search Bar -->
        <div class="content-search-box">
          <span class="search-icon">${icons.search}</span>
          <input type="text" class="content-search-input" id="content-search"
                 placeholder="Search quote or author…" value="${escapeAttr(state.searchQuery)}" />
          ${state.searchQuery ? `
            <button class="clear-search-btn" id="clear-content-search" title="Clear search">${icons.x}</button>
          ` : ''}
        </div>
        <div class="content-meta-badge">${list.length} highlight${list.length !== 1 ? 's' : ''}</div>
      </div>
    </div>

    <!-- Quick-Jump & Inter-Navigation Strip -->
    <div id="jump-strip" class="jump-strip-container"></div>

    <!-- Highlights Container -->
    <div class="highlights-container" id="highlights-container"></div>
  `;

  // Bind Content Search
  const searchInput = document.getElementById('content-search');
  let searchDebounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.searchQuery = searchInput.value;
      renderContent();
    }, 150);
  });

  const clearSearchBtn = document.getElementById('clear-content-search');
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      state.searchQuery = '';
      renderContent();
    });
  }

  // Check Empty
  if (list.length === 0) {
    document.getElementById('jump-strip').style.display = 'none';
    document.getElementById('highlights-container').innerHTML = `
      <div class="empty-content">
        ${icons.search}
        <p>${state.searchQuery ? `No highlights match "${escapeHTML(state.searchQuery)}".` : 'No highlights to show in this view.'}</p>
      </div>
    `;
    return;
  }

  // Route to Timeline or Book View
  if (state.view === 'timeline') {
    renderTimelineView(document.getElementById('jump-strip'), document.getElementById('highlights-container'), list);
  } else {
    renderBookView(document.getElementById('jump-strip'), document.getElementById('highlights-container'), list);
  }
}

/* ============================================================
   Book View — Arranged with 50-Page Range Collapsible Sections
   ============================================================ */
function renderBookView(stripEl, containerEl, list) {
  // If viewing a specific book or large list, group into 50-page sections
  const pageSections = groupByPageRanges(list, 50);

  // If there are multiple page sections, show the quick-jump bar and collapsible accordions
  if (pageSections.length > 1) {
    stripEl.style.display = 'flex';
    stripEl.innerHTML = `
      <div class="jump-label">${icons.layers} Page Ranges:</div>
      <div class="jump-pills">
        <button class="jump-pill ${state.selectedPageRange === 'all' ? 'active' : ''}" data-range="all">
          All (${list.length})
        </button>
        ${pageSections.map(sec => `
          <button class="jump-pill ${state.selectedPageRange === sec.id ? 'active' : ''}" data-range="${sec.id}">
            ${sec.shortLabel} (${sec.count})
          </button>
        `).join('')}
      </div>
      <div class="jump-actions">
        <button class="action-link-btn" id="toggle-all-sections">Expand / Collapse All</button>
      </div>
    `;

    // Bind Jump Pills
    stripEl.querySelectorAll('.jump-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        state.selectedPageRange = pill.dataset.range;
        renderBookView(stripEl, containerEl, list);
      });
    });

    // Expand / Collapse All
    document.getElementById('toggle-all-sections')?.addEventListener('click', () => {
      const allCollapsed = pageSections.every(sec => state.collapsedSections.has(sec.id));
      if (allCollapsed) {
        pageSections.forEach(sec => state.collapsedSections.delete(sec.id));
      } else {
        pageSections.forEach(sec => state.collapsedSections.add(sec.id));
      }
      renderBookView(stripEl, containerEl, list);
    });

    // Filter by selected range if active
    const visibleSections = state.selectedPageRange === 'all'
      ? pageSections
      : pageSections.filter(sec => sec.id === state.selectedPageRange);

    containerEl.innerHTML = '';
    const frag = document.createDocumentFragment();

    visibleSections.forEach(section => {
      const isCollapsed = state.collapsedSections.has(section.id);
      const groupDiv = document.createElement('div');
      groupDiv.className = 'collapsible-group';

      groupDiv.innerHTML = `
        <div class="accordion-header ${isCollapsed ? 'collapsed' : ''}" data-section-id="${section.id}">
          <div class="accordion-title-area">
            <span class="accordion-chevron">${icons.chevronDown}</span>
            <span class="accordion-title">${escapeHTML(section.label)}</span>
            <span class="accordion-badge">${section.count} highlight${section.count !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div class="accordion-body ${isCollapsed ? 'collapsed' : ''}" id="body-${section.id}"></div>
      `;

      // Accordion click toggle
      groupDiv.querySelector('.accordion-header').addEventListener('click', () => {
        if (state.collapsedSections.has(section.id)) {
          state.collapsedSections.delete(section.id);
        } else {
          state.collapsedSections.add(section.id);
        }
        renderBookView(stripEl, containerEl, list);
      });

      // Append cards
      const bodyEl = groupDiv.querySelector(`#body-${section.id}`);
      section.highlights.forEach((h, idx) => {
        bodyEl.appendChild(createHighlightCard(h, idx, state.selectedBook === null));
      });

      frag.appendChild(groupDiv);
    });

    containerEl.appendChild(frag);
  } else {
    // If only 1 section or few highlights, render flat cards
    stripEl.style.display = 'none';
    containerEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    list.forEach((h, idx) => {
      frag.appendChild(createHighlightCard(h, idx, state.selectedBook === null));
    });
    containerEl.appendChild(frag);
  }

  bindCardCopyButtons(containerEl);
}

/* ============================================================
   Timeline View — Hierarchical Years & Months with Collapsibility
   ============================================================ */
function renderTimelineView(stripEl, containerEl, list) {
  const hierarchy = groupByTimelineHierarchy(list);

  // Render Year Quick-Jump Strip
  stripEl.style.display = 'flex';
  stripEl.innerHTML = `
    <div class="jump-label">${icons.calendar} Jump to Year:</div>
    <div class="jump-pills">
      <button class="jump-pill ${state.selectedYear === 'all' ? 'active' : ''}" data-year="all">
        All (${list.length})
      </button>
      ${hierarchy.map(y => `
        <button class="jump-pill ${state.selectedYear === y.year ? 'active' : ''}" data-year="${y.year}">
          ${y.year} (${y.count})
        </button>
      `).join('')}
    </div>
    <div class="jump-actions">
      <button class="action-link-btn" id="toggle-all-timeline">Expand / Collapse All</button>
    </div>
  `;

  // Bind Year Pills
  stripEl.querySelectorAll('.jump-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      state.selectedYear = pill.dataset.year;
      renderTimelineView(stripEl, containerEl, list);
    });
  });

  // Expand / Collapse All
  document.getElementById('toggle-all-timeline')?.addEventListener('click', () => {
    const allCollapsed = hierarchy.every(y => state.collapsedSections.has(`year-${y.year}`));
    if (allCollapsed) {
      hierarchy.forEach(y => {
        state.collapsedSections.delete(`year-${y.year}`);
        y.months.forEach(m => state.collapsedSections.delete(`month-${m.monthKey}`));
      });
    } else {
      hierarchy.forEach(y => {
        state.collapsedSections.add(`year-${y.year}`);
        y.months.forEach(m => state.collapsedSections.add(`month-${m.monthKey}`));
      });
    }
    renderTimelineView(stripEl, containerEl, list);
  });

  // Filter hierarchy if year is selected
  const visibleYears = state.selectedYear === 'all'
    ? hierarchy
    : hierarchy.filter(y => y.year === state.selectedYear);

  containerEl.innerHTML = '';
  const frag = document.createDocumentFragment();
  let cardIdx = 0;

  visibleYears.forEach(yearObj => {
    const yearId = `year-${yearObj.year}`;
    const isYearCollapsed = state.collapsedSections.has(yearId);

    const yearDiv = document.createElement('div');
    yearDiv.className = 'collapsible-group';

    yearDiv.innerHTML = `
      <div class="accordion-header ${isYearCollapsed ? 'collapsed' : ''}" data-year-id="${yearId}">
        <div class="accordion-title-area">
          <span class="accordion-chevron">${icons.chevronDown}</span>
          <span class="accordion-title">${yearObj.year}</span>
          <span class="accordion-badge">${yearObj.count} highlight${yearObj.count !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div class="accordion-body ${isYearCollapsed ? 'collapsed' : ''}" id="body-${yearId}"></div>
    `;

    // Year collapse toggle
    yearDiv.querySelector('.accordion-header').addEventListener('click', () => {
      if (state.collapsedSections.has(yearId)) {
        state.collapsedSections.delete(yearId);
      } else {
        state.collapsedSections.add(yearId);
      }
      renderTimelineView(stripEl, containerEl, list);
    });

    const yearBody = yearDiv.querySelector(`#body-${yearId}`);

    // Render Months inside Year
    yearObj.months.forEach(monthObj => {
      const monthId = `month-${monthObj.monthKey}`;
      const isMonthCollapsed = state.collapsedSections.has(monthId);

      const monthDiv = document.createElement('div');
      monthDiv.className = 'month-group';

      monthDiv.innerHTML = `
        <div class="month-header ${isMonthCollapsed ? 'collapsed' : ''}" data-month-id="${monthId}">
          <span class="accordion-chevron">${icons.chevronDown}</span>
          <span>${monthObj.monthName}</span>
          <span class="accordion-badge">${monthObj.count}</span>
        </div>
        <div class="accordion-body ${isMonthCollapsed ? 'collapsed' : ''}" id="body-${monthId}"></div>
      `;

      // Month collapse toggle
      monthDiv.querySelector('.month-header').addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.collapsedSections.has(monthId)) {
          state.collapsedSections.delete(monthId);
        } else {
          state.collapsedSections.add(monthId);
        }
        renderTimelineView(stripEl, containerEl, list);
      });

      const monthBody = monthDiv.querySelector(`#body-${monthId}`);

      // Render Days inside Month
      monthObj.days.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'date-day-header';
        dayHeader.textContent = formatDateHeader(day.label, day.date);
        monthBody.appendChild(dayHeader);

        day.highlights.forEach(h => {
          monthBody.appendChild(createHighlightCard(h, cardIdx++, true));
        });
      });

      yearBody.appendChild(monthDiv);
    });

    frag.appendChild(yearDiv);
  });

  containerEl.appendChild(frag);
  bindCardCopyButtons(containerEl);
}

/* ============================================================
   Highlight Card Factory (Exact hh:mm:ss Timestamps & Copy)
   ============================================================ */
function createHighlightCard(h, index, showBook) {
  const card = document.createElement('div');
  card.className = 'highlight-card';
  card.style.setProperty('--i', Math.min(index, 12));

  // Search match highlight
  const text = state.searchQuery
    ? highlightSearchMatch(escapeHTML(h.text), state.searchQuery)
    : escapeHTML(h.text);

  // Exact timestamp: hh:mm:ss format (e.g. 10:23:45 PM)
  const timeDisplay = h.timeStr || (h.date ? formatTimeFromDate(h.date) : '');
  const dateFormatted = h.date ? formatDate(h.date) : '';

  card.innerHTML = `
    <!-- Copy Quote Button -->
    <button class="card-copy-btn" data-quote-id="${h.id}" data-tooltip="Copy quote with citation">
      ${icons.copy}
    </button>

    <!-- Quote Body -->
    <div class="highlight-text">${text}</div>

    <!-- Metadata Strip with exact hh:mm:ss timestamp -->
    <div class="highlight-meta">
      ${showBook ? `<span class="meta-pill book-pill">${icons.book} ${escapeHTML(h.bookTitle)}</span>` : ''}
      ${h.page ? `<span class="meta-pill">${icons.page} p. ${h.page}</span>` : ''}
      ${h.location ? `<span class="meta-pill">${icons.location} loc. ${h.location}</span>` : ''}
      ${timeDisplay ? `
        <span class="meta-pill time-pill" title="Exact clipping timestamp">
          ${icons.clock} ${state.view === 'timeline' ? timeDisplay : (dateFormatted ? dateFormatted + ' at ' + timeDisplay : timeDisplay)}
        </span>
      ` : (dateFormatted ? `<span class="meta-pill">${icons.clock} ${dateFormatted}</span>` : '')}
    </div>
  `;

  // Store raw text for copying
  card.dataset.copyText = `“${h.text}”\n— ${h.author ? h.author + ', ' : ''}${h.bookTitle}${h.page ? ' (p. ' + h.page + ')' : (h.location ? ' (loc. ' + h.location + ')' : '')}`;

  return card;
}

/* Bind copy buttons on cards */
function bindCardCopyButtons(container) {
  container.querySelectorAll('.card-copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.highlight-card');
      const textToCopy = card?.dataset.copyText || '';
      if (!textToCopy) return;

      navigator.clipboard.writeText(textToCopy).then(() => {
        btn.innerHTML = icons.check;
        btn.classList.add('copied');
        showToast('Quote copied to clipboard!');
        setTimeout(() => {
          btn.innerHTML = icons.copy;
          btn.classList.remove('copied');
        }, 1800);
      }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
      });
    });
  });
}

/* ============================================================
   Helper Functions
   ============================================================ */
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateHeader(label, date) {
  if (!date) return label;
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function highlightSearchMatch(html, query) {
  if (!query.trim()) return html;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return html.replace(regex, '<mark>$1</mark>');
}

/* ============================================================
   Bootstrap
   ============================================================ */
renderLanding();
