from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


class Security:
    def __init__(self, jwt_secret: str, jwt_expire_hours: int) -> None:
        self._jwt_secret = jwt_secret
        self._jwt_expire_hours = jwt_expire_hours

    def hash_password(self, plain: str) -> str:
        return hash_password(plain)

    def verify_password(self, plain: str, hashed: str) -> bool:
        return verify_password(plain, hashed)

    def create_access_token(self, user_id: str) -> str:
        payload: dict[str, Any] = {
            "sub": user_id,
            "exp": datetime.now(UTC) + timedelta(hours=self._jwt_expire_hours),
        }
        return jwt.encode(payload, self._jwt_secret, algorithm="HS256")

    def decode_access_token(self, token: str) -> str:
        try:
            payload = jwt.decode(token, self._jwt_secret, algorithms=["HS256"])
        except jwt.PyJWTError as exc:
            raise ValueError("invalid token") from exc
        user_id = payload.get("sub")
        if not isinstance(user_id, str) or not user_id:
            raise ValueError("invalid token")
        return user_id
