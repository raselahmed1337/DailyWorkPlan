# Research Command Center V4 — JSON-first / No Backend

This version is completely backend-free.

## Features
- 5-phase roadmap
- Task management
- Completion tracking
- Deadlines and priorities
- Estimated time
- Notes
- Search and filters
- Weekly focus
- PhD-ready outcome milestones
- Automatic browser saving
- JSON export
- JSON import
- Reset to starter plan
- Mobile responsive
- GitHub Pages / Vercel compatible

## How data works

The browser keeps the working copy in localStorage. JSON is the portable backup format.

Use **Export JSON** regularly. You can move the exported JSON file to another device and use **Import JSON**.

## Deploy

### GitHub Pages
Upload `index.html`, `style.css`, and `app.js` to a repository, then enable Pages from the main branch/root.

### Vercel
Import the repository into Vercel as a static site.

No environment variables, database, server, or API key are required.

## Important limitation

A static browser site cannot directly rewrite a `data.json` file inside your GitHub/Vercel repository. The export/import workflow is therefore used for portable JSON persistence.

## Starter deadline

The paper tasks use 28/08/2026 because that date was present in the supplied planning figure. Change it if the actual deadline is different.
