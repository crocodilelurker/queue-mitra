# Queue Mitra - Frontend

A mobile-first, installable **Progressive Web App (PWA)** for Queue Mitra, a way for hospital patients to reach the right care without a long queue. It has two pages:

| Route | Page | Purpose |
| --- | --- | --- |
| `/` | Home | Describe a symptom (text, voice or photo) and pick a path: direct OPD, emergency, pharmacy, or get help when unsure. |
| `/new` | New Ticket | A short step-by-step form: patient details, then either a known doctor/department or a problem description. |

> **Frontend only.** Nothing in this app is sent to a server or stored. See [Limitations](#known-limitations).

---

## Contents

1. [Quick start](#quick-start)
2. [Technologies](#technologies)
3. [Folder structure](#folder-structure)
4. [The `/new` New Ticket flow](#the-new-new-ticket-flow)
5. [Home page](#home-page)
6. [Design system](#design-system)
7. [Languages](#languages)
8. [Accessibility](#accessibility)
9. [PWA and offline behaviour](#pwa-and-offline-behaviour)
10. [Change history](#change-history)
11. [Known limitations](#known-limitations)

---

## Quick start

**Prerequisites:** Node.js 18+ and npm.

```bash
cd frontend
npm install
npm run dev        # development server (default http://localhost:5173)
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot reload. The service worker is **not** registered in dev. |
| `npm run build` | Create a production build in `dist/`. |
| `npm run preview` | Serve `dist/` at http://localhost:4173 (use this to test the PWA). |

There are no lint, type-check or unit-test scripts yet.

## Technologies

- **React 18 + Vite 6.** No frontend existed before, so this stack was chosen.
- **Plain CSS** with design tokens (no CSS framework).
- **Inter** font via `@fontsource-variable/inter`, bundled so it works offline.
- **Hand-written** web app manifest and service worker (no PWA plugin).
- **Browser Web Speech API** for voice input on the home page (where supported).
- No router library: a tiny path switch in `src/App.jsx` is enough for two pages.

## Folder structure

```
frontend/
├── index.html                    # entry point + PWA / mobile meta tags
├── vite.config.js
├── public/
│   ├── manifest.webmanifest      # PWA manifest
│   ├── sw.js                     # service worker
│   └── icons/                    # icon.svg, 192/512 PNG, maskable 512 PNG
└── src/
    ├── main.jsx                  # bootstrap, global CSS, service worker registration (production only)
    ├── App.jsx                   # path-based routing: "/new" -> NewPatient, anything else -> Home
    ├── pages/
    │   ├── Home.jsx              # "/"
    │   └── NewPatient.jsx        # "/new" (shows the "New Ticket" heading); holds all flow state
    ├── components/
    │   ├── Header.jsx, LanguageSwitch.jsx, OfflineBanner.jsx     # shared
    │   ├── SymptomInput.jsx, PathCard.jsx, OptionButton.jsx      # home page
    │   └── new/                  # everything for /new
    │       ├── StepIndicator.jsx       # "Step 1 / 3" dots
    │       ├── Field.jsx               # labelled input/textarea + accessible error
    │       ├── PatientInfoStep.jsx     # step 1
    │       ├── KnowledgeStep.jsx       # step 2
    │       ├── DoctorDepartmentStep.jsx  # step 3, "Knowledge" branch
    │       ├── ProblemStep.jsx         # step 3, "No Knowledge" branch
    │       ├── Confirmation.jsx        # final screen
    │       ├── EmergencyButton.jsx     # round emergency button
    │       └── validation.js           # all validation rules in one place
    ├── hooks/                    # useSpeechRecognition, useInstallPrompt, useOnlineStatus
    ├── i18n/                     # en.js, hi.js, provider + useI18n hook
    └── styles/                   # tokens.css (design tokens), base.css, components.css
```

---

## The `/new` New Ticket flow

The route is opened directly by URL (for example from a QR code that points to it). The page heading is **New Ticket**.

```
/new
 └─ Step 1  Patient details  ──(Continue, only if valid)──┐
                                                          ▼
                              Step 2  "Do you know which doctor or department you need?"
                                      ┌──────────────┴──────────────┐
                                 Knowledge                    No Knowledge
                                      ▼                              ▼
                      Step 3  Doctor's name +          Step 3  Describe your problem
                              Department                       (max 500 characters)
                                      └──────────────┬──────────────┘
                                                     ▼
                                       Confirmation screen
                                       (Start over / Back to home)
```

### Step by step

1. **Patient details.** First name, age and gender (Male / Female / Other). Continue stays blocked until all three are valid.
2. **Knowledge question.** Two clear choices, **Knowledge** and **No Knowledge**. A Back button returns to step 1 with the values kept.
3. **Branch form.**
   - *Knowledge:* doctor's name and department, then **Submit**.
   - *No Knowledge:* a multiline "Describe your problem" box with a placeholder and a live character counter, then **Submit**. The app gives no diagnosis or advice.
4. **Confirmation.** Shows what was entered. It states that the information is kept only in this browser session and has **not** been sent to the hospital. **Start over** clears everything and returns to step 1; **Back to home** goes to `/`.

### Validation rules

All rules live in `src/components/new/validation.js` and return a message key that is translated for display.

| Field | Rule |
| --- | --- |
| First name | Required, up to 60 characters. |
| Age | Required, a whole number from 0 to 120 (rejects `-5`, `12.5`, `abc`, `121`). |
| Gender | Must be selected. |
| Doctor's name, Department | Both required. They are plain text because the repo has no doctor/department data. |
| Problem description | Required, up to 500 characters. |

When a submit fails, errors appear under the fields and focus moves to the first invalid one.

### Emergency button

A round red ⚠ button sits **beside the form card on every step** (including the confirmation) and stays in view while scrolling. It has an accessible label ("Emergency"). For now clicking it only runs `console.log('Emergency button clicked')`; it is a placeholder to be connected to a real action later.

### How data is handled

- Form values live in React state in `NewPatient.jsx` and are passed down to each step. Going Back keeps them.
- Nothing is sent anywhere and nothing is written to local or session storage (only the chosen language is remembered).
- Reloading the page or choosing **Start over** discards the data.

### Routing note

`src/App.jsx` reads `window.location.pathname` (a trailing slash is ignored): `/new` renders the form, anything else renders Home. Any host must serve `index.html` for unknown paths so `/new` works when opened directly; the Vite dev and preview servers already do. Connecting a QR code to `/new` is a separate step outside this app.

---

## Home page

1. **Header:** Queue Mitra brand, an *Install app* button (only when the browser offers installation) and the language switch.
2. **Symptom input:** a text box ("What is bothering you?"), a **Speak** button for voice input, and **Add photo / report** with a local preview and Remove button.
3. **Two path cards**, following the project's whiteboard sketch:
   - *I know what I need:* Direct OPD consultation, Emergency, Pharmacy.
   - *Not sure:* Emergency, Get help.

These buttons are not connected to anything yet.

## Design system

- **Look:** grey background, dark outlined rounded boxes and a red emergency colour, taken from the whiteboard sketch.
- **Tokens** in `src/styles/tokens.css`: colours, the Inter font stack, fluid font sizes, spacing, radius, border and a 48px minimum touch target.
- **Responsive:** mobile-first from 320px up to large screens (single column on phones, two columns for the home page cards from 48em, larger base text from 90em). Safe-area insets are respected.
- **Motion:** only short hover/press transitions, and none when the user prefers reduced motion.
- **Contrast:** the Emergency button uses a darker red (`#c92a2a`) so white text stays readable.

## Languages

English and Hindi, switched from the header and remembered in the browser. All text lives in `src/i18n/en.js` and `src/i18n/hi.js`; add a key to both when you add text. The whiteboard sketch lists a third language ("TX") that was never specified, so it is not included.

## Accessibility

- Every input has an associated label; gender is a `fieldset` with radio buttons.
- Errors use `role="alert"` and are linked to their field with `aria-describedby`; invalid fields get `aria-invalid`.
- Visible focus outlines, keyboard-operable controls, and touch targets of at least 48px.
- The step indicator and the Emergency button have text alternatives.

## PWA and offline behaviour

- **Manifest** (`public/manifest.webmanifest`): name, theme and background colours, 192/512 icons and a maskable icon.
- **Service worker** (`public/sw.js`, registered only in production builds):
  - Page navigations are network-first and fall back to the cached app shell when offline.
  - Same-origin static GET files use stale-while-revalidate.
  - Non-GET requests, cross-origin requests and `/api/*` are never cached.
- **Offline banner** appears when the browser goes offline.

**To test the PWA:**

1. `npm run build && npm run preview`, then open http://localhost:4173 in Chrome.
2. DevTools > Application: check **Manifest** (no errors, icons load) and **Service Workers** (activated).
3. Tick **Offline** under Service Workers and reload: the app shell should still load with the offline banner.
4. Use the *Install app* button or the address-bar install icon.

---

## Change history

What was built, in order. Each step was pushed to the `swastik` branch and reviewed through a pull request.

1. **Home page PWA** (PR #2). Created the `frontend/` app with React + Vite: responsive home page styled after the whiteboard sketch, English/Hindi switch, voice and photo input, web manifest with placeholder icons, service worker with offline fallback, install button and offline banner.
2. **`/new` route and dynamic form** (PR #3). Added path-based routing without a router dependency and the 3-step form (patient details, Knowledge / No Knowledge, doctor+department or problem description, confirmation) with validation, accessible errors and Hindi text. Frontend only.
3. **Inter font** (PR #3). Replaced the earlier hand-drawn font with Inter across the whole site and reduced font sizes slightly because Inter is wider.
4. **Emergency button and title** (PR #3). Renamed the form heading to **New Ticket** and added an emergency button on every step. First version was a fixed bar at the bottom that opened a dialog.
5. **Round emergency button** (PR #3). Changed the button to a round ⚠ button beside the form card, sticky while scrolling. Clicking it now only logs to the console, and the dialog and its text were removed.
6. **README rewrite** (this document). Reorganised into a sequential guide with the flow, validation rules and this history.

> **Maintenance rule:** whenever anything in `frontend/` changes, update this README in the same pull request (structure, flow, rules and a new line in the change history).

## Known limitations

- **UI only:** the `/new` form does not submit anywhere, and the home page buttons (OPD, Emergency, Pharmacy, Get help) and department suggestion are not connected to a backend. The emergency button only logs to the console.
- **Photo and voice:** the photo is only previewed locally; voice input uses the browser's speech API.
- **Hindi font:** Inter has no Devanagari glyphs, so Hindi text uses the system fallback font.
- **Voice support:** needs a browser with the Web Speech API (for example Chrome or Safari); disabled elsewhere.
- **No data lists:** there is no doctor or department data in the repo, so those fields are free text.
- **Icons** are generated placeholders (red cross on grey); replace them in `public/icons/` with final branding.
- **Not tested** on real devices or with a screen reader; no automated test suite is included.
