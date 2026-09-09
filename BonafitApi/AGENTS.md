# BonafitApi — agent notes

FastAPI + SQLAlchemy 2 + PostgreSQL 16. JSON is camelCase and must match Angular DTOs in BonafitDesk.

## Layout

```
app/main.py          # FastAPI app, CORS, /api routers, /health
app/config.py        # pydantic-settings from .env
app/database.py      # engine, SessionLocal, get_db (commit on success)
app/models.py        # SQLAlchemy tables (snake_case columns, UUID string PKs)
app/schemas.py       # Pydantic request/response (camelCase field names)
app/serializers.py   # ORM row → schema
app/deps.py          # auth dependencies
app/errors.py        # NotFoundError, BusinessError, booking/auth codes
app/booking.py       # slot/cutoff/bono rules (keep in sync with Desk core/booking.ts)
app/security.py      # bcrypt + JWT
app/seed.py          # demo data if trainer-1 is missing
app/emailer.py       # optional SMTP for temporary passwords
app/routers/         # auth, clients, services, calendar, forms
```

Routers mount at `/api`. OpenAPI: `http://localhost:8080/docs`.

## Run

Postgres must be on `localhost:5432`. Once:

```bash
docker compose up -d
# or: psql -U postgres -f setup_postgres.sql
cp .env.example .env
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8080
```

Startup runs `create_all` and `seed_if_empty`. Seed password is `BOOTSTRAP_PASSWORD` (default `ChangeMe123!`).

| Email | Role |
| --- | --- |
| alex.martin@bonafit.local | admin |
| sam.ortega@bonafit.local | admin |
| marina.lopez@example.com | client |
| pablo.nieto@example.com | client |
| iris.vega@example.com | client |

`POST /api/auth/login` body: `{ "email", "password" }`. Other routes: `Authorization: Bearer <token>`.

There is no pytest suite yet. Prefer adding tests next to the module you change rather than leaving booking/auth unverified.

## Conventions

- **ORM** uses snake_case (`first_name`). **JSON** uses camelCase (`firstName`) via `camel_config()` on schemas and explicit mapping in `serializers.py`.
- New endpoints: schema in `schemas.py`, serializer in `serializers.py`, route in the matching router. Do not return ORM objects.
- Errors: `NotFoundError(resource, id)` → 404 `{ resource, id, code }`. `BusinessError(code)` → 409 (or given status) `{ code }`. Reuse `BOOKING_ERROR_CODES` instead of new strings for booking/auth.
- Auth: `require_not_must_change` for logged-in work; `require_admin` for trainer-only writes. Clients must not see other clients’ notes (`hide_notes`).
- IDs are UUID strings. Seed rows keep stable ids (`trainer-1`, `client-1`, …) so Desk mocks can stay aligned.
- Datetimes: aware UTC in the DB; serialize with `to_utc_iso`. Interpret booking cutoffs in `Europe/Madrid`.
- `get_db` commits the request if the handler returns. Raise to roll back. Do not commit inside serializers.

## When changing the contract

Update BonafitDesk in the same change: `models/*.dto.ts`, `core/*-api.ts`, both `*-mock.service.ts` and `*-http.service.ts`, and `API_PATHS` if the path is new.

Login is **not** aligned with Desk yet: the API expects email/password; Desk’s HTTP auth client still posts `{ userId }` from the account picker. Do not “fix” that as a drive-by; it is an intentional remaining gap while `useMockApi` is the default.
