from enum import StrEnum


class UserRole(StrEnum):
    ADMIN = "admin"
    CLIENT = "client"


USER_ROLE_VALUES = tuple(role.value for role in UserRole)
