import os
import subprocess
from pathlib import Path


def run(
    args: list[str], *, cwd: Path, env: dict[str, str] | None = None
) -> None:
    """Run a command, echoing it, and fail on a non-zero exit.

    ``env`` entries are merged onto the current environment, so callers can
    force non-interactive behaviour (e.g. ``GIT_TERMINAL_PROMPT=0``) without
    dropping PATH.
    """
    print(f"+ {' '.join(args)}", flush=True)
    merged = {**os.environ, **env} if env else None
    subprocess.run(args, cwd=cwd, check=True, env=merged)
