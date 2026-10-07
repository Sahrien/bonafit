# BonafitDeploy ? agent notes

uv CLI that builds the three Bonafit apps locally and rsyncs them to the OVH VPS over SSH.
Ansible provisions the server; this package only deploys code. No FTP.

Needs `node`/`npm` on PATH (nvm is fine; non-interactive shells must `source ~/.nvm/nvm.sh` first).

```bash
cd BonafitDeploy
cp .env.example .env   # SSH_HOST, key path, remotes
uv sync
uv run deploy frontend
uv run deploy backend --skip-tests
uv run deploy web
uv run deploy all --skip-tests
uv run deploy all --dev --skip-tests   # /srv/dev.bonafit + bonafit-api-bonafit_dev
```

Desk and Web: `npm ci`, Karma unless `--skip-tests`, production `ng build`, rsync of `dist/*/browser`.
API: pytest unless skipped, rsync of `app/`, `scripts/`, `pyproject.toml`, `uv.lock`, `.python-version` (never `.env`), then remote `sudo -u bonafit uv sync --frozen` and `systemctl restart` the site unit.

`--dev` rewrites `/srv/bonafit/...` remotes to `/srv/dev.bonafit/...` and uses `API_UNIT_DEV`.
Settings are pydantic-settings from `.env`. Do not log secrets or commit private keys / `.env`.
