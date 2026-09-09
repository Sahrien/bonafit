import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { API_PATHS, apiUrl } from '../core/api-url';
import { AuthApi } from '../core/auth-api';
import { AuthTokenStore } from '../core/auth/auth-token.store';
import {
  AuthSessionDto,
  ChangePasswordRequestDto,
  LoginRequestDto,
} from '../models/auth-session.dto';

@Injectable({ providedIn: 'root' })
export class AuthApiService implements AuthApi {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(AuthTokenStore);

  login(payload: LoginRequestDto): Observable<AuthSessionDto> {
    return this.http.post<AuthSessionDto>(apiUrl(API_PATHS.authLogin), payload).pipe(
      tap((session) => this.tokens.set(session.token)),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(apiUrl(API_PATHS.authLogout), {}).pipe(
      catchError(() => of(undefined)),
      tap(() => this.tokens.clear()),
      map(() => undefined),
    );
  }

  getSession(): Observable<AuthSessionDto | null> {
    const token = this.tokens.get();
    if (!token) {
      return of(null);
    }
    return this.http.get<AuthSessionDto | null>(apiUrl(API_PATHS.authMe)).pipe(
      map((session) => {
        if (!session) {
          this.tokens.clear();
          return null;
        }
        return { user: session.user, token };
      }),
    );
  }

  changePassword(payload: ChangePasswordRequestDto): Observable<void> {
    return this.http.post<void>(apiUrl(API_PATHS.authChangePassword), payload);
  }
}
