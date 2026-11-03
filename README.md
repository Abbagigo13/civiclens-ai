# CivicLens AI

**CivicLens AI** turns photos of community infrastructure problems into structured, evidence-aware reports that people can review, submit, and track.

Initial focus: a practical prototype for problems such as potholes, blocked drains, accumulated waste, damaged sidewalks, and other visible public-infrastructure issues in Nigerian communities.

> **Prototype principle:** AI assists with observation and report drafting; a person reviews and confirms every report. The system must not present uncertain visual estimates as verified facts.

## Why this project

A photo can show a problem, but it does not automatically become a useful report. CivicLens helps a user move from image to an organized record containing:

- A suggested issue category
- A plain-language description of visible evidence
- An optional user-provided location
- A suggested priority with an explanation and uncertainty
- A report that a person can edit and confirm
- A status history so resolution can be tracked

## MVP scope

1. Upload or select a photo.
2. Enter a location manually (optional).
3. Analyze the image using a configured vision-capable model when available.
4. Show a structured draft with visible observations separated from inferences.
5. Optionally highlight/segment relevant objects using SAM 3.1 if access is available.
6. Let the user edit and confirm the draft.
7. Save reports locally or in a configured database.
8. Track statuses: `Submitted`, `Under Review`, `Resolved`.
9. Provide a dashboard with filters and report details.

## Out of scope for the first version

- Automatic dispatch of emergency services
- Guaranteed pothole-size or damage-severity measurement from a single photo
- Automatic public posting without user review
- Facial recognition or identification of people in images
- Background location collection
- Claims that a government agency has received or acted on a report without an actual integration
- Paid APIs or cloud hosting as a requirement

## Stack (as built)

- **Frontend:** React + Vite + TypeScript, plain CSS with custom-property tokens
- **Backend:** Node.js + Express + TypeScript (`server/`)
- **Storage:** SQLite (`node:sqlite`) for report metadata and status history; photos stored beside the database; browser IndexedDB keeps local copies
- **AI integration:** Meta AI via the OpenAI-compatible API, server-side only (`MODEL_API_KEY`). Without it the app still works: visitors file reports manually
- **Access:** open by design — no accounts or API keys for filing, browsing or updating reports. Rate limits still apply
- **Testing:** Node's built-in test runner via `tsx` (`npm test`)

No API key should be committed to the repository.

## Architecture at a glance

```text
Browser / React UI
  ├── Photo upload + location form
  ├── Analysis review and edit screen
  └── Reports dashboard
          |
          v
Express backend (server/)
  ├── Validation and upload limits
  ├── Report service and SQLite store
  ├── AI analysis adapter (Meta AI, lazy-initialised)
  └── Rate limiting
          |
          +--> Vision model API (configured provider, optional)
          +--> SQLite + local uploads
```

