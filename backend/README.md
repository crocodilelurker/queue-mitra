# Queue Mitra backend

Express 5 + MongoDB (Mongoose 9) + Socket.io 4 API for **Queue Mitra**: smart OPD queues and accessible
in-hospital navigation for government hospitals (Hackcache PS2, see `../p2.pdf`).

**The database starts empty.** Nothing is seeded: no hospital, departments, accounts, patients or tickets.
The first person to open the app runs the setup wizard (`POST /api/setup`), which creates the hospital and its
main administrator. Everything else is added live by staff. The only built-in data is:

- the sample building layout and navigation graph (`src/data/hospitalMapData.js`), and
- a catalog of department templates the admin can pick from (`src/data/departmentCatalog.js`: names,
  descriptions, Hindi/Telugu/Tamil translations, icon key, suggested room).

```
src/
  app.js              Express app: security headers, CORS, rate limits, routes, SPA hosting in production
  server.js           HTTP + Socket.io server, DB connection, graceful shutdown
  config/             env.js (validated config), db.js (MongoDB connection), cors.js
  data/               hospitalMapData.js (building graph), departmentCatalog.js (templates + OPD rooms)
  models/             Hospital, Department, User, Ticket, Counter, Notification, UrgentFlag
  services/           queueService (matching engine, wait estimate, urgent flags), overviewService (staff console),
                      authService, navigationService (Dijkstra), triageService, notificationService (simulated SMS),
                      analyticsService, demoService (auto-simulation on real queues)
  controllers/ routes/ middleware/ (auth, rate limits, errors) socket/ utils/ (validation)
  scripts/resetDb.js  wipe the whole database
```

## Running locally

```bash
cd backend
cp .env.example .env        # then edit JWT_SECRET
npm install
npm run dev                 # node --watch, restarts on file changes
```

- If `MONGODB_URI` points at localhost and no MongoDB server is running, development mode starts a local
  `mongod` (via `mongodb-memory-server`) that **stores its files in `backend/.data/db`**, so data survives
  restarts. `.data/` is git-ignored. Production never does this.
- Frontend dev server (port 5180) proxies `/api` and `/socket.io` to this server.
- `npm run reset-db -- --yes` empties the whole database (works while the dev server is running).
  Reload the app afterwards: it opens the setup wizard.

### Wait-time estimate

`round5( ceil(peopleAhead / doctorsOnDuty) * avgConsultMinutes + doctorDelay )`, where `avgConsultMinutes` is
the moving average of the department's last 10 consultations (falls back to the department's setting), and
`doctorDelay` is the smallest current delay among doctors on duty (rest of a break, or minutes running late).

### Crowding

`waitingCount / seatingCapacity`: **green** below 70%, **amber** 70-100%, **red** above 100%.

## Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | | `development` | `production` turns on strict checks, secure cookies, frontend hosting |
| `PORT` | | `5000` | Render/Railway set this automatically |
| `MONGODB_URI` | production | `mongodb://127.0.0.1:27017/queue-mitra` (dev) | e.g. a MongoDB Atlas connection string |
| `JWT_SECRET` | yes | | production: at least 32 characters, not a placeholder |
| `JWT_EXPIRES_IN` | | `12h` | |
| `CLIENT_URL` | | `http://localhost:5180` | allowed browser origin(s), comma-separated. Development also allows any `localhost` port |
| `PUBLIC_APP_URL` | | first `CLIENT_URL` | base URL printed in slip QR codes (`<url>/my-turn/<publicId>`) |
| `HOSPITAL_TIMEZONE` | | `Asia/Kolkata` | queues reset at local midnight |
| `TRUST_PROXY` | | `1` in production | Express `trust proxy` (hops), for correct client IPs behind a proxy |
| `SERVE_FRONTEND` | | `true` in production | serve `../frontend/dist` with SPA fallback |
| `FRONTEND_DIST` | | `../frontend/dist` | |
| `CSP` | | on | `off` disables the Content-Security-Policy header |
| `LOCAL_DB_PATH` / `LOCAL_DB_PORT` | | `.data/db` / `27027` | development fallback database only |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | | | optional LLM for voice translation/triage; rule-based fallback without it |

