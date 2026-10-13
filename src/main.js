import './style.css';
import { parseClippings, groupByBook, groupByDate, searchHighlights } from './parser.js';
import { icons } from './icons.js';

/* ============================================================
   State
   ============================================================ */
let state = {
  highlights: [],
  books: new Map(),
  view: 'books',            // 'books' | 'timeline'
  selectedBook: null,        // book title key or null (all)
  searchQuery: '',
  theme: localStorage.getItem('kho-theme') || 'light',
};

const app = document.getElementById('app');

/* ============================================================
   Theme
   ============================================================ */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('kho-theme', state.theme);
}
applyTheme();

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme();
  // Update toggle button icon
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.innerHTML = state.theme === 'light' ? icons.moon : icons.sun;
}

/* ============================================================
   Upload View
   ============================================================ */
function renderUpload() {
  app.innerHTML = `
    <div class="upload-view">
      <div class="upload-zone" id="drop-zone">
        <div class="upload-icon">${icons.bookOpen}</div>
        <div class="upload-title">Kindle Highlight Organizer</div>
        <div class="upload-subtitle">
          Drop your <strong>My Clippings.txt</strong> file here,<br/>or click to browse.
        </div>
        <button class="upload-btn" id="upload-btn">
          ${icons.upload} Choose file
        </button>
        <div class="upload-hint">Exported from your Kindle device</div>
      </div>
      <button class="sample-link" id="sample-btn">or try with sample data</button>
      <input type="file" id="file-input" accept=".txt" hidden />
    </div>
  `;

  const zone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadBtn = document.getElementById('upload-btn');

  uploadBtn.addEventListener('click', () => fileInput.click());
  zone.addEventListener('click', (e) => {
    if (e.target !== uploadBtn && !uploadBtn.contains(e.target)) fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  // Sample data
  document.getElementById('sample-btn').addEventListener('click', loadSampleData);

  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
}

/* ============================================================
   File handling
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
  renderMain();
}

async function loadSampleData() {
  const res = await fetch('/sample-clippings.txt');
  const raw = await res.text();
  loadRaw(raw);
}

/* ============================================================
   Main Layout
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
   Sidebar
   ============================================================ */
function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  const booksArr = [...state.books.values()];

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="app-brand">
        ${icons.bookOpen}
        <span>Kindle Highlights</span>
      </div>
      <div class="sidebar-controls">
        <button id="view-books" class="${state.view === 'books' ? 'active' : ''}">Books</button>
        <button id="view-timeline" class="${state.view === 'timeline' ? 'active' : ''}">Timeline</button>
      </div>
      <div class="search-box">
        ${icons.search}
        <input type="text" class="search-input" id="search-input"
               placeholder="Search highlights…" value="${escapeAttr(state.searchQuery)}" />
      </div>
    </div>
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
            ${b.author ? `<div class="book-author">${escapeHTML(b.author)}</div>` : ''}
          </div>
          <span class="book-count">${b.highlights.length}</span>
        </div>
      `).join('')}
    </div>
    <div class="sidebar-footer">
      <span class="total-count">${state.highlights.length} highlights · ${booksArr.length} books</span>
      <div class="sidebar-actions">
        <button class="icon-btn" id="theme-toggle" data-tooltip="${state.theme === 'light' ? 'Dark mode' : 'Light mode'}">
          ${state.theme === 'light' ? icons.moon : icons.sun}
        </button>
        <button class="icon-btn" id="new-file-btn" data-tooltip="Open another file">
          ${icons.refresh}
        </button>
      </div>
    </div>
  `;

  // Event: view toggle
  document.getElementById('view-books').addEventListener('click', () => {
    state.view = 'books';
    renderSidebar();
    renderContent();
  });
  document.getElementById('view-timeline').addEventListener('click', () => {
    state.view = 'timeline';
    renderSidebar();
    renderContent();
  });

  // Event: search
  const searchInput = document.getElementById('search-input');
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.searchQuery = searchInput.value;
      renderContent();
    }, 150);
  });

  // Event: book selection
  document.getElementById('book-list').addEventListener('click', (e) => {
    const item = e.target.closest('.book-item');
    if (!item) return;
    const bookKey = item.dataset.book;
    state.selectedBook = bookKey === '__all__' ? null : bookKey;
    // Update active states without full re-render
    document.querySelectorAll('.book-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    renderContent();
  });

  // Event: theme toggle
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // Event: new file
  document.getElementById('new-file-btn').addEventListener('click', () => {
    state.highlights = [];
    state.books = new Map();
    state.selectedBook = null;
    state.searchQuery = '';
    renderUpload();
  });
}

