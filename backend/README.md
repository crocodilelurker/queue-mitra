# Queue Mitra: Backend Architecture & API Specification

Comprehensive, production-ready backend for **Queue Mitra** — built for the Hackcache 48-Hour Hackathon ([p2.pdf](../p2.pdf)).

Engineered with **Node.js (>=22)**, **Express 5**, **MongoDB (Mongoose 9)**, and **Socket.io 4**.

---

## 1. Architecture & Design Principles

The backend is built with strict modular separation of concerns:

```
backend/src/
├── config/             # Environment variables, database connection
├── models/             # Mongoose schemas (Hospital, Department, User, Ticket, Counter, Notification)
├── services/           # Pure business logic, queue engine, Dijkstra pathfinder, triage, analytics
│   ├── authService.js         # JWT & Staff PIN authentication
│   ├── hospitalService.js     # Hospital & department resolution
│   ├── queueService.js        # Atomic ticket matching, wait calculation, transfers, preferences
│   ├── navigationService.js   # Dijkstra shortest path, avoid-stairs, landmark QR checkpoints
│   ├── triageService.js       # Emergency red-flag detection & safe department suggestion
│   ├── notificationService.js # Simulated SMS alerts, 3-ahead triggers, delivery logs
│   ├── analyticsService.js    # Overcrowding heatmap, emergency response SLA, hourly traffic
│   └── demoService.js         # 10x auto-simulation runner, sample patient seeding & reset
├── controllers/        # Express request validation and response handling
│   ├── authController.js
│   ├── hospitalController.js
│   ├── ticketController.js
│   ├── doctorController.js
│   ├── navigationController.js
│   ├── triageController.js
│   ├── boardController.js
│   ├── notificationController.js
│   ├── analyticsController.js
│   └── demoController.js
├── routes/             # Clean REST route bindings
│   ├── auth.js
│   ├── hospitals.js
│   ├── tickets.js
│   ├── doctor.js
│   ├── navigation.js
│   ├── triage.js
│   ├── board.js
│   ├── notifications.js
│   ├── analytics.js
│   ├── demo.js
│   └── health.js
├── socket/             # Real-time WebSocket rooms and broadcast handlers
├── data/               # Spatial layout, floor coordinates, landmarks & navigation graph
│   └── hospitalMapData.js
├── middleware/         # JWT protection, role guards, global error handling
├── utils/              # ApiError, date/time formatting
└── scripts/
    └── seed.js         # Hospital, department translations, seating & doctor seeding
```

---

## 2. Implemented Features (Phase-by-Phase)

### Phase 1: Core Ticket Matching & Queue Management Engine
- **Atomic Daily Tokens**: Scoped per-hospital, per-department, per-day (e.g. `MED-001`, `ENT-042`).
- **Atomic Matching Engine**: `POST /api/doctor/call-next` uses `findOneAndUpdate` with concurrency locking to guarantee that multiple doctors calling at the exact same millisecond never get assigned the same patient.
- **Dynamic Estimated Wait Time**:
  $$\text{Wait Minutes} = \operatorname{round5}\left(\left\lceil\frac{\text{peopleAhead}}{\text{doctorsOnDuty}}\right\rceil \times \text{avgConsultMinutes} + \text{doctorDelay}\right)$$
  - Uses the moving average of the last 10 completed consultations in that department.
  - Automatically incorporates doctor breaks or running-late delays.
- **Requeue to Tail**: `POST /api/doctor/tickets/:ticketId/requeue` sends a patient who stepped out to the end of the line with a fresh sequence number.
- **Department Transfer**: `POST /api/doctor/tickets/:ticketId/transfer` moves a patient to another OPD department, generating a new department token and recalculating queues atomically.
- **Overcrowding Indicators**: Evaluates waiting room load against seating capacity:
  - **Green** (Normal, `<70%` capacity)
  - **Amber** (Busy, `70% - 100%` capacity)
  - **Red** (Overcrowded, `>100%` capacity)
- **Staff Quick PIN Login**: `POST /api/auth/staff-pin` provides instant counter/kiosk authentication (default PIN: `1234`).
- **Assisted Registration & Walk-in Counter**:
  - `POST /api/tickets/counter` enables hospital counter staff to register patients without smartphones in one click, immediately issuing a printed slip.

