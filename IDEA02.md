# IDEA02: Queue Mitra (Problem Statement 2)

Notes from our discussion of the Hackcache problem statement (`p2.pdf`) and our first architecture sketch. They're here so the whole team can refer back to them.

---

## 1. The problem

**Smart Queue Management and Accessible Navigation for Government Hospitals**: Hackcache by CachedInfo, a 48-hour online hackathon (₹1.22L total value).

Patients at government hospitals wait hours to register, get an OPD slip and see a doctor. Then they often can't find the room or ward written on the slip ("I need Ward 4, but where is it?"). Registration is hardest for:

- elderly patients
- people with disabilities
- people who don't read English or are only comfortable in a regional language
- people who rarely use smartphones

**In one line:** help a patient register in their own language, get an OPD slip, find the right ward and know when their turn is coming.

**Expected outcome:** a working prototype in which a patient registers in their preferred language, gets an OPD slip, finds the correct department, tracks their turn and reaches the doctor with minimal confusion. A sample hospital layout and simulated patients are fine. We don't need to connect to a real hospital system.

## 2. How we're judged

1. Ease of registration
2. Language accessibility
3. Inclusive design
4. Queue-management efficiency
5. Navigation accuracy
6. Emergency handling
7. Technical execution
8. Real-world usefulness

> Five of the eight criteria are about accessibility and the patient's experience. A polished patient flow will earn more than a clever backend.

## 3. Hard rules from the brief (don't break these)

- **Emergencies come first.** A digital queue must never delay emergency care.
- **The app never decides whether a case is an emergency**, never tells anyone they can wait, and never makes an urgent case wait for registration or a token. **Only qualified staff assess urgent cases.**
- **Accessibility is a core requirement**, not an optional add-on.
- **Made-up data only.** Never ask for a real Aadhaar or ABHA number. The slip shows only the token, first name and department.

## 4. Feature areas the brief suggests

| Area | What it means |
|---|---|
| Simple registration | Few steps, clear instructions, an OPD slip at the end |
| Native language | Register and navigate in a regional language |
| Accessibility | Voice guidance, text-to-speech, large readable text, assisted registration |
| Smart queue | Token numbers, estimated wait, live queue status, "your turn is close" alerts |
| Hospital navigation | Maps and floor plans, landmarks, step-by-step directions |
| Slip-to-destination | Enter or scan the slip and get directions to the right room |
| Emergency prioritisation | Flag urgent cases so staff assess them immediately |
| Real-time updates | Doctor availability, delays, queue changes |
| Staff dashboard | Patient flow, overcrowding, coordination between counters |

### Useful details from the brief's sample spec ("OPD Saathi")

The brief includes a ready-made AI build prompt. Ideas worth borrowing:

- **Emergency button on every screen**, including before registration. It shows the way to Casualty and the numbers 112 and 108 (ambulance).
- **Warning-signs list on the first registration screen**: chest pain, trouble breathing, heavy bleeding, fainting, sudden weakness or a drooping face, serious injury, a pregnant woman who is bleeding or in severe pain, a very unwell child. Message: *"Any of these? Go to Emergency now. You don't need a token."*
- **"I need urgent help" flag**: it goes to the top of the staff dashboard, with a sound, until a staff member marks it as seen.
- **Registration**: one question per screen, a progress bar, picture cards for departments described in plain words (e.g. General Medicine: "fever, cough, BP, sugar"), a microphone for voice input, and a **"Someone is helping me" assisted mode**.
- **OPD slip**: token (e.g. `MED-042`), department, room and floor, doctor, people ahead, estimated wait and a QR code. It can be saved, printed, read aloud or shown in large type.
- **My turn**: an alert at **3 people ahead** (vibration, sound, banner, notification and a simulated SMS).
- **Navigation**: SVG floor plans, routes calculated with **Dijkstra's shortest path** over a graph of places and paths, an **"Avoid stairs"** switch (lifts and ramps only), **Listen** (read aloud) and **"I'm lost"** (shows the way to the help desk plus a card to show staff).
- **Staff side**: a dashboard (call next, no-show, send to end of queue, move department, doctor status, overcrowding colours), a registration counter for patients without phones, a TV **waiting-room board** that announces tokens aloud, and **demo controls** (add 20 patients, run time 10× faster, reset).
- **Wait-time formula**: `people ahead × average of the last 10 consultation times + doctor's delay`, rounded to 5 minutes and shown as "about".
- **Design rules**: designed for 360px-wide screens, body text 18px or more, buttons 56px or taller, WCAG AA contrast, an icon **and** a word on every button, words a Class 8 student understands, and every screen can be read aloud.

---

## 5. Our architecture (from our whiteboard sketch)

- **Monolithic app** ✅: a backend and a frontend in one repo.
- **Backend modules:**
  - **Auth**
  - **Project management** (core hospital logic: queues, tokens, departments)
- **Frontend**
- **Translation**: a cross-cutting layer used by both backend and frontend.

