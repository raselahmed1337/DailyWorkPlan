# Research Command Center V4 — JSON-first / No Backend

A lightweight, browser-only research planning tool that stores data as JSON in the browser. This release removes any server-side dependencies so you can run the app as a static site (GitHub Pages, Vercel, or just open index.html locally).

Key goals
- Keep your research plan portable and simple.
- Make backups and transfers easy via JSON import/export.
- Focus on task planning, deadlines, and milestone tracking geared toward long-term research (PhD-ready outcomes).

Features
- 5-phase roadmap
- Task management (create, edit, delete)
- Completion tracking (mark tasks done/undone)
- Deadlines and priority levels
- Estimated time per task
- Notes per task
- Search, filters, and weekly focus view
- Outcome milestones suitable for research projects
- Automatic browser saving (localStorage)
- JSON import / export for portable backups
- Reset to starter plan
- Mobile responsive layout
- Works on GitHub Pages and Vercel as a static site

Quick start
1. Clone or download this repository.
2. Open `index.html` in your browser (no server needed).
3. Use the UI to add tasks and milestones — changes are saved automatically to your browser's localStorage.

Data model and portability
- Working data is kept in localStorage while you use the app.
- Use "Export JSON" regularly to create a portable backup file.
- To move your plan to another device or browser, use "Export JSON" then "Import JSON" on the other device.

Important limitation
- Because this is a purely static site running in the browser, it cannot directly write back to a `data.json` file inside this repository. Use the export/import workflow for persisting and moving data between browsers or devices.

Deployment
- GitHub Pages: Upload `index.html`, `style.css`, and `app.js` to a repository and enable Pages from the main branch/root (or whichever branch you prefer).
- Vercel: Import the repository into Vercel as a static site — no build step required for the plain HTML/CSS/JS version.
- No environment variables, servers, databases, or API keys are required.

Starter deadline
- The starter tasks in the included example use 28/08/2026 because that date was present in the supplied planning figure. Update the deadline in the UI or in your exported JSON if your actual due date is different.

Files of interest
- `index.html` — the application UI
- `style.css` — styles and responsive layout
- `app.js` — core application logic, data handling, and import/export

Contributing
- Bug reports, suggestions, and improvements are welcome.
- If you open an issue or PR, include steps to reproduce and a short description of the desired change.

License
- This project does not contain a license file. If you want to allow reuse please add a LICENSE (for example, MIT).

Contact
- Maintainer: raselahmed1337 (see GitHub profile)

Notes & suggestions
- Regularly export your JSON as part of your backup routine.
- Consider adding optional GitHub/Gist sync or a small server for multi-device sync if you need real-time collaboration or permanent cloud backups.
