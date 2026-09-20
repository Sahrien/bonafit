from __future__ import annotations

import argparse
import subprocess
import sys

from pydantic import ValidationError

from bonafit_deploy.settings import load_env
from bonafit_deploy.targets import deploy_backend, deploy_frontend, deploy_web

TARGETS = ("frontend", "backend", "web", "all")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build a Bonafit app locally and upload it over FTP.",
    )
    parser.add_argument("target", choices=TARGETS)
    parser.add_argument(
        "--dev",
        action="store_true",
        help="use the development FTP/SSH user (same remote paths)",
    )
    parser.add_argument(
        "--skip-tests",
        action="store_true",
        help="skip that app's tests; still build and upload",
    )
    args = parser.parse_args()
    try:
        _deploy(args.target, dev=args.dev, skip_tests=args.skip_tests)
    except subprocess.CalledProcessError as exc:
        cmd = " ".join(str(part) for part in exc.cmd)
        print(f"error: command failed ({exc.returncode}): {cmd}", file=sys.stderr)
        raise SystemExit(exc.returncode) from exc
    except ValidationError as exc:
        print("error: missing or invalid deploy settings in BonafitDeploy/.env", file=sys.stderr)
        print(exc, file=sys.stderr)
        raise SystemExit(1) from exc
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc


def _deploy(target: str, *, dev: bool, skip_tests: bool) -> None:
    env = load_env(dev=dev)
    label = "development" if dev else "production"
    names = ("backend", "frontend", "web") if target == "all" else (target,)
    for name in names:
        print(f"Deploying {name} ({label})", flush=True)
        if name == "frontend":
            deploy_frontend(env, skip_tests=skip_tests)
        elif name == "backend":
            deploy_backend(env, skip_tests=skip_tests)
        else:
            deploy_web(env, skip_tests=skip_tests)
        print(f"Done: {name}", flush=True)


if __name__ == "__main__":
    main()