### How we split the work ("Let's collab")

| Stream | Scope |
|---|---|
| Auth | Staff login, roles; the patient side can stay low-friction |
| Project | Queue, tokens, departments, OPD flow |
| Frontend | Patient screens, staff dashboard, board |

### Languages

- English
- Hindi
- **"TX"**: a third language, still to be decided.

## 6. Patient flow (whiteboard sketch)

Example patient: **Swastik**, with throat pain or general pain.

```
                   Swastik: "throat pain / general pain"
                         /                         \
               Knows where to go             Doesn't know where to go
              /        |        \                /                \
   Direct OPD     Emergency    Pharmacy    Emergency (EGNCY)   Audio-to-text +
   doctor                      counter                         photos (if any) to report
   consultation                                                   |
                                                                  ├─ suggest department
                                                                  └─ advice until treated
              \        |        |         /        /
                        ───►  OPD feature  ◄─── pre-invited (pre-booked) patients
                                   ▲
                                 Doctor
```

**Reading of the flow:**

- **Patient knows where to go**: route straight to an OPD doctor consultation, Emergency or the pharmacy counter.
- **Patient doesn't know where to go**:
  - Emergency is always available as a direct path.
  - Otherwise the patient **describes the symptoms by voice** (speech to text) and can **attach photos** for the report. The system then **suggests a department** and shows **general advice until treatment**.
- Every path ends at the **OPD feature** (queue and consultation), which the **Doctor** works from.
- **Pre-invited** patients (follow-ups or pre-booked appointments) go straight into the OPD queue.

### ⚠️ Fitting the "no knowledge" path to the brief's rules

The department suggestion from voice and photos is a strong differentiator, but it has to stay a **suggestion**:

- It must **never** classify a case as "not an emergency" or tell anyone they can wait.
- If the description contains warning signs, it should **show the emergency guidance and raise a staff flag**, not triage the case itself.
- "Advice until treatment" should stay general and comforting (sit down, drink water, tell staff if it gets worse). It should never be a diagnosis or a medicine recommendation.
- The patient (or staff) should always be able to override the suggested department.

---

## 7. Where to focus (priority order)

1. **Emergency handling.** It's cheap to build, explicitly judged and a hard rule.
2. **Directions from slip to room.** The brief's sample spec singles this out as the place to go deepest. The hospital graph must be correct: paths work in both directions, the lift connects every floor, and "Avoid stairs" removes stair paths *before* the route is calculated.
3. **Complete Hindi (and the third language).** Every string switches, including directions, landmarks and announcements. One leftover English string hurts the language-accessibility score.
4. **Assisted mode and read-aloud.** These carry the inclusive-design score.
5. **Live queue and the "3 ahead" alert.** This is the core of the queue-management score.

## 8. Risks and how to avoid them

| Risk | Mitigation |
|---|---|
| Too much scope (12+ screens plus add-ons in 48 hours) | Build every screen to a basic working level first, then polish |
| Browser support (speech recognition, `BarcodeDetector`, Hindi text-to-speech voices) | Hide features the browser lacks; test on the exact demo device and browser |
| Refreshing a route like `/staff` gives a 404 after deploy | Add a rewrite so every route serves `index.html` (Vercel/Netlify) |
| Live sync between the patient screen, staff dashboard and board fails in the demo | Rehearse with three screens open; show an "updated at" time on each |
| Looking like every other team that used the same AI prompt | Our symptom-to-department flow, the "show this to staff" card, simulated SMS, and accessibility done properly |

## 9. Current status

- Branch: `backend-setup`
- `backend/`: Node + Express 5, MongoDB (Mongoose), Socket.io. See `backend/README.md` for every route and live-update event.
  - **Hospitals**: everything (departments, doctors, tickets) belongs to a hospital; its short code goes in the gate QR poster
  - **Ticket-matching engine**: per-day token numbers, atomic "Call next", estimated wait, live position updates to each patient
  - **Auth**: JWT login/logout for doctors, plus a simple open doctor sign-up (to be locked down)
  - **Urgent flags**: alert that hospital's staff only; the app never decides who is urgent
  - Run it: `cd backend && cp .env.example .env && npm install && npm run seed && npm run dev`
- Frontend: being built separately
- `p2.pdf`: the original problem statement

## 10. Open questions for the team

- What is the third language, "TX"? (Tamil? Telugu?)
- Speech to text: the browser's Web Speech API, or a server-side service? Which one supports Hindi and the third language reliably?
- Department suggestion: a simple keyword or rule map, or an LLM? (Either way, stick to the rules in section 6.)
- Auth: staff only (PIN or login), or patient accounts too? The brief prefers patients not needing to log in.
- Database: in-memory or JSON for the demo, or a real database (MongoDB or Postgres)?
- Live updates: Socket.io on the Express server?
- Frontend stack: React + Vite + Tailwind, as the brief suggests?
