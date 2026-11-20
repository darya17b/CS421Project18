# VCC Standardized Patient File Management System

## Project summary

### One-sentence description of the project

The VCC Standardized Patient File Management System is a secure web application for organizing, searching, updating, and sharing standardized patient scripts and actor information.

### Additional information about the project

The Elson S. Floyd College of Medicine Virtual Clinical Center (VCC) uses simulations in which students interact with actors portraying patients in realistic clinical scenarios. Actors rely on scripts containing symptoms, medical history, emotional context, behavioral guidance, and door notes that prepare students for each encounter.

This project provides a centralized system for managing those scripts and related actor data. It combines a React frontend with a Go REST API, MongoDB document storage, and a SQLite actor database. The application includes script upload and versioning workflows, searchable data, authentication options, role-aware pages, and a local mock mode for frontend development.

## Installation

### Prerequisites

Install the following before starting:

- Git
- Docker Desktop with Docker Compose
- Node.js 24 or newer
- npm 9 or newer

Go 1.25.1 is required only when building or running the backend outside Docker. The normal installation uses the Go toolchain inside the Docker build.

### Add-ons

- **Docker Compose:** Builds and runs the Go backend and MongoDB together.
- **MongoDB:** Stores application documents, scripts, requests, and artifacts.
- **SQLite:** Stores actor information and ships with the included actor database.
- **Go REST API:** Provides backend authentication, document, request, artifact, and actor endpoints.
- **React, Vite, and Tailwind CSS:** Provide the frontend development and production UI.
- **JWT authentication:** Supports authenticated API requests and local login flows.
- **Local mock store:** Allows frontend work without a running backend when `VITE_USE_MOCK=true`.

### Installation Steps

1. Clone the repository and enter it:

   ```bash
   git clone https://github.com/AndrewN4675/VCC-Script-Management.git
   cd VCC-Script-Management
   ```

2. Start MongoDB and the backend from the repository root:

   ```bash
   docker compose -f Docker/docker-compose.yml up --build mongodb backend
   ```

   The backend refuses to start without `JWT_SECRET`. Copy `.env.example` to `.env` in the repository root and set `JWT_SECRET` (the file explains how to generate one); the other settings have development defaults. The backend is available at `http://localhost:8080`. The container initializes MongoDB and includes the SQLite actor database shipped in the repository; there is no separate seed command.

3. In a second terminal, install and start the active frontend:

   ```bash
   cd code/Frontend
   npm install
   ```

   Copy the example environment file to `.env.local`:

   ```bash
   # macOS/Linux
   cp .env.example .env.local

   # Windows PowerShell
   Copy-Item .env.example .env.local
   ```

   Start the Vite development server:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173`.

   The Vite development server proxies `/api` requests to `http://localhost:8080`.

Run the Docker services and Vite frontend in separate terminals. Stop each process with `Ctrl+C` in its respective terminal.

#### Authentication and local development options

- Login uses email and password against the backend. Okta is disabled (see "Okta (disabled)" below).
- To run the frontend without the backend, set `VITE_USE_MOCK=true` in `.env.local`, then run `npm run dev`.
- The active frontend is `code/Frontend`. The root-level `Frontend` directory is legacy and should not be used for development.

## Functionality

After installation, the main workflow is:

1. Sign in with your email and password.
2. Use the dashboard to open the script library and search available standardized patient scripts.
3. Open a script to review its details, versions, medications, vitals, and related artifacts.
4. Create or submit a script request, then track its status from the request pages.
5. Authorized users can create, clone, update, publish, restore, and delete scripts.
6. Use the actor database to search for actors and manage actor records.

The frontend also supports mock mode, PDF generation, printing, and local development workflows backed by browser local storage.

Useful frontend commands, run from `code/Frontend`, include:

```bash
npm run build
npm run lint
npm run preview
```

## Okta (disabled)

Okta sign-in is turned off and removed from the active code. The Okta pieces are kept for reference:

- `code/Frontend/src/oktaConfig.js` is unused and left in place.
- The Okta variables in `Docker/docker-compose.yml` and `code/Frontend/.env.example` are commented out.
- The `@okta/*` npm packages and the Okta Go dependency are still installed.

The full working Okta version is at the git tag `okta-reference`. To restore it:

1. Inspect it with `git show okta-reference:code/Frontend/src/App.jsx` (or check out the tag in a separate worktree: `git worktree add ../vcc-okta okta-reference`).
2. Restore the Okta changes in `App.jsx`, `pages/Login.jsx`, `pages/Layout.jsx`, `components/RequireAuth.jsx` and `api/client.js`, for example `git checkout okta-reference -- <file>` for each, then reapply any auth changes made since.
3. Uncomment the Okta variables in `code/Frontend/.env.example` and copy them into `.env.local`.

## Known Problems

The frontend currently does not support all backend functionality, including some actor database features and permission workflows.

JWT authentication has been implemented but is still undergoing testing and validation.

Some UI elements require additional refinement and usability improvements.

These issues are planned to be addressed in upcoming sprints.

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Additional Documentation

- [Frontend documentation](code/Frontend/README.md)
- [Sprint 1 report](Sprints/Sprint_1/Sprint_Report/Sprint1_Report.md)
- [Sprint 1 demo video](Sprints/Sprint%201/Video/Sprint1_Demo.md)

## License

No license file has been added to the repository yet. Add a `LICENSE.txt` file with the project’s approved license before distributing the project.
