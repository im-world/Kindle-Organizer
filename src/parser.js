/**
 * Parses a Kindle "My Clippings.txt" file into structured highlight objects.
 *
 * Kindle clippings format:
 * ─────────────────────────
 * Book Title (Author Name)
 * - Your Highlight on page 42 | location 630-635 | Added on Monday, January 1, 2024 12:00:00 AM
 *
 * The actual highlighted text goes here.
 * ==========
 */

const SEPARATOR = '==========';

/**
 * @typedef {Object} Highlight
 * @property {string}  id        - Unique ID
 * @property {string}  bookTitle - Book title
 * @property {string}  author    - Author name
 * @property {string}  text      - Highlighted text
 * @property {string}  type      - "Highlight", "Note", or "Bookmark"
 * @property {string}  page      - Page number (if available)
 * @property {string}  location  - Kindle location
 * @property {Date|null} date    - Date added
 * @property {string}  dateStr   - Original date string
 */

/**
 * Parse the full clippings text.
 * @param {string} raw
 * @returns {Highlight[]}
 */
export function parseClippings(raw) {
  const blocks = raw.split(SEPARATOR).map(b => b.trim()).filter(Boolean);
  const highlights = [];

  for (let i = 0; i < blocks.length; i++) {
    const h = parseBlock(blocks[i], i);
    if (h) highlights.push(h);
  }

  return highlights;
}

/**
 * Parse a single clipping block.
 * @param {string} block
 * @param {number} index
 * @returns {Highlight|null}
 */
function parseBlock(block, index) {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  // Line 0: title (author)
  const titleLine = lines[0];
  const { title, author } = parseTitleAuthor(titleLine);

  // Line 1: metadata  "- Your Highlight on ..."
  const metaLine = lines[1];
  const meta = parseMeta(metaLine);

  // Remaining lines: the highlight text
  const text = lines.slice(2).join('\n').trim();

  // Skip bookmarks (no text) and empty highlights
  if (!text && meta.type === 'Bookmark') return null;
  if (!text) return null;

  return {
    id: `h-${index}`,
    bookTitle: title,
    author,
    text,
    type: meta.type,
    page: meta.page,
    location: meta.location,
    date: meta.date,
    dateStr: meta.dateStr,
  };
}

/**
 * Extracts title and author from the first line.
 * Handles: "Book Title (Author Name)" or "Book Title"
 */
function parseTitleAuthor(line) {
  // Remove BOM if present
  line = line.replace(/^\uFEFF/, '');

  // Match last parenthesized group as author
  const match = line.match(/^(.+)\(([^)]+)\)\s*$/);
  if (match) {
    return { title: match[1].trim(), author: match[2].trim() };
  }
  return { title: line.trim(), author: '' };
}

/**
 * Extracts type, page, location, and date from the metadata line.
 */
function parseMeta(line) {
  const result = { type: 'Highlight', page: '', location: '', date: null, dateStr: '' };

  // Type
  if (/Your Note/i.test(line))       result.type = 'Note';
  else if (/Your Bookmark/i.test(line)) result.type = 'Bookmark';

  // Page
  const pageMatch = line.match(/page\s+(\d+)/i);
  if (pageMatch) result.page = pageMatch[1];

  // Location
  const locMatch = line.match(/location\s+([\d-]+)/i);
  if (locMatch) result.location = locMatch[1];

  // Date — "Added on ..."
  const dateMatch = line.match(/Added on\s+(.+)$/i);
  if (dateMatch) {
    result.dateStr = dateMatch[1].trim();
    const parsed = new Date(result.dateStr);
    if (!isNaN(parsed.getTime())) {
      result.date = parsed;
    }
  }

  return result;
}

/**
 * Group highlights by book title.
 * @param {Highlight[]} highlights
 * @returns {Map<string, {title: string, author: string, highlights: Highlight[]}>}
 */
export function groupByBook(highlights) {
  const map = new Map();

  for (const h of highlights) {
    const key = h.bookTitle;
    if (!map.has(key)) {
      map.set(key, { title: h.bookTitle, author: h.author, highlights: [] });
    }
    map.get(key).highlights.push(h);
  }

  // Sort books alphabetically
  return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

/**
 * Group highlights by date (day).
 * @param {Highlight[]} highlights
 * @returns {{label: string, date: Date|null, highlights: Highlight[]}[]}
 */
export function groupByDate(highlights) {
  // Sort newest first
  const sorted = [...highlights].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date - a.date;
  });

  const groups = [];
  let currentKey = null;

  for (const h of sorted) {
    const key = h.date ? h.date.toDateString() : 'Unknown date';
    if (key !== currentKey) {
      currentKey = key;
      groups.push({ label: key, date: h.date, highlights: [] });
    }
    groups[groups.length - 1].highlights.push(h);
  }

  return groups;
}

/**
 * Simple text search across highlights.
 * @param {Highlight[]} highlights
 * @param {string} query
 * @returns {Highlight[]}
 */
export function searchHighlights(highlights, query) {
  if (!query.trim()) return highlights;
  const q = query.toLowerCase();
  return highlights.filter(h =>
    h.text.toLowerCase().includes(q) ||
    h.bookTitle.toLowerCase().includes(q) ||
    h.author.toLowerCase().includes(q)
  );
}
