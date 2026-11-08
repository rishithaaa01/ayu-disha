# Ayu Disha

**Ayu Disha** is a healthcare application project organized into mobile, web, and backend components. The repository contains workflows for patient records, community health workers, clinical teams, appointments, and AI-assisted services.

> **Implementation note:** This README describes the code currently checked into this repository. Its mobile app is Expo / React Native, its API is FastAPI, and its web client is React with Vite. Other Ayu Disha repository variants may contain different or newer implementations.

## Repository architecture

| Component | Location | Current implementation |
| --- | --- | --- |
| Mobile app | `mobile/` | Expo, React Native, TypeScript |
| API backend | `backend/` | Python, FastAPI |
| Database | Backend configuration | MongoDB |
| Web client | `web/` | React, Vite, TypeScript |
| Native web wrapper | `web/` | Capacitor for Android and iOS |

## Application areas

The backend is organized into route groups and services for areas including:

- Authentication and user access
- Patients and community health worker workflows
- Clinician, administrator, and laboratory workflows
- Appointments and visit-related services
- Voice and local AI-related endpoints
- Reminder scheduling

The exact features available in a running environment depend on the configured services and credentials.

## Getting started

Run each component in its own terminal.

### 1. Backend API

Requirements: Python 3.10+ and access to a MongoDB database.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` and configure at least the MongoDB connection and JWT secret. Add third-party credentials only for integrations you intend to use.

Start the API:

```bash
uvicorn main:app --reload
```

### 2. Mobile application

Requirements: Node.js and the Expo development environment.

```bash
cd mobile
npm install
npm start
```

Use the Expo CLI prompts to open the app on a device, emulator, or supported web target.

### 3. Web application

Requirements: Node.js.

```bash
cd web
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

The web component also contains Capacitor configuration for native Android and iOS packaging.

## Configuration and security

- Keep real API keys, database credentials, JWT secrets, and service-account files out of Git.
- Use the supplied `.env.example` as the configuration reference.
- Configure the API base URL for the device or emulator you are testing; `localhost` on a physical phone does not refer to your development computer.
- Enable external integrations only after their credentials and service-side settings are configured.

## Repository layout

```text
.
├── backend/       # FastAPI application, routes, services and jobs
├── mobile/        # Expo / React Native application
├── web/           # React + Vite web client and Capacitor project
├── assets/        # Shared assets
└── reports/       # Test reports and project analysis
```

## Development

Before submitting changes, run the relevant checks for the component you changed. Keep API contracts aligned between the mobile client, web client, and backend, and document any new environment variables in `.env.example`.