## Deploying (one service hosts API + frontend)

1. Create a free MongoDB Atlas cluster; copy its connection string.
2. On Render (Web Service) or Railway, from the repo root:
   - Build command: `cd frontend && npm ci && npm run build && cd ../backend && npm ci --omit=dev`
   - Start command: `cd backend && npm start`
   - Health check path: `/api/health`
3. Environment: `NODE_ENV=production`, `MONGODB_URI=<atlas uri>`, `JWT_SECRET=<48 random bytes hex>`,
   `CLIENT_URL=https://<your-app>.onrender.com`.
   Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
4. Open the site: the setup wizard creates the hospital and the first admin.

If the frontend is hosted separately (e.g. Vercel), set `SERVE_FRONTEND=false`, list the frontend origin in
`CLIENT_URL`, and build the frontend with `VITE_API_URL=https://<backend-host>`. Cookies use
`SameSite=None; Secure` in production; the frontend also sends the token as a Bearer header.

Security in production: helmet headers (CSP, HSTS, nosniff...), gzip, 100 kB JSON limit, rate limits on
login, staff PIN, setup, registration and urgent help, bcrypt-hashed passwords and staff PIN, JWT revoked on
logout/password change, no stack traces in error responses, SIGTERM closes the server and database cleanly.

## REST API

All responses are JSON. Errors: `{ "error": "readable message" }` with a proper status
(400 validation, 401 not signed in, 403 not allowed, 404, 409 conflict/duplicate, 413, 429 rate limited).
Auth: `Authorization: Bearer <token>` (the `token` cookie also works).
Roles: `superadmin` (created by setup), `admin`, `doctor`, `staff`. Accounts are only created by admins.

### Setup (public)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/setup/status` | `{ configured, hospital: {_id, code, name, address:{line,city,state,pincode}, contact:{phone,emergencyPhone}, languages, type, floors} \| null, counts: {departments, doctors, staff} }` |
| GET | `/api/setup/catalog` | `{ departments: [{code, name, description, icon, suggestedRoom, floor, avgConsultMinutes, seatingCapacity, translations:{hi,te,ta}}], rooms: [{id:"room_1", name:"Room 1", floor, landmark}] }` |
| POST | `/api/setup` | `{ hospital:{name, code?, city?, state?, phone?, emergencyPhone?, addressLine?, pincode?}, admin:{name, email, password}, staffPin }` -> 201 `{ token, user, hospital }`. 409 once a hospital exists. `code` derived from the name if omitted ("City District Hospital" -> `CDH`). PIN 4-6 digits; password at least 8 characters |

### Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` -> `{ token, user }` |
| POST | `/api/auth/staff-pin` | `{ hospitalCode, pin }` -> `{ token, user }` (shared counter account, role `staff`, `user.isKiosk: true`). Changing the PIN signs out all PIN sessions |
| GET | `/api/auth/me` | `{ user }` |
| POST | `/api/auth/logout` | revokes the token |

`user` = `{ _id, name, email, role, isKiosk, hospital, hospitalCode, hospitalName, department, departmentCode, departmentName, floor, room, specialty, status? }`

