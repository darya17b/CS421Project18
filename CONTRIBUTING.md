# Contributing to VCC Script Management

Thank you for contributing to the VCC Standardized Patient File Management System. This guide describes the local setup, development workflow, validation checks, and pull request expectations for this repository.

## Before you start

Please check the existing [README](README.md) and open issues before starting work. For a new feature or behavior change, create or update an issue using the repository's user-story format:

```text
As a [role]
I need [function]
So that [benefit]
```

Include relevant details, assumptions, and acceptance criteria. For small documentation, maintenance, or clearly scoped bug fixes, an issue may not be necessary, but explain the change clearly in the pull request.

Do not include sensitive information or secrets in issues, commits, screenshots, fixtures, or pull requests.

## Development environment

Install:

- Git
- Docker Desktop with Docker Compose
- Node.js 24 or newer
- npm 9 or newer
- Go 1.25.1 when building or running the backend outside Docker

The active frontend is in [`code/Frontend`](code/Frontend). Do not use the legacy root-level `Frontend` directory for new development.

### Clone and configure

```bash
git clone https://github.com/AndrewN4675/VCC-Script-Management.git
cd VCC-Script-Management
```

Install frontend dependencies and create a local environment file:

```powershell
cd code\Frontend
npm install
Copy-Item .env.example .env.local
```

`.env.local` is for local settings and must not be committed. See [`code/Frontend/README.md`](code/Frontend/README.md) for the available frontend variables and authentication modes.

### Run the full stack

Run the backend and frontend in separate terminals. In the first terminal, from the repository root:

```powershell
docker compose -f Docker/docker-compose.yml up --build mongodb backend
```

In a second terminal:

```powershell
cd code\Frontend
npm run dev
```

The application is available at:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`

Stop development processes with `Ctrl+C` in their respective terminals.

### Frontend-only development

The frontend can run without the backend by setting `VITE_USE_MOCK=true` in `.env.local`:

```powershell
cd code\Frontend
npm run dev
```

Mock data is stored in browser local storage. Use API mode when a change depends on backend endpoints, authentication, persistence, or database behavior.

## Repository layout

```text
code/
  Frontend/                 Active React/Vite application
  backend/VCCwebsite/       Go API and backend services
Docker/                     Dockerfile and Docker Compose configuration
tests/                      Shell-based API test scripts
.github/
  ISSUE_TEMPLATE/           Issue templates
  workflows/                Continuous integration workflows
```

Keep changes in the component or service they affect. Update related documentation when commands, configuration, routes, environment variables, or user-facing behavior change.

## Making changes

1. Create a focused branch from the current `main` branch.

   ```powershell
   git checkout main
   git pull origin main
   git checkout -b feature/short-description
   ```

   Use a descriptive branch name such as `feature/script-search`, `fix/actor-validation`, or `docs/local-setup`.

2. Make the smallest complete change that addresses the issue.

3. Follow the existing patterns:
   - Use React components and utilities already present in `code/Frontend/src`.
   - Keep API-related frontend changes in the API client or store layers where appropriate.
   - Preserve the mock store when adding frontend behavior that can be used without the backend.
   - Keep backend changes compatible with the existing MongoDB and SQLite configuration.
   - Do not commit generated build output, local environment files, database credentials, or personal data.

4. Add or update tests when behavior changes. Include acceptance-criteria coverage for user-facing work.

5. Run the relevant validation commands before opening a pull request.

## Validation commands

### Frontend

Run these commands from `code/Frontend`:

```powershell
npm run lint
npm run build
```

`npm run lint` currently reports known issues in the existing codebase, and CI permits that step to continue while those issues are addressed. New or modified code should not add avoidable lint errors.

### Backend

Run these commands from `code/backend/VCCwebsite`:

```powershell
go build ./...
go vet ./...
```

The backend build uses CGO for SQLite-related dependencies. The normal Docker workflow supplies the required Linux build environment.

### API scripts

The repository includes shell-based checks in [`tests`](tests). Review each script before running it because API tests may require a running backend, configured authentication, or local services.

### Docker

When changing the Docker image or Compose configuration, validate the backend image from the repository root:

```powershell
docker compose -f Docker/docker-compose.yml config
docker compose -f Docker/docker-compose.yml build backend
```

Do not add a second root-level Dockerfile. The canonical backend image definition is [`Docker/Dockerfile`](Docker/Dockerfile), and Compose references it explicitly.

## Commits and pull requests

Keep commits focused and use a concise imperative subject, for example:

```text
Fix script search filtering
Document mock-mode setup
Update backend dependency
```

Avoid mixing unrelated refactors with a feature or bug fix. If a change has multiple logical parts, separate them into coherent commits where practical.

Before opening a pull request:

- Rebase or update your branch from `main` if needed.
- Describe what changed and why.
- Link the related issue or user story.
- Include the validation commands you ran and their results.
- Call out known limitations, migration requirements, or follow-up work.
- Include screenshots or short recordings for meaningful UI changes, using only synthetic or redacted data.
- Confirm that no secrets, local environment files, generated artifacts, or sensitive records are included.

Pull requests should be narrow enough to review and should update directly related documentation. Reviewers may request changes to improve correctness, accessibility, security, maintainability, or consistency with the existing application.

## Security and sensitive data

This application handles script and actor-management workflows. Treat all real patient, actor, student, and organizational data as sensitive.

- Never commit secrets or real personal/medical information.
- Do not paste confidential data into GitHub issues or pull requests.
- Report suspected vulnerabilities privately to the project maintainers rather than opening a public issue with exploit details.
- Avoid weakening authentication, authorization, input validation, or database protections to make local development easier.
- Use local mock data or clearly synthetic fixtures for tests and screenshots.

## Documentation

When a contribution changes setup or usage, update the relevant documentation:

- [`README.md`](README.md) for repository-wide installation and workflows.
- [`code/Frontend/README.md`](code/Frontend/README.md) for frontend-specific routes, environment variables, and development details.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) for contribution-process changes.
