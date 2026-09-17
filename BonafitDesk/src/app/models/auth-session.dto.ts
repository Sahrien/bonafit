export const USER_ROLES = {
  admin: 'admin',
  client: 'client',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface AuthUserDto {
  id: string;
  displayName: string;
  role: UserRole;
  trainerId?: string;
  clientId?: string;
  email?: string;
  mustChangePassword?: boolean;
}

export interface AuthSessionDto {
  user: AuthUserDto;
  token: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface ChangePasswordRequestDto {
  currentPassword?: string;
  newPassword: string;
}
