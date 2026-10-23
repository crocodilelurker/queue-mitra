# Queue Mitra - Frontend

A mobile-first, installable **Progressive Web App (PWA)** for Queue Mitra, a smart queue and indoor-navigation system for government hospitals (problem statement: [p2.pdf](../p2.pdf)). A patient registers in their own language, gets an OPD slip with a token, finds the room, and watches their turn move up live. Hospital staff get a doctor desk, a waiting-room TV board and an analytics dashboard.

It talks to the Express + Socket.io backend in [../backend](../backend). The backend API is described in [../backend/README.md](../backend/README.md).

| Route | Screen | Who |
| --- | --- | --- |
| `/` | Home: describe symptoms, 3 big actions | Patient |
| `/new` (alias `/register`) | New Ticket: 4-step registration, or the 2-step **emergency ticket** (`/new?emergency=1`) | Patient |
| `/slip/:publicId` | OPD slip: token, QR, print, read aloud | Patient |
| `/my-turn/:publicId` | Live queue position, "3 ahead" alert, SMS, urgent help | Patient |
| `/map` | Hospital floor plan, directions, "Avoid stairs", "I'm lost" | Patient |
| `/doctor` (alias `/staff`) | Doctor dashboard or staff desk (login) | Staff |
| `/board` | Waiting-room TV board with spoken announcements | Public screen |
| `/analytics` | Patient flow, overcrowding heatmap, emergency response time | Staff |

---

## Contents

