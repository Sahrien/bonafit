from __future__ import annotations

import shlex
from pathlib import Path

import paramiko


def run_remote(
    *,
    host: str,
    port: int,
    user: str,
    password: str,
    private_key: Path,
    command: str,
) -> None:
    pkey = _load_private_key(private_key, password=password)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    connect_kwargs: dict[str, object] = {
        "hostname": host,
        "port": port,
        "username": user,
        "pkey": pkey,
        "allow_agent": False,
        "look_for_keys": False,
    }
    if password:
        connect_kwargs["password"] = password
    client.connect(**connect_kwargs)
    try:
        wrapped = f"bash -lc {shlex.quote(command)}"
        print(f"$ {command}", flush=True)
        _stdin, stdout, stderr = client.exec_command(wrapped)
        for line in stdout:
            print(line, end="")
        err = stderr.read().decode()
        if err:
            print(err, end="")
        status = stdout.channel.recv_exit_status()
        if status != 0:
            raise RuntimeError(f"remote command failed with exit code {status}")
    finally:
        client.close()


def _load_private_key(path: Path, *, password: str) -> paramiko.PKey:
    if not path.is_file():
        raise FileNotFoundError(f"SSH private key not found: {path}")
    passphrase = password or None
    last_error: Exception | None = None
    for key_class in (
        paramiko.Ed25519Key,
        paramiko.RSAKey,
        paramiko.ECDSAKey,
        paramiko.DSSKey,
    ):
        try:
            return key_class.from_private_key_file(str(path), password=passphrase)
        except paramiko.SSHException as exc:
            last_error = exc
            continue
    raise RuntimeError(f"could not load SSH private key {path}: {last_error}")
