# BonafitDeploy — agent notes

uv CLI that builds the three Bonafit apps locally and uploads them over FTP. Production vs `--dev` only switches FTP/SSH users. Remote directories are shared.

```bash
cd BonafitDeploy
cp .env.example .env   # fill in host, users, passwords, remote paths
uv sync
uv run deploy frontend
uv run deploy backend --dev --skip-tests
uv run deploy web
uv run deploy all
```

Desk and Web: `npm ci`, Karma (`ng test --watch=false --browsers=ChromeHeadless`) unless `--skip-tests`, production `ng build`, FTP of `dist/*/browser`. API: pytest unless skipped, FTP of `app/`, `scripts/`, `pyproject.toml`, `uv.lock`, `.python-version` (never `.env` or `tests/`), then SSH `uv sync --frozen` and `uv run start`.

Settings are pydantic-settings from `.env` next to this package. `SSH_PRIVATE_KEY` defaults to `id_rsa` under this directory (relative paths resolve here). Do not log passwords or commit private keys. Do not add Typer or a test suite here.
