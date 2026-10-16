# BonafitDeploy ? agent notes

uv CLI that builds apps locally and rsyncs them to the OVH VPS over SSH.
Ansible provisions the server; this package only deploys code. No FTP.

Needs `node`/`npm` on PATH (nvm is fine; non-interactive shells must
`source ~/.nvm/nvm.sh` first). Estalvia additionally needs `uv` and `pnpm`.

## Bonafit

```bash
cd BonafitDeploy
cp .env.example .env   # SSH_HOST, key path, remotes
uv sync
uv run deploy bonafit frontend
uv run deploy bonafit backend --skip-tests
uv run deploy bonafit web
uv run deploy bonafit all --skip-tests
uv run deploy bonafit all --dev --skip-tests   # /srv/dev.bonafit + bonafit-api-bonafit_dev
```

Desk and Web: `npm ci`, Karma unless `--skip-tests`, production `ng build`,
rsync of `dist/*/browser`.
API: pytest unless skipped, rsync of `app/`, `scripts/`, `pyproject.toml`,
`uv.lock`, `.python-version` (never `.env`), then remote
`sudo -u bonafit uv sync --frozen` and `systemctl restart` the site unit.

`--dev` rewrites `/srv/bonafit/...` remotes to `/srv/dev.bonafit/...` and uses
`API_UNIT_DEV`.

The bare `uv run deploy all` form (no app) still means Bonafit.

## Estalvia

Estalvia is a monorepo (FastAPI + Angular) in a **different repo**
(`gitlab.com/madriguera1/sagar`), so this target takes an explicit commit and
always builds a **clean clone at that commit** — never a working tree. What is
deployed is reproducible and cannot include uncommitted work.

```bash
uv run deploy estalvia <commit>            # api + web
uv run deploy estalvia <commit> api        # backend only
uv run deploy estalvia <commit> web        # frontend only
uv run deploy estalvia <commit> --skip-tests
```

Steps: `git init` + fetch the exact commit into a temp dir → backend
`uv sync` (+ the unittest suite unless `--skip-tests`) → frontend
`pnpm install --frozen-lockfile` + `pnpm run build:prod` → rsync the staged
backend (never `.env`/`.venv`) to `/srv/estalvia/api` and `dist/browser` to
`/srv/estalvia/public` → remote, as the app user:
`uv sync --frozen && uv run alembic upgrade head`, then
`systemctl enable --now estalvia-api && systemctl restart estalvia-api`.

Because it runs `alembic upgrade head` on the server, **a deploy is a schema
decision**: confirm migrations before shipping.

Settings are pydantic-settings from `.env`. Never log secrets or commit private
keys / `.env`.