### Phase 2: Hospital Navigation & Graph Engine (Dijkstra)
- **Accurate Spatial Graph**: Models City District Hospital (CDH) across 3 floors:
  - **Ground Floor (Floor 0)**: Main entrance, registration counters, help desk, emergency (casualty), pharmacy, blood test lab, X-ray, drinking water, accessible toilets, wheelchair point, lift, stairs, ramp.
  - **First Floor (Floor 1)**: OPD consultation rooms 1 to 8 (General Medicine 1 & 2, Children 3, Women & Pregnancy 4, Bones & Joints 5, ENT 6, Eyes 7, Skin 8), Waiting Hall A, enquiry desk, lift, stairs, toilets.
  - **Second Floor (Floor 2)**: Inpatient Wards 4 (Medicine), 5 (Surgery), 6 (Children), Central Nurses' Station, lift, stairs.
- **Dijkstra Shortest Path Pathfinder**:
  - Computes the shortest walking path and estimates walking time.
  - **"Avoid Stairs" Filter**: Dropping stair edges *before* graph traversal so elderly and wheelchair users are routed exclusively through lifts and ramps.
- **Physical Landmark QR Checkpoints**:
  - Wall poster checkpoints across the hospital (`CP_MAIN_ENTRANCE`, `CP_HELP_DESK`, `CP_LIFT_G`, `CP_PHARMACY`, `CP_WAITING_HALL_A`, `CP_WATER_COOLER_1`, `CP_NURSES_STATION_2`).
  - Scanning a QR checkpoint calculates the route directly from that exact wall location (`POST /api/navigation/from-checkpoint`).
- **Landmark-Guided Directions**: Generates accessible instructions in **English, Hindi, and Tamil** referencing visible landmarks (*"Opposite the blue chairs"*, *"Next to drinking water cooler"*).
- **"I'm Lost" Patient Assistance**:
  - Automatically locates the nearest Help Desk or Nurses' Station using shortest path.
  - Generates a high-contrast **"Show to Staff"** card in the patient's language + English.

### Phase 3: Emergency-Safe AI Symptom Triage Engine
- **Strict Hackathon Safety Compliance**: The app **never** triages an emergency as "safe" or makes urgent cases wait for a token.
- **Red-Flag Warning Signs Detection**: Scans symptom descriptions in English, Hindi, and Tamil for:
  - Severe chest pain / cardiac symptoms
  - Acute breathing trouble
  - Heavy bleeding / profuse blood loss
  - Unconsciousness / fainting
  - Sudden facial drooping / stroke symptoms
  - Severe injury / trauma
  - Maternal distress / pregnancy bleeding
  - Critically unwell infants or children
- **Emergency Directive**: Immediately returns 112/108 numbers and route to Casualty.
- **Safe OPD Suggestion**: Matches non-emergency symptoms to the 7 seeded OPD departments with confidence scores, plain-language reasoning, and safe non-clinical comforting advice (stay seated, hydrate, notify help desk).

### Phase 4: Public Waiting-Room TV Board API
- **Live Board Endpoint**: `GET /api/board/:hospitalCode` aggregates all rooms, currently called tokens, next 3 tokens in line, and doctor delays.
- **Bilingual Spoken Announcements**: Formats announcement payloads for speech synthesis:
  - English: *"Token MED-042, please proceed to Room 1 (General Medicine) on Floor 1."*
  - Hindi: *"टोकन MED-042, कृपया पहली मंजिल पर Room 1 (सामान्य चिकित्सा) में जाएं।"*
  - Tamil: *"டோக்கன் MED-042, தயவுசெய்து தளம் 1-ல் உள்ள Room 1-க்கு செல்லவும்."*

### Phase 5: Simulated SMS & Notification Alert Engine
- **Simulated SMS Alerts**: Automatically dispatches and records SMS messages when:
  - Patient registers (`registered`)
  - 3 people ahead in queue (`near_turn`)
  - Called by doctor (`called`)
  - Doctor delay announced (`doctor_delay`)
  - Transferred to another department (`transferred`)
- **Simulated Inbox API**: `GET /api/notifications/:identifier` allows the frontend to show an animated incoming SMS modal or phone notification tray.

