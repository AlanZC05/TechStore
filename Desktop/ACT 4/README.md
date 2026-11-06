# TechStore MX — Multi-Currency Hardware Store & Catalog Platform

Complete Node.js (Express) + React (Vite + Tailwind CSS) microservices monorepo for **TechStore MX** (Evidence 3 & Evidence 4 Deliverable).

TechStore MX provides a dual-currency (`MXN` / `USD`) computer hardware catalog backed by an authentication microservice (`HS256` JWTs + `HttpOnly` refresh token rotation) and a foreign-exchange microservice integrated with **Banco de México (Banxico) SIE API (`Series SF43718`)**.

---

## 1. Project Purpose & Architecture Overview

The monorepo uses an **in-memory DAO/Repository layer** seeded automatically at startup (mirroring the relational SQL schema in [`database/schema.sql`](database/schema.sql)) so peer evaluators can clone, install, test, and run all 4 services with a single command—**no external PostgreSQL installation required**.

| Service / Package | Path | Port | Responsibility |
| :--- | :--- | :---: | :--- |
| **Auth Service** | `services/auth-service` | `4001` | Authenticates users (`bcrypt` cost 12), issues `HS256` JWT access tokens (`15m` TTL), and manages `HttpOnly; SameSite=Strict` refresh token cookies. |
| **FX Microservice (Evidence 3)** | `services/fx-microservice` | `4002` | Caches and converts `USD/MXN` rates, integrates with **Banxico SIE API (`SF43718`)** with a `4000ms` `AbortController` timeout, smart peer-evaluation fallback, and JWT + `admin` RBAC protection. |
| **Main Backend** | `services/main-backend` | `4000` | Serves the 6 hardware catalog products (`GPUs`, `CPUs`, `Monitors`, `Mechanical Keyboards`) and consumes `fx-microservice` (`:4002`) to attach live `priceUsd` and `exchangeRateUsed`. |
| **React Frontend** | `frontend` | `5173` | React + Vite + Tailwind CSS SPA with one-click Admin/Customer login, live in-memory JWT payload decoder, interactive currency calculator, and Admin Banxico sync tester. |

---

## 2. Prerequisites & 3-Step Quick Start

### Prerequisites
- **Node.js** `>= 18.x` (tested with Node v18, v20, v22, v24)
- **npm** `>= 9.x`

### 3-Step Quick Start
```bash
# 1. Clone the repository
git clone <repository-url>
cd techstore-mx

# 2. Install all workspace dependencies (root + all 3 backend services + React frontend)
npm install

# 3. Automatically initialize .env from .env.example (if missing) and start all 4 services concurrently
npm start
```

Once started:
- **Frontend UI (React + Vite)**: `http://localhost:5173`
- **Main Catalog Backend**: `http://localhost:4000/api/v1/products`
- **Auth Microservice**: `http://localhost:4001/api/v1/auth`
- **FX Microservice (Evidence 3)**: `http://localhost:4002/api/v1/rates`

---

## 3. Seeded Demo Accounts

Seeded automatically at startup in `services/auth-service/src/repositories/userRepository.js` using `bcrypt` cost factor `12`:

| Role | Email | Password | User ID (`sub`) | `POST /api/v1/rates/refresh` Access |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin.demo@techstore.test` | `AdminPass123!` | `usr_9f8a7d6c5b4e` | Allowed (`201 Created`) |
| **Customer** | `customer.demo@techstore.test` | `CustomerPass123!` | `usr_1a2b3c4d5e6f` | Denied (`403 Forbidden`) |

---

## 4. Environment Variables

`.env` files are excluded from Git via `.gitignore`. Each service includes a `.env.example` template, and `npm start` (or `npm run setup`) automatically copies `.env.example` to `.env` if not present. Furthermore, each service safely falls back to `.env.example` defaults in development/test so a fresh checkout never crashes.

| Variable | Default / Example Value | Used By | Description |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | `techstore_mx_super_secret_hs256_signing_key_2026_e3_e4` | `:4001`, `:4002` | Shared HMAC-SHA256 (`HS256`) signing and verification secret |
| `JWT_ISSUER` | `techstore-auth-service` | `:4001`, `:4002` | Expected `iss` claim in access tokens |
| `JWT_AUDIENCE` | `techstore-main-backend,techstore-fx-microservice` | `:4001`, `:4002` | Permitted `aud` claims in access tokens |
| `JWT_EXPIRES_IN_SECONDS` | `900` | `:4001` | Access token TTL in seconds (15 minutes) |
| `BCRYPT_SALT_ROUNDS` | `12` | `:4001` | Cost factor for `bcrypt` password hashing |
| `BANXICO_API_TOKEN` | `demo_token_or_real_token` | `:4002` | `Bmx-Token` header for Banxico SIE (`SF43718`). Uses smart fallback if set to `demo_token_or_real_token` |
| `BANXICO_SERIES_ID` | `SF43718` | `:4002` | Banxico USD/MXN FIX series identifier |
| `BANXICO_TIMEOUT_MS` | `4000` | `:4002` | `AbortController` timeout (ms) for Banxico requests |
| `FALLBACK_USD_MXN_RATE` | `19.854` | `:4002`, `:4000` | Seeded & fallback `USD/MXN` exchange rate |
| `AUTH_SERVICE_PORT` | `4001` | `:4001` | Port for `services/auth-service` |
| `FX_SERVICE_PORT` | `4002` | `:4002` | Port for `services/fx-microservice` |
| `MAIN_BACKEND_PORT` | `4000` | `:4000` | Port for `services/main-backend` |
| `CORS_ORIGIN` | `http://localhost:5173` | `:4000`–`:4002` | Allowed frontend origin (`credentials: true`) |

