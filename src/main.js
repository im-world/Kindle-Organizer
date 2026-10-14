import './style.css';
import {
  parseClippings,
  groupByBook,
  groupHighlightsByBookList,
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
  searchQuery: '',               // unified search across highlight text, book, and author
  selectedYear: 'all',           // timeline year filter
  selectedPageRange: 'all',      // book view 50-page range filter
  selectedBookFilter: 'all',     // all-books view jump filter
  globalCollapseState: 'collapsed', // 'collapsed' (default) | 'expanded'
  expandedSections: new Set(),   // explicitly expanded sections when global is collapsed
  collapsedSections: new Set(),  // explicitly collapsed sections when global is expanded
  theme: localStorage.getItem('kho-theme') || 'light',
};

const app = document.getElementById('app');

/* ============================================================
   Collapse Management (Carried across all tabs)
   ============================================================ */
function isSectionCollapsed(sectionId) {
  if (state.globalCollapseState === 'collapsed') {
    return !state.expandedSections.has(sectionId);
  } else {
    return state.collapsedSections.has(sectionId);
  }
}

function toggleSectionCollapse(sectionId) {
  if (state.globalCollapseState === 'collapsed') {
    if (state.expandedSections.has(sectionId)) {
      state.expandedSections.delete(sectionId);
    } else {
      state.expandedSections.add(sectionId);
    }
  } else {
    if (state.collapsedSections.has(sectionId)) {
      state.collapsedSections.delete(sectionId);
    } else {
      state.collapsedSections.add(sectionId);
    }
  }
}

function toggleGlobalCollapse() {
  state.globalCollapseState = state.globalCollapseState === 'collapsed' ? 'expanded' : 'collapsed';
  state.expandedSections.clear();
  state.collapsedSections.clear();
  renderContent();
}

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
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
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
  }, 2000);
}

/* ============================================================
   Minimalist Landing Page (Centered, Balanced, No Box Clutter)
   ============================================================ */
