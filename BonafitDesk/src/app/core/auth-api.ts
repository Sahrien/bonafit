import { Observable } from 'rxjs';
import {
  AuthSessionDto,
  ChangePasswordRequestDto,
  LoginRequestDto,
} from '../models/auth-session.dto';

export interface AuthApi {
  login(payload: LoginRequestDto): Observable<AuthSessionDto>;
  logout(): Observable<void>;
  getSession(): Observable<AuthSessionDto | null>;
  changePassword(payload: ChangePasswordRequestDto): Observable<void>;
}
