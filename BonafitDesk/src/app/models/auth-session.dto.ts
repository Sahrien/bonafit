export type UserRole = 'admin' | 'client';

export interface AuthUserDto {
  id: string;
  displayName: string;
  role: UserRole;
  trainerId?: string;
  clientId?: string;
}

export interface AuthSessionDto {
  user: AuthUserDto;
  token: string;
}

export interface LoginRequestDto {
  userId: string;
}
