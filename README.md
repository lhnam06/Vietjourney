# Vietjourney

Vietjourney is a travel planning product focused on Vietnam: discovery, collaborative trip workspaces, and budget tooling. This repository splits a **Vite + React** client from a **Spring Boot** API so features can grow without coupling UI to persistence.

## Repository layout

| Path | Role |
|------|------|
| `frontend/` | SPA: discovery, workspace, budget, profile, auth UI (`@vietjourney/frontend`) |
| `backend/` | REST API: authentication, users, roles, permissions (Java 17, Spring Boot 3.2) |
| `guidelines/` | Design and implementation notes |

The frontend can use **Supabase** for hosted auth/data when configured; client defaults are documented in `frontend/.env.example`. The Java backend uses **PostgreSQL** and issues its own JWTs for protected routes.

## Prerequisites

- **Node.js** (for the frontend)
- **Java 17** and **Maven** (for the backend; wrapper scripts `backend/mvnw` / `backend/mvnw.cmd` are included)
- **PostgreSQL** with a database the app can use (see below)

## Backend

1. Create a database (default in config is `tourism_db` on `localhost:5432`).
2. Set environment variables expected by `backend/src/main/resources/application.yml`:
   - `DB_PASSWORD` — PostgreSQL password for the configured user (`postgres` in the checked-in defaults)
   - `JWT_SIGNER_KEY` — secret used to sign access and refresh tokens

3. From `backend/`:

```bash
./mvnw spring-boot:run
```

The API serves on the default Spring Boot port **8080** unless you override `server.port`. JPA is set to `ddl-auto: update` for development.

### REST surface (high level)

- `POST /api/v1/auth/login`, refresh, logout, introspect
- `api/v1/users` — user management
- `/api/v1/roles`, `/api/v1/permissions` — authorization model

Controllers live under `backend/src/main/java/com/project/backend/modules/auth/controller/`.

### Places catalog (Discovery)

- **`POST /api/v1/places/filter`** — public (no JWT). Request body supports optional `category` (`food` \| `drink` \| `activity`), `district`, tags, price and rating bounds, plus `page` / `size`.
- The Spring app runs these queries against the **primary datasource** (`spring.datasource`), expecting tables such as **`places_food`**, **`places_drink`**, **`places_activity`** (PostgreSQL-oriented SQL: JSONB + `int4range`). Profile **`dev`** uses in-memory **H2**: if those tables do not exist locally, the Discovery client falls back to HCMC sample data while the API stays up for auth and timelines.

## Frontend

1. Copy `frontend/.env.example` to `frontend/.env` and set variables as needed (Google Maps, optional Supabase).
2. Install and run from `frontend/`:

```bash
npm install
npm run dev
```

3. Production build:

```bash
npm run build
```

There is no root `package.json`; run npm commands inside `frontend/`.

## Product overview

The app targets a full trip lifecycle: find places, plan day-by-day timelines with maps, track spend and splits, and manage profile and sign-in. Much of the UI still relies on **mock data** (sample Vietnamese locations, trips, transactions) while the Spring API fills in real auth and user/role storage.

### Feature areas

- **Discovery** — Map + cards, filters (weather, vibe, budget), search.
- **Workspace** — Drag-and-drop timeline, map, chat-style collaboration affordances, route hints and AI-suggestion placeholders.
- **Budget** — Budget vs. actual, category breakdown, debt/settlement helpers, transaction history tied to the trip narrative.
- **Profile & auth** — Account flows in the UI; backend supports credential-based auth and token lifecycle.

## Tech stack

**Frontend:** React 18, TypeScript, Vite, React Router 7, React DnD, React Leaflet / Google Maps, Motion, Tailwind CSS v4, Radix UI, Lucide, Recharts, optional Supabase client.

**Backend:** Spring Boot (Web, Security, OAuth2 resource server, JPA, WebSocket starter), PostgreSQL, MapStruct, Lombok.

## Routes (SPA)

| Path | Purpose |
|------|---------|
| `/` | Discovery |
| `/workspace/:tripId` | Trip workspace |
| `/budget/:tripId` | Budget |
| `/profile` | Profile |
| `/auth` | Login / signup |

## What is integrated vs. planned

- **Today:** Rich client experience with mocks; Java API for users, roles, permissions, and JWT auth; PostgreSQL as the API database.
- **Next steps:** Point the SPA at the Spring API for login and trip persistence, wire real-time collaboration to WebSocket or a managed service, and align optional Supabase usage with your deployment story (client-only vs. backend sync).

For third-party and asset credits, see `ATTRIBUTIONS.md`.
