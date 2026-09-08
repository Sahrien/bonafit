# Bonafit API

FastAPI + PostgreSQL for BonafitDesk. JSON fields are camelCase and match the Angular DTOs under `/api`.

## Run

PostgreSQL 16 must be reachable at `localhost:5432`. Create the app user and database once:

```bash
psql -U postgres -f setup_postgres.sql
```

If the `bonafit` role already exists, skip that file and set `DATABASE_URL` in `.env` to the password you actually use.

```bash
copy .env.example .env
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

Optional: `docker compose up -d` starts a Postgres 16 container with user/db `bonafit` if Docker is installed.

API: `http://localhost:8080/api`  
Docs: `http://localhost:8080/docs`

On startup the API creates tables and seeds demo data if `trainer-1` is missing.

Seed login password: `ChangeMe123!` (`BOOTSTRAP_PASSWORD`)

| Email | Role |
| --- | --- |
| alex.martin@bonafit.local | admin |
| sam.ortega@bonafit.local | admin |
| marina.lopez@example.com | client |
| pablo.nieto@example.com | client |
| iris.vega@example.com | client |

`POST /api/auth/login` body: `{ "email", "password" }`. Send `Authorization: Bearer <token>` on the other routes.

Angular still uses `environment.useMockApi: true`. Point it at this API with `useMockApi: false` when you wire the interceptor.
