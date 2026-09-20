from __future__ import annotations

import ftplib
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Protocol


class FtpSession(Protocol):
    def pwd(self) -> str: ...

    def cwd(self, dirname: str) -> None: ...

    def mkd(self, dirname: str) -> str: ...

    def storbinary(self, command: str, fp: object) -> None: ...

    def quit(self) -> None: ...


@contextmanager
def connect(
    *,
    host: str,
    port: int,
    user: str,
    password: str,
    tls: bool,
) -> Iterator[FtpSession]:
    session: ftplib.FTP
    if tls:
        session = ftplib.FTP_TLS()
        session.connect(host, port)
        session.login(user, password)
        session.prot_p()
    else:
        session = ftplib.FTP()
        session.connect(host, port)
        session.login(user, password)
    session.set_pasv(True)
    try:
        yield session
    finally:
        try:
            session.quit()
        except OSError:
            session.close()


def upload_directory(session: FtpSession, local: Path, remote: str) -> None:
    _ensure_and_cwd(session, remote)
    _upload_cwd(session, local)


def _ensure_and_cwd(session: FtpSession, remote: str) -> None:
    parts = [part for part in remote.replace("\\", "/").split("/") if part]
    if remote.startswith("/"):
        session.cwd("/")
    for part in parts:
        _mkdir(session, part)
        session.cwd(part)


def _mkdir(session: FtpSession, name: str) -> None:
    try:
        session.mkd(name)
    except ftplib.error_perm:
        pass


def _upload_cwd(session: FtpSession, local: Path) -> None:
    for item in sorted(local.iterdir(), key=lambda path: path.name):
        if item.is_dir():
            _mkdir(session, item.name)
            session.cwd(item.name)
            _upload_cwd(session, item)
            session.cwd("..")
            continue
        print(f"  {item.as_posix()}", flush=True)
        with item.open("rb") as handle:
            session.storbinary(f"STOR {item.name}", handle)
