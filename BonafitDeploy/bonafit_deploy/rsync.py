from __future__ import annotations

from pathlib import Path

from bonafit_deploy.process import run


def upload_directory(
    *,
    local: Path,
    remote: str,
    host: str,
    port: int,
    user: str,
    private_key: Path,
    delete: bool = True,
    excludes: tuple[str, ...] = (),
    remote_owner: str | None = None,
) -> None:
    """rsync local dir to user@host:remote over SSH (writes via sudo rsync)."""
    if not local.is_dir():
        raise FileNotFoundError(f"local path is not a directory: {local}")
    if not private_key.is_file():
        raise FileNotFoundError(f"SSH private key not found: {private_key}")

    ssh = (
        f"ssh -i {private_key} -p {port} "
        "-o BatchMode=yes -o StrictHostKeyChecking=accept-new"
    )
    dest = f"{user}@{host}:{remote.rstrip('/')}/"
    cmd = [
        "rsync",
        "-az",
        "--info=progress2",
        "-e",
        ssh,
        "--rsync-path",
        "sudo rsync",
    ]
    if delete:
        cmd.append("--delete")
    for pattern in excludes:
        cmd.extend(["--exclude", pattern])
    cmd.append(f"{local.as_posix().rstrip('/')}/")
    cmd.append(dest)
    print(f"rsync {local} -> {dest}", flush=True)
    run(cmd, cwd=local)

    if remote_owner:
        from shlex import quote
        from bonafit_deploy import ssh as sshmod

        path = quote(remote.rstrip("/"))
        owner = quote(remote_owner)
        sshmod.run_remote(
            host=host,
            port=port,
            user=user,
            password="",
            private_key=private_key,
            command=f"sudo chown -R {owner}:{owner} {path}",
        )
