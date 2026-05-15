# Vietjourney Startup Guide 🚀

Welcome to **Vietjourney**, a real-time collaborative travel planning platform. This guide will help you get the system up and running on your local machine.

## 🏗 Project Architecture

The application consists of three main services:
1.  **Backend**: Spring Boot (Java 17) - REST API and business logic.
2.  **Frontend**: React (Vite + Tailwind CSS) - User interface.
3.  **WebSocket Proxy**: Go - Real-time synchronization for collaborative planning.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:
-   **Java 17** (JDK)
-   **Node.js** (v18 or later) & npm
-   **Go** (v1.20 or later)
-   **PostgreSQL** (or a Supabase instance)
-   **Redis** (Required for WebSocket proxy communication)

---

## 🚀 Getting Started

### 1. Database Setup
-   Create a PostgreSQL database named `vietjourney`.
-   Configure the database connection in `backend/src/main/resources/application.yml` (or set environment variables).

### 2. Backend (Spring Boot)
Open a terminal in the `backend` directory:
```bash
cd backend
./mvnw clean install
./mvnw spring-boot:run
```
*The backend will start on `http://localhost:8082` by default.*

### 3. WebSocket Proxy (Go)
Open a terminal in the `websocket-proxy` directory. Ensure Redis is running locally.
```bash
cd websocket-proxy
go mod download
go run .
```
*The proxy facilitates real-time updates between the backend and frontend.*

### 4. Frontend (React)
Open a terminal in the `frontend` directory:
```bash
cd frontend
npm install
npm run dev
```
*The frontend will be available at `http://localhost:5173`.*

---

## ⚙️ Configuration

### Environment Variables
Copy `.env.example` to `.env` in the root directory and fill in your credentials:
-   `DATABASE_URL`: Your PostgreSQL connection string.
-   `JWT_SECRET`: Secret key for authentication.
-   `REDIS_URL`: Connection string for Redis.

---

## 🛠 Troubleshooting

-   **Port Conflicts**: Ensure ports `8082`, `5173`, and the proxy port are not in use.
-   **Real-time sync not working**: Check if Redis is running and the Go proxy is connected.
-   **Authentication errors**: Verify that the `JWT_SECRET` matches across the backend and proxy settings.

Happy Traveling! 🌏✈️
