from __future__ import annotations

import argparse
import subprocess
import sys

from pydantic import ValidationError

from bonafit_deploy.settings import (
    load_env,
    load_estalvia_env,
    load_horoscope_env,
)
from bonafit_deploy.targets import deploy_backend, deploy_frontend, deploy_web

TARGETS = ("frontend", "backend", "web", "all")
ESTALVIA_TARGETS = ("api", "web", "all")
HOROSCOPE_TARGETS = ("api", "web", "app", "landing", "all")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build an app locally and rsync it to the OVH VPS over SSH.",
    )
    sub = parser.add_subparsers(dest="app")

    bonafit = sub.add_parser("bonafit", help="deploy a Bonafit app")
    bonafit.add_argument("target", choices=TARGETS)
    bonafit.add_argument(
        "--dev",
        action="store_true",
        help="deploy to /srv/dev.bonafit and restart bonafit-api-bonafit_dev",
    )
    bonafit.add_argument(
        "--skip-tests",
        action="store_true",
        help="skip that app's tests; still build and upload",
    )

    estalvia = sub.add_parser(
        "estalvia", help="deploy Estalvia at an exact commit"
    )
    estalvia.add_argument(
        "commit",
        help="full or short commit hash already pushed to the repo",
    )
    estalvia.add_argument(
        "target",
        nargs="?",
        default="all",
        choices=ESTALVIA_TARGETS,
        help="which part to ship (default: all)",
    )
    estalvia.add_argument(
        "--skip-tests",
        action="store_true",
        help="skip the backend test suite; still build and upload",
    )

    horoscope = sub.add_parser(
        "horoscope", help="deploy Horoscope at an exact commit"
    )
    horoscope.add_argument(
        "commit",
        help="full or short commit hash already pushed to the repo",
    )
    horoscope.add_argument(
        "target",
        nargs="?",
        default="all",
        choices=HOROSCOPE_TARGETS,
        help="which surface(s) to ship (default: all)",
    )
    horoscope.add_argument(
        "--skip-tests",
        action="store_true",
        help="skip the backend test suite; still build and upload",
    )

    # Back-compat: `deploy all` (no app) still means Bonafit.
    apps = ("bonafit", "estalvia", "horoscope")
    argv = sys.argv[1:]
    if argv and argv[0] not in apps and not argv[0].startswith("-"):
        argv = ["bonafit", *argv]
    args = parser.parse_args(argv)

    try:
        if args.app == "estalvia":
            _deploy_estalvia(
                args.commit, target=args.target, skip_tests=args.skip_tests
            )
        elif args.app == "horoscope":
            _deploy_horoscope(
                args.commit, target=args.target, skip_tests=args.skip_tests
            )
        else:
            _deploy(args.target, dev=args.dev, skip_tests=args.skip_tests)
    except subprocess.CalledProcessError as exc:
        cmd = " ".join(str(part) for part in exc.cmd)
        print(f"error: command failed ({exc.returncode}): {cmd}", file=sys.stderr)
        raise SystemExit(exc.returncode) from exc
    except ValidationError as exc:
        print(
            "error: missing or invalid deploy settings in BonafitDeploy/.env",
            file=sys.stderr,
        )
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
        print(f"Deploying {name} ({label}) -> {env.ssh_user}@{env.ssh_host}", flush=True)
        if name == "frontend":
            deploy_frontend(env, skip_tests=skip_tests)
        elif name == "backend":
            deploy_backend(env, skip_tests=skip_tests)
        else:
            deploy_web(env, skip_tests=skip_tests)
        print(f"Done: {name}", flush=True)


def _deploy_estalvia(commit: str, *, target: str, skip_tests: bool) -> None:
    """Estalvia: clean clone at an exact commit, built here, rsynced to the VPS."""
    from bonafit_deploy.estalvia.targets import deploy_estalvia

    env = load_estalvia_env()
    print(
        f"Deploying estalvia {commit} ({target}) -> {env.ssh_user}@{env.ssh_host}",
        flush=True,
    )
    deploy_estalvia(env, commit=commit, skip_tests=skip_tests, target=target)


def _deploy_horoscope(commit: str, *, target: str, skip_tests: bool) -> None:
    """Horoscope: clean clone at an exact commit, build all surfaces, ship."""
    from bonafit_deploy.horoscope.targets import deploy_horoscope

    env = load_horoscope_env()
    print(
        f"Deploying horoscope {commit} ({target}) -> "
        f"{env.ssh_user}@{env.ssh_host}",
        flush=True,
    )
    deploy_horoscope(env, commit=commit, skip_tests=skip_tests, target=target)


if __name__ == "__main__":
    main()
