# Agentic IDE Prompt: Complete Frontend Implementation for Queue Mitra

> **Instructions for the AI Coding Agent**: You are tasked with building the complete, production-ready frontend for **Queue Mitra** — a Smart Queue Management and Accessible Hospital Navigation system for government hospitals ([p2.pdf](p2.pdf)).
> 
> The backend is **100% complete, fully tested, and running at `http://localhost:5000`** (Node.js 22, Express 5, Socket.io 4, MongoDB, and Dijkstra navigation engine).
> 
> Your mission is to build the complete frontend in `frontend/` using **React 18 + Vite 6 + Vanilla CSS tokens**, connect all screens to the backend REST APIs and Socket.io events, and ensure maximum scoring across all 8 hackathon evaluation criteria.

---

## 1. Project Context & Non-Negotiable Rules

1. **The Core Problem**:
   - Patients at government hospitals wait hours, struggle with English or smartphones, and get lost finding rooms written on their OPD slip.
   - We must make registration dead-simple, support regional languages (**English, Hindi, Tamil**), prioritize emergency cases, provide Dijkstra-based indoor navigation with an **"Avoid stairs"** mode, and display live queue updates with a **"3 people ahead"** alert.

2. **Hard Rules from the Problem Brief (`p2.pdf`)**:
   - **Emergencies come first**: An Emergency button and 112 / 108 contact info must be accessible on **every single screen**.
   - **The app never decides someone is safe**: Symptom analysis can suggest a department or route to Emergency, but it **never** triages someone as "not urgent" or tells them they can wait.
   - **Inclusive design**:
     - Touch targets: Buttons must be **at least 56px tall**.
     - Typography: Body text **at least 18px**; high contrast (WCAG AA).
     - Visual clarity: Every button should have an **icon AND a label**.
     - Designed for **360px-wide mobile screens** up to full desktop / TV displays.
   - **Made-up data only**: No Aadhaar or ABHA numbers. Slips show only first name, age, gender, token, room, and floor.

3. **Current Frontend Codebase State**:
   - Located in `frontend/`. Built with React 18 and Vite 6.
   - Uses Vanilla CSS design tokens in `frontend/src/styles/tokens.css` (NO Tailwind CSS).
   - Inter font bundled locally via `@fontsource-variable/inter` for offline PWA support.
   - Service worker and Web App Manifest in `frontend/public/`.
   - Browser Web Speech API hooks in `frontend/src/hooks/useSpeechRecognition.js`.

---

## 2. Backend API & Socket.io Reference

The backend runs on `http://localhost:5000`. Configure Vite proxy or use `const API_BASE = "http://localhost:5000/api"`:

