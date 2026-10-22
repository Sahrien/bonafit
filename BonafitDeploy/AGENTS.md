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

### A deploy is not done until it proves itself

`bonafit_deploy/estalvia/verify.py` runs before the success line and raises
`DeployVerificationError` (non-zero exit) if any assertion fails:

- the public API health URL reports `ok`;
- `index.html` sits at the web root (not nested one level down — that 403s);
- the public SPA index serves the app shell AND references a `main-*.js` that
  exists in the bundle just uploaded (a stale index pointing at a deleted chunk
  is a blank page behind a 200);
- `DEPLOYED_COMMIT` on the server equals the commit that was built.

HTTP checks retry, because requests right after `systemctl restart` hit a 502.
This exists because a green exit shipped a 403 once and a broken migration step
once — never report a deploy as live on the exit code alone.

The tool writes `/srv/estalvia/api/DEPLOYED_COMMIT` (`<sha> <timestamp>`) on
every deploy and it is the one to read. The old infra `deploy.sh` marker under
`/var/lib/infra-deploy` goes stale the moment this tool deploys.

## Horoscope

Horoscope is its own GitLab repo (`gitlab.com/madriguera1/horoscope`) with four
surfaces. Like Estalvia it always builds a **clean clone at the exact pushed
commit**, never the working tree (landing photos can be work in progress).

```bash
uv run deploy horoscope <commit>             # api + web + app + landing
uv run deploy horoscope <commit> api         # FastAPI / renderer only
uv run deploy horoscope <commit> web         # editor SPA /horoscope/
uv run deploy horoscope <commit> app         # customer SPA /app/
uv run deploy horoscope <commit> landing     # tucartalaser.com root
uv run deploy horoscope <commit> --skip-tests
```

Build: `uv pip compile pyproject.toml` for the remote venv; backend unittest
suite unless skipped; two Angular builds with baseHrefs `/horoscope/` and
`/app/`; landing `pnpm build` with baseHref `/`.

Ship: API to `/srv/horoscope/api` (never `.env`/`.venv`), editor to
`/srv/horoscope/public`, app to `/srv/tucartalaser/app`, landing to
`/srv/tucartalaser/public`. The API owns and exposes the editor/app endpoints
through nginx; the tucartalaser static trees are owned by `bonafit`.

Remote after API upload: `uv pip install -r requirements.txt`,
`alembic upgrade head`, then `systemctl enable --now horoscope-api` and
restart. Verification checks API health, each SPA's root `index.html`, app shell
and uploaded `main-*.js`, plus `/srv/horoscope/api/DEPLOYED_COMMIT`.

Settings are pydantic-settings from `.env`. Never log secrets or commit private
keys / `.env`.
