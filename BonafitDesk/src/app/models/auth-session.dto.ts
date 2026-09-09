export type UserRole = 'admin' | 'client';

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
  currentPassword: string;
  newPassword: string;
}