### Core REST Endpoints
- `GET /api/hospitals/CDH`: Hospital profile and language list.
- `GET /api/hospitals/CDH/departments`: 7 seeded OPD departments (`MED`, `CHD`, `WOM`, `ORT`, `ENT`, `EYE`, `SKN`) with rooms and translations.
- `POST /api/triage/suggest`: Body `{ text, age, gender, language }` -> returns `{ isEmergency, directive, suggestedDepartment, confidence, preConsultationAdvice }`.
- `GET /api/triage/warning-signs`: Lists emergency red-flag symptoms.
- `POST /api/tickets`: Patient registration -> returns `{ publicId, tokenNumber, department, room, floor, estimatedWaitMinutes }`.
- `POST /api/tickets/counter`: Fast counter walk-in registration for patients without smartphones.
- `GET /api/tickets/:publicId`: Live queue status (`peopleAhead`, `estimatedWaitMinutes`, `nowServing`).
- `GET /api/tickets/:publicId/slip`: Full printable OPD slip data with hospital disclaimers and QR code URL.
- `GET /api/tickets/lookup/:tokenNumber?hospitalCode=CDH`: "I have my slip" lookup by printed token number.
- `PATCH /api/tickets/:publicId/preferences`: Save accessibility preferences `{ accessibility: { avoidStairs, largeText, readAloud, highContrast }, language }`.
- `POST /api/tickets/:publicId/urgent`: Patient raises "I need urgent help" -> sends siren to staff.
- `POST /api/tickets/sync`: Batch sync for tickets created while offline.
- `GET /api/notifications/:publicIdOrMobile`: Simulated SMS messages history.
- `GET /api/navigation/map`: Full 3-floor hospital layout, coordinates, and landmarks.
- `GET /api/navigation/checkpoints`: Physical QR checkpoints on hospital walls.
- `POST /api/navigation/route`: Dijkstra routing: `{ from, to, avoidStairs: boolean, language }`.
- `POST /api/navigation/from-checkpoint`: Route from scanned wall checkpoint: `{ checkpointId, to, room, departmentCode, avoidStairs, language }`.
- `POST /api/navigation/lost`: "I'm lost" -> route to nearest help desk & bilingual "Show to Staff" card.
- `POST /api/auth/staff-pin`: Fast staff login: `{ hospitalCode: "CDH", pin: "1234" }`.
- `POST /api/auth/login`: Doctor login `{ email, password: "doctor123" }`.
- `GET /api/doctor/dashboard`: Doctor's active patient, waiting list, and queue.
- `POST /api/doctor/call-next`: Atomically call next waiting patient.
- `POST /api/doctor/tickets/:id/requeue`: Send patient to end of the line.
- `POST /api/doctor/tickets/:id/transfer`: Move patient to another department `{ departmentCode: "ENT" }`.
- `PATCH /api/doctor/status`: Doctor state `{ state: "available" | "on_break" | "running_late", delayMinutes }`.
- `GET /api/doctor/urgent`: List active urgent flags.
- `POST /api/doctor/urgent/:id/seen`: Acknowledge urgent flag (records response SLA).
- `GET /api/board/CDH`: Live TV feed of all rooms, current tokens, next 3, and bilingual announcements.
- `GET /api/analytics/CDH`: Hospital throughput, live overcrowding heatmap, and emergency response SLA.
- `POST /api/demo/seed-patients`: Seeds 20 sample patients across all 7 departments.
- `POST /api/demo/auto-simulate/start`: 10x auto-progression of queues for demo presentations.
- `POST /api/demo/auto-simulate/stop`: Stop simulation.
- `POST /api/demo/reset`: Clear all queues.

### Socket.io Real-Time Protocol (`http://localhost:5000`)
- **Join Rooms**:
  - `socket.emit("ticket:join", publicId)`: On "My Turn" screen.
  - `socket.emit("department:join", departmentId)`: On department watch.
  - `socket.emit("board:join", hospitalId)`: On TV board screen.
- **Listen to Events**:
  - `socket.on("ticket:position", (data))` -> `{ peopleAhead, estimatedWaitMinutes, nowServing }`. Trigger "3 ahead" alert when `peopleAhead === 3`!
  - `socket.on("ticket:called", (call))` -> `{ tokenNumber, room, floor, doctorName }`.
  - `socket.on("ticket:sms", (sms))` -> Simulated SMS arrival modal.
  - `socket.on("queue:updated", (snapshot))` -> Live queue snapshot refresh.
  - `socket.on("token:called", (call))` -> TV board spoken announcement.
  - `socket.on("urgent:raised", (alert))` -> Staff dashboard audio siren.
  - `socket.on("urgent:seen", ({ seenBy }))` -> Dismiss staff siren.

---

## 3. Step-by-Step Implementation Roadmap

Implement the following screens and components in `frontend/src/`:

### Step 1: Routing & Navigation Setup
- Expand `frontend/src/App.jsx` to route cleanly between:
  - `/` -> `Home.jsx`
  - `/register` (or `/new`) -> `Register.jsx`
  - `/slip/:publicId` -> `OpdSlip.jsx`
  - `/my-turn/:publicId` -> `MyTurn.jsx`
  - `/map` -> `NavigationMap.jsx`
  - `/doctor` (or `/staff`) -> `DoctorDashboard.jsx`
  - `/board` -> `WaitingBoard.jsx`
  - `/analytics` -> `AnalyticsDashboard.jsx`
