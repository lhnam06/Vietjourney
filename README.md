# Vietjourney - Collaborative Travel Planning Platform

## 1. Overview

A modern web platform for planning trips in Vietnam with real-time collaboration:

- Place discovery with filters (food, drink, activities) backed by a PostgreSQL place catalog
- Personalized recommendations from user interaction signals
- Collaborative trip workspaces with proposal-based timeline editing
- Budget tracking and split-expense views
- Real-time sync via WebSocket for multi-user itinerary updates

The system is built for Vietnam-focused travel data: districts, tags, maps, itineraries, and group planning workflows.

## 2. Key Features

**Discovery & Search**
- Browse and filter places by category, district, rating, price, and tag groups
- Drag-and-drop places into a multi-day timetable preview
- Personalized recommendations when signed in

**My Trip & Workspace**
- Create and manage trip timelines
- Collaborative workspace with real-time updates
- Proposal / ghost UI for pending changes from other members
- Route map with road-following polylines and GPS locate control

**Budget**
- Track trip expenses and split costs among participants

**Authentication & Notifications**
- JWT-based sign-in and profile management
- In-app notifications with real-time delivery

## 3. System Architecture

The system follows a modular architecture consisting of:

- **Frontend** (`frontend/`)
  - React SPA built with Vite and TypeScript
  - Discovery, workspace, budget, profile, and auth pages
  - Leaflet maps, drag-and-drop timetable, and WebSocket client hooks

- **Backend** (`backend/`)
  - Spring Boot REST API on port `8082`
  - Authentication, timelines, places filter, recommendations, notifications
  - PostgreSQL via JPA/Flyway; optional separate place-data source

- **WebSocket Proxy** (`websocket-proxy/`)
  - Go service for real-time timeline and notification fan-out
  - Uses Redis pub/sub between backend events and connected clients

- **Data stores**
  - **PostgreSQL** — users, timelines, notifications, app metadata
  - **Place catalog** — `places_food`, `places_drink`, `places_activity` (Supabase or local Postgres)
  - **Redis** — message bus for the WebSocket proxy

## 4. Tech Stack

- **Languages:** Java, TypeScript, Go

- **Frontend:** React 18, Vite, React Router, Tailwind CSS v4, Radix UI, React Leaflet, React DnD
- **Backend:** Spring Boot 3.2, Spring Security (JWT HS256), Spring Data JPA, Flyway, PostgreSQL
- **Real-time:** Go WebSocket proxy, Redis
- **Maps & routing:** Leaflet, OpenStreetMap tiles, OSRM (public demo router for road polylines)

## 6. How to Run

### 6.1. Requirements

- **Java:** 17 (JDK)
- **Node.js:** 18 or higher
- **npm**
- **Go:** 1.20 or higher (for WebSocket proxy)
- **PostgreSQL** (local or Supabase)
- **Redis** (required for real-time sync)
- (Optional) **Docker & Docker Compose**

### 6.2. Option 1: Run with Docker (Recommended for backend stack)

This starts PostgreSQL, Redis, the Spring Boot API, and the WebSocket proxy.

#### Step 1: Navigate to the project directory

```bash
cd Vietjourney
```

#### Step 2: Configure environment variables

Create `backend/.env` (and update `docker-compose.yml` or service env vars) with your database credentials, JWT secret, and place DB settings.  
For local frontend API access, set `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8082
```

#### Step 3: Build and start services

```bash
docker compose up --build
```

#### Step 4: Start the frontend (separate terminal)

```bash
cd frontend
npm install
npm run dev
```

#### Step 5: Access the application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8082
- **WebSocket proxy:** http://localhost:8081

### 6.3. Option 2: Run Locally (Manual Setup)

See [STARTUP_GUIDE.md](./STARTUP_GUIDE.md) for step-by-step details.

#### 6.3.1. Run Backend

```bash
cd backend
./mvnw clean install
./mvnw spring-boot:run
```

Backend runs at **http://localhost:8082**.

#### 6.3.2. Run WebSocket Proxy

Ensure Redis is running, then:

```bash
cd websocket-proxy
go mod download
go run .
```

#### 6.3.3. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**.  
The Vite dev server proxies `/api` and `/ws` to the backend when configured via `frontend/.env`.

---

## Application Routes

| Path | Purpose |
|------|---------|
| `/` | Discovery — search and filter places |
| `/mytrip` | My Trip — create and open timelines |
| `/workspace/:tripId` | Collaborative workspace and route map |
| `/budget/:tripId` | Budget and expense splits |
| `/profile` | User profile and preferences |
| `/timelines` | Timeline list |
| `/notifications` | Notifications |
| `/auth` | Login and registration |

## Credits

For third-party libraries and asset credits, see [ATTRIBUTIONS.md](./ATTRIBUTIONS.md).

For recommendation design notes, see [backend/docs/recommendation-mechanism.md](./backend/docs/recommendation-mechanism.md).
