EpiWatch AI landing page

Files:
- index.html
- styles.css
- script.js
- assets/epiwatch-dashboard.png

Quick deploy:
1. Upload the contents of this folder to your web root, or deploy the folder to Netlify/Vercel.
2. The CTA links currently point to /dashboard. Change that path in index.html if your dashboard lives elsewhere.
3. The seasonal-risk chart is pure JavaScript (no chart library dependency). Sample chart values live near the top of the chart section in script.js. Replace those arrays with your API data when ready.
4. Google Fonts are loaded from fonts.googleapis.com. If you need a fully self-hosted build, replace them with your preferred local/web-safe font setup.

No build step or npm install is required.
