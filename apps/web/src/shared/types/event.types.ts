/** Viven en @harmonyhub/contracts: la API valida los pedidos y comprueba sus respuestas con estos mismos tipos. */
export type {
  AddEventMusicianInput,
  AttendanceStatus,
  CreateEventInput,
  EventAttendanceSummary,
  EventDetail,
  EventListResponse,
  EventMusician,
  EventSetlistRef,
  EventStatus,
  EventSummary,
  UpdateEventInput,
  UpdateEventMusicianInput,
} from '@harmonyhub/contracts';
import type { EventStatus } from '@harmonyhub/contracts';

/** Filtros de la lista tal como los arma la web (se mandan como texto en la query). */
export type EventListFilters = {
  from?: string;
  to?: string;
  status?: EventStatus;
  search?: string;
  includeCancelled?: boolean;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};
