import { Injectable } from '@angular/core';

const TOKEN_KEY = 'bonafit.authToken';

@Injectable({ providedIn: 'root' })
export class AuthTokenStore {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  set(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
  }
}
