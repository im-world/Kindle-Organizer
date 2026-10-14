# Kindle Highlight Organizer

A clean, minimalist desktop web app to browse and search your Kindle highlights.

🔗 **[Live Demo](https://im-world.github.io/Kindle-Organizer/)**

![Kindle Highlight Organizer Screenshot](docs/screenshot.png)

## Features

- **Import** your `My Clippings.txt` file via drag-and-drop or file picker, or explore the instant demo library
- **Browse by Book** — sidebar with real-time book filtering and sorting (Recently Read, Alphabetical, Highlight Count)
- **50-Page Range Reader** — collapsible 50-page sections with quick-jump pills for navigating books with dozens of highlights
- **Hierarchical Timeline View** — collapsible years and months with quick year jump buttons
- **Exact Timestamps** — displays exact `hh:mm:ss` clipping timestamps alongside page and location markers
- **Instant Search** — real-time full-text search across quotes, book titles, and authors with live text highlighting
- **One-Click Citation Copy** — hover over any highlight to copy the quote with formatted title, author, and page citation
- **Refined Theming** — warm editorial cream light mode and high-contrast Obsidian/warm charcoal dark mode
- **Ultra Fast & Private** — 100% client-side, zero dependencies, zero data sent to any server


## Getting Started

```bash
npm install
npm run dev
```

Then open the URL shown in your terminal.

## How to Export Clippings from Kindle

1. Connect your Kindle to your computer via USB
2. Navigate to the `documents` folder on your Kindle
3. Copy the `My Clippings.txt` file
4. Drop it into the app

## Tech Stack

- Vanilla JavaScript (no frameworks)
- Vite (build tool)
- CSS custom properties for theming

## License

MIT
