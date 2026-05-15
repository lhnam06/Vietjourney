# Vietjourney 🌏✈️

Vietjourney is a real-time collaborative travel planning platform focused on Vietnam: discovery, collaborative trip workspaces, and budget tooling. This repository splits a **Vite + React** client from a **Spring Boot** API and a **Go** WebSocket proxy for high-performance real-time synchronization.

## 🏗 Repository Layout

| Path | Role |
|------|------|
| `frontend/` | SPA: discovery, workspace, budget, profile, auth UI (React + Vite) |
| `backend/` | REST API: authentication, users, roles, permissions, timeline management (Java 17, Spring Boot 3.2) |
| `websocket-proxy/` | High-performance Go proxy for real-time timeline synchronization |
| `tests/unit/` | Consolidated JavaScript unit tests and debug scripts |
| `guidelines/` | Design and implementation notes |

---

## 🚀 Quick Start

For detailed instructions, please refer to the [STARTUP_GUIDE.md](./STARTUP_GUIDE.md).

### Prerequisites
- **Node.js** (v18+)
- **Java 17** (JDK)
- **Go** (v1.20+)
- **Redis** (For real-time sync)
- **PostgreSQL**

### 1. Backend
```bash
cd backend
./mvnw spring-boot:run
```
*API serves on `http://localhost:8082`*

### 2. WebSocket Proxy
```bash
cd websocket-proxy
go run .
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
*UI serves on `http://localhost:5173`*

---

## ✨ Key Features

- **Discovery** — Interactive map + cards with advanced filters (category, tags, rating).
- **Collaborative Workspace** — Real-time timeline synchronization using a proposal-based system.
- **Ghost UI** — Visualize pending changes from collaborators before they are approved.
- **Conflict Detection** — Smart overlap prevention with detailed feedback (e.g., "Conflicts with 'Lunch' at 12:00").
- **Budget Tooling** — Track spend and splits across your travel narrative.

## 🛠 Tech Stack

**Frontend:** React 18, TypeScript, Vite, React DnD, React Leaflet / Google Maps, Tailwind CSS v4, Radix UI, Sonner (Toasts).

**Backend:** Spring Boot 3.2, Spring Security (JWT), Spring Data JPA, PostgreSQL, Redis (Messaging), WebSocket.

**Proxy:** Go (Golang) for decoupled, efficient WebSocket message routing.

---

## 🗺 Routes (SPA)

| Path | Purpose |
|------|---------|
| `/` | Discovery & Search |
| `/workspace/:tripId` | Real-time Trip Workspace |
| `/timetable/:tripId` | Multi-day schedule view |
| `/budget/:tripId` | Expense tracking |
| `/profile` | User management |
| `/auth` | Secure login / signup |

---

## 📜 Credits
For third-party and asset credits, see `ATTRIBUTIONS.md`.
