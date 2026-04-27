# VCC Frontend Documentation

Frontend for the VCC Standardized Patient File Management System.

## Tech Stack

- React 19 + Vite 7
- React Router
- Tailwind CSS 4
- Okta (optional, env-driven)
- Local mock store or backend API store

## Frontend Location

- Active app: `code/Frontend`
- Legacy/unused folder in repo root: `Frontend` (do not use for development)

## Prerequisites

- Node.js 20+ (recommended; Docker image also uses Node 20)
- npm 9+
- Backend running at `http://localhost:8080` for API mode

## Quick Start

1. Install dependencies:

```bash
cd code/Frontend
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

3. Start dev server:

```bash
npm run dev
```

4. Open:

- Frontend: `http://localhost:5173`
- Backend (expected): `http://localhost:8080`

## Full-Stack Dev (Recommended)

From repo root:

```powershell
.\start-dev.ps1
```

This starts:

- `docker compose up --build mongodb backend`
- `npm run dev` in `code/Frontend`

Use `.\start-dev.ps1 -NoBuild` for faster restarts.

## NPM Scripts

- `npm run dev`: start Vite dev server
- `npm run build`: production build to `dist/`
- `npm run preview`: preview production build locally
- `npm run lint`: run ESLint

## Environment Variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_URL` | No | `/api` | Base URL for frontend API client |
| `VITE_USE_MOCK` | No | `false` | When `true`, use localStorage-backed mock store instead of backend APIs |
| `VITE_OKTA_ISSUER` | For Okta mode | empty | Okta issuer URL |
| `VITE_OKTA_CLIENT_ID` | For Okta mode | empty | Okta app client ID |
| `VITE_OKTA_REDIRECT_URI` | No | `<origin><VITE_OKTA_CALLBACK_PATH>` | OAuth callback URI |
| `VITE_OKTA_CALLBACK_PATH` | No | `/login/callback` | Callback path used for fallback redirect URI |
| `VITE_OKTA_SCOPES` | No | `openid profile email` | Requested scopes |
| `VITE_OKTA_ADMIN_GROUPS` | No | includes `BAM.PROD.ESFCOM.ADMIN` | Group names treated as admin |

## Authentication Modes

### Okta mode

Enabled automatically when both `VITE_OKTA_ISSUER` and `VITE_OKTA_CLIENT_ID` are set.

- Uses `@okta/okta-react` and `@okta/okta-auth-js`
- Syncs `token`, `user`, and `role` into localStorage after login
- Admin role is derived from group claims in `VITE_OKTA_ADMIN_GROUPS`

### Legacy/local mode

Used when Okta env vars are not configured.

- Login page supports:
  - Email/password login via `/api/auth/login`
  - `Skip Login` (guest local session)
  - `Admin` quick local session (`role=admin`)

## Routing

All routes are mounted in `src/App.jsx` under `Layout`.

| Route | Auth | Notes |
| --- | --- | --- |
| `/login` | Public | Login page |
| `/login/callback` | Okta only | OAuth callback |
| `/` | Required | Landing page |
| `/dashboard` | Required | Mirrors landing actions |
| `/forms-search` | Required | Script library list/search |
| `/forms/:id` | Required | Script detail/editor |
| `/requests` | Required | Request queue and status management |
| `/requests/forms/:id` | Required | Request-focused script detail view |
| `/create-script` | Required | New script request form |
| `/request-new` | Admin | Admin create/publish flow |
| `/clone-new` | Admin | Admin clone/create flow |
| `/actor-database` | Required | Actor search/create/delete UI |
| `/sp-search` | Required | Placeholder page |
| `/forms-reviewer` | Required | Placeholder page |

## Data Layer

`StoreProvider` (`src/store/index.js`) selects one of two stores:

- API mode (default): `ApiStoreProvider`
  - Fetches documents and script requests from backend
  - Supports create/update/delete for docs and requests
- Mock mode (`VITE_USE_MOCK=true`): `MockStoreProvider`
  - Persists data in localStorage (`mockScripts`, `mockRequests`)

Main API client: `src/api/client.js`

- Uses `VITE_API_URL` base (default `/api`)
- Sends bearer token from localStorage when present
- Uses `credentials: "include"`

## Backend Endpoints Used by Frontend

- `GET /api/health`
- Auth: `/api/auth/login`
- Documents: `/api/document`, `/api/document/versions`, `/api/document/version`, `/api/document/restore`, `/api/document/medications`, `/api/document/vitals`
- Artifacts: `/api/artifact` (fallback `/api/artifacts` in some flows)
- Script requests: `/api/script-request`
- Actor DB page: `/api/actors`

## Folder Map

```
code/Frontend
  src/
    api/           # HTTP client
    components/    # Reusable UI pieces (modal, auth guard, toast, date picker)
    pages/         # Route-level screens
    store/         # API and mock store providers
    utils/         # Script normalization, PDF generation, print/artifact helpers
```

## Build and Static Output

```bash
npm run build
```

- Generates static files in `dist/`
- `Dockerfile.frontend` builds assets and copies `dist/` for containerized serving

## Known Frontend Notes

- `SpSearch` and `FormsReviewer` are placeholders.
- Some features rely on localStorage role/session values (`token`, `user`, `role`).
- Root `docker-compose.yml` currently starts backend services only; frontend runs via Vite dev server in local development.
