import { Observable } from 'rxjs';
import {
  AuthMePatchDto,
  AuthSessionDto,
  ChangePasswordRequestDto,
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDto,
  LoginRequestDto,
} from '../models/auth-session.dto';

export interface AuthApi {
  login(payload: LoginRequestDto): Observable<AuthSessionDto>;
  logout(): Observable<void>;
  getSession(): Observable<AuthSessionDto | null>;
  changePassword(payload: ChangePasswordRequestDto): Observable<void>;
  requestPasswordReset(payload: ForgotPasswordRequestDto): Observable<ForgotPasswordResponseDto>;
  updateMe(payload: AuthMePatchDto): Observable<AuthSessionDto>;
}
