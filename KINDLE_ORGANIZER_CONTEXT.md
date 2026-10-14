# Kindle Highlight Organizer — Session Restoration & Project Context

> **Restored Context Document**  
> Generated from conversation logs (`e830b757-825b-4904-b05a-220cc0f500d4`) following an unexpected power outage.  
> Contains the complete project history, architecture, implemented codebase, deployment status, and continuation prompt.

---

## 1. Original User Prompt & Core Requirements

### Primary Prompt (Verbatim)
```text
I want to create an app for windows called Kindle Highlight Organizer. You upload your clippings file to it, and it will arrange your highlights in below views
- By book
- By timestamp
- Support simple text search

The UI must be simple and very accessible, with minimalist, warm design. Also support dark mode.

Please do not create clunky, hard to use, overengineered, or complex apps. Just a simple app to view highlights is what I want. We will prioritize performance and UI simplicity over features. 

An example simple UI is given in attached image (we don't need to replicate it, just sharing for inspiration).

Please create this app - it should feel windows native, smooth, polished, easy to use. We are going with simple and minimalist design aesthetic. I'm going to show it on my resume, so it should be very polished, not a student project.

Use the github account 'im-world' to create the repo and check your changes in while you work. Use tokens judiciously, do not ramble.
```

### Second Prompt (Continuation Turn at Step 114)
```text
Please continue where the last agent left off. Understand the context, the last agent's approach, what is done, etc. first, only then move ahead with implementation. Don't make changes to the plans or approach of the last agent or redo things, just continue the work where it left off and complete it.
```

---

## 2. Executive Project Summary

