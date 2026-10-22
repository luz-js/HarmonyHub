/**
 * Comprobaciones solo de tipos (no corren): si lo que devuelve la API deja de encajar con el tipo de respuesta de
 * @harmonyhub/contracts que usa la web, `npm run typecheck` falla aqui.
 */
import type { AssertAssignable, CurrentUser, UserInstrument, Wire } from '@harmonyhub/contracts';
import type { AuthService } from './auth.service';
import type { ProfileService } from '../profile/profile.service';

export type AuthContractCheck = [
  AssertAssignable<Wire<Awaited<ReturnType<AuthService['me']>>>, CurrentUser>,
  AssertAssignable<Wire<Awaited<ReturnType<AuthService['login']>>['user']>, CurrentUser>,
  AssertAssignable<Wire<Awaited<ReturnType<ProfileService['replaceInstruments']>>>, UserInstrument[]>,
];