### Phase 6: Hospital Staff Analytics & Overcrowding Heatmap
- **Administrative Command Center**: `GET /api/analytics/:hospitalCode`
  - Real-time patient flow (total registered, waiting, in consultation, completed, no-show).
  - Department-by-department overcrowding heatmap (`green`, `amber`, `red`).
  - Emergency response SLA compliance (average seconds from "I need urgent help" to doctor acknowledgment).
  - Hourly registration traffic distribution (09:00 to 14:00).
  - Language breakdown (English, Hindi, Tamil) and assisted registration percentage.

### Phase 7: Hackathon 10x Auto-Simulation & Demo Controls
- **10x Live Simulation Runner**:
  - `POST /api/demo/auto-simulate/start`: Periodically progresses the queue (calls next patient, updates wait times) every few seconds so judges watch real-time screen transitions and board updates without manual clicking.
  - `POST /api/demo/auto-simulate/stop`: Halts the runner.
  - `GET /api/demo/auto-simulate/status`: Returns current status.
- **Seed & Reset**:
  - `POST /api/demo/seed-patients`: Seeds 20 realistic patients distributed across all 7 departments with live queue broadcasts.
  - `POST /api/demo/reset`: Atomically flushes tickets, resets daily counters, and sets doctor delays back to zero.

---

## 3. REST API Reference

### Public & Patient Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Server and MongoDB connection health check |
| `GET` | `/api/hospitals` | List of active hospitals |
| `GET` | `/api/hospitals/:code` | Single hospital details (e.g. `/api/hospitals/CDH`) |
| `GET` | `/api/hospitals/:code/departments` | List of departments with multilingual names & picture card info |
| `GET` | `/api/hospitals/:code/departments/:deptCode/queue` | Live department queue snapshot |
| `POST` | `/api/tickets` | Patient registration: `{ hospitalCode, departmentCode, firstName, age, gender, mobile?, language?, isAssisted?, accessibility? }` |
| `POST` | `/api/tickets/counter` | Walk-in counter registration by hospital staff (generates slip directly) |
| `GET` | `/api/tickets/:publicId` | Patient "My Turn" status, people ahead, estimated wait time |
| `GET` | `/api/tickets/:publicId/slip` | Full printable/downloadable OPD slip data (QR URL, room, floor, disclaimer) |
| `PATCH` | `/api/tickets/:publicId/preferences` | Save patient accessibility & language preferences (`avoidStairs`, `largeText`, `readAloud`, `highContrast`) |
| `GET` | `/api/tickets/lookup/:tokenNumber` | "I have my slip" lookup by token (e.g. `/api/tickets/lookup/MED-001?hospitalCode=CDH`) |
| `POST` | `/api/tickets/:publicId/urgent` | "I need urgent help" button (pins urgent alert to all staff screens) |
| `POST` | `/api/tickets/sync` | PWA offline batch sync: `{ tickets: [ { clientTempId, ... } ] }` |

### Navigation & Map Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/navigation/map` | Complete hospital layout: floors, place nodes, coordinates, landmarks, and graph edges |
| `GET` | `/api/navigation/places` | Filter places by floor, category, or search query (`?floor=1&q=medicine`) |
| `GET` | `/api/navigation/checkpoints` | List of physical QR checkpoints posted on walls and pillars |
| `POST` | `/api/navigation/route` | Dijkstra routing: `{ from, to, avoidStairs: boolean, language: "en"\|"hi"\|"ta", departmentCode?, room? }` |
| `POST` | `/api/navigation/from-checkpoint` | Route from scanned wall checkpoint: `{ checkpointId: "CP_LIFT_G", to, room, departmentCode }` |
| `POST` | `/api/navigation/lost` | "I'm lost" assistance: `{ currentFloor, destinationPlaceId, language }` |

### Symptom Triage Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/triage/suggest` | Analyze symptoms: `{ text, age, gender, language }` -> emergency directive or suggested department |
| `GET` | `/api/triage/warning-signs` | Emergency warning signs list for the registration screen (`?language=hi`) |

### TV Waiting-Room Board

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/board/:hospitalCode` | Aggregated room-by-room feed with active tokens, next 3, and spoken announcements |

### Simulated SMS & Notifications

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/notifications/:identifier` | Get simulated SMS notifications for a patient (`publicId` or `mobile`) |

