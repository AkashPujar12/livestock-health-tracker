# Smart Livestock Health & Disease Alert System

Bilingual (Kannada + English), voice-first livestock health app with village-level disease cluster alerts.

| # | Feature | Where |
|---|---------|-------|
| 1 | AI photo assistance + vet referral | `ai-service/main.py`, `backend/src/routes/ai.js`, `frontend/src/pages/Report.jsx` |
| 2 | Suspected-cluster alerts within 10 km | `backend/src/cluster.js` (+ `routes/reports.js`, `routes/alerts.js`) |
| 3 | Expected delivery calculator + reminders | `backend/src/gestation.js`, `routes/pregnancies.js`, `jobs.js` |
| 4 | Kannada / English (UI, alerts, AI text, voice) | `frontend/src/locales/*.json`, bilingual fields in notifications |
| 5 | Voice data entry with read-back + confirm | `frontend/src/voice.js`, `voiceParser.js`, `components/VoiceAssistant.jsx` |
| 6 | Vaccination records, configurable schedules | `backend/src/routes/vaccinations.js`, `Schedule` model |

Extras: QR animal IDs, vet dashboard (verify/dismiss clusters), offline queue + cached reads, emergency-sign guidance.

## Run locally

Prerequisites: Node 20+, Python 3.10+, MongoDB (or Docker).

```bash
# 1. MongoDB (skip if you have one)
docker compose up -d mongo

# 2. AI service  (terminal A)
cd ai-service && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000

# 3. Backend  (terminal B)
cd backend && cp .env.example .env && npm install
npm run seed        # sample vaccine schedules, sample vets, demo vet login
npm run dev

# 4. Frontend (terminal C)
cd frontend && npm install && npm run dev      # http://localhost:5173
```
Or run mongo + ai + backend together: `docker compose up --build`, then start the frontend.

Demo vet (dev only): phone `9000000001`, password `vet12345`.
Register a few farmer accounts (allow GPS) to try the cluster alert: 4 distinct farmers reporting the same
symptom category within 10 km in 7 days triggers a *suspected* alert. Thresholds are in `backend/.env`.

## Safety & design decisions (from the project plan)
- Alerts say **"suspected disease cluster"** until a vet verifies; duplicate reports from one farmer count once; reporters are never revealed; alert centres are rounded (~1 km); alerts go only to farmers with `notifyConsent`.
- Vet numbers come only from the verified `Vet` collection, never from AI.
- Voice input never saves directly: it pre-fills the form, reads it back, and waits for Save.
- Gestation values are planning averages (cow 283, buffalo 310, goat 150, sheep 147 days).

## Things you MUST do before real use
1. **AI model:** `ai-service` ships a basic photo-quality/colour checker, not a trained disease model. It never names a disease. Plug a vetted classifier into `model_predict()`.
2. **Seed data is sample data:** vaccine intervals in `backend/src/seed.js` and the "SAMPLE" vets must be replaced with values confirmed by a veterinarian / official directory.
3. **Kannada text:** have a native speaker review `locales/kn.json` and the Kannada notification/AI strings.
4. **Speech:** the browser Web Speech API (Chrome) is used for kn-IN/en-IN recognition and speech output; quality and voice availability vary by device. For production consider Google Cloud STT/TTS, Azure, or Bhashini.
5. **Push/SMS:** in-app notifications work out of the box. For push, set `FIREBASE_SERVICE_ACCOUNT` and send each device's FCM token via `PATCH /api/auth/me {fcmToken}`. SMS/WhatsApp needs a provider hook in `backend/src/notify.js`.
6. **Offline-first:** the app caches reads and queues new records offline. For full installable PWA behaviour add a service worker (e.g. `vite-plugin-pwa`).
7. Set a strong `JWT_SECRET`, serve over HTTPS, and review privacy/consent text for location data.

## API summary
`POST /api/auth/register|login`, `GET|PATCH /api/auth/me` · `GET|POST /api/animals`, `GET|DELETE /api/animals/:id`
· `GET|POST /api/vaccinations`, `GET /vaccinations/due|schedules` · `GET|POST /api/pregnancies`, `PATCH /pregnancies/:id/deliver`
· `POST /api/reports` · `GET /api/alerts/nearby`, vet: `GET /alerts/all`, `PATCH /alerts/:id`
· `GET /api/vets/nearby` · `POST /api/ai/analyze` (multipart) · `GET /api/notifications`

Tests: `cd backend && npm test` (gestation maths).
