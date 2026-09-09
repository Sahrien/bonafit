# Bonafit — agent notes

Three independent apps for a personal-training studio. There is no npm/pnpm workspace and no shared Python package. Work in the package that owns the change; read that package’s `AGENTS.md` before editing.

| Package | Role | Stack |
| --- | --- | --- |
| [BonafitDesk](BonafitDesk/AGENTS.md) | Authenticated product: admin studio + client portal | Angular 19 |
| [BonafitApi](BonafitApi/AGENTS.md) | JSON API + PostgreSQL for Desk | FastAPI |
| [Webonafit](Webonafit/AGENTS.md) | Public marketing site | Angular 19 |

`docs/TARIFA.ods` is commercial pricing reference, not runtime config.

## Which package

- Admin calendar, clients, services/bonos, forms, or client portal → **BonafitDesk**, and **BonafitApi** if the contract or persistence changes.
- Public landing, brand, or contact page → **Webonafit** only. Do not import Desk `bona-*` components or the API.
- Database, auth tokens, booking rules on the server, SMTP → **BonafitApi**.

Keep Desk and API DTO/JSON shapes in lockstep (camelCase). Booking rules exist in both `BonafitDesk/src/app/core/booking.ts` and `BonafitApi/app/booking.py`; change them together.

## Shared domain

- Roles: `admin` (trainers) and `client`.
- Admin UI lives under `/admin/*`. Client portal under `/app/*`.
- Service categories: `entrenamiento-personal`, `hipopresivos`, `masaje`.
- Appointment statuses: `pending`, `confirmed`, `completed`, `cancelled`.
- Timezone: `Europe/Madrid`. Instants in JSON are UTC ISO strings.
- UI copy is Spanish. Put strings in literals files, not inline in templates, unless the file already inlines marketing copy (Webonafit).

## Commands (from each package directory)

Desk and Webonafit both default to port **4200**. If both run, start one with `--port 4201`.

```bash
# BonafitDesk
cd BonafitDesk && npm start          # http://localhost:4200
cd BonafitDesk && npm test

# Webonafit
cd Webonafit && npm start            # http://localhost:4200
cd Webonafit && npm test

# BonafitApi (Postgres 16 on localhost:5432)
cd BonafitApi && docker compose up -d
cd BonafitApi && uv sync && uv run uvicorn app.main:app --reload --port 8080
```

Desk talks to the API at `http://localhost:8080/api` when `environment.useMockApi` is `false`. It currently ships with **mock API on** in development.

## Do not

- Mix Webonafit and BonafitDesk component kits or design tokens.
- Rename JSON fields to snake_case; the HTTP contract is camelCase.
- Add a monorepo tool or shared library unless asked.
- Commit `.env`, secrets, or `node_modules` / `.venv`.
