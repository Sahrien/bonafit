import { Observable } from 'rxjs';
import { AuthSessionDto, AuthUserDto } from '../models/auth-session.dto';

export interface AuthApi {
  listAccounts(): Observable<AuthUserDto[]>;
  login(userId: string): Observable<AuthSessionDto>;
  logout(): Observable<void>;
  getSession(): Observable<AuthSessionDto | null>;
}
