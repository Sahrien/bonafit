import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { AuthApi } from '../core/auth-api';
import {
  AuthSessionDto,
  AuthUserDto,
  LoginRequestDto,
} from '../models/auth-session.dto';

@Injectable({ providedIn: 'root' })
export class AuthHttpApi implements AuthApi {
  private readonly http = inject(HttpClient);

  listAccounts(): Observable<AuthUserDto[]> {
    return this.http.get<AuthUserDto[]>(apiUrl(API_PATHS.authAccounts));
  }

  login(userId: string): Observable<AuthSessionDto> {
    const payload: LoginRequestDto = { userId };
    return this.http.post<AuthSessionDto>(apiUrl(API_PATHS.authLogin), payload);
  }

  logout(): Observable<void> {
    return this.http.post<void>(apiUrl(API_PATHS.authLogout), {});
  }

  getSession(): Observable<AuthSessionDto | null> {
    return this.http.get<AuthSessionDto | null>(apiUrl(API_PATHS.authMe));
  }
}