### Admin (`admin`, `superadmin`)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/overview` | `{ hospital, generatedAt, totals, urgent, departments, doctors }` (departments/totals/urgent as in staff overview) |
| PATCH | `/api/admin/hospital` | `{ name?, address?:{line,city,state,pincode}, contact?:{phone,emergencyPhone}, languages?, staffPin? }` -> `{ hospital, staffPinChanged }`. Code can't change (printed on posters) |
| GET | `/api/admin/departments` | `{ departments: [{...department, doctorCount, isActive}] }` (inactive ones included) |
| POST | `/api/admin/departments` | `{ code, name?, description?, icon?, rooms:["Room 1"], floor?, avgConsultMinutes?, seatingCapacity?, translations?, opdHours?:{start,end} }` -> 201 `{ department }`. A catalog code fills name/description/icon/translations/room/capacity when not given. Code 2-5 letters, unique (409). Rooms must be OPD rooms of the map (400) and not used by another active department (409). Re-adding a removed code reactivates it |
| PATCH | `/api/admin/departments/:id` | same fields + `isActive`. Code can't change once tickets exist |
| DELETE | `/api/admin/departments/:id` | `{ ok: true, deactivated }`: deleted if never used, else deactivated. 409 while patients are in today's queue. Its doctors are unassigned |
| GET | `/api/admin/doctors` | `{ doctors: [{_id, name, email, department, departmentCode, departmentName, room, specialty, status:{state,until,delayMinutes}}] }` |
| POST | `/api/admin/doctors` | `{ name, email, password, departmentCode, room?, specialty? }` -> 201 `{ doctor }`. Room must be one of the department's rooms (defaults to its first) |
| PATCH | `/api/admin/doctors/:id` | `{ name?, email?, password?, departmentCode?, room?, specialty?, state? }` -> `{ doctor }` |
| DELETE | `/api/admin/doctors/:id` | `{ ok: true }` |
| GET | `/api/admin/staff` | `{ staff: [{_id, name, email, role}] }` (staff, admin, superadmin; not the PIN counter account) |
| POST | `/api/admin/staff` | `{ name, email, password, role: "staff"\|"admin" }` -> 201 `{ staff }` |
| PATCH | `/api/admin/staff/:id` | `{ name?, email?, password?, role? }`. Only a superadmin can edit a superadmin; you can't change your own role |
| DELETE | `/api/admin/staff/:id` | `{ ok: true }`. Not yourself, not the superadmin |
| POST | `/api/admin/reset-queue` | new day: deletes today's tickets, their notifications, today's token counters, all urgent flags; doctors on break/late become available; stops the auto-simulation. Keeps hospital, departments, people |
| POST | `/api/admin/factory-reset` | superadmin, `{ confirm: "<hospital code>" }`: empties the whole database (app goes back to setup) |

