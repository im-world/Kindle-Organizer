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

  const pageNum = meta.page ? parseInt(meta.page, 10) : null;
  const locNum = meta.location ? parseInt(meta.location.split('-')[0], 10) : null;

  return {
    id: `h-${index}`,
    bookTitle: title,
    author,
    text,
    type: meta.type,
    page: meta.page,
    pageNum: isNaN(pageNum) ? null : pageNum,
    location: meta.location,
    locNum: isNaN(locNum) ? null : locNum,
    date: meta.date,
    dateStr: meta.dateStr,
    timeStr: meta.timeStr || (meta.date ? formatTimeFromDate(meta.date) : ''),
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
 * Extracts type, page, location, date, and exact hh:mm:ss timestamp from metadata.
 */
function parseMeta(line) {
  const result = { type: 'Highlight', page: '', location: '', date: null, dateStr: '', timeStr: '' };

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
      result.timeStr = formatTimeFromDate(parsed);
    } else {
      // Fallback regex to capture hh:mm:ss or hh:mm for localized dates
      const timeMatch = result.dateStr.match(/(\d{1,2}:\d{2}:\d{2}(?:\s*[AP]M)?)/i) ||
                        result.dateStr.match(/(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i);
      if (timeMatch) result.timeStr = timeMatch[1];
    }
  }

  return result;
}

/**
 * Formats a Date object to hh:mm:ss format (12-hour with seconds and AM/PM).
 */
export function formatTimeFromDate(date) {
  if (!date || isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Group highlights by book title.
 * @param {Highlight[]} highlights
 * @returns {Map<string, {title: string, author: string, highlights: Highlight[], latestDate: Date|null, totalCount: number}>}
 */
export function groupByBook(highlights) {
  const map = new Map();

  for (const h of highlights) {
    const key = h.bookTitle;
    if (!map.has(key)) {
      map.set(key, { title: h.bookTitle, author: h.author, highlights: [], latestDate: null, totalCount: 0 });
    }
    const bookObj = map.get(key);
    bookObj.highlights.push(h);
    if (h.date && (!bookObj.latestDate || h.date > bookObj.latestDate)) {
      bookObj.latestDate = h.date;
    }
  }

  for (const book of map.values()) {
    book.totalCount = book.highlights.length;
  }

  // Default alphabetical sort
  return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

/**
 * Hierarchical grouping by Year -> Month -> Day for avid readers with years of reading history.
 * @param {Highlight[]} highlights
 * @returns {{year: string, count: number, months: {monthKey: string, monthName: string, count: number, days: {dayKey: string, label: string, date: Date|null, highlights: Highlight[]}[]}[]}[]}
 */
export function groupByTimelineHierarchy(highlights) {
  // Sort newest first
  const sorted = [...highlights].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date - a.date;
  });

  const yearMap = new Map();

  for (const h of sorted) {
    const date = h.date;
    const yearKey = date ? String(date.getFullYear()) : 'Undated';
    const monthKey = date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : 'undated';
    const monthName = date
      ? date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'Undated';
    const dayKey = date ? date.toDateString() : 'undated-day';

    if (!yearMap.has(yearKey)) {
      yearMap.set(yearKey, { year: yearKey, count: 0, monthsMap: new Map() });
    }
    const yearObj = yearMap.get(yearKey);
    yearObj.count++;

    if (!yearObj.monthsMap.has(monthKey)) {
      yearObj.monthsMap.set(monthKey, {
        monthKey,
        monthName,
        count: 0,
        daysMap: new Map(),
      });
    }
    const monthObj = yearObj.monthsMap.get(monthKey);
    monthObj.count++;

    if (!monthObj.daysMap.has(dayKey)) {
      monthObj.daysMap.set(dayKey, {
        dayKey,
        label: dayKey,
        date: date || null,
        highlights: [],
      });
    }
    monthObj.daysMap.get(dayKey).highlights.push(h);
  }

  const result = [];
  for (const yearObj of yearMap.values()) {
    const months = [];
    for (const monthObj of yearObj.monthsMap.values()) {
      months.push({
        monthKey: monthObj.monthKey,
        monthName: monthObj.monthName,
        count: monthObj.count,
        days: [...monthObj.daysMap.values()],
      });
    }
    result.push({
      year: yearObj.year,
      count: yearObj.count,
      months,
    });
  }

  return result;
}

/**
 * Group highlights within a book by 50-page ranges.
 * For avid readers with 50-100+ highlights in a single book.
 * @param {Highlight[]} highlights
 * @param {number} pageSize (default 50)
 */
export function groupByPageRanges(highlights, pageSize = 50) {
  // Sort highlights by page number, then location, then date
  const sorted = [...highlights].sort((a, b) => {
    if (a.pageNum !== null && b.pageNum !== null) return a.pageNum - b.pageNum;
    if (a.pageNum !== null) return -1;
    if (b.pageNum !== null) return 1;
    if (a.locNum !== null && b.locNum !== null) return a.locNum - b.locNum;
    if (a.date && b.date) return a.date - b.date;
    return 0;
  });

  const pagedHighlights = sorted.filter(h => h.pageNum !== null);
  const unpagedHighlights = sorted.filter(h => h.pageNum === null);

  const sections = [];

  if (pagedHighlights.length > 0) {
    const maxPage = Math.max(...pagedHighlights.map(h => h.pageNum));
    const totalBuckets = Math.ceil(maxPage / pageSize);

    for (let i = 0; i < totalBuckets; i++) {
      const start = i * pageSize + 1;
      const end = (i + 1) * pageSize;
      const inRange = pagedHighlights.filter(h => h.pageNum >= start && h.pageNum <= end);
      if (inRange.length > 0) {
        sections.push({
          id: `range-${start}-${end}`,
          label: `Pages ${start}–${end}`,
          shortLabel: `pp. ${start}–${end}`,
          startPage: start,
          endPage: end,
          count: inRange.length,
          highlights: inRange,
        });
      }
    }
  }

  if (unpagedHighlights.length > 0) {
    sections.push({
      id: 'range-unpaged',
      label: pagedHighlights.length > 0 ? 'Other Locations' : 'All Highlights',
      shortLabel: pagedHighlights.length > 0 ? 'Locations' : 'Highlights',
      startPage: null,
      endPage: null,
      count: unpagedHighlights.length,
      highlights: unpagedHighlights,
    });
  }

  return sections;
}

/**
 * Flat date grouping (backwards compatible).
 * @param {Highlight[]} highlights
 * @returns {{label: string, date: Date|null, highlights: Highlight[]}[]}
 */
export function groupByDate(highlights) {
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