- Add persistent Top Navigation Bar with:
  - App Logo & Name ("Queue Mitra")
  - Trilingual Language Switcher: **English** | **हिंदी** | **தமிழ்**
  - Emergency Quick Button (Red, always visible, opens Emergency guidance modal)
  - PWA "Install App" button (using `useInstallPrompt.js`)

### Step 2: Home Page (`pages/Home.jsx`)
- **Hero Title**: Clear multilingual tagline (*"Right care, no long queue"*).
- **Symptom Input Box**:
  - Text input + Microphone button (using `useSpeechRecognition`).
  - Calls `POST /api/triage/suggest`.
  - **Triage Result Modal**:
    - If `isEmergency === true`: Full-screen red alert, emergency directive, 112/108 call buttons, and directions to Ground Floor Casualty.
    - If non-emergency: Displays suggested department picture card, confidence percentage, comforting pre-treatment advice, and a direct button: **"Register for this Department"** (pre-fills department in registration).
- **4 Large Primary Action Cards** (>=56px tall, icon + bold text):
  1. 📝 **Register for OPD** -> navigates to `/register`
  2. 🎟️ **I Have My Slip / Token** -> modal to enter token (e.g. `MED-001`) or scan QR code -> redirects to `/my-turn/:id`
  3. 🗺️ **Find a Place / Hospital Map** -> navigates to `/map`
  4. 🚨 **Emergency Care (Casualty)** -> opens immediate emergency modal

### Step 3: Registration Flow (`pages/Register.jsx`)
- One question per screen with a progress indicator ("Step 2 of 4"):
  1. **Patient Info**: First name, Age, Gender (Male / Female / Other), Mobile number (optional).
  2. **Assisted Mode Switch**: *"Someone is helping me"* toggle -> increases font size, speaks questions aloud via Web Speech Synthesis, records helper name.
  3. **Department Selection**:
    - Fetch departments dynamically from `GET /api/hospitals/CDH/departments`.
    - Display the 7 departments as large picture cards with plain words:
      - *General Medicine* (fever, cough, BP, sugar)
      - *Children* (under 14 years)
      - *Women and pregnancy* (maternity, antenatal)
      - *Bones and joints* (knee pain, fracture, back)
      - *Ear, nose and throat* (ear pain, sore throat, sinus)
      - *Eyes* (vision, redness, glasses)
      - *Skin* (rash, itching, allergy)
    - Add *"Not sure? Describe symptoms"* link that triggers the triage suggestion.
  4. **Confirmation & Submission**:
    - Submits to `POST /api/tickets` with patient details, department, language, and accessibility preferences.
    - Immediately redirects to `/slip/:publicId`.

### Step 4: OPD Slip Screen (`pages/OpdSlip.jsx`)
- Fetches ticket slip from `GET /api/tickets/:publicId/slip`.
- Renders a clean, high-contrast, printable OPD Slip:
  - Hospital Header: City District Hospital (CDH)
  - Large Token Badge (e.g. **MED-042**)
  - Patient First Name, Age, Gender
  - Assigned Department, Room Number, and Floor
  - Assigned Doctor Name
  - Estimated Wait Time & People Ahead
  - Live QR Code (pointing to `https://<origin>/my-turn/:publicId`)
  - Bilingual Disclaimers (*"Valid for today only. In emergency, proceed to Casualty immediately"*).
- **Action Buttons**:
  - 🖨️ **Print Slip** (`window.print()`)
  - 🔊 **Read Aloud** (reads slip details via Web Speech API)
  - 🚶 **Directions to Room** (opens `/map` with destination pre-set to assigned room)
  - ⏱️ **Track My Turn Live** (opens `/my-turn/:publicId`)

