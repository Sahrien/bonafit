import { environment } from '../../environments/environment';
import { API_PATHS, apiUrl } from './api-url';

describe('apiUrl', () => {
  it('joins apiUrl with path segments', () => {
    expect(apiUrl(API_PATHS.clients)).toBe(`${environment.apiUrl}/clients`);
    expect(apiUrl(API_PATHS.clients, 'client-1')).toBe(
      `${environment.apiUrl}/clients/client-1`,
    );
  });

  it('flattens nested path segments', () => {
    expect(apiUrl(API_PATHS.authMe)).toBe(`${environment.apiUrl}/auth/me`);
  });
});