### Staff Analytics & Administration

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/analytics/:hospitalCode` | Live hospital patient flow, overcrowding heatmap, emergency response SLA, hourly traffic |

### Staff & Doctor Authentication

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register/doctor` | Register doctor: `{ name, email, password, hospitalCode, departmentCode, room }` |
| `POST` | `/api/auth/login` | Doctor login with email and password -> returns JWT + httpOnly cookie |
| `POST` | `/api/auth/staff-pin` | Quick staff/kiosk login: `{ hospitalCode: "CDH", pin: "1234" }` |
| `POST` | `/api/auth/logout` | Invalidate all session tokens |
| `GET` | `/api/auth/me` | Current authenticated user profile |

### Doctor & Staff Management (`doctor` or `staff` role)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/doctor/dashboard` | Doctor's department queue, current active patient, next 20 waiting |
| `POST` | `/api/doctor/call-next` | Atomically completes previous patient and assigns the next waiting ticket |
| `POST` | `/api/doctor/tickets/:ticketId/complete` | Complete patient consultation without calling next |
| `POST` | `/api/doctor/tickets/:ticketId/no-show` | Mark called patient as no-show |
| `POST` | `/api/doctor/tickets/:ticketId/requeue` | Send patient to the end of the line with fresh sequence |
| `POST` | `/api/doctor/tickets/:ticketId/transfer` | Move patient to another department: `{ departmentCode: "ENT" }` |
| `PATCH` | `/api/doctor/status` | Update state: `{ state: "available" }`, `{ state: "on_break", until }`, `{ state: "running_late", delayMinutes }` |
| `GET` | `/api/doctor/urgent` | List unseen urgent flags in this hospital |
| `POST` | `/api/doctor/urgent/:ticketId/seen` | Acknowledge and dismiss an urgent flag (records response SLA) |

### Hackathon Demo Controls

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/demo/seed-patients` | Seed 20 realistic patients across all OPD departments for live demos |
| `POST` | `/api/demo/reset` | Flush all tickets, counters, and doctor delays back to clean state |
| `POST` | `/api/demo/auto-simulate/start` | Start 10x queue auto-progression: `{ intervalMs: 3000 }` |
| `POST` | `/api/demo/auto-simulate/stop` | Stop auto-simulation |
| `GET` | `/api/demo/auto-simulate/status` | Get auto-simulation status and tick count |

---

## 4. Socket.io Real-Time Event Protocol

Connect with:
```javascript
import { io } from "socket.io-client";
const socket = io("http://localhost:5000", { withCredentials: true });
```

### Client -> Server Join Events
- `socket.emit("ticket:join", publicId)`: Patient screen watching their own ticket.
- `socket.emit("department:join", departmentId)`: Screen watching one department queue.
- `socket.emit("board:join", hospitalId)`: Waiting-room TV display.

### Server -> Client Push Events
- `ticket:position`: `{ publicId, tokenNumber, peopleAhead, estimatedWaitMinutes, nowServing, updatedAt }`
  *(Trigger "3 ahead" alert when `peopleAhead === 3`)*
- `ticket:called`: `{ publicId, tokenNumber, room, floor, department, doctorName, calledAt }`
- `ticket:sms`: `{ id, type, tokenNumber, message: { en, hi, ta }, sentAt }` *(Simulated SMS arrival)*
- `ticket:transferred`: `{ publicId, newTokenNumber, newDepartment: { code, name, floor } }`
- `ticket:updated`: `{ publicId, status, urgentSeen }`
- `queue:updated`: Fresh department queue snapshot with overcrowding indicators.
- `token:called`: Board announcement event (`{ tokenNumber, room, department }`).
- `urgent:raised`: Broadcast to all staff screens with audio chime (`{ tokenNumber, firstName, department, raisedAt }`).
- `urgent:seen`: Dismisses urgent alarm banner (`{ seenBy, responseTimeSeconds }`).

---

## 5. Running the Backend

```bash
cd backend
cp .env.example .env     # Configure MONGODB_URI and JWT_SECRET
npm install
npm run seed             # Seeds CDH hospital, 7 departments, 8 doctors, staff PIN
npm run dev              # Starts Express + Socket.io server on http://localhost:5000
```
