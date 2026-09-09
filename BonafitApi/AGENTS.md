# BonafitApi — agent notes

FastAPI + SQLAlchemy 2 + PostgreSQL 16. JSON is camelCase and must match Angular DTOs in BonafitDesk.

Composition uses [Dependency Injector](https://python-dependency-injector.ets-labs.org/examples/fastapi-sqlalchemy.html), not FastAPI `Depends` as the application container. Routers inject services with `@inject` and `Depends(Provide[Container.…])`. FastAPI still binds path/query/header parameters.

## Layout

```
app/main.py          # create_app(), CORS, routers, /health
app/containers.py    # DeclarativeContainer (db, security, emailer, services)
app/wiring.py        # Annotated Provide aliases for routers
app/config.py        # pydantic-settings from .env
app/database.py      # Database (engine + session that commits on success)
app/identity.py      # CurrentUser, actor_of
app/models.py        # SQLAlchemy tables (snake_case columns, UUID string PKs)
app/schemas.py       # Pydantic request/response (camelCase field names)
app/serializers.py   # ORM row → schema
app/services/        # auth, clients, catalog, calendar, forms
app/errors.py        # NotFoundError, BusinessError, UnauthorizedError, ForbiddenError
app/booking.py       # slot/cutoff/bono rules (keep in sync with Desk core/booking.ts)
app/security.py      # bcrypt + JWT
app/emailer.py       # optional SMTP for temporary passwords
app/routers/         # thin HTTP adapters
scripts/create_db.py # create tables from models
scripts/seed.py      # demo data if trainer-1 is missing; --force wipes after RESET
scripts/create_user.py
tests/               # pytest (provider override, no DB required for container tests)
```

Routers mount at the server root (`/auth/login`, `/clients`, …). OpenAPI: `http://localhost:8080/docs`. Desk `apiUrl` is the origin (`http://localhost:8080`).

## Run

Postgres must be on `localhost:5432`. Once:

```bash
docker compose up -d
# or: psql -U postgres -f setup_postgres.sql
cp .env.example .env
uv sync
uv run create-db
uv run seed                 # optional demo data (no-op if already seeded)
uv run seed --force         # wipe all rows; type RESET to confirm, then reseed
uv run create-user EMAIL [--role admin|client] [--name "Display Name"]
uv run uvicorn app.main:app --reload --port 8080
uv run pytest
```

This is a uv project (`pyproject.toml` + `uv.lock`). Hatchling installs `app/` and `scripts/`. Do not add a `requirements.txt`. Add or bump deps with `uv add`; commit `uv.lock` with `pyproject.toml`.

The API does not create tables or seed on startup. `create-user` generates a temporary password and prints it (`must_change_password` is true). Demo seed password is `BOOTSTRAP_PASSWORD` (default `ChangeMe123!`).

| Email | Role |
| --- | --- |
| lucia@bonafit.com | admin |
| sam.ortega@bonafit.com | admin |
| marina.lopez@example.com | client |
| pablo.nieto@example.com | client |
| iris.vega@example.com | client |

`POST /auth/login` body: `{ "email", "password" }`. Other routes: `Authorization: Bearer <token>`.

CORS allows Desk on `localhost` and `127.0.0.1` ports 4200 and 4201. Browsers treat those as different origins. Override with `CORS_ORIGINS`.

Prefer adding tests next to the module you change rather than leaving booking/auth unverified. Override container providers in HTTP tests instead of monkey-patching.

## Conventions

- **ORM** uses snake_case (`first_name`). **JSON** uses camelCase (`firstName`) via `camel_config()` on schemas and explicit mapping in `serializers.py`.
- New endpoints: schema in `schemas.py`, serializer in `serializers.py`, service method, thin route. Do not return ORM objects.
- Errors: `NotFoundError(resource, id)` → 404 `{ resource, id, code }`. `BusinessError(code)` → 409 (or given status) `{ code }`. `UnauthorizedError` → 401 `{ detail }`. `ForbiddenError` → 403 `{ detail }`. `RequestValidationError` → 422 `{ detail }` and a `bonafit` WARNING with the failed fields (passwords redacted). Reuse `BOOKING_ERROR_CODES` instead of new strings for booking/auth.
- Auth: `AuthService.require_not_must_change` for logged-in work; `require_admin` for trainer-only writes. Clients must not see other clients’ notes (`hide_notes`).
- IDs are UUID strings. Seed rows keep stable ids (`trainer-1`, `client-1`, …).
- Datetimes: aware UTC in the DB; serialize with `to_utc_iso`. Interpret booking cutoffs in `Europe/Madrid`.
- `Database.session()` commits if the `with` block returns. Raise to roll back. Do not commit inside serializers.

## When changing the contract

Update BonafitDesk in the same change: `models/*.dto.ts`, `core/*-api.ts`, `*-api.service.ts`, and `API_PATHS` if the path is new.

Masaje may have bonos (including `sessionCount: 1`). Admin walk-in without a voucher is allowed only when `allowsSingleSession` and there is no usable client bono.