/* ============================================================
   Content
   ============================================================ */
function renderContent() {
  const content = document.getElementById('content');

  // Determine which highlights to show
  let list = state.selectedBook
    ? (state.books.get(state.selectedBook)?.highlights || [])
    : state.highlights;

  // Apply search
  list = searchHighlights(list, state.searchQuery);

  if (list.length === 0) {
    content.innerHTML = `
      <div class="empty-content">
        ${icons.search}
        <p>${state.searchQuery ? 'No highlights match your search.' : 'No highlights to show.'}</p>
      </div>
    `;
    return;
  }

  if (state.view === 'timeline') {
    renderTimeline(content, list);
  } else {
    renderBookView(content, list);
  }
}

function renderBookView(container, list) {
  const title = state.selectedBook || 'All Highlights';
  const author = state.selectedBook ? (state.books.get(state.selectedBook)?.author || '') : '';

  container.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">${escapeHTML(title)}</h1>
        ${author ? `<div class="content-meta">${escapeHTML(author)}</div>` : ''}
      </div>
      <div class="content-meta">${list.length} highlight${list.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="highlights-container" id="highlights-list"></div>
  `;

  renderHighlightCards(document.getElementById('highlights-list'), list, false);
}

function renderTimeline(container, list) {
  const groups = groupByDate(list);
  container.innerHTML = `
    <div class="content-header">
      <h1 class="content-title">Timeline</h1>
      <div class="content-meta">${list.length} highlight${list.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="highlights-container" id="highlights-list"></div>
  `;

  const listEl = document.getElementById('highlights-list');
  let idx = 0;

  for (const group of groups) {
    const groupEl = document.createElement('div');
    groupEl.className = 'date-group';

    const headerEl = document.createElement('div');
    headerEl.className = 'date-header';
    headerEl.textContent = formatDateHeader(group.label, group.date);
    groupEl.appendChild(headerEl);

    for (const h of group.highlights) {
      groupEl.appendChild(createHighlightCard(h, idx++, true));
    }

    listEl.appendChild(groupEl);
  }
}

function renderHighlightCards(container, list, showBook) {
  // Use DocumentFragment for performance
  const frag = document.createDocumentFragment();
  for (let i = 0; i < list.length; i++) {
    frag.appendChild(createHighlightCard(list[i], i, showBook));
  }
  container.appendChild(frag);
}

function createHighlightCard(h, index, showBook) {
  const card = document.createElement('div');
  card.className = 'highlight-card';
  card.style.setProperty('--i', Math.min(index, 15)); // cap stagger

  const text = state.searchQuery
    ? highlightSearchMatch(escapeHTML(h.text), state.searchQuery)
    : escapeHTML(h.text);

  card.innerHTML = `
    <div class="highlight-text">${text}</div>
    <div class="highlight-meta">
      ${showBook ? `<span class="timeline-book-label">${icons.book} ${escapeHTML(h.bookTitle)}</span>` : ''}
      ${h.page ? `<span>${icons.page} p. ${h.page}</span>` : ''}
      ${h.location ? `<span>${icons.location} ${h.location}</span>` : ''}
      ${h.date ? `<span>${icons.clock} ${formatDate(h.date)}</span>` : ''}
    </div>
  `;

  return card;
}

/* ============================================================
   Helpers
   ============================================================ */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateHeader(label, date) {
  if (!date) return label;
  const now = new Date();
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function highlightSearchMatch(html, query) {
  if (!query.trim()) return html;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return html.replace(regex, '<mark>$1</mark>');
}

/* ============================================================
   Boot
   ============================================================ */
renderUpload();
