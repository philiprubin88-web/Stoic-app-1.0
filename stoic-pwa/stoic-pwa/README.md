# STOIC — Performance & Discipline System

A stoic-based personal performance PWA: goal tracking, discipline evaluation, and virtue progression.

---

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

Output is in the `dist/` folder — deploy this to any static host.

---

## Deploy

### Netlify (recommended, free)
1. Push this repo to GitHub
2. Connect repo to [netlify.com](https://netlify.com)
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Done — HTTPS is automatic, PWA will work immediately

### Vercel
```bash
npm i -g vercel
vercel --prod
```

### Any static host (Cloudflare Pages, GitHub Pages, etc.)
Upload the contents of `dist/` after `npm run build`.

---

## PWA — Install on iOS (Safari)
1. Open the deployed URL in Safari
2. Tap the Share button → **Add to Home Screen**
3. App opens full-screen, works offline after first load

## PWA — Install on Android (Chrome)
Chrome will prompt automatically, or: Menu → **Add to Home Screen**

---

## Icons

The project ships with SVG + PNG icons in `public/icons/`.
To regenerate PNGs after editing the SVG:

```bash
pip install cairosvg
python3 -c "
import cairosvg
svg = open('public/icons/favicon.svg','rb').read()
cairosvg.svg2png(bytestring=svg, write_to='public/icons/icon-192.png', output_width=192, output_height=192)
cairosvg.svg2png(bytestring=svg, write_to='public/icons/icon-512.png', output_width=512, output_height=512)
"
```

Or replace the PNG files with your own 192×192 and 512×512 icons.

---

## Project Structure

```
stoic-pwa/
├── index.html              # Entry point, iOS meta tags, manifest link
├── vite.config.js          # Vite + PWA plugin config
├── package.json
├── public/
│   └── icons/
│       ├── favicon.svg
│       ├── icon-192.png    # PWA / Add to Home Screen
│       └── icon-512.png
└── src/
    ├── main.jsx            # React entry + service worker registration
    ├── App.jsx             # All UI components
    ├── styles.css          # All styles (CSS variables, mobile-first)
    ├── constants.js        # Stoic content, virtue definitions, level tables
    ├── utils.js            # Pure utility functions (scoring, XP, dates)
    └── storage.js          # localStorage abstraction (also works in Claude)
```

---

## Data Storage

All data is persisted to **localStorage** under these keys:

| Key | Contents |
|-----|----------|
| `stoic-goals` | Array of goal objects |
| `stoic-logs` | `{ "YYYY-MM-DD": { goalId: value } }` |
| `stoic-virtue-xp` | `{ courage, wisdom, temperance, justice }` |
| `stoic-focus-date` | ISO date string of last focus gate completion |
| `stoic-settings` | User preferences |

Data is scoped to the device. No server, no account required.

---

## Future Expansion (per PRD)
- Journaling system
- Advanced analytics & charts
- Multi-device sync (replace localStorage with a backend)
- Expanded skill trees & milestone rewards
- External integrations
