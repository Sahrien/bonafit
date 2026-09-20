import subprocess
from pathlib import Path


def run(args: list[str], *, cwd: Path) -> None:
    print(f"+ {' '.join(args)}", flush=True)
    subprocess.run(args, cwd=cwd, check=True)