function renderLanding() {
  app.innerHTML = `
    <div class="upload-view" id="upload-view">
      <!-- Discrete corner theme switch -->
      <div class="upload-corner-actions">
        <button class="icon-btn theme-toggle-btn" id="landing-theme-toggle" data-tooltip="${state.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}">
          ${state.theme === 'light' ? icons.moon : icons.sun}
        </button>
      </div>

      <div class="upload-center-card" id="drop-zone">
        <div class="upload-icon">${icons.bookOpen}</div>
        <h1 class="upload-title">Kindle Highlight Organizer</h1>
        <p class="upload-subtitle">
          Drop your <strong>My Clippings.txt</strong> file here,<br/>or click to browse.
        </p>

        <!-- Symmetrically Centered Action Row -->
        <div class="upload-action-row">
          <div class="upload-button-wrapper">
            <button class="upload-btn" id="upload-btn">
              ${icons.upload} Upload Clippings.txt
            </button>

            <!-- Help Icon absolutely positioned to the right (does not offset the button) -->
            <div class="help-wrapper">
              <button class="help-icon-btn" id="help-btn" type="button" aria-label="Help with exporting clippings" data-tooltip="How to get clippings">
                ${icons.helpCircle}
              </button>
              <div class="help-popover" role="tooltip">
                <div class="help-popover-title">How to get your clippings:</div>
                <ol class="help-popover-steps">
                  <li>Connect your Kindle to computer via USB</li>
                  <li>Open the <code>documents</code> folder on Kindle</li>
                  <li>Select <code>My Clippings.txt</code></li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <button class="sample-link" id="sample-btn">or try with sample data</button>
      </div>

      <input type="file" id="file-input" accept=".txt" hidden />
    </div>
  `;

  // Bind Events
  document.getElementById('landing-theme-toggle').addEventListener('click', toggleTheme);

  const dropZone = document.getElementById('drop-zone');
  const uploadView = document.getElementById('upload-view');
  const fileInput = document.getElementById('file-input');
  const uploadBtn = document.getElementById('upload-btn');
  const sampleBtn = document.getElementById('sample-btn');

  uploadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropZone.addEventListener('click', (e) => {
    if (e.target !== uploadBtn && !uploadBtn.contains(e.target) && !e.target.closest('.help-wrapper') && e.target !== sampleBtn) {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  sampleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    loadSampleData();
  });

  // Drag-and-drop on entire view
  ['dragenter', 'dragover'].forEach(name => {
    window.addEventListener(name, (e) => {
      e.preventDefault();
      uploadView.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    window.addEventListener(name, (e) => {
      e.preventDefault();
      if (e.type === 'dragleave' && e.relatedTarget !== null) return;
      uploadView.classList.remove('drag-over');
    });
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadView.classList.remove('drag-over');
    if (e.dataTransfer && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
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
  state.searchQuery = '';
  state.selectedYear = 'all';
  state.selectedPageRange = 'all';
  state.selectedBookFilter = 'all';
  state.globalCollapseState = 'collapsed'; // Default collapsed on load!
  state.expandedSections.clear();
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
   Sidebar (With Single Smooth Unified Search Bar)
   ============================================================ */
function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const booksArr = [...state.books.values()];

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

      <!-- Single Unified Search Bar: Matches quote, book, and author -->
      <div class="search-box">
        <span class="search-icon">${icons.search}</span>
        <input type="text" class="search-input" id="search-input"
               placeholder="Search highlights, books, authors…" value="${escapeAttr(state.searchQuery)}" />
        <button class="clear-search-btn" id="clear-search" style="display: ${state.searchQuery ? 'flex' : 'none'};" title="Clear search">
          ${icons.x}
        </button>
      </div>
    </div>

    <!-- Scrollable Book List -->
    <div class="book-list" id="book-list">
      <div class="book-item ${state.selectedBook === null ? 'active' : ''}" data-book="__all__">
        <span class="book-icon">${icons.book}</span>
        <div class="book-info">
          <div class="book-title-text">All Books</div>
        </div>
        <span class="book-count" id="all-books-count">${state.highlights.length}</span>
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
    </div>

    <!-- Sidebar Footer -->
    <div class="sidebar-footer">
      <span class="total-count">${state.highlights.length} highlights · ${booksArr.length} books</span>
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

  // Bind View Switch
  document.getElementById('view-books').addEventListener('click', () => {
    state.view = 'books';
    state.selectedPageRange = 'all';
    state.selectedBookFilter = 'all';
    renderSidebar();
    renderContent();
  });

  document.getElementById('view-timeline').addEventListener('click', () => {
    state.view = 'timeline';
    state.selectedYear = 'all';
    renderSidebar();
    renderContent();
  });

  // Single Unified Search Input (Never re-renders sidebar, so cursor stays intact!)
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  let searchDebounce;

  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    const val = searchInput.value;
    clearSearchBtn.style.display = val ? 'flex' : 'none';

    searchDebounce = setTimeout(() => {
      state.searchQuery = val;
      renderContent();
    }, 120);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
    renderContent();
  });

  // Book Selection from Sidebar List
  document.getElementById('book-list').addEventListener('click', (e) => {
    const item = e.target.closest('.book-item');
    if (!item) return;
    const bookKey = item.dataset.book;
    state.selectedBook = bookKey === '__all__' ? null : bookKey;
    state.selectedPageRange = 'all';
    state.selectedBookFilter = 'all';

    document.querySelectorAll('.book-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    renderContent();
  });

  // Theme Toggle
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // Open New File / Reset
  document.getElementById('new-file-btn').addEventListener('click', () => {
    state.highlights = [];
    state.books = new Map();
    state.selectedBook = null;
    state.searchQuery = '';
    state.globalCollapseState = 'collapsed';
    state.expandedSections.clear();
    state.collapsedSections.clear();
    renderLanding();
  });
}

/* ============================================================
   Content Area Rendering
   ============================================================ */
function renderContent() {
  const content = document.getElementById('content');
  if (!content) return;

  // Determine active highlights by selected book
  let list = state.selectedBook
    ? (state.books.get(state.selectedBook)?.highlights || [])
    : state.highlights;

  // Apply unified search across quotes, book titles, and authors
  if (state.searchQuery.trim()) {
    list = searchHighlights(list, state.searchQuery);
  }

  // Header Details
  const title = state.view === 'timeline'
    ? (state.selectedBook ? `${state.selectedBook} — Timeline` : 'Timeline')
    : (state.selectedBook || 'All Books');

  const subtitle = state.view === 'timeline'
    ? 'Chronological reading journey with exact timestamps'
    : (state.selectedBook ? (state.books.get(state.selectedBook)?.author || 'Selected book') : 'Organized by book title');

  // Simple, clean header with NO duplicate search input
  content.innerHTML = `
    <div class="content-header">
      <div class="content-title-area">
        <h1 class="content-title" title="${escapeAttr(title)}">${escapeHTML(title)}</h1>
        <div class="content-subtitle">${escapeHTML(subtitle)}</div>
      </div>
      <div class="content-meta-badge">${list.length} highlight${list.length !== 1 ? 's' : ''}</div>
    </div>

    <!-- Quick Jump Strip (Books in All-Books view / Pages in Single-Book view / Years in Timeline) -->
    <div id="jump-strip" class="jump-strip-container"></div>

    <!-- Highlights Container -->
    <div class="highlights-container" id="highlights-container"></div>
  `;

  // Empty State Check
  if (list.length === 0) {
    document.getElementById('jump-strip').style.display = 'none';
    document.getElementById('highlights-container').innerHTML = `
      <div class="empty-content">
        ${icons.search}
        <p>${state.searchQuery ? `No highlights match "${escapeHTML(state.searchQuery)}".` : 'No highlights to show.'}</p>
      </div>
    `;
    return;
  }

  // Route to the appropriate view
  if (state.view === 'timeline') {
    renderTimelineView(document.getElementById('jump-strip'), document.getElementById('highlights-container'), list);
  } else if (state.selectedBook === null) {
    // ALL BOOKS view: Sections organized BY BOOK NAME!
    renderAllBooksView(document.getElementById('jump-strip'), document.getElementById('highlights-container'), list);
  } else {
    // SINGLE BOOK view: Sections organized BY 50-PAGE RANGES!
    renderSingleBookView(document.getElementById('jump-strip'), document.getElementById('highlights-container'), list);
  }
}

/* ============================================================
   All Books View — Organized by Book Name
   (Page numbers across multiple books are not mixed)
   ============================================================ */
function renderAllBooksView(stripEl, containerEl, list) {
  // Group highlights by book name
  const bookGroups = groupHighlightsByBookList(list);

  // If there are multiple books, show the book jump strip & global expand/collapse toggle
  if (bookGroups.length > 1) {
    stripEl.style.display = 'flex';
    stripEl.innerHTML = `
      <div class="jump-label">${icons.book} Books:</div>
      <div class="jump-pills">
        <button class="jump-pill ${state.selectedBookFilter === 'all' ? 'active' : ''}" data-book-filter="all">
          All (${list.length})
        </button>
        ${bookGroups.map(bg => `
          <button class="jump-pill ${state.selectedBookFilter === bg.title ? 'active' : ''}" data-book-filter="${escapeAttr(bg.title)}">
            ${escapeHTML(bg.title)} (${bg.highlights.length})
          </button>
        `).join('')}
      </div>
      <div class="jump-actions">
        <button class="action-link-btn" id="toggle-global-collapse">
          ${state.globalCollapseState === 'collapsed' ? 'Expand All' : 'Collapse All'}
        </button>
      </div>
    `;

    // Bind Book Jump Pills
    stripEl.querySelectorAll('.jump-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        state.selectedBookFilter = pill.dataset.bookFilter;
        renderAllBooksView(stripEl, containerEl, list);
      });
    });

    // Global Expand / Collapse All (carries across all tabs)
    document.getElementById('toggle-global-collapse')?.addEventListener('click', toggleGlobalCollapse);

    // Filter by selected book pill if active
    const visibleBookGroups = state.selectedBookFilter === 'all'
      ? bookGroups
      : bookGroups.filter(bg => bg.title === state.selectedBookFilter);

    containerEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    let cardIdx = 0;

    visibleBookGroups.forEach(bg => {
      const sectionId = `book-${bg.title}`;
      const isCollapsed = isSectionCollapsed(sectionId);

      const groupDiv = document.createElement('div');
      groupDiv.className = 'collapsible-group';

      groupDiv.innerHTML = `
        <div class="accordion-header ${isCollapsed ? 'collapsed' : ''}" data-section-id="${escapeAttr(sectionId)}">
          <div class="accordion-title-area">
            <span class="accordion-chevron">${icons.chevronDown}</span>
            <span class="book-icon">${icons.book}</span>
            <span class="accordion-title">${escapeHTML(bg.title)}</span>
            ${bg.author ? `<span class="accordion-author">by ${escapeHTML(bg.author)}</span>` : ''}
            <span class="accordion-badge">${bg.highlights.length} highlight${bg.highlights.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div class="accordion-body ${isCollapsed ? 'collapsed' : ''}"></div>
      `;

      // Accordion click toggle
      groupDiv.querySelector('.accordion-header').addEventListener('click', () => {
        toggleSectionCollapse(sectionId);
        renderAllBooksView(stripEl, containerEl, list);
      });

      // Append cards
      const bodyEl = groupDiv.querySelector('.accordion-body');
      bg.highlights.forEach(h => {
        bodyEl.appendChild(createHighlightCard(h, cardIdx++, false));
      });

      frag.appendChild(groupDiv);
    });

    containerEl.appendChild(frag);
  } else {
    // Only 1 book in list: render flat
    stripEl.style.display = 'none';
    containerEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    list.forEach((h, idx) => {
      frag.appendChild(createHighlightCard(h, idx, true));
    });
    containerEl.appendChild(frag);
  }

  bindCardCopyButtons(containerEl);
}

/* ============================================================
   Single Book View — Organized with 50-Page Range Sections
   ============================================================ */
function renderSingleBookView(stripEl, containerEl, list) {
  // Group highlights of this specific book into 50-page sections
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
        <button class="action-link-btn" id="toggle-global-collapse">
          ${state.globalCollapseState === 'collapsed' ? 'Expand All' : 'Collapse All'}
        </button>
      </div>
    `;

    // Bind Jump Pills
    stripEl.querySelectorAll('.jump-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        state.selectedPageRange = pill.dataset.range;
        renderSingleBookView(stripEl, containerEl, list);
      });
    });

    // Global Expand / Collapse All
    document.getElementById('toggle-global-collapse')?.addEventListener('click', toggleGlobalCollapse);

    // Filter by selected range if active
    const visibleSections = state.selectedPageRange === 'all'
      ? pageSections
      : pageSections.filter(sec => sec.id === state.selectedPageRange);

    containerEl.innerHTML = '';
    const frag = document.createDocumentFragment();

    visibleSections.forEach(section => {
      const sectionId = `page-${section.id}`;
      const isCollapsed = isSectionCollapsed(sectionId);
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
        <div class="accordion-body ${isCollapsed ? 'collapsed' : ''}"></div>
      `;

      // Accordion click toggle
      groupDiv.querySelector('.accordion-header').addEventListener('click', () => {
        toggleSectionCollapse(sectionId);
        renderSingleBookView(stripEl, containerEl, list);
      });

      // Append cards
      const bodyEl = groupDiv.querySelector('.accordion-body');
      section.highlights.forEach((h, idx) => {
        bodyEl.appendChild(createHighlightCard(h, idx, false));
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
      frag.appendChild(createHighlightCard(h, idx, false));
    });
    containerEl.appendChild(frag);
  }

  bindCardCopyButtons(containerEl);
}

/* ============================================================
   Timeline View — Hierarchical Years & Months
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
      <button class="action-link-btn" id="toggle-global-collapse">
        ${state.globalCollapseState === 'collapsed' ? 'Expand All' : 'Collapse All'}
      </button>
    </div>
  `;

  // Bind Year Pills
  stripEl.querySelectorAll('.jump-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      state.selectedYear = pill.dataset.year;
      renderTimelineView(stripEl, containerEl, list);
    });
  });

  // Global Expand / Collapse All
  document.getElementById('toggle-global-collapse')?.addEventListener('click', toggleGlobalCollapse);

  // Filter hierarchy if year is selected
  const visibleYears = state.selectedYear === 'all'
    ? hierarchy
    : hierarchy.filter(y => y.year === state.selectedYear);

  containerEl.innerHTML = '';
  const frag = document.createDocumentFragment();
  let cardIdx = 0;

  visibleYears.forEach(yearObj => {
    const yearId = `year-${yearObj.year}`;
    const isYearCollapsed = isSectionCollapsed(yearId);

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
      <div class="accordion-body ${isYearCollapsed ? 'collapsed' : ''}"></div>
    `;

    // Year collapse toggle
    yearDiv.querySelector('.accordion-header').addEventListener('click', () => {
      toggleSectionCollapse(yearId);
      renderTimelineView(stripEl, containerEl, list);
    });

    const yearBody = yearDiv.querySelector('.accordion-body');

    // Render Months inside Year
    yearObj.months.forEach(monthObj => {
      const monthId = `month-${monthObj.monthKey}`;
      const isMonthCollapsed = isSectionCollapsed(monthId);

      const monthDiv = document.createElement('div');
      monthDiv.className = 'month-group';

      monthDiv.innerHTML = `
        <div class="month-header ${isMonthCollapsed ? 'collapsed' : ''}" data-month-id="${monthId}">
          <span class="accordion-chevron">${icons.chevronDown}</span>
          <span>${monthObj.monthName}</span>
          <span class="accordion-badge">${monthObj.count}</span>
        </div>
        <div class="accordion-body ${isMonthCollapsed ? 'collapsed' : ''}"></div>
      `;

      // Month collapse toggle
      monthDiv.querySelector('.month-header').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSectionCollapse(monthId);
        renderTimelineView(stripEl, containerEl, list);
      });

      const monthBody = monthDiv.querySelector('.accordion-body');

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
   Highlight Card Factory (Balanced Spacing & Non-colliding Copy)
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
    <!-- Quote Body (starts right at top of card, zero awkward space) -->
    <div class="highlight-text">${text}</div>

    <!-- Metadata Row with exact timestamp and right-aligned copy quote button -->
    <div class="highlight-meta">
      <div class="meta-pills-group">
        ${showBook ? `<span class="meta-pill book-pill">${icons.book} ${escapeHTML(h.bookTitle)}</span>` : ''}
        ${h.page ? `<span class="meta-pill">${icons.page} p. ${h.page}</span>` : ''}
        ${h.location ? `<span class="meta-pill">${icons.location} loc. ${h.location}</span>` : ''}
        ${timeDisplay ? `
          <span class="meta-pill time-pill" title="Exact clipping timestamp">
            ${icons.clock} ${state.view === 'timeline' ? timeDisplay : (dateFormatted ? dateFormatted + ' at ' + timeDisplay : timeDisplay)}
          </span>
        ` : (dateFormatted ? `<span class="meta-pill">${icons.clock} ${dateFormatted}</span>` : '')}
      </div>

      <!-- Copy Quote Button (in footer, right-aligned, zero overlap) -->
      <button class="card-copy-btn" data-quote-id="${h.id}" data-tooltip="Copy quote with citation">
        ${icons.copy} <span>Copy</span>
      </button>
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
        btn.innerHTML = `${icons.check} <span>Copied!</span>`;
        btn.classList.add('copied');
        showToast('Quote copied to clipboard!');
        setTimeout(() => {
          btn.innerHTML = `${icons.copy} <span>Copy</span>`;
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
