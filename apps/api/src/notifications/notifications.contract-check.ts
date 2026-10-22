/**
 * Comprobaciones solo de tipos (no corren): si lo que devuelve la API deja de encajar con el tipo de respuesta de
 * @harmonyhub/contracts que usa la web, `npm run typecheck` falla aqui.
 */
import type {
  AssertAssignable,
  DashboardActivityItem,
  DashboardSummary,
  NotificationsPage,
  TeamAvailability,
  Unavailability,
  UnavailabilityRange,
  Wire,
} from '@harmonyhub/contracts';
import type { AvailabilityService } from '../availability/availability.service';
import type { DashboardService } from '../dashboard/dashboard.service';
import type { NotificationsService } from './notifications.service';

type Returned<Method extends (...args: never[]) => unknown> = Wire<Awaited<ReturnType<Method>>>;

export type NotificationsContractCheck = [
  AssertAssignable<Returned<NotificationsService['list']>, NotificationsPage>,
  AssertAssignable<Returned<DashboardService['summary']>, DashboardSummary>,
  AssertAssignable<Returned<DashboardService['activity']>, { items: DashboardActivityItem[] }>,
  AssertAssignable<Returned<AvailabilityService['listMine']>, Unavailability[]>,
  AssertAssignable<Returned<AvailabilityService['unavailableInRange']>, UnavailabilityRange>,
  AssertAssignable<Returned<AvailabilityService['forEvent']>, TeamAvailability>,
  AssertAssignable<Returned<AvailabilityService['forSetlist']>, TeamAvailability>,
];