1. [Quick start](#quick-start)
2. [Technologies](#technologies)
3. [Folder structure](#folder-structure)
4. [How it connects to the backend](#how-it-connects-to-the-backend)
5. [The screens](#the-screens)
6. [Safety rules built in](#safety-rules-built-in)
7. [Languages](#languages)
8. [Accessibility and design](#accessibility-and-design)
9. [PWA and offline behaviour](#pwa-and-offline-behaviour)
10. [What was tested](#what-was-tested)
11. [Backend fixes made along the way](#backend-fixes-made-along-the-way)
12. [Change history](#change-history)
13. [Known limitations](#known-limitations)

---

## Quick start

**Prerequisites:** Node.js 22+ (the backend requires it), npm and a local MongoDB.

### 1. Start the backend

```bash
cd backend
cp .env.example .env     # then set PORT=5001, see the note below
npm install
npm run seed             # City District Hospital, 7 departments, 8 doctors, staff PIN
npm run dev
```

> **macOS note:** port 5000 is used by *AirPlay Receiver* (Control Center), so the backend cannot start there. Set `PORT=5001` in `backend/.env` (or turn AirPlay Receiver off in System Settings).

### 2. Start the frontend

```bash
cd frontend
cp .env.example .env     # set VITE_API_PROXY to the backend address, e.g. http://localhost:5001
npm install
npm run dev              # http://localhost:5173
```

The dev server proxies `/api` and `/socket.io` to the backend, so the browser only ever talks to one origin (no CORS setup and the login cookie works).

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload. The service worker is **not** registered in dev. |
| `npm run build` | Production build in `dist/`. |
| `npm run preview` | Serve `dist/` at http://localhost:4173 (same proxy). Use this to test the PWA. |

There are no lint, type-check or unit-test scripts yet.

### Demo logins (seeded, made-up data)

| Role | Login |
| --- | --- |
| Staff desk | PIN `1234` |
| Doctors | `anita@queuemitra.test` (General Medicine), `priya@queuemitra.test` (ENT), others in `backend/src/scripts/seed.js`. Password `doctor123` for all. |

For a demo, open `/analytics` or the home page, press the floating **Demo** button and use *Add 20 sample patients*, *10x auto-simulate* and *Reset all*.

### Environment variables (`frontend/.env`)

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_PROXY` | Backend address the dev/preview server proxies to | `http://localhost:5000` |
| `VITE_API_URL` | Call a backend directly instead of through the proxy (needs CORS) | empty (same origin) |
| `VITE_HOSPITAL_CODE` | Which hospital to show | `CDH` |

## Technologies

- **React 18 + Vite 6**, plain CSS with design tokens (no CSS framework).
- **Socket.io client** for live queue updates, **qrcode-generator** for the slip's QR code (the only two runtime dependencies besides React and the font).
- **Inter** font via `@fontsource-variable/inter`, bundled so it works offline.
- Hand-written web app manifest and service worker (no PWA plugin).
- Browser **Web Speech API** for voice input and read-aloud, **Web Audio** for alert sounds (no audio files).
- A tiny History-API router in `src/router.jsx` (no router library).

## Folder structure

```
frontend/
├── index.html                      # entry + PWA / mobile meta tags
├── vite.config.js                  # React plugin + /api and /socket.io proxy
├── .env.example
├── public/
│   ├── manifest.webmanifest
│   ├── sw.js                       # service worker
│   └── icons/                      # icon.svg, 192/512 PNG, maskable 512 PNG
└── src/
    ├── main.jsx                    # bootstrap, global CSS, service worker registration (production only)
    ├── App.jsx                     # providers + route table
    ├── router.jsx                  # navigate(), useLocation(), matchRoute(), <Link>
    ├── config.js                   # hospital code, API base
    ├── api/
    │   ├── client.js               # fetch wrapper + every REST call, staff session token
    │   ├── socket.js               # shared socket + useSocket() hook
    │   └── departments.js          # cached department list (+ ordering)
    ├── context/                    # Access.jsx (text size, contrast, read aloud, avoid stairs), Emergency.jsx
    ├── i18n/                       # en.js, hi.js, ta.js, places.js (place names), provider
    ├── hooks/                      # useAsync, useStaffSession, useUrgent, useSpeechRecognition,
    │                               #   useInstallPrompt, useOnlineStatus
    ├── utils/                      # speech.js (read aloud), sound.js (chime, siren), format.js
    ├── pages/                      # Home, NewPatient, OpdSlip, MyTurn, NavigationMap,
    │                               #   DoctorDashboard, WaitingBoard, AnalyticsDashboard, NotFound
    ├── components/
    │   ├── Header, Layout, LanguageSwitch, OfflineBanner, ActionCard, SymptomBox,
    │   │   TriageResult, SlipLookup, SmsToast
    │   ├── common/                 # Modal, EmergencyModal, EmergencyTicketNotice, ListenButton, Toggle, QrCode,
    │   │                           #   DepartmentCard, Status (loading / error)
    │   ├── new/                    # /new steps: StepIndicator, Field, PatientInfoStep, KnowledgeStep,
    │   │                           #   DepartmentStep, DescribeStep, ReviewStep, EmergencyButton, EmergencyBanner,
    │   │                           #   EmergencyTicketStep, validation.js
    │   ├── map/                    # FloorMap (SVG), RouteSteps, placeIcons
    │   └── staff/                  # StaffLogin, QueueSummary, UrgentBanner, CounterRegistration, DemoToolbar
    └── styles/                     # tokens.css, base.css, components.css, pages.css
```

---

## How it connects to the backend

- **REST:** every call lives in `src/api/client.js`. Errors become an `ApiError` with the HTTP status (`0` means the server could not be reached) and the screens show a friendly, translated message with a *Try again* button.
- **Live updates:** `useSocket()` in `src/api/socket.js` joins rooms and re-joins automatically after a reconnect.
- **Staff login:** the token is kept in `sessionStorage` (for the browser session only) and sent as `Authorization: Bearer`. After login or logout the socket reconnects so the server puts it in the staff room. Patients never log in.
- **Hospital id:** the TV board room is named after the hospital's database id, not its code, so `/board` reads `GET /api/hospitals/CDH` first and joins `board:<id>`.

**Endpoints each screen uses**

| Screen | Calls |
| --- | --- |
| Home | `POST /triage/suggest`, `GET /triage/warning-signs`, `GET /tickets/lookup/:token`, `GET /hospitals/:code/departments` |
| `/new` | `GET /hospitals/:code/departments`, `POST /triage/suggest`, `POST /tickets` (emergency tickets send `emergency: true` and an optional `complaint`) |
| Slip | `GET /tickets/:id/slip` |
| My Turn | `GET /tickets/:id`, `GET /hospitals/:code/departments/:dept/queue`, `GET /notifications/:id`, `PATCH /tickets/:id/preferences`, `POST /tickets/:id/urgent` |
| Map | `GET /navigation/map`, `GET /navigation/checkpoints`, `POST /navigation/route`, `POST /navigation/from-checkpoint`, `POST /navigation/lost` |
| Doctor / staff | `POST /auth/staff-pin`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, `GET /doctor/dashboard`, `POST /doctor/call-next`, `/complete`, `/no-show`, `/requeue`, `/transfer`, `PATCH /doctor/status`, `GET /doctor/urgent`, `POST /doctor/urgent/:id/seen`, `POST /tickets/counter` |
| Board | `GET /board/:code`, `GET /hospitals/:code` |
| Analytics | `GET /analytics/:code` (refreshed every 5 seconds) |
| Demo toolbar | `POST /demo/seed-patients`, `/demo/auto-simulate/start`, `/stop`, `GET /demo/auto-simulate/status`, `POST /demo/reset` |

**Socket events used:** `ticket:position`, `ticket:called`, `ticket:sms`, `ticket:updated`, `ticket:transferred`, `queue:updated`, `token:called`, `urgent:raised`, `urgent:seen`. Rooms joined: `ticket:join`, `department:join`, `board:join` (staff are placed in their hospital's staff room by the server).

---

## The screens

### Header (every screen)
Brand, **Emergency** (always reachable), a **Text size** toggle, the language switch (English / हिन्दी / தமிழ்) and an *Install app* button when the browser offers it. On **Home** the Emergency button goes straight to the emergency ticket (see below); on other screens it opens the emergency guidance. On the registration screen the Emergency control is the round button beside the form instead.

### Home `/`
1. Type or **speak** your symptoms (optionally attach a photo, which is only previewed on your device) and press **Check my symptoms**.
2. A red-flag symptom opens the emergency guidance (with a **Get an emergency ticket** button); otherwise you get a suggested department with advice and **Register for this department**.
3. Three large actions: **Register for OPD**, **I have my slip** (enter a token like `MED-001`) and **Find a place**. Emergency has no card of its own: the red **Emergency** button in the header takes the patient to the emergency ticket.

### New Ticket `/new`
The page heading is **New Ticket**. Four steps with a progress indicator, one question per screen. The round red ⚠ button beside the form switches the form into the **emergency ticket** flow on every step (details already typed are kept).

```
1 Patient details ─► 2 Do you know the department? ─┬─ Knowledge ───► 3 Pick a department card ─┐
                                                    └─ No Knowledge ► 3 Describe the problem ───┤
                                                         (suggestion, can be overridden)         ▼
                                                                                  4 Review + comfort options ─► Get my token ─► /slip/:id
```

1. **Patient details:** first name, age, gender, optional mobile number and **"Someone is helping me"** (assisted mode: bigger text, questions read aloud, optional helper name).
2. **Knowledge / No Knowledge.**
3. **Knowledge:** 7 department picture cards from the backend, in plain words (for example "fever, cough, BP, sugar"). **No Knowledge:** describe by typing or voice; the backend suggests a department, and the patient can use it or choose another.
4. **Review:** check the details, set comfort options (avoid stairs, large text, read aloud, high contrast), then **Get my token**.

| Field | Validation |
| --- | --- |
| First name | Required, up to 50 characters (the backend limit). |
| Age | Whole number 0 to 120. |
| Gender | Must be selected. |
| Mobile | Optional; 10 digits starting 6 to 9 (the backend format). |
| Problem description | Required, up to 500 characters, with a live counter. |

Opening `/new?dept=ENT` (the Home suggestion does this) skips straight from step 1 to the review. This is the page the hospital QR code is meant to open.

#### Emergency ticket (`/new?emergency=1`)

Started by the Emergency button on Home, the round button on `/new`, or **Get an emergency ticket** in the emergency guidance. It is two steps, with a red banner (one-tap **Call 108** / **Call 112** and a way back to a normal ticket) on both:

```
1 Patient details (same form, same validation) ─► 2 "Do you know the problem?" (optional) ─► ticket at once ─► /slip/:id
```

- Step 2 is a single optional box (200 characters, voice supported): *disease or problem, if you know it*. Leaving it empty is fine and gives the ticket just as fast.
- There is no department or review step. If a problem is typed, the department is the one suggested for it; otherwise (or if the suggestion fails) it is **General Medicine**, because the backend has no separate Casualty queue. A red-flag text never blocks or slows the ticket.
- The ticket goes to the **front of the department queue** (behind earlier emergencies, ahead of everyone else), so it shows **0 people ahead** and is the next one a doctor calls. Staff are alerted straight away (siren banner, marked **EMERGENCY**, with the problem text).
- The slip and live screens show a red **EMERGENCY TICKET** notice: go to Emergency (Casualty), Ground Floor, with directions and a Call 108 button.
- A normal ticket (no emergency button pressed) still goes through all four steps.
- The patient declares the emergency; the app does not judge it, and only staff assess the patient. Because it skips the queue, a hospital may want a counter check or a limit on repeated use (see limitations).

### OPD slip `/slip/:publicId`
Hospital header, a large token (for example **ENT-001**), patient, department, room, floor, doctor, people ahead and estimated wait, a **QR code** that opens the live screen, and a disclaimer in the patient's language. Buttons: **Track my turn live**, **Directions to the room**, **Print slip** (the print view shows only the slip) and **Listen**. The mobile number is masked and no Aadhaar or ABHA data is ever collected.

### My Turn `/my-turn/:publicId`
- "**N people ahead of you, about M minutes**" and who is being served now, updated live.
- At **3 or fewer ahead** a "Your turn is close" banner appears; when the count drops to 3 a chime and vibration play.
- Doctor status (in room, on break until, running late).
- A simulated-SMS notification slides in when a message arrives, and all messages are kept in a **Messages** list.
- When called, the screen turns green: "YOUR TURN! Please enter Room 6 now" with a **Guide me to the room** button.
- **I need urgent help** (asks to confirm first) raises an alert for staff. The patient later sees "staff have seen your alert".
- Transfers, completion and no-show are reflected live. Comfort options are saved to the ticket.

### Map `/map`
- SVG floor plan with Ground, First and Second floor tabs. The route drawn by the backend (Dijkstra) is overlaid, and the view zooms to fit it.
- **Avoid stairs** (lifts and ramps only), **From / To** pickers, or tap a place on the map.
- **Scan a wall poster:** pick the checkpoint you are standing next to and the route starts from there.
- Step-by-step directions with landmarks, in the chosen language, with a **Listen** button.
- **I'm lost:** shows the nearest help desk with a route, and a large bilingual **"Show to staff"** card (your language and English).
- The slip, the emergency guidance and the My Turn "called" screen all link here with the destination already set.

### Doctor dashboard and staff desk `/doctor`
- Emergency tickets show a red **EMERGENCY** badge and the patient's own words, sit at the top of the waiting list and are called first.
- **Doctor login** (email + password): status buttons (Available, On break 15 min, Running late 15 min), **Call next patient** (finishes the current one), current patient card with a consultation timer, **Complete, No-show, Requeue to end, Transfer** (to another department), queue summary with overcrowding colour, and the next 20 waiting.
- **Staff PIN login:** read-only view of any department queue and **Counter registration** for walk-ins without a phone (issues a printable slip). Staff accounts have no department in the backend, so they cannot call patients.
- **Urgent help banner:** a flashing banner and repeating siren appear live until each request is marked **Seen** (with a Mute button). The sound needs one earlier click on the page, which the login provides.

### TV board `/board`
Eight room cards in two wings with the room, doctor, huge **now serving** token and the next tokens, in English, Hindi and Tamil. When a patient is called the card flashes and the announcement is spoken, **alternating English, Hindi and Tamil**. Browsers only allow speech after a click, so the board asks you to tap once to turn sound on.

### Analytics `/analytics`
Registered today, waiting, in consultation, completed and no-show cards; the emergency response time against its 60-second target; registrations by hour; language mix and assisted-registration share; and a green / amber / red load card for every department.

### Demo toolbar
A collapsible dock (Home, doctor and analytics screens): **Add 20 sample patients**, **10x auto-simulate** / **Stop**, **Reset all** (asks to confirm).

---

## Safety rules built in

These come from the problem brief and are enforced in the UI:

- **Emergency is on every screen:** the header button (on Home it starts the emergency ticket; elsewhere it opens guidance) or the round button on `/new` opens guidance with one-tap **Call 112** and **Call 108**, the warning signs from the backend, a link to directions to Casualty, and a statement that no token is needed.
- **The app never says someone is safe.** A red-flag symptom shows the emergency guidance and never offers a normal-queue suggestion; the only ticket it offers is the immediate emergency ticket. A normal result is labelled "only a suggestion, not a diagnosis", and the patient can always choose another department or press Emergency.
- **Only made-up, minimal data.** First name, age, gender and an optional mobile number. No Aadhaar or ABHA numbers.

## Languages

English, Hindi and **Tamil** (the third language on the whiteboard, "TX", is Tamil in the backend). The language is chosen from the header and remembered. Patient screens, the TV board labels and the emergency guidance are translated; the backend's own text (triage advice, landmarks, SMS, disclaimers, department names) is shown in the chosen language. Directions and place names are generated on the client because the backend only returns instructions and names in English.

The **doctor dashboard, counter registration, analytics and demo toolbar are English only** (staff tools).

## Accessibility and design

- Body text 18px or more, buttons and inputs at least 56px tall, an icon **and** a label on every button, designed from 360px phones up to large screens, safe-area aware.
- **Text size** toggle (scales everything), **high contrast** option, **read aloud** (slip, directions, emergency guidance, triage advice) and assisted mode that speaks each question.
- Every input has a label; errors use `role="alert"` and `aria-describedby`; focus moves to the first invalid field; modals trap focus and close with Esc; status changes are announced with `aria-live`.
- Look: grey background, dark outlined rounded boxes and a red emergency colour (from the whiteboard sketch), with design tokens in `src/styles/tokens.css`. The red is darkened so white text stays readable. Motion is limited to short hover and press transitions and is disabled when the user prefers reduced motion.

## PWA and offline behaviour

- **Manifest** (`public/manifest.webmanifest`): name, theme and background colours, 192/512 icons and a maskable icon.
- **Service worker** (`public/sw.js`, production builds only): page navigations are network-first with the cached app shell as the offline fallback; same-origin static GET files use stale-while-revalidate. Non-GET requests, cross-origin requests, **`/api/*` and `/socket.io/*` are never cached**.
- Offline, the app shell loads and shows an offline banner; screens that need the server show a friendly message with *Try again*. Registering offline is not supported (see limitations).

**Test it:** `npm run build && npm run preview`, open http://localhost:4173, then DevTools > Application: check *Manifest* and *Service Workers*, tick *Offline* and reload.

## What was tested

Everything below was run against the real backend (a throwaway MongoDB) using the real app in headless Chrome:

- **Registration:** both branches, all validation, Back keeps values, preset department, token and slip created, data stored correctly in the backend.
- **Live queue:** position counts down without reload, the "3 ahead" banner and SMS toast, called screen, doctor delay, transfer, completion, no-show, urgent help from patient to staff and back.
- **Map:** automatic route from a slip, avoid-stairs route uses only the lift, Hindi and Tamil directions, wall-poster start, "I'm lost" card, casualty route.
- **Staff:** logins, every doctor action, counter registration, urgent banner, board flash and alternating spoken announcements, analytics numbers, demo toolbar.
- **Layout:** no horizontal overflow on all screens at 360, 768 and 1440px, also with large text and high contrast; touch targets at least 56px; print view of the slip.
- **PWA:** service worker, cache contents, manifest, offline loading and recovery.

Not tested: real phones, a screen reader, real Hindi or Tamil speech voices (voice availability depends on the device), the camera and microphone, and installing the app.

## Backend fixes made along the way

The backend could not start or had broken features, so these small fixes are included in the same pull request:

| File | Problem | Fix |
| --- | --- | --- |
| `backend/src/routes/analytics.js` | Crashed on startup: `/:hospitalCode?` is not valid in Express 5. | `{/:hospitalCode}` |
| `backend/src/routes/navigation.js` | Crashed on startup: `Router` was never imported. | Added the import. |
| `backend/src/controllers/doctorController.js` | `ApiError` used without an import. | Added the import. |
| `backend/src/controllers/hospitalController.js` | `GET /api/hospitals/:code` returned the **staff PIN** to anyone. | PIN removed from the response. |
| `backend/src/services/queueService.js` | **Requeue and Transfer always failed** ("Hospital not found"): `findHospital()` takes a code but was given an id. | Look the hospital up by id. |

Other things noticed but **not** changed: the hospital map hint texts and instructions are English only; the `CP_WATER_COOLER_1` checkpoint points at Room 6; `qrPayload` on the slip points at `queuemitra.in` (the frontend builds its own QR link instead); from reading the code, the "3 people ahead" SMS looks like it can be sent again on later queue changes while a patient stays at position 3 (not tested).

---

## Change history

What was built, in order. Each step was pushed to the `swastik` branch and reviewed through a pull request.

1. **Home page PWA** (PR #2). Created the `frontend/` app with React + Vite: responsive home page styled after the whiteboard sketch, English/Hindi switch, voice and photo input, web manifest with placeholder icons, service worker with offline fallback, install button and offline banner.
2. **`/new` route and dynamic form** (PR #3). Path-based routing without a router dependency and the first 3-step form with validation, accessible errors and Hindi text. Frontend only.
3. **Inter font** (PR #3). Replaced the earlier hand-drawn font with Inter across the whole site.
4. **Emergency button and title** (PR #3). Renamed the form heading to **New Ticket** and added an emergency button on every step.
5. **Round emergency button** (PR #3). A round ⚠ button beside the form card, sticky while scrolling, that only logged to the console.
6. **README rewrite** (PR #5). Reorganised this document into a sequential guide.
7. **Frontend built on the backend** (this pull request).
   - Studied the backend completely (routes, services, models, sockets, seed data) and tested it; fixed the five backend problems listed above.
   - Real router with all eight routes, shared header, and an API client plus socket hook.
   - `/new` now registers a real ticket: 4 steps with department cards, symptom description and voice, triage suggestion, assisted mode and comfort options. The old "Doctor's name" field was dropped because the backend queues patients per department, not per doctor.
   - New screens: OPD slip, live My Turn, hospital map and directions, doctor dashboard and staff desk, TV board, analytics, demo toolbar.
   - The round emergency button now opens the shared emergency guidance (it previously only logged to the console).
   - Third language **Tamil**, translated place names and directions, accessibility options, 18px text and 56px touch targets.
   - Service worker no longer caches `/socket.io`, cache version bumped to v2.
   - Added `socket.io-client` and `qrcode-generator`; removed the unused Home path cards and the old confirmation screen.

8. **Emergency card removed from Home.** The Home page now has three action cards; the header Emergency button (and the round button on `/new`) remain the way to reach emergency guidance.

9. **Emergency ticket.** The Home Emergency button, the round button on `/new` and the guidance modal start a 2-step emergency flow (details, then an optional "problem if known") that issues a ticket immediately, at the front of the queue, with staff alerted. A normal ticket still needs all four steps. The map now also follows address changes while it is open (so "Directions to Casualty" works from the map itself). Backend: tickets can be flagged `emergency` and carry an optional `complaint`.

> **Maintenance rule:** whenever anything in `frontend/` changes, update this README in the same pull request (structure, screens and a new line in the change history).

## Known limitations

- **Staff tools are English only** (doctor dashboard, counter registration, analytics, demo toolbar).
- **No offline registration:** the backend's `/tickets/sync` endpoint exists, but the app does not queue tickets while offline, because that would store patient details in the browser.
- **No camera QR scanning:** wall posters are picked from a list, and a slip is found by typing its token. The slip's QR code can be scanned by any phone camera, which opens the live screen.
- **Slip images:** there is no "Save as image"; use **Print slip** (the browser can save a PDF).
- **No doctor choice:** tickets are per department; the doctor is assigned when called.
- **Staff accounts cannot call patients** (the backend gives them no department); doctors can.
- **Symptom photos** are only previewed on the device and are not sent anywhere.
- **Read aloud and voice input** depend on the browser (the Web Speech API) and on installed Hindi and Tamil voices; the buttons are disabled or hidden where unsupported.
- **Autoplay rules:** the staff siren and the TV board speech need one click on the page first.
- **Emergency tickets are self-declared:** anyone can press Emergency and go to the front of their queue. There is no check or limit on this yet, and the emergency ticket joins General Medicine unless a problem is typed (there is no Casualty queue in the backend).
- **Hindi and Tamil text** use the system font because Inter has no Devanagari or Tamil glyphs.
- **Icons** are generated placeholders (red cross on grey); replace them in `public/icons/` with final branding.
- **No automated test suite** is included in the repository, and nothing was tested on real devices or with a screen reader.
