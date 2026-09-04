import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { ApiNotFoundError } from '../core/api-not-found.error';
import { AuthApi } from '../core/auth-api';
import { createMockSession } from '../core/mock-data';
import { MockStore } from '../core/mock-store.service';
import { AuthSessionDto, AuthUserDto } from '../models/auth-session.dto';

@Injectable({ providedIn: 'root' })
export class AuthMockApi implements AuthApi {
  private readonly store = inject(MockStore);

  listAccounts(): Observable<AuthUserDto[]> {
    return of(structuredClone(this.store.accounts));
  }

  login(userId: string): Observable<AuthSessionDto> {
    const user = this.store.accounts.find((row) => row.id === userId);
    if (!user) {
      return throwError(() => new ApiNotFoundError('account', userId));
    }
    this.store.session = createMockSession(user);
    return of(structuredClone(this.store.session));
  }

  logout(): Observable<void> {
    this.store.session = null;
    return of(undefined);
  }

  getSession(): Observable<AuthSessionDto | null> {
    return of(structuredClone(this.store.session));
  }
}
