/**
 * Comprobaciones solo de tipos (no corren): si lo que devuelve la API deja de encajar con el tipo de respuesta de
 * @harmonyhub/contracts que usa la web, `npm run typecheck` falla aqui.
 */
import type { AssertAssignable, EventDetail, EventListResponse, Wire } from '@harmonyhub/contracts';
import type { EventsService } from './events.service';

type Returned<Method extends (...args: never[]) => unknown> = Wire<Awaited<ReturnType<Method>>>;

export type EventsContractCheck = [
  AssertAssignable<Returned<EventsService['list']>, EventListResponse>,
  AssertAssignable<Returned<EventsService['detail']>, EventDetail>,
  AssertAssignable<Returned<EventsService['create']>, EventDetail>,
  AssertAssignable<Returned<EventsService['addMusician']>, EventDetail>,
];