### Staff console (`doctor`, `staff`, `admin`, `superadmin`)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/staff/overview` | see shape below |
| POST | `/api/doctor/call-next` | `{ departmentCode?, room? }`. Doctors default to their own department and room; staff/admin give `departmentCode` (room defaults to the department's first; the doctor assigned to that room is recorded). Completes the room's current patient, then calls the next. -> `{ ticket, called, completed: [tokenNumbers] }` or 404 `{ error: "Queue is empty" }` |
| POST | `/api/doctor/tickets/:ticketId/complete` | `{ diagnosis?, consultationNotes?, prescriptions?, followUpDate? }` (called tickets) |
| POST | `/api/doctor/tickets/:ticketId/no-show` | waiting or called tickets |
| POST | `/api/doctor/tickets/:ticketId/requeue` | to the end of the queue (keeps its token number) |
| POST | `/api/doctor/tickets/:ticketId/transfer` | `{ departmentCode }`: new token in the other department |
| PATCH | `/api/doctor/status` | `{ state: available\|on_break\|running_late\|offline, until?, delayMinutes?, doctorId? }`. Doctors set their own; staff/admin pass `doctorId`. Defaults: break 15 min, late 10 min. -> `{ user, doctor }` |
| GET | `/api/doctor/dashboard` | `{ queue, current, waiting }` for the doctor's department (staff/admin: `?departmentCode=`) |
| GET | `/api/doctor/urgent` | `{ flags: [flag] }` open urgent requests |
| POST | `/api/doctor/urgent/:id/seen` | `:id` = the flag's `id` (or, for older screens, the `ticketId` of a ticket with a flag) -> `flag` (+ `alreadySeen: true` if someone got there first) |
| POST | `/api/tickets/counter` | assisted registration (same body as `POST /api/tickets`, hospital from the session) -> 201 slip |
| GET | `/api/patients?search=` | today's registrations, newest first; search by token, first name or mobile -> `{ patients: [{ticketId, publicId, tokenNumber, firstName, age, gender, mobile, language, departmentCode, departmentName, status, room, doctorName, assisted, isEmergency, complaint, urgent, createdAt, calledAt, completedAt}], total, serviceDate }` |
| GET | `/api/analytics/:hospitalCode?` | today's totals, urgent response SLA, languages, hourly registrations, crowd heatmap |

`GET /api/staff/overview`:

```js
{
  generatedAt, serviceDate, hospital: { _id, code, name },
  totals: { registeredToday, waiting, serving, completed, noShow, urgentOpen },
  urgent: [flag],
  departments: [{
    _id, code, name, description, icon, translations, rooms, floor, seatingCapacity, avgConsultMinutes, opdHours,
    waitingCount, estimatedWaitMinutes, crowd: "green"|"amber"|"red", crowdLabel, crowdRatio,
    nowServing: [{ ticketId, publicId, tokenNumber, firstName, room, calledAt, doctorId, doctorName, isEmergency }],
    waiting: [{ ticketId, publicId, tokenNumber, firstName, age, gender, language, assisted, urgent, isEmergency,
                complaint, accessibility, position, estimatedWaitMinutes, createdAt }],
    doctors: [{ _id, name, room, specialty, status: { state, until, delayMinutes } }]
  }]
}
```

`flag` (urgent request) = `{ id, ticketId, publicId, tokenNumber, firstName, departmentCode, departmentName,
department:{code,name}|null, isEmergency, complaint, location, note, language, by: "patient"|"registration",
raisedAt, seenAt, seenBy, responseTimeSeconds }`. Without a ticket, `ticketId`, `tokenNumber` etc. are `null`.

### Patients and public screens (no login)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/hospitals`, `/api/hospitals/:code` | hospital info (never the PIN) |
| GET | `/api/hospitals/:code/departments` | active departments |
| GET | `/api/hospitals/:code/departments/:deptCode/queue` | live queue snapshot |
| POST | `/api/tickets` | `{ hospitalCode?, departmentCode, firstName, age, gender: male\|female\|other, mobile?, language?, isAssisted?, helperName?, accessibility?, emergency?, complaint? }` -> 201 ticket status. Only first name, age, gender and an optional 10-digit mobile are stored: never Aadhaar or address. `emergency: true` jumps the queue and alerts staff |
| GET | `/api/tickets/:publicId` | "My turn": `{ tokenNumber, status, peopleAhead, estimatedWaitMinutes, nowServing, department, room, ... }` |
| GET | `/api/tickets/:publicId/slip` | printable slip (mobile masked) |
| GET | `/api/tickets/lookup/:token?hospitalCode=` | "I have my slip": accepts `MED-007`, `med7`, `MED 7` |
| PATCH | `/api/tickets/:publicId/preferences` | `{ language?, accessibility?: {avoidStairs, largeText, readAloud, highContrast} }` |
| POST | `/api/tickets/:publicId/urgent` | "I need urgent help" with a ticket -> `{ publicId, urgentRaised, raisedAt, flag }` (pressing again re-alerts, no duplicate) |
| POST | `/api/urgent` | urgent help **without** a ticket: `{ hospitalCode?, location?, note?, language? }` -> 201 `{ flag }` |
| POST | `/api/tickets/sync` | offline registrations `{ tickets: [{clientTempId, ...ticket body}] }` (max 10) |
| GET | `/api/notifications/:publicId` | simulated SMS history for a ticket |
| GET | `/api/board/:code` | TV board: `{ hospital:{_id,code,name}, rooms:[{departmentCode, departmentName, room, floor, doctorName, doctorState, delayMinutes, nowServing, nextTokens, announcementText:{en,hi,te,ta}}] }` |
| GET | `/api/navigation/map`, `/places` | building graph; OPD rooms carry the live department (`name: "Room 1 (General Medicine)"`, `roomName`, `departmentCode`) |
| POST | `/api/navigation/route` | `{ from?, to? \| room? \| departmentCode?, avoidStairs?, language? }` (room "Room 1" -> place `room_1`; a department code resolves to its first room) |
| GET/POST | `/api/navigation/checkpoints`, `/from-checkpoint`, `/lost` | QR wall checkpoints, "I am lost" |
| POST/GET | `/api/triage/suggest`, `/warning-signs`, `/voice-translate`, `/api/voice/translate` | symptom -> department suggestion (never says an emergency can wait) |
| GET | `/api/health` | `{ status, database, databaseMode, uptime }` (503 when the DB is down) |

### Demo controls (`admin`, `superadmin`)

Auto-simulation moves **real** queues forward (call next, which completes the previous patient in that room)
for every department room that has patients. It never creates patients.

| Method | Path | Notes |
|---|---|---|
| POST | `/api/demo/auto-simulate/start` | `{ speed?: 1-20 \| intervalMs? }`. 1x = one step every 30 s; default speed 10 = every 3 s |
| POST | `/api/demo/auto-simulate/stop` | |
| GET | `/api/demo/auto-simulate/status` | `{ isRunning, intervalMs, speed, ticksCount, startedAt, lastStepAt, lastAction }` |

## Socket.io events

```js
import { io } from "socket.io-client";
const socket = io(API_URL, { auth: { token } });   // token optional (patients and the board are anonymous)
```

Rooms: signed-in doctor/staff/admin/superadmin sockets join `staff:<hospitalId>` automatically.

| Client -> server | Room |
|---|---|
| `ticket:join` / `ticket:leave` (publicId) | `ticket:<publicId>` |
| `department:join` / `department:leave` (departmentId) | `department:<departmentId>` |
| `board:join` / `board:leave` (hospitalId) | `board:<hospitalId>` |

| Server -> client | Sent to | Payload |
|---|---|---|
| `hospital:updated` | staff, board (every socket after setup/factory reset) | `{ hospitalId, reason, at, departmentId? }`, after **every** mutation: refetch. `reason` e.g. `ticket:registered`, `ticket:called`, `ticket:completed`, `ticket:no_show`, `ticket:requeued`, `ticket:transferred`, `doctor:status`, `urgent:raised`, `urgent:seen`, `department:created\|updated\|deleted`, `doctor:updated`, `staff:updated`, `hospital:updated`, `queue:reset`, `setup`, `factory-reset` |
| `queue:updated` | department, staff, board | department snapshot (same as `GET .../queue`) |
| `token:called` | board, department, staff | `{ ticketId, publicId, tokenNumber, firstName, room, floor, department, departmentCode, departmentName, doctorName, calledAt }` |
| `ticket:called` | ticket | same as `token:called` |
| `ticket:position` | ticket | `{ publicId, tokenNumber, peopleAhead, estimatedWaitMinutes, nowServing, updatedAt }` |
| `ticket:updated` | ticket | `{ publicId, status?, message?, urgentRaised?, urgentSeen?, reason? }` (`status: "cancelled", reason: "queue_reset"` after a queue reset) |
| `ticket:transferred` | ticket | `{ publicId, newTokenNumber, newDepartment:{code,name,floor} }` |
| `ticket:sms` | ticket | simulated SMS `{ id, type, tokenNumber, message:{en,hi,ta,te}, sentAt }` |
| `urgent:raised` | staff | `flag` (with `department` = department name) |
| `urgent:seen` | staff | `{ id, flagId, ticketId, seenBy, responseTimeSeconds }` |
| `doctor:status` | staff, board, department | `{ doctorId, name, room, departmentId, status }` |
| `departments:updated`, `doctors:updated`, `staff:updated` | staff, board | `{ reason, departmentId? }` |
| `queue:reset` | staff, board | `{ at }` |
| `system:reset` | everyone | `{ at }` after a factory reset: go to `/setup` |
