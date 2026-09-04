import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthApi } from '../core/auth-api';
import { AuthSessionDto, AuthUserDto } from '../models/auth-session.dto';
import { AuthHttpApi } from './auth-http.service';
import { AuthMockApi } from './auth-mock.service';

@Injectable({ providedIn: 'root' })
export class AuthApiService implements AuthApi {
  private readonly impl: AuthApi = environment.useMockApi
    ? inject(AuthMockApi)
    : inject(AuthHttpApi);

  listAccounts(): Observable<AuthUserDto[]> {
    return this.impl.listAccounts();
  }

  login(userId: string): Observable<AuthSessionDto> {
    return this.impl.login(userId);
  }

  logout(): Observable<void> {
    return this.impl.logout();
  }

  getSession(): Observable<AuthSessionDto | null> {
    return this.impl.getSession();
  }
}

