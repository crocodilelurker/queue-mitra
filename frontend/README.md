# Queue Mitra - Frontend

Mobile-first Progressive Web App home page for Queue Mitra. It follows the hand-drawn grey/black/red look of the project's whiteboard sketch and the triage flow in it: describe a symptom (text, voice or photo), then pick a path (direct OPD, emergency, pharmacy) or ask for help when unsure.

## Technologies

- React 18 + Vite 6 (no existing frontend stack was in the repo)
- Plain CSS with design tokens (`src/styles/tokens.css`)
- `@fontsource/patrick-hand` (bundled, so the font works offline)
- Hand-written web app manifest and service worker (no PWA plugin)
- Browser Web Speech API for voice input (where supported)

## Folder structure

```
frontend/
├── index.html                  # entry + PWA/mobile meta tags
├── vite.config.js
├── public/
│   ├── manifest.webmanifest
│   ├── sw.js                   # service worker
│   └── icons/                  # icon.svg, 192/512 PNG, maskable 512 PNG
└── src/
    ├── main.jsx                # bootstrap + service worker registration (production only)
    ├── App.jsx
    ├── pages/Home.jsx
    ├── components/             # Header, LanguageSwitch, SymptomInput, PathCard, OptionButton, OfflineBanner
    ├── hooks/                  # useSpeechRecognition, useInstallPrompt, useOnlineStatus
    ├── i18n/                   # en.js, hi.js, provider
    └── styles/                 # tokens.css, base.css, components.css
```

## Prerequisites

Node.js 18+ and npm.

## Install

```bash
cd frontend
npm install
```

## Development

```bash
npm run dev
```

The service worker is only registered in production builds.

## Production build

```bash
npm run build     # outputs dist/
npm run preview   # serves dist/ at http://localhost:4173
```

## Testing the PWA

1. Run `npm run build && npm run preview` and open http://localhost:4173 in Chrome.
2. DevTools > Application: check **Manifest** (no errors, icons load) and **Service Workers** (activated).
3. Tick **Offline** under Service Workers and reload; the app shell should still load and show the offline banner.
4. Use the "Install app" button in the header (shown when the browser offers installation) or the address-bar install icon.

Caching: navigations are network-first with an offline fallback to the app shell; same-origin static GET assets use stale-while-revalidate. Non-GET, cross-origin and `/api/*` requests are never cached.

## Known limitations

- UI only: the path buttons (OPD, Emergency, Pharmacy, Get help) and department suggestion are not wired to a backend yet. Audio-to-text uses the browser's speech API, and the photo is only previewed locally.
- Languages: English and Hindi. The sketch lists a third language ("TX"), which is unspecified, so it is not included.
- The Patrick Hand font has no Devanagari glyphs; Hindi text uses the fallback font.
- Voice input needs a browser with the Web Speech API (e.g. Chrome, Safari) and is disabled elsewhere.
- Icons are generated placeholders (red cross on grey); replace them in `public/icons/` with final branding.
