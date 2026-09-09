# Bonafit API

FastAPI + PostgreSQL for BonafitDesk. JSON fields are camelCase and match the Angular DTOs.

## Run

PostgreSQL 16 must be reachable at `localhost:5432`. Create the app user and database once:

```bash
psql -U postgres -f setup_postgres.sql
```

If the `bonafit` role already exists, skip that file and set `DATABASE_URL` in `.env` to the password you actually use.

```bash
cp .env.example .env
uv sync
uv run create-db
uv run seed
uv run seed --force   # type RESET to wipe all rows and reseed
uv run uvicorn app.main:app --reload --port 8080
```

Create a login without the demo seed:

```bash
uv run create-user you@example.com --role admin --name "Your Name"
```

That prints a generated temporary password. Optional: `docker compose up -d` starts a Postgres 16 container with user/db `bonafit` if Docker is installed.

API: `http://localhost:8080`  
Docs: `http://localhost:8080/docs`

CORS allows `http://localhost:4200` and `http://127.0.0.1:4200` (and port 4201). Set `CORS_ORIGINS` if Desk is served from another origin.

Seed login password: `ChangeMe123!` (`BOOTSTRAP_PASSWORD`)

| Email | Role |
| --- | --- |
| lucia@bonafit.com | admin |
| sam.ortega@bonafit.com | admin |
| marina.lopez@example.com | client |
| pablo.nieto@example.com | client |
| iris.vega@example.com | client |

`POST /auth/login` body: `{ "email", "password" }`. Send `Authorization: Bearer <token>` on the other routes.