---

## 5. Complete API Endpoints Reference

### A. `services/auth-service` (`http://localhost:4001`)

| Method | Endpoint | Auth | Request Body / Params | Status Codes | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | `{ "email": "...", "password": "..." }` | `200`, `400`, `401`, `429` | Validates input with `zod`, checks password with `bcrypt.compare`, sets `HttpOnly` `refreshToken` cookie, returns `{ accessToken, expiresIn: 900, user }`. |
| `POST` | `/api/v1/auth/refresh` | Cookie | `Cookie: refreshToken=<uuid>` | `200`, `401` | Rotates the `refreshToken` cookie and returns a new 15-minute `accessToken`. |
| `POST` | `/api/v1/auth/logout` | Cookie | `Cookie: refreshToken=<uuid>` | `204` | Revokes the refresh token in store and clears the `refreshToken` cookie. |
| `GET` | `/api/v1/auth/me` | Bearer JWT | `Authorization: Bearer <JWT>` | `200`, `401` | Verifies `HS256` JWT and returns `{ id, email, role }`. |

### B. `services/fx-microservice` (`http://localhost:4002` — Evidence 3 Deliverable)

| Method | Endpoint | Auth | Request Body / Query | Status Codes | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/rates/current` | Public | `?base=USD&target=MXN` | `200`, `400` | Returns `{ pair: "USD/MXN", rate: 19.854, updatedAt, stale }`. Returns `400` on unsupported currencies (e.g. `EUR`). |
| `POST` | `/api/v1/rates/convert` | Public | `{ "amount": 1500, "from": "MXN", "to": "USD" }` | `200`, `400` | Validates positive `amount > 0` and ISO codes (`MXN`, `USD`). Returns `{ originalAmount, convertedAmount, rateUsed, from, to }`. |
| `POST` | `/api/v1/rates/refresh` | **Bearer JWT (`admin`)** | `{ "currency": "USD" }` (Optional `?simulateDown=true`) | `201`, `400`, `401`, `403`, `502` | Requires valid `HS256` JWT with `role === "admin"`. Syncs with Banxico SIE `SF43718` (`4000ms` timeout) or simulates `502 Bad Gateway` when `?simulateDown=true`. |

### C. `services/main-backend` (`http://localhost:4000`)

| Method | Endpoint | Auth | Request Body / Params | Status Codes | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/products` | Public | None | `200` | Returns 6 hardware products with `priceMxn`, `priceUsd`, and `exchangeRateUsed` fetched from `:4002/api/v1/rates/current`. |

---

## 6. Running Automated Integration Tests & REST Client Requests

### Automated Integration Test Suite (Jest + Supertest)
Run all 9 Evidence 3 & Evidence 4 integration test cases with a single command:

```bash
npm test
```

This executes [`tests/auth-and-fx.integration.test.js`](tests/auth-and-fx.integration.test.js), verifying:
1. `POST /api/v1/auth/login` (valid credentials) → `200 OK` + `HS256` JWT + `HttpOnly` `refreshToken` cookie
2. `POST /api/v1/auth/login` (wrong password) → `401 Unauthorized` (`{ "error": "Invalid credentials" }`)
3. `GET /api/v1/rates/current` → `200 OK` (`pair: "USD/MXN"`, `rate: 19.854`, `stale: false`)
4. `POST /api/v1/rates/convert` (negative amount `-100` & invalid currency) → `400 Bad Request` (`ValidationError`)
5. `POST /api/v1/rates/refresh` (missing token) → `401 Unauthorized`
6. `POST /api/v1/rates/refresh` (tampered JWT signature) → `401 Unauthorized`
7. `POST /api/v1/rates/refresh` (valid `customer` role JWT) → `403 Forbidden`
8. `POST /api/v1/rates/refresh` (valid `admin` role JWT) → `201 Created` (`source: "Banxico-SF43718"`)
9. `POST /api/v1/rates/refresh?simulateDown=true` (upstream Banxico failure fallback) → `502 Bad Gateway`

### Interactive REST Client Collection
Open [`tests/e3-e4-auth-flow.http`](tests/e3-e4-auth-flow.http) in VS Code with the **REST Client** extension (`humao.rest-client`) while `npm start` is running, and click **"Send Request"** above each step to test Login, Token Decode, Public Conversion, Input Validation (`400`), Missing/Tampered Token (`401`), Customer RBAC (`403`), Admin Refresh (`201`), and Upstream Failure (`502`).

---

## 7. Technical Documentation (`docs/`)

- [`docs/auth-report.md`](docs/auth-report.md): Authentication, `bcrypt` cost-12 hashing, `HttpOnly` cookie rotation, and RBAC matrix.
- [`docs/case-study.md`](docs/case-study.md): Activity 3 Case Study on Banxico SIE API integration, timeouts, caching resilience, and OWASP API Security Top 10 controls.
- [`docs/jwt-guide.md`](docs/jwt-guide.md): Activity 4 Guide on `HS256` JWT structure, claim validation, algorithm confusion prevention, and client storage security.

