---
title: GigShield AI
emoji: 🛡️
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
---

# GigShield AI — Parametric Protection for Gig Workers

> **Autonomous income protection for gig workers.** GigShield AI monitors real-time environmental risk (weather, traffic, pollution) and the moment conditions breach a policy threshold, it automatically triggers a payout — no claims process, no waiting.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Repository Structure](#4-repository-structure)
5. [Services & How They Connect](#5-services--how-they-connect)
6. [Backend API Reference](#6-backend-api-reference)
7. [Frontend Pages & Components](#7-frontend-pages--components)
8. [ML Service](#8-ml-service)
9. [Trigger Engine](#9-trigger-engine)
10. [Data Models](#10-data-models)
11. [Authentication Flow](#11-authentication-flow)
12. [Investor Demo Console](#12-investor-demo-console)
13. [Environment Variables](#13-environment-variables)
14. [Local Development Setup](#14-local-development-setup)
15. [Running the Full Stack](#15-running-the-full-stack)
16. [API Testing](#16-api-testing)
17. [Security Design](#17-security-design)
18. [INR Localization](#18-inr-localization)

---

## 1. Project Overview

GigShield AI is a **parametric insurance platform** built for India's gig economy (Swiggy, Zomato, Uber, Amazon Flex, etc.). Unlike traditional insurance that requires manual claims, GigShield works on a trigger model:

```
Sensor/API Data → Risk Score → Threshold Breach → Automatic Payout → Bank Account
```

### Key Value Propositions
| Feature | How it works |
|---|---|
| **Zero-claim payouts** | Smart contracts trigger automatically when the risk index breaches a threshold |
| **Real-time risk scoring** | ML model evaluates weather, traffic, and pollution scores every 15 minutes |
| **Fraud prevention** | Multi-layer guard: impossible telemetry detection + fraud flag system |
| **Idempotent engine** | Same trigger event can never pay out twice |
| **Personalized pricing** | Weekly premium calculated from a 5-question risk profile questionnaire |

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
│                  React + Vite SPA (port 5173)                        │
│   Landing │ Login │ Register │ Dashboard │ Payouts │ Profile         │
│                      Demo Console (Investor)                         │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ REST + WebSocket (JWT)
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       BACKEND API (Express)                          │
│                        Node.js (port 3000)                           │
│                                                                      │
│   /api/auth   /api/activity   /api/risk   /api/payout               │
│   /api/admin  /api/demo       /api/health                           │
│                                                                      │
│   Middleware: JWT Auth │ Rate Limiter │ Helmet CSP │ Morgan Logger   │
└───────┬────────────────────────────────────────┬──────────────────────┘
        │ HTTP (internal)                        │ Mongoose ODM
        ▼                                        ▼
┌───────────────────┐                  ┌──────────────────────┐
│   ML SERVICE      │                  │      MONGODB         │
│  FastAPI (Python) │                  │   (Atlas / Local)    │
│    port 8000      │                  │                      │
│                   │                  │ Users │ ActivityLog  │
│ GradientBoosting  │                  │ RiskScore │ FraudFlag│
│   Regressor       │                  │ Payout │ Notification│
│                   │                  │ TokenBlacklist       │
└───────────────────┘                  └──────────────────────┘
                                                 ▲
                                                 │ Mongoose ODM
                         ┌───────────────────────┘
                         │
┌───────────────────────────────────────────────┐
│              TRIGGER ENGINE (Node.js)          │
│                  Standalone process            │
│                                               │
│  Cron: every 15 min                           │
│    1. evaluate() → find eligible users        │
│    2. dispatchPayout() → POST /api/payout     │
│    3. logTriggerEvent() → audit trail         │
│                                               │
│  Guards: Fraud flag │ Cooldown │ Idempotency  │
└───────────────────────────────────────────────┘
```

---

## 3. Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express.js 4.x |
| Database | MongoDB via Mongoose 8.x |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Real-time | Socket.IO 4.x |
| Security | Helmet (CSP), express-rate-limit |
| Testing | Jest + Supertest + mongodb-memory-server |
| Dev server | Nodemon |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 5 |
| Routing | React Router v6 |
| Styling | Tailwind CSS v3 |
| HTTP Client | Axios with interceptors |
| Icons | Lucide React |
| State | React Context (AuthContext) + custom hooks |

### ML Service
| Layer | Technology |
|---|---|
| Language | Python 3.10+ |
| Framework | FastAPI |
| Model | scikit-learn GradientBoostingRegressor |
| Server | Uvicorn |
| Validation | Pydantic v2 |

### Trigger Engine
| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Scheduler | node-cron |
| DB Access | Mongoose (shared models from backend) |
| Dispatch | Axios (internal API calls) |

---

## 4. Repository Structure

```
projectgw/
│
├── backend/                        # Express REST API + WebSocket server
│   ├── config/
│   │   ├── db.js                   # MongoDB connection with retry
│   │   └── env.js                  # Validated env var exports
│   ├── controllers/
│   │   ├── authController.js       # Register, OTP login, subscribe
│   │   ├── activityController.js   # Activity log CRUD + bulk ingest
│   │   ├── riskController.js       # Risk score compute & fetch
│   │   ├── payoutController.js     # Payout initiation & status
│   │   ├── adminController.js      # Admin: users, fraud flags, risk override
│   │   └── demoController.js       # Investor demo: reset, crisis, fire engine
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT protect() + checkRole()
│   │   ├── errorHandler.js         # Central error handler
│   │   ├── logger.js               # HTTP request logger (Morgan)
│   │   └── rateLimiter.js          # authLimiter + otpLimiter
│   ├── models/
│   │   ├── User.js                 # User schema (auth, tier, trust, weeklyPremium)
│   │   ├── ActivityLog.js          # Delivery activity log
│   │   ├── RiskScore.js            # Risk score snapshots
│   │   ├── FraudFlag.js            # Fraud investigation records
│   │   ├── Payout.js               # Payout records
│   │   ├── Notification.js         # System notifications
│   │   └── TokenBlacklist.js       # Revoked JWT store (logout)
│   ├── routes/
│   │   ├── auth.js                 # /api/auth/*
│   │   ├── activity.js             # /api/activity/*
│   │   ├── risk.js                 # /api/risk/*
│   │   ├── payout.js               # /api/payout/*
│   │   ├── admin.js                # /api/admin/*
│   │   ├── demo.js                 # /api/demo/*
│   │   └── health.js               # /api/health
│   ├── services/
│   │   ├── mlService.js            # Axios wrapper to call ML service
│   │   ├── notificationService.js  # Notification creation helper
│   │   └── socketService.js        # Socket.IO init + user room management
│   ├── tests/                      # Jest integration tests
│   ├── app.js                      # Express app setup (middleware + routes)
│   ├── server.js                   # HTTP + WebSocket server entry point
│   ├── seed_investor_demo.js       # Deterministic demo seed script
│   ├── .env                        # Local environment (gitignored)
│   └── .env.example                # Environment template
│
├── frontend/                       # React SPA
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js           # Axios instance with auth + 401 interceptors
│   │   ├── component/
│   │   │   ├── Badge.jsx           # Status badge component
│   │   │   ├── BottomNav.jsx       # Mobile bottom navigation
│   │   │   ├── ErrorBoundary.jsx   # React error boundary
│   │   │   ├── Header.jsx          # App header
│   │   │   └── PrivateRoute.jsx    # Auth guard wrapper
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Auth state + login/logout/updateUserInfo
│   │   ├── hooks/
│   │   │   └── useProtectionData.js # Polling hook: risk score, payouts, activities
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx     # Public marketing page
│   │   │   ├── LoginView.jsx       # Phone + OTP two-step login
│   │   │   ├── RegisterView.jsx    # Registration form
│   │   │   ├── Dashboard.jsx       # Live risk + payout timeline
│   │   │   ├── Payouts.jsx         # Payout history
│   │   │   ├── HistoryPage.jsx     # Activity history
│   │   │   ├── Profile.jsx         # User profile + plan details
│   │   │   ├── UpgradeView.jsx     # 5-question risk questionnaire + pricing
│   │   │   └── DemoTerminal.jsx    # Investor demo console
│   │   ├── router/
│   │   │   └── AppRouter.jsx       # Route definitions + ProtectedLayout
│   │   ├── styles/                 # Global CSS overrides
│   │   ├── App.jsx                 # Root with AuthProvider
│   │   └── main.jsx                # Vite entry point
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── ml-service/                     # Python ML risk scoring service
│   ├── main.py                     # FastAPI app (GET /health, POST /risk-score)
│   ├── schemas.py                  # Pydantic request/response models
│   ├── config.py                   # Service config
│   ├── pipeline/                   # Model training scripts
│   ├── models/                     # Saved model artifacts (.joblib)
│   ├── utils/
│   │   └── predictor.py            # load_model() + predict_risk()
│   ├── tests/                      # ML service tests
│   └── requirements.txt
│
└── trigger-engine/                 # Autonomous payout cron process
    ├── index.js                    # Entry point: DB connect + start scheduler
    ├── scheduler.js                # Cron runner with mutex lock
    ├── evaluator.js                # Core eligibility logic with all guards
    ├── dispatcher.js               # HTTP dispatch to backend payout API
    ├── auditLogger.js              # Immutable audit trail writer
    ├── .env                        # Trigger engine env vars
    └── tests/                      # Engine tests
```

---

## 5. Services & How They Connect

### Service Communication Map

```
Frontend
  ├── REST  →  Backend  :3000/api/*
  └── WS    →  Backend  :3000  (Socket.IO, JWT auth)

Backend
  └── HTTP  →  ML Service  :8000/risk-score
              (POST with weather/traffic/pollution/history features)

Trigger Engine
  └── Mongoose → MongoDB  (direct model access, shared schemas)
  └── HTTP (internal) → Backend :3000/api/payout/initiate
      (authenticated with x-internal-api-key header)
```

### WebSocket Usage
Socket.IO is initialized on the same HTTP server as Express. Each authenticated user joins a private room (`socket.userId`). The backend emits events to user rooms when payouts are triggered, enabling real-time dashboard updates without polling.

---

## 6. Backend API Reference

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Create a new worker account |
| `POST` | `/request-otp` | Public | Generate + send OTP for login |
| `POST` | `/verify-otp` | Public | Verify OTP, receive JWT token |
| `POST` | `/subscribe` | JWT | Upgrade to Sentinel tier (saves weeklyPremium to DB) |
| `POST` | `/logout` | JWT | Blacklist current JWT token |

**Register** `POST /api/auth/register`
```json
{ "name": "Rahul Sharma", "email": "rahul@example.com", "phone": "+919876543210" }
```

**Request OTP** `POST /api/auth/request-otp`
```json
{ "phone": "+919876543210" }
// Response (dev only): { "success": true, "demo_otp": "123456" }
```

**Verify OTP** `POST /api/auth/verify-otp`
```json
{ "phone": "+919876543210", "otp": "123456" }
// Returns full user object + JWT token + weeklyPremium
```

**Subscribe** `POST /api/auth/subscribe` _(requires Bearer token)_
```json
{ "weeklyPremium": 145 }
// Persists premium amount to User model for cross-device access
```

---

### Activity — `/api/activity`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/` | JWT | Log a single delivery activity |
| `POST` | `/bulk` | JWT | Bulk insert activity records |
| `GET` | `/:userId` | JWT | Get paginated activity logs for a user |

**Create Activity** `POST /api/activity`
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "location": { "lat": 28.7041, "lng": 77.1025 },
  "deliveriesCompleted": 3
}
```

Query params for GET: `?page=1&limit=50`

---

### Risk — `/api/risk`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/score/:userId` | JWT | Compute + store new risk score |
| `GET` | `/latest/:userId` | JWT | Get most recent risk score |

Risk scores are `0.0–1.0` floats. The trigger engine uses `>= 0.5` as the payout threshold (configurable via `RISK_PAYOUT_THRESHOLD`).

---

### Payout — `/api/payout`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/initiate` | JWT / Internal API Key | Initiate a new parametric payout |
| `PATCH` | `/:payoutId/status` | JWT (admin) | Update payout status |
| `GET` | `/me` | JWT | Get all payouts for current user |
| `GET` | `/:payoutId` | JWT | Get single payout (owner or admin) |

**Initiate Payout** `POST /api/payout/initiate`
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "amount": 500,
  "triggerType": "weather_event",
  "idempotencyKey": "trigger_userId_2026-04-04T10:30"
}
```

Guards: Active fraud flags block payout. Duplicate idempotency keys return the existing record (HTTP 200).

---

### Admin — `/api/admin` _(admin role required)_

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/users` | List all users (paginated) |
| `GET` | `/fraud-flags` | List fraud flags (filterable by status) |
| `POST` | `/risk-override/:userId` | Manually set a user's risk score (0.0–1.0) |

---

### Demo — `/api/demo` _(public, investor use)_

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/reset` | Re-seed 4 deterministic demo users to clean state |
| `POST` | `/simulate_crisis` | Push 0.95 risk score to all demo users |
| `POST` | `/fire_engine` | Run evaluator + explainability output |

---

### Health — `/api/health`

```json
GET /api/health
// { "status": "ok", "timestamp": "...", "uptime": 1234 }
```

---

## 7. Frontend Pages & Components

### Pages

| Page | Route | Auth | Description |
|---|---|---|---|
| `LandingPage` | `/` | Public | Marketing page with hero, how-it-works, and "View Demo" CTA |
| `LoginView` | `/login` | Public | Two-step phone + OTP login flow |
| `RegisterView` | `/register` | Public | Registration form |
| `Dashboard` | `/dashboard` | 🔒 Premium | Live risk score, compensation earned today, protection timeline |
| `Payouts` | `/payouts` | 🔒 Premium | Total compensation + full payout history |
| `HistoryPage` | `/history` | 🔒 JWT | Activity log history |
| `Profile` | `/profile` | 🔒 JWT | User info, trust score ring, plan card with weeklyPremium |
| `UpgradeView` | (inline) | 🔒 JWT | 5-question risk questionnaire → personalized pricing → subscribe |
| `DemoTerminal` | `/demo-console` | Public | Investor demo console with live DB state visualization |

### Key Components

| Component | Purpose |
|---|---|
| `AuthContext` | Global auth state via React Context. Provides `user`, `token`, `login()`, `logout()`, `updateUserInfo()` |
| `useProtectionData` | Polls `/risk/latest`, `/payout/me`, `/activity/:userId` every 5s (pauses when tab is hidden) |
| `PrivateRoute` | Redirects unauthenticated users to `/login` |
| `ProtectedLayout` | Wraps all authenticated pages with `Header` + `BottomNav` |
| `Badge` | Status pill with variants: `live`, `automatic`, `premium`, `payout`, `red` |

### Subscription & Pricing Flow

The `UpgradeView` implements a sequential questionnaire with 5 questions:
1. **Platform** — Swiggy, Zomato, Dunzo, Amazon Flex, etc.
2. **City type** — Metro, Tier-2, Tier-3
3. **Vehicle** — Bicycle, Two-wheeler, Auto, Car
4. **Hours/week** — <20, 20–40, 40–60, 60+
5. **Shift** — Day, Night, Mixed

Each option has a risk multiplier. The final premium = `₹79 (base) × product_of_multipliers`, rounded to the nearest ₹5.

The premium (e.g. ₹145/week) is sent to `POST /api/auth/subscribe` and stored permanently in the User model.

---

## 8. ML Service

The ML service is a standalone **FastAPI application** (Python) that exposes a risk scoring endpoint consumed by the Express backend.

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Returns `{ status, model_loaded, version }` |
| `POST` | `/risk-score` | Accepts features, returns `risk_score` (0.0–1.0) |

### Request Schema

```json
POST /risk-score
{
  "userId": "507f1f77bcf86cd799439011",
  "weather": 2,       // 1=clear, 2=rain, 3=storm
  "traffic": 2,       // 1=low, 2=moderate, 3=heavy
  "pollution": 1,     // 1=low, 2=medium, 3=high
  "history": 42,      // total delivery count
  "isNewUser": false
}

// Response
{ "userId": "...", "risk_score": 0.7823 }
```

### Model

The model is a **scikit-learn GradientBoostingRegressor** trained on the 5 environmental features above. It must be trained and saved before the service can score:

```bash
cd ml-service
python pipeline/train_model.py
```

If no model file is found, the service starts but returns `503` on `/risk-score` until the model is trained.

---

## 9. Trigger Engine

The trigger engine is a **standalone Node.js process** that runs on a cron schedule (default: every 15 minutes). It is completely independent of the Express backend web process and communicates with it only via the internal REST API.

### Evaluation Pipeline (per cron cycle)

```
1. EVALUATE  — For each user in DB:
   ├── Get latest RiskScore from DB
   ├── Guard: risk_score < THRESHOLD (0.5) → SKIP
   ├── Guard: active FraudFlag (open/investigating) → SKIP
   ├── Guard: payout within cooldown window (24h) → SKIP
   └── Guard: idempotency key already exists → SKIP
   → Eligible users queued for dispatch

2. DISPATCH  — For each eligible user:
   └── POST /api/payout/initiate (with x-internal-api-key header)

3. AUDIT LOG — Write immutable trigger event record with:
   cycleId, userId, riskScore, decision, idempotencyKey, payoutId
```

### Configurables (via `trigger-engine/.env`)

| Variable | Default | Description |
|---|---|---|
| `CRON_SCHEDULE` | `*/15 * * * *` | Cron expression for cycle frequency |
| `RISK_PAYOUT_THRESHOLD` | `0.5` | Minimum score to qualify for payout |
| `PAYOUT_COOLDOWN_MS` | `86400000` | Milliseconds between payouts per user (24h) |
| `MONGO_URI` | — | Must match backend MONGO_URI |
| `INTERNAL_API_KEY` | — | Must match backend INTERNAL_API_KEY |
| `BACKEND_URL` | `http://localhost:3000` | Base URL for dispatch calls |

### Mutex Lock
The scheduler uses a mutex (`isRunning` flag) to prevent cycle overlap — if one evaluation cycle takes longer than 15 minutes, the next scheduled tick is skipped rather than creating duplicate processing.

---

## 10. Data Models

### User
```js
{
  name:          String (required),
  email:         String (required, unique),
  phone:         String (required, unique),
  trustScore:    Number (default: 0.8),     // 0.0 – 1.0
  isPremium:     Boolean (default: false),
  tier:          'basic' | 'sentinel',
  role:          'worker' | 'admin',
  weeklyPremium: Number (null),             // INR, from questionnaire
  otp:           String (hashed, transient),
  otpExpiresAt:  Date
}
```

### ActivityLog
```js
{
  userId:              ObjectId → User,
  location:            { lat: Number, lng: Number },
  deliveriesCompleted: Number (default: 0),
  timestamp:           Date (default: now)
}
```

### RiskScore
```js
{
  userId:  ObjectId → User,
  score:   Number (0.0 – 1.0),
  factors: { weather, traffic, pollution, history, ... }
}
// Always queried with .sort({ createdAt: -1 }).limit(1)
```

### FraudFlag
```js
{
  userId: ObjectId → User,
  score:  Number,
  reason: String,
  status: 'open' | 'investigating' | 'resolved' | 'dismissed'
}
```

### Payout
```js
{
  userId:         ObjectId → User,
  amount:         Number (INR),
  status:         'pending' | 'approved' | 'paid' | 'failed',
  triggerType:    'weather_event' | 'manual' | 'demo_auto' | ...,
  idempotencyKey: String (unique, sparse)
}
```

### TokenBlacklist
```js
{
  token:     String,
  expiresAt: Date  // TTL index for automatic cleanup
}
```

---

## 11. Authentication Flow

GigShield uses **OTP-based authentication** (no passwords) with JWT sessions.

```
┌─────────────┐        ┌──────────────┐        ┌──────────────┐
│   Register  │        │  Request OTP │        │  Verify OTP  │
│             │        │              │        │              │
│ POST /register       │ POST /request-otp     │ POST /verify-otp
│ { name,     │        │ { phone }    │        │ { phone, otp }│
│   email,    │        │              │        │              │
│   phone }   │        │ OTP hashed   │        │ JWT returned │
│             │        │ in User doc  │        │ + weeklyPrem │
│ → userId    │        │ (10 min TTL) │        │              │
└─────────────┘        └──────────────┘        └──────────────┘
```

**Rate limiting:**
- Registration: 10 requests / 15 minutes / IP
- OTP request: 5 requests / 10 minutes / IP
- All API endpoints: 120 requests / 60 seconds / IP (global)

**JWT Lifecycle:**
- Expiry: 7 days (configurable via `JWT_EXPIRES_IN`)
- Logout: Token is added to `TokenBlacklist` collection
- Expired token: 401 interceptor in frontend auto-clears localStorage and redirects to `/login`

**Internal Service Auth:**
The trigger engine authenticates via `x-internal-api-key` header for payout dispatch calls, bypassing user JWT entirely and receiving admin-level access.

---

## 12. Investor Demo Console

The demo console at `/demo-console` provides a guided 3-step demonstration of GigShield's autonomous engine without requiring a login.

### Demo Users (seeded deterministically)

| Name | Trust Score | Profile | Expected Outcome |
|---|---|---|---|
| Legit Worker | 0.98 | Consistent 5-hour delivery history | ✅ **Approved** — payout issued |
| High-Risk Worker | 0.85 | Active + in high-risk area | ✅ **Approved** — payout issued |
| Suspicious User | 0.40 | Only 1 delivery in 10 days | 🔵 **Under Review** — insufficient baseline |
| Fraudulent Actor | 0.10 | Delhi→Mumbai in 5 mins (impossible) | 🔴 **Blocked** — fraud flag active |

### Demo Sequence

1. **Reset Environment** — Wipes all demo user data and re-seeds the deterministic state. Accepts up to a few seconds (runs the seed script via `child_process.exec`).

2. **Inject Heavy Rain Risk** — Writes `{ score: 0.95, factors: { weather: 3 } }` to the 4 demo users only (real users are never affected).

3. **Execute Inference** — Calls the real evaluator logic and returns:
   - Live DB state snapshot (before + after)
   - Explainability matrix per user (status, confidence score, reason)
   - Commercial impact metrics (₹ payouts issued, ₹ fraud prevented, anomalies handled)

The console auto-scrolls to the newest log entry and displays live DB node cards that update after each command.

---

## 13. Environment Variables

### Backend (`backend/.env`)

```env
PORT=3000
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/gigshield
JWT_SECRET=your_long_random_secret_here
JWT_EXPIRES_IN=7d
NODE_ENV=development
ML_SERVICE_URL=http://localhost:8000
INTERNAL_API_KEY=your_shared_secret_for_trigger_engine
CORS_ORIGIN=http://localhost:5173
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000/api
```

### Trigger Engine (`trigger-engine/.env`)

```env
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/gigshield
INTERNAL_API_KEY=your_shared_secret_for_trigger_engine
BACKEND_URL=http://localhost:3000
RISK_PAYOUT_THRESHOLD=0.5
PAYOUT_COOLDOWN_MS=86400000
CRON_SCHEDULE=*/15 * * * *
```

### ML Service (`ml-service/.env`)

```env
HOST=0.0.0.0
PORT=8000
```

> ⚠️ **Critical:** `INTERNAL_API_KEY` must be identical in both the backend and trigger engine `.env` files. `MONGO_URI` must also point to the same database across all Node.js services.

---

## 14. Local Development Setup

### Prerequisites

| Tool | Version | Required For |
|---|---|---|
| Node.js | 20+ | Backend, Frontend, Trigger Engine |
| npm | 9+ | Package management |
| Python | 3.10+ | ML Service |
| pip | latest | Python packages |
| MongoDB | 7+ (or Atlas) | Database |

### Step 1 — Clone & install all dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Trigger Engine
cd ../trigger-engine
npm install

# ML Service
cd ../ml-service
pip install -r requirements.txt
```

### Step 2 — Set up environment files

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env and fill in MONGO_URI, JWT_SECRET, INTERNAL_API_KEY

# Frontend
echo "VITE_API_URL=http://localhost:3000/api" > frontend/.env

# Trigger Engine
cp trigger-engine/.env.example trigger-engine/.env  # (if exists, else create manually)
# Fill in MONGO_URI and INTERNAL_API_KEY to match backend
```

### Step 3 — Train the ML model

```bash
cd ml-service
python pipeline/train_model.py
```

> The ML service will start without the model but will return `503` on scoring requests until training is complete.

### Step 4 — Seed the investor demo data (optional)

```bash
cd backend
node seed_investor_demo.js
```

---

## 15. Running the Full Stack

Open **4 separate terminal windows**:

**Terminal 1 — Backend API**
```bash
cd backend
npm run dev        # nodemon, auto-restarts on changes
# or
node server.js     # production mode
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev        # Vite dev server with HMR
```

**Terminal 3 — ML Service**
```bash
cd ml-service
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 4 — Trigger Engine** (optional, for autonomous payout testing)
```bash
cd trigger-engine
node index.js
```

### Service URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |
| ML Service | http://localhost:8000 |
| ML API Docs | http://localhost:8000/docs |
| Demo Console | http://localhost:5173/demo-console |

---

## 16. API Testing

### Backend unit + integration tests

```bash
cd backend
npm test
```

Tests use `mongodb-memory-server` for full isolation — no real database is touched.

### Manual API testing with curl

```bash
# Health check
curl http://localhost:3000/api/health

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phone":"+919000000001"}'

# Request OTP (dev mode returns demo_otp in response)
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919000000001"}'

# Verify OTP
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919000000001","otp":"123456"}'

# Get latest risk score (replace TOKEN and USER_ID)
curl http://localhost:3000/api/risk/latest/USER_ID \
  -H "Authorization: Bearer TOKEN"
```

### ML Service

```bash
# Health
curl http://localhost:8000/health

# Score (if model is trained)
curl -X POST http://localhost:8000/risk-score \
  -H "Content-Type: application/json" \
  -d '{"userId":"123","weather":2,"traffic":3,"pollution":2,"history":15,"isNewUser":false}'
```

---

## 17. Security Design

### Implemented Protections

| Layer | Mechanism |
|---|---|
| **Auth** | OTP-based (no passwords stored), JWT with 7d expiry |
| **Token revocation** | Logout blacklists JWT in MongoDB (`TokenBlacklist`) |
| **Rate limiting** | 5 OTP requests/10min, 10 auth requests/15min, 120 global API requests/min |
| **HTTP headers** | Helmet with strict Content Security Policy |
| **CORS** | Origin-restricted to `CORS_ORIGIN` env var |
| **Fraud guard** | Active fraud flags block all payout initiation |
| **Idempotency** | Duplicate payout trigger suppressed by idempotency key |
| **Role-based access** | `checkRole('admin')` middleware on all admin endpoints |
| **Internal auth** | Trigger engine uses `x-internal-api-key` not JWT |
| **OTP security** | Expiry checked before bcrypt comparison (prevents timing attacks) |
| **Input validation** | ObjectId, numeric ranges, and type checks on all controller inputs |

### Security Notes for Production

- Replace the default `JWT_SECRET` with a cryptographically random 64-character secret
- Set `NODE_ENV=production` to disable OTP dev-mode exposure in API responses
- Lock the ML service `allow_origins` from `"*"` to your backend URL
- Use MongoDB Atlas with IP allowlisting and a dedicated database user
- Set up HTTPS termination via a reverse proxy (Nginx/Caddy) in front of the Express server

---

## 18. INR Localization

The entire platform is localized for the Indian market:

| Area | Implementation |
|---|---|
| **Currency** | `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })` across all pages |
| **Payout amounts** | Displayed in ₹ (e.g. ₹500/day, ₹2,000 total) |
| **Premium calculation** | Base of ₹79/week with risk multipliers, rounded to nearest ₹5 |
| **Platforms** | Swiggy, Zomato, Dunzo/Zepto, Amazon Flex |
| **Cities** | Metro (Delhi, Mumbai, Bengaluru), Tier-2 (Jaipur, Pune), Tier-3 |
| **Phone format** | All demo users use +91 Indian mobile numbers |
| **Locations** | Demo activity logs use Delhi (28.70, 77.10) and Mumbai (19.07, 72.87) coordinates |
| **Compliance** | Profile page notes IRDAI Compliance-Ready status |
| **Time formatting** | `toLocaleTimeString('en-IN')` and `toLocaleDateString('en-IN')` |

---

## License

Private — GigShield AI. All rights reserved © 2026.
