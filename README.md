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
8. Track statuses: `draft`, `submitted`, `under_review`, `in_progress`, `resolved`, `rejected`.
9. Provide a dashboard with filters and report details.

## Out of scope for the first version

- Automatic dispatch of emergency services
- Guaranteed pothole-size or damage-severity measurement from a single photo
- Automatic public posting without user review
- Facial recognition or identification of people in images
- Background location collection
- Claims that a government agency has received or acted on a report without an actual integration
- Paid APIs or cloud hosting as a requirement

## Suggested stack

- **Frontend:** React + Vite + TypeScript (JavaScript is acceptable if preferred)
- **UI:** CSS Modules or plain CSS with design tokens
- **Backend:** Python + FastAPI + Pydantic
- **Storage:** SQLite for local development; local file storage for prototype images
- **AI integration:** provider adapter for a vision-capable model; Meta models only when account access, API terms, and quota are confirmed
- **Optional visual segmentation:** SAM 3.1 only after verifying practical access and hardware/API requirements
- **Testing:** Pytest, Vitest, and React Testing Library

No API key should be committed to the repository. The app must remain usable in demo mode with clearly labeled sample data if model access is unavailable.

## Architecture at a glance

```text
Browser / React UI
  ├── Photo upload + location form
  ├── Analysis review and edit screen
  └── Reports dashboard
          |
          v
FastAPI backend
  ├── Validation and upload limits
  ├── Report service
  ├── AI provider adapter
  ├── Optional segmentation adapter
  └── Repository layer
          |
          +--> Vision model API (configured provider, optional)
          +--> SAM 3.1 adapter (optional)
          +--> SQLite + local uploads
```

See [`docs/4.architecture.md`](docs/4.architecture.md) for the detailed design.

## Repository structure

```text
civiclens-ai/
├── README.md
├── .env.example
├── .gitignore
├── docs/
│   ├── 1.prd.md
│   ├── 2.design_system.md
│   ├── 3.code_style.md
│   ├── 4.architecture.md
│   ├── 5.security.md
│   ├── 6.testing.md
│   └── 7.agents.md
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── features/
│       │   ├── analysis/
│       │   └── reports/
│       ├── lib/
│       ├── styles/
│       ├── types/
│       └── App.tsx
├── backend/
│   └── app/
│       ├── api/
│       ├── core/
│       ├── models/
│       ├── schemas/
│       ├── services/
│       ├── repositories/
│       ├── ai/
│       └── main.py
├── data/
│   └── .gitkeep
└── tests/
    ├── frontend/
    └── backend/
```

This is the target structure, not a claim that the application code has already been implemented.

## Local development plan

### Prerequisites

- Git
- Node.js LTS and npm
- Python 3.11+ (use a version supported by selected dependencies)
- VS Code or another editor

### Backend (planned)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install fastapi uvicorn[standard] pydantic-settings python-multipart pillow pytest httpx
uvicorn app.main:app --reload
```

### Frontend (planned)

```powershell
cd frontend
npm install
npm run dev
```

The frontend and backend scaffolding must be created before these commands will work. We'll implement it incrementally after agreeing on these documents.

## Configuration

Create a local `.env` file from `.env.example`. Keep secrets local and use placeholder values in examples.

```env
APP_ENV=development
APP_HOST=127.0.0.1
APP_PORT=8000
DATABASE_URL=sqlite:///./civiclens.db
UPLOAD_DIR=./data/uploads
MAX_UPLOAD_MB=8
AI_PROVIDER=mock
AI_API_KEY=
AI_MODEL=
SEGMENTATION_ENABLED=false
```

`AI_PROVIDER=mock` means deterministic demo analysis, not real model inference. The UI must clearly label mock output.

## Responsible AI and trust

- Explain that analysis may be wrong.
- Distinguish what is visible in the image from inferred causes or severity.
- Require user review before submission.
- Never infer identity, intent, criminality, or sensitive personal attributes from an image.
- Do not use a single image to assert a precise measurement unless the method has been validated.
- Let users correct categories, descriptions, location, and priority.
- Avoid collecting more personal data than needed.

## Project status

**Stage:** planning and documentation.

**Next milestone:** scaffold the repository, implement upload and report-review flow using mock analysis, then add the real model adapter once access is confirmed.

## Documentation

- [1. Product Requirements](docs/1.prd.md)
- [2. Design System](docs/2.design_system.md)
- [3. Code Style](docs/3.code_style.md)
- [4. Architecture](docs/4.architecture.md)
- [5. Security](docs/5.security.md)
- [6. Testing](docs/6.testing.md)
- [7. Agent / AI Coding Rules](docs/7.agents.md)