### Step 5: "My Turn" Live Queue Tracking (`pages/MyTurn.jsx`)
- Connects to Socket.io: `socket.emit("ticket:join", publicId)`.
- **Live Queue Card**:
  - Displays: **"X people ahead of you, about Y minutes"**.
  - Current token being served in this room (Now Serving).
  - Doctor status badge (*In room* / *On break until 11:30* / *Running 15 mins late*).
- **"3 People Ahead" Alert Trigger**:
  - When `peopleAhead === 3` (or received via `ticket:position` / `ticket:sms`):
    - Plays audio chime.
    - Triggers device vibration (`if (navigator.vibrate) navigator.vibrate([200, 100, 200])`).
    - Pops up high-priority warning banner: *"Your turn is close! Please head to Room X on Floor 1 now."*
- **Simulated SMS Drawer**:
  - Listens to `ticket:sms` socket event or polls `GET /api/notifications/:publicId`.
  - Shows an incoming phone SMS notification card on screen.
- **"Called" State**:
  - When `ticket:called` is received: Screen turns bold green: *"YOUR TURN! Please enter Room X now. Dr. Y is ready."* Includes direct button: *"Guide me to Room"*.
- **"I Need Urgent Help" Button**:
  - Red button at bottom of screen.
  - On click, confirms and calls `POST /api/tickets/:publicId/urgent`.
  - Shows confirmation: *"Hospital staff alerted. A nurse/doctor has been notified."*

### Step 6: Hospital Navigation & SVG Floor Plan (`pages/NavigationMap.jsx`)
- Deepest visual feature as highlighted in `p2.pdf`.
- **Floor Switcher**: Tabs for **Ground Floor (0)**, **First Floor (1)**, and **Second Floor (2)**.
- **Interactive Inline SVG Floor Plan**:
  - Draw floor layouts with rooms, corridors, entrance, lifts, stairs, ramp, and waiting halls.
  - Draw Dijkstra path polyline highlighted across the floor.
- **Controls**:
  - Start location dropdown (default: Main Entrance) + Destination dropdown (OPD rooms 1-8, labs, pharmacy, toilets, water).
  - **"Avoid Stairs" Switch**: Passes `avoidStairs: true` to `POST /api/navigation/route`. Must route strictly via lifts and ramps!
  - **Landmark-guided Directions List**: Displays step-by-step instructions (*"Take the lift to Floor 1"*, *"Turn right opposite the blue chairs"*).
  - 🔊 **"Listen" Button**: Speaks each step aloud in the selected language.
  - 📷 **Checkpoint QR Scanner**: Simulates scanning a wall QR poster (or pick from list: Elevator, Waiting Hall, Water Cooler) -> calls `POST /api/navigation/from-checkpoint`.
  - 🆘 **"I'm Lost" Button**: Calls `POST /api/navigation/lost` -> displays route to nearest Help Desk and renders a full-screen **"Show to Staff"** assistance card with large bilingual text.

### Step 7: Doctor / Staff Dashboard (`pages/DoctorDashboard.jsx`)
- **Login Modal**: Allows quick login with **Staff PIN: `1234`** (`POST /api/auth/staff-pin`) or Doctor credentials (`anita@queuemitra.test`, password: `doctor123`).
- **Dashboard Views**:
  - Department Queue list (shows next 20 waiting patients).
  - **Active Patient Card**: Token number, patient name, age, consultation timer.
  - **Action Buttons**:
    - 🔔 **Call Next**: Calls `POST /api/doctor/call-next` (atomically matches next waiting ticket).
    - ⏭️ **Requeue to End**: Calls `POST /api/doctor/tickets/:id/requeue`.
    - 🔄 **Transfer Department**: Modal to move patient to another department (`POST /api/doctor/tickets/:id/transfer`).
    - ❌ **Mark No-Show**: Calls `POST /api/doctor/tickets/:id/no-show`.
  - **Doctor Status Controls**: Toggle between *Available*, *On Break*, and *Running Late (15 mins)*.
  - **Overcrowding Indicator**: Shows waiting area badge (*Normal / Busy / Overcrowded*).
  - **Urgent Help Siren Banner**:
    - Listens to `urgent:raised`.
    - Displays flashing red top banner with loud repeating chime until marked as seen (`POST /api/doctor/urgent/:id/seen`).