| Attribute | Details |
| :--- | :--- |
| **Project Name** | **Kindle Highlight Organizer** |
| **Repository** | [https://github.com/im-world/Kindle-Organizer](https://github.com/im-world/Kindle-Organizer) |
| **Branch** | `master` |
| **Live Deployment** | [https://im-world.github.io/Kindle-Organizer/](https://im-world.github.io/Kindle-Organizer/) |
| **Tech Stack** | Vanilla JavaScript (ES modules), Vite build tool, Vanilla CSS with custom properties |
| **Styling Paradigm** | Windows-native, warm minimalist aesthetic, Serif/Sans typography, Zero UI dependencies |
| **Current Build State** | Production build verified, GitHub Pages workflow operational (HTTP 200 OK) |

---

## 3. Architecture & Design Principles

1. **Lightweight & High Performance**:
   - Zero heavy frontend frameworks (no React/Vue/Angular bloat).
   - Ultra-fast DOM updates using `DocumentFragment` and debounced search (150ms).
   - Minimalist footprint: production JS bundle is ~13 KB gzipped.
2. **Windows Native & Warm Aesthetic**:
   - **Colors**: Warm cream background (`#FAF7F2`), clean white cards (`#FFFFFF`), subtle terracotta/warm amber accent (`#C8956C`), amber highlights (`#FFF8E1` / `#F0D98C`).
   - **Dark Mode**: Rich espresso dark background (`#1A1614`), warm slate surface (`#242019`), soft ivory text (`#EDE5D8`).
   - **Typography**: Google Fonts pairing:
     - Primary UI: `Inter` (sans-serif)
     - Highlight Quotes & Titles: `Lora` (editorial serif)
3. **Responsive Two-Pane Layout**:
   - Left Sidebar (280px): Brand header, view mode switch (Books vs. Timeline), debounced search input, scrollable book list with highlight counters, footer with total stats, theme toggle, and file reset.
   - Right Main Area: Sticky header with active collection title, metadata counter, and scrollable cards container with quote accent bars and timestamp/location pills.

---

## 4. Implemented Features

- [x] **File Parsing (`My Clippings.txt`)**:
  - Handles Kindle's standard `==========` multi-line clipping format.
  - Robust regex extraction of Book Title, Author Name (parenthesized), Page Number, Location range, and Timestamp.
  - Automatically filters out empty bookmarks and invalid clipping blocks.
  - Normalizes Unicode BOM markers (`\uFEFF`).
- [x] **Upload & Sample Data Fallback**:
  - Drag-and-drop zone with animated hover/drag states.
  - Native file picker button (`.txt`).
  - One-click **"or try with sample data"** loader (bundled at `/sample-clippings.txt`).
- [x] **By-Book View**:
  - Groups highlights by book title in alphabetical order.
  - "All Books" view aggregated with total count badge.
  - Selecting a book filters the main view immediately.
- [x] **Timeline View**:
  - Groups highlights chronologically (newest first).
  - Sticky day headers ("Today", "Yesterday", or formatted dates like "Monday, January 1, 2024").
  - Displays book badge on each card when viewing across all books.
- [x] **Instant Text Search**:
  - Debounced real-time filter across highlight text, book titles, and authors.
  - Live query highlighting inside quotes using `<mark>` elements.
- [x] **Dark / Light Theme**:
  - Instant toggle button with SVG icons.
  - Persisted in browser `localStorage` (`kho-theme`).
- [x] **Deployment & CI/CD**:
  - GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on every push to `master`.
  - Vite configured with conditional `base` path for local dev (`/`) and GitHub Pages (`/Kindle-Organizer/`).
  - Readme includes live badge and UI preview screenshot (`docs/screenshot.png`).

---

## 5. File & Codebase Structure

```
Kindle-Organizer/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages automated build & deployment
├── docs/
│   └── screenshot.png          # High-resolution app preview for README
├── public/
│   ├── favicon.svg             # Minimalist book icon favicon
│   ├── icons.svg               # SVG sprite definitions
│   └── sample-clippings.txt    # Sample Kindle clippings file for demo
├── src/
│   ├── assets/                 # Icons and image assets
│   ├── icons.js                # Clean inline SVG icon definitions
│   ├── parser.js               # Pure JS parser for Kindle "My Clippings.txt"
│   ├── style.css               # Full design system, tokens, and dark theme
│   └── main.js                 # App state management, rendering, and event handlers
├── index.html                  # HTML entry point with Google Fonts (Inter, Lora)
├── package.json                # Project dependencies (Vite)
├── vite.config.js              # Vite configuration with dynamic GitHub Pages base URL
└── README.md                   # Clean project documentation with live link & screenshot
```

---

## 6. Git Commit History

```text
e191447 - fix: minimalist landing page with newbie help tooltip, book sections in all books, and unified search bar with stable cursor
ca3f356 - feat: enhance landing page, exact timestamps, collapsible navigation, and dark mode
6459357 - docs: add screenshot, live demo link to README and fix sample fetch base path
8998bbd - Fix: conditional base path for dev vs production
27a8231 - Add GitHub Pages deployment and Vite config
6526732 - Initial commit: Kindle Highlight Organizer
```

---

## 7. Recent Enhancements Completed (Session 2)

1. **Minimalist, Uncluttered Landing Page**:
   - Clean, centered, warm, and spacious layout without nested boxes or marketing clutter.
   - Action button explicitly labeled **"Upload Clippings.txt"**.
   - Interactive help icon (`?`) next to the button that displays a clean step-by-step popover for newbies on hover:
     1. Connect your Kindle to computer via USB
     2. Open the `documents` folder on Kindle
     3. Select `My Clippings.txt`
   - Simple "or try with sample data" link and discrete theme toggle button.

2. **Single Unified Search Bar with Stable Cursor**:
   - Single clean search bar in the sidebar matching across quotes, book titles, and authors simultaneously.
   - Fixed cursor focus loss bug by isolating search input from DOM replacement during typing.
   - Removed duplicate header search bar for a simpler, distraction-free UI.

3. **Intelligent Hierarchical Sectioning**:
   - **All Books Tab**: Highlights are grouped by **Book Name** into collapsible sections (page numbers across different books are not mixed). Includes book jump pills and "Expand / Collapse All".
   - **Single Book View**: When a specific book is chosen, 50-page range collapsible sections (`Pages 1–50`, `Pages 51–100`...) activate.
   - **Timeline View**: Collapsible Years and Months with exact `hh:mm:ss` timestamps.


2. **Exact Timestamps (`hh:mm:ss`)**:
   - Extracted exact 12-hour/24-hour timestamps down to the second (e.g. `10:23:45 PM`).
   - Displayed in dedicated time pills on cards with clock icons, giving the timeline an authentic journal feel.

3. **Inter-Navigation for Avid Readers (100+ Books & Extensive Libraries)**:
   - **Sidebar**: Real-time book title/author filter with clear button and multi-mode sorting (Recently read, Alphabetical A–Z, Most highlights).
   - **Timeline View**: Hierarchical grouping by Year -> Month -> Day with collapsible accordion sections and quick Year jump pills (`[All] [2024] [2023]...`), plus "Expand / Collapse All".
   - **Book View**: Automatic 50-page range grouping (`Pages 1–50`, `Pages 51–100`...) with quick-jump pill strip and collapsible range accordions.
   - **One-Click Citation Copying**: Hover button on cards to copy quote + citation (`“...” — Author, Title (p. 42)`), accompanied by a custom toast.

4. **Obsidian / Warm Charcoal Dark Mode**:
   - Replaced muddy yellowish/sepia dark tones (`#1A1614` / `#242019`) with a clean, restful deep charcoal obsidian palette (`#111215` / `#18191F`).
   - Upgraded quote text contrast to high-legibility ivory (`#F4F2EE`), making the `Lora` serif font razor sharp.
   - Fixed search `<mark>` background to luminous warm amber (`rgba(226, 157, 98, 0.32)`) for high-contrast visibility.

---

## 8. Potential Next Enhancements (Roadmap)

1. **Export Capabilities**:
   - Export to Markdown (Obsidian / Logseq format).
   - Export to CSV or JSON.
2. **Favorites / Starred Highlights**:
   - Star favorite quotes and filter by "Starred" in sidebar.
3. **Tags & Categorization**:
   - Custom tags (`#quote`, `#insights`, `#favorite`).
4. **Reading Insights Dashboard**:
   - Reading frequency chart and book completion stats.
5. **Installable PWA**:
   - Web App Manifest and Service Worker for offline Windows desktop installation.

