# Queue Mitra: Backend

Node + Express 5 + MongoDB (Mongoose) + Socket.io.

## Run it

```bash
cd backend
cp .env.example .env      # then set MONGODB_URI and JWT_SECRET
npm install
npm run seed              # sample hospital, departments + doctors (add -- --reset to clear tickets)
npm run dev               # http://localhost:5000
```

Requires Node 22 or newer. `MONGODB_URI` can be a local MongoDB or a free MongoDB Atlas cluster.

The seed creates **City District Hospital** (code `CDH`). Sample doctor logins (made up): `anita@queuemitra.test`, `rakesh@queuemitra.test` (General Medicine), `meena@`, `sunita@`, `imran@`, `priya@`, `arjun@`, `kavita@queuemitra.test`. The password for all of them is `doctor123`.

## Structure

```
src/
├── server.js           # HTTP server + Socket.io + DB connection
├── app.js              # Express app, middleware, routes
├── config/             # env vars, MongoDB connection
├── models/             # Hospital, Department, User, Ticket, Counter
├── controllers/        # request/response handling, input checks
├── services/           # business logic: auth, hospitals, queue / ticket-matching engine
├── routes/             # URL → controller
├── middleware/         # auth (protect, requireRole), errors
├── socket/             # Socket.io setup, rooms, emit helper
├── utils/
└── scripts/seed.js
```

## Hospitals

Everything belongs to a hospital: departments, doctors and tickets. Each hospital has a short `code` (e.g. `CDH`) that goes in the QR poster at its gate, e.g. `https://<frontend>/h/CDH/register`. The frontend reads the code from the URL and sends it as `hospitalCode`. Department codes (`MED`, `ENT`, …) are unique only within a hospital, and urgent flags, staff screens and the board only see their own hospital. For now, hospitals are created by the seed script only.

## How the ticket-matching engine works

- **Token numbers**: an atomic per-hospital, per-department, per-day counter, e.g. `ENT-001`, `ENT-002`, … Numbering restarts every day (hospital time zone).
- **Matching**: when a doctor presses **Call next**, the server finishes their current patient and *atomically* assigns the lowest-numbered waiting ticket in their department to them. Two doctors in the same department pressing at the same moment never get the same patient.
- **Estimated wait**: `ceil(people ahead ÷ doctors on duty) × average of the last 10 consultations + current doctor delay` (break remaining or minutes late), rounded to 5 minutes. Until there are completed consultations, it uses the department's sample average.
- **Urgent flags**: a patient can raise "I need urgent help". It goes straight to the screen of every logged-in doctor in that hospital until someone marks it as seen. **The app never decides who is urgent**; it only alerts staff.

## REST API

All responses are JSON. Errors look like `{ "error": "message" }`.

### Public (patients, board)

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/health` | Server + DB status |
| GET | `/api/hospitals` | List of hospitals |
| GET | `/api/hospitals/:code` | One hospital's details, e.g. `/api/hospitals/CDH` |
| GET | `/api/hospitals/:code/departments` | That hospital's departments (for the picture cards) |
| GET | `/api/hospitals/:code/departments/:deptCode/queue` | Live queue snapshot, e.g. `/api/hospitals/CDH/departments/MED/queue` |
| POST | `/api/tickets` | Register (the QR-code form): `{ hospitalCode, departmentCode, firstName, age, gender: "male"\|"female"\|"other", mobile?, language? }` → ticket |
| GET | `/api/tickets/:publicId` | Patient's "My turn": status, people ahead, estimated wait, now serving |
| POST | `/api/tickets/:publicId/urgent` | "I need urgent help" |

`publicId` is a random UUID returned at registration. Put it in the slip's QR code.

### Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register/doctor` | `{ name, email, password, hospitalCode, departmentCode, room }` → `{ user, token }`, already logged in. `room` must be one of the department's rooms (see `GET /api/hospitals/:code/departments`). **Open to anyone for now** |
| POST | `/api/auth/login` | `{ email, password }` → `{ user, token }` and sets an httpOnly `token` cookie |
| POST | `/api/auth/logout` | Logged in. Invalidates **all** of the user's tokens |
| GET | `/api/auth/me` | Logged in. Current user |

Send the token as a cookie (`credentials: "include"`) or as `Authorization: Bearer <token>`. Doctors can sign up with the simple registration route above (a newly registered doctor starts as `offline` until they set a status or call a patient). Registration for other users is still to be discussed.

### Doctor (logged in, role `doctor`)

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/doctor/dashboard` | Own department's queue, current patient, next 20 waiting |
| POST | `/api/doctor/call-next` | Finishes the current patient and calls the next one |
| POST | `/api/doctor/tickets/:ticketId/complete` | Finish the current patient without calling the next |
| POST | `/api/doctor/tickets/:ticketId/no-show` | Mark the called patient as not present |
| PATCH | `/api/doctor/status` | `{ state: "available" }`, `{ state: "on_break", until: "<ISO date>" }`, `{ state: "running_late", delayMinutes: 15 }` or `{ state: "offline" }` |
| GET | `/api/doctor/urgent` | Unseen urgent flags in the doctor's hospital (all departments) |
| POST | `/api/doctor/urgent/:ticketId/seen` | Mark an urgent flag as seen |

## Socket.io (real-time)

Connect with `io(API_URL, { withCredentials: true })`. Doctors can also pass `{ auth: { token } }`. A logged-in doctor automatically joins their hospital's staff room.

**Client → server**

| Event | Payload | Use |
|---|---|---|
| `ticket:join` | `publicId` | Patient's own screen |
| `department:join` | department id | Anyone watching one department's queue |
| `board:join` | hospital id | Waiting-room TV board for one hospital |

**Server → client**

| Event | Sent to | Payload |
|---|---|---|
| `ticket:position` | that ticket | `{ publicId, tokenNumber, peopleAhead, estimatedWaitMinutes, nowServing, updatedAt }` (show the "3 ahead" alert when `peopleAhead === 3`) |
| `ticket:called` | that ticket | `{ publicId, tokenNumber, room, floor, department, doctorName, calledAt }` |
| `ticket:updated` | that ticket | `{ publicId, status? , urgentSeen? }` |
| `queue:updated` | department, staff, board | Same shape as `GET /api/departments/:code/queue` |
| `token:called` | department, staff, board | Same as `ticket:called`; the board reads it aloud |
| `urgent:raised` | staff | `{ id, tokenNumber, firstName, department, raisedAt }` |
| `urgent:seen` | staff | `{ id, seenBy }` |