### Step 8: Waiting-Room TV Board (`pages/WaitingBoard.jsx`)
- Designed for large TV displays in waiting lounges (`/board`).
- Connects to Socket.io: `socket.emit("board:join", "CDH")` and fetches `GET /api/board/CDH`.
- Split-screen layout:
  - Column 1: Left Wing OPD Rooms (General Medicine, Children, Women).
  - Column 2: Right Wing OPD Rooms (Bones, ENT, Eyes, Skin).
- For each room: Shows Room Name, Doctor Name, Currently Serving Token (huge font), and Next 3 Waiting Tokens.
- **Audio Announcements (TTS)**:
  - When `token:called` event fires, speaks the announcement aloud using `window.speechSynthesis`:
    - Alternates English (*"Token MED-042, please proceed to Room 1"*) and Hindi (*"टोकन MED-042, कृपया कमरा नंबर 1 में जाएं"*).

### Step 9: Hospital Analytics & Overcrowding Heatmap (`pages/AnalyticsDashboard.jsx`)
- Fetches `GET /api/analytics/CDH`.
- Displays real-time charts/cards:
  - Total patients registered today, completed, and currently waiting.
  - Department Overcrowding Heatmap (Green, Amber, Red cards).
  - Emergency SLA Compliance: Average response time in seconds (Target: <60s).
  - Hourly registration traffic distribution.
  - Language and Assisted Registration breakdown.

### Step 10: Hackathon Demo Toolbar (`components/DemoToolbar.jsx`)
- Floating demo control dock at bottom-right of screen (collapsible):
  - 👥 **Add 20 Sample Patients**: `POST /api/demo/seed-patients`.
  - ⏩ **10x Speed Auto-Simulate**: `POST /api/demo/auto-simulate/start`.
  - ⏹️ **Stop Simulation**: `POST /api/demo/auto-simulate/stop`.
  - 🔄 **Reset All**: `POST /api/demo/reset`.

---

## 4. Verification & Testing Checklist

When finished, test the following end-to-end flows:

1. **Patient Registration Flow**:
   - Open `/register`, register in Hindi, enable Assisted Mode, select General Medicine.
   - Verify `/slip/:publicId` loads with token `MED-001` and QR code.
2. **Live Queue & "3 Ahead" Alert**:
   - Open `/my-turn/:publicId` in Tab 1 and `/doctor` in Tab 2.
   - Click "Call Next" in Doctor dashboard. Verify Tab 1 live countdown updates without page refresh.
   - When 3 patients remain, verify chime and vibration alert fire.
3. **Emergency Handling**:
   - In Home symptom input, type "severe chest pain" -> verify immediate red Emergency modal appears.
   - In `/my-turn`, click "I Need Urgent Help" -> verify persistent siren banner pops up on `/doctor`.
4. **Navigation**:
   - Open `/map`, select Room 6, toggle "Avoid Stairs". Verify route uses Lifts only, no stairs.
   - Click "I'm Lost" -> verify nearest Help Desk route and bilingual Staff Assistance Card render properly.
5. **Waiting Room TV Board**:
   - Open `/board` on a wide screen. Click "Call Next" from `/doctor`. Verify board flashes and speaks announcement aloud.
6. **Mobile Responsiveness**:
   - Inspect at 360px width. Ensure all buttons are >=56px tall, no horizontal scrolling, and text is readable at largest zoom.

---

**Good luck! Build with confidence and wow the hackathon judges!**