See [`#docs/docs/4.architecture.md`](#docs/docs/4.architecture.md) for the detailed design.

## Repository structure

```text
civiclens-ai/
├── README.md
├── .env.example
├── index.html
├── src/                  React frontend (pages, features, components)
├── server/src/           Express API (routes, services, middleware)
└── #docs/docs/           Design documents 1-7
```

The application is implemented in this structure (the `#docs/` folder holds the design documents).

## Local development

### Prerequisites

- Git
- Node.js LTS and npm

### Run

```bash
npm install
npm run server:dev   # backend API on http://localhost:3001
npm run dev          # frontend on http://localhost:5173
```

Open http://localhost:5173 in your browser. Filing, browsing and
resolving reports need no account or key. AI photo analysis needs
`MODEL_API_KEY` in `.env`; without it, use "File it manually instead".

Checks: `npm test` (server test suite), `npm run lint`, `npm run build`.

## Configuration

Copy `.env.example` to `.env` and fill in your own values. Never commit `.env`.

```env
MODEL_API_KEY=       # Meta AI key, server-side only; optional (manual filing works without it)
META_MODEL=muse-spark-1.3
CLIENT_ORIGIN=http://localhost:5173
PORT=3001
REPORTS_DB_PATH=data/civiclens.db
REPORTS_PHOTO_DIR=data/photos
```

Access is open by design: anyone can file, browse and update reports
without a key. Rate limits still apply.

## Responsible AI and trust

- Explain that analysis may be wrong.
- Distinguish what is visible in the image from inferred causes or severity.
- Require user review before submission.
- Never infer identity, intent, criminality, or sensitive personal attributes from an image.
- Do not use a single image to assert a precise measurement unless the method has been validated.
- Let users correct categories, descriptions, location, and priority.
- Avoid collecting more personal data than needed.

## Project status

**Stage:** live production prototype on Render — see
[Deploy on Render](#deploy-on-render).

## Key features

- Photo upload with AI visual assessment (Meta Model API), with
  editable human review before any report is saved
- Interactive map: Nigerian location search (OpenStreetMap/Nominatim),
  click-to-select coordinates, community report map
- Report queue with status tracking (`Submitted`, `Under Review`,
  `Resolved`), priorities, filters, and report details
- Works without an AI key: manual filing is always available

## Testing

```bash
npm test          # server test suite (tsx + node:test)
npm run lint      # ESLint
npm run build     # TypeScript + Vite production build
```

## Known limitations

- AI analysis is optional: without `MODEL_API_KEY`, analysis is
  unavailable and reports are filed manually.
- Reports/photos persist only on a persistent disk (Render `/data`);
  without one they are lost on redeploy/restart.
- Access is open by design: no accounts; protection is rate limits
  only. Upload validation trusts the multipart MIME type.
- Location search depends on OpenStreetMap coverage in Nigeria;
  users must always verify the pin on the map.
- SAM 3.1 segmentation is not implemented.

## Production

**Live app:** https://civiclens-ai-jbup.onrender.com/dashboard

## Documentation

- [1. Product Requirements](#docs/docs/1.prd.md)
- [2. Design System](#docs/docs/2.design_system.md)
- [3. Code Style](#docs/docs/3.code_style.md)
- [4. Architecture](#docs/docs/4.architecture.md)
- [5. Security](#docs/docs/5.security.md)
- [6. Testing](#docs/docs/6.testing.md)
- [7. Agent / AI Coding Rules](#docs/docs/7.agents.md)

## Run with Docker

The image builds the frontend and serves it together with the API on
port 3001. Report data lives in a volume so it survives restarts.

```bash
docker compose up --build
```

Nothing to fill in — no keys, no `.env`, no flags. Then open
http://localhost:3001 in your browser. Access is open by design:
anyone can file, browse and update reports without a key or account.

Equivalent without Compose:

```bash
docker build -t civiclens-ai .
docker run --rm -p 3001:3001 -v civiclens-data:/data civiclens-ai
```

AI photo analysis is the only feature that needs a server-side key.
If the owner puts `MODEL_API_KEY` in a local `.env` file (never
committed), Compose passes it to the server and **visitors can use
"Analyze image" without entering anything** — the key never reaches
the browser. Without it, visitors simply file reports manually;
everything else works exactly the same.

## Deploy on Render

One Render Web Service hosts everything: Express serves the API
and the built frontend from the same origin, so the frontend uses
relative `/api` requests and no CORS wiring is needed. The repo's
[render.yaml](render.yaml) (Blueprint spec) matches this setup;
an existing dashboard-created Docker service is equivalent.

1. **Create the service:** Render → New → Web Service (or Blueprint
   with `render.yaml`) → connect this repo. Render auto-detects
   the `Dockerfile`; do not override build/start commands. The
   image runs `npm run build` and starts
   `npm run server:start` on Render's `PORT`.
2. **Environment variables** (Render → service → Environment;
   never commit secrets):

   ```env
   MODEL_API_KEY=<optional, server-side only>
   META_MODEL=muse-spark-1.3
   CLIENT_ORIGIN=https://<your-app>.onrender.com
   REPORTS_DB_PATH=/data/civiclens.db
   REPORTS_PHOTO_DIR=/data/photos
   ```

   Leave `VITE_API_BASE_URL` unset (same-origin `/api`) and do not
   set `PORT` (Render provides it).
3. **Persistence:** attach a Persistent Disk mounted at `/data`
   (paid add-on, single instance) so the SQLite database and
   photos survive redeploys. Without it, report data is ephemeral.
4. **Health check:** `/api/health` must return `"status":"ok"`.
5. **Verify:** open `/dashboard`, refresh the page (SPA fallback),
   run one image analysis, file a test report, and confirm it is
   still listed after a redeploy.
