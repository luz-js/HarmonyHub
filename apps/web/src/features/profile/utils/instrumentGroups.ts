import type { SetlistMusicalRole, UserInstrumentRef } from '../../../shared/types';
import { getRoleLabel } from '../../setlists/assignments/utils/assignmentLabels';

/** Nombre del instrumento principal del perfil (o '' si no eligio ninguno). */
export function primaryInstrumentLabel(instruments: UserInstrumentRef[] | undefined) {
  const primary = instruments?.find((item) => item.isPrimary) ?? instruments?.[0];
  return primary ? getRoleLabel(primary.instrument) : '';
}

/** Los 30 roles musicales agrupados como se muestran en "Mi perfil". */
export const INSTRUMENT_GROUPS: { title: string; roles: SetlistMusicalRole[] }[] = [
  { title: 'Voces', roles: ['LEAD_VOCAL', 'BACKING_VOCAL', 'CHOIR'] },
  { title: 'Guitarras y cuerdas', roles: ['ACOUSTIC_GUITAR', 'ELECTRIC_GUITAR', 'BASS', 'STRINGS', 'VIOLIN', 'CELLO'] },
  { title: 'Teclados', roles: ['PIANO', 'KEYS', 'ORGAN', 'SYNTH'] },
  { title: 'Percusión', roles: ['DRUMS', 'PERCUSSION'] },
  { title: 'Vientos', roles: ['BRASS', 'WOODWIND'] },
  { title: 'Técnica', roles: ['TRACKS', 'CLICK', 'PAD', 'AUDIO_ENGINEER', 'MONITOR_ENGINEER', 'LIGHTING', 'VIDEO'] },
  { title: 'Dirección y otros', roles: ['MUSIC_DIRECTOR', 'BAND_LEADER', 'SPEAKER', 'PRAYER_LEADER', 'ANNOUNCER', 'OTHER'] },
];

export type SelectedInstrument = { instrument: SetlistMusicalRole; isPrimary: boolean };

/** Agrega o quita; el primero que se agrega pasa a ser principal y, si se quita el principal, lo hereda el siguiente. */
export function toggleInstrument(selected: SelectedInstrument[], instrument: SetlistMusicalRole): SelectedInstrument[] {
  if (selected.some((item) => item.instrument === instrument)) return removeInstrument(selected, instrument);
  return [...selected, { instrument, isPrimary: selected.length === 0 }];
}

export function removeInstrument(selected: SelectedInstrument[], instrument: SetlistMusicalRole): SelectedInstrument[] {
  const removed = selected.find((item) => item.instrument === instrument);
  const rest = selected.filter((item) => item.instrument !== instrument);
  if (removed?.isPrimary && rest.length > 0) return rest.map((item, index) => ({ ...item, isPrimary: index === 0 }));
  return rest;
}

export function makePrimary(selected: SelectedInstrument[], instrument: SetlistMusicalRole): SelectedInstrument[] {
  return selected.map((item) => ({ ...item, isPrimary: item.instrument === instrument }));
}
