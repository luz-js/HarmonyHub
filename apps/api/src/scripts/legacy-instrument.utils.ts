import type { SetlistMusicalRole } from '@prisma/client';

/**
 * Texto libre de `Membership.instrument` -> rol del enum. Se compara sin mayusculas ni acentos, y tambien
 * se corrige el texto mal codificado ("DirecciÃ³n") que hay en la base local.
 * "Guitarra" a secas se toma como acustica: es lo mas comun en el equipo y la persona lo puede cambiar en "Mi perfil".
 */
const LEGACY_INSTRUMENT_MAP: Record<string, SetlistMusicalRole> = {
  voz: 'LEAD_VOCAL',
  'voz principal': 'LEAD_VOCAL',
  coro: 'BACKING_VOCAL',
  'voz de apoyo': 'BACKING_VOCAL',
  guitarra: 'ACOUSTIC_GUITAR',
  'guitarra acustica': 'ACOUSTIC_GUITAR',
  'guitarra electrica': 'ELECTRIC_GUITAR',
  bajo: 'BASS',
  bateria: 'DRUMS',
  percusion: 'PERCUSSION',
  piano: 'PIANO',
  teclado: 'KEYS',
  teclados: 'KEYS',
  organo: 'ORGAN',
  sintetizador: 'SYNTH',
  violin: 'VIOLIN',
  cello: 'CELLO',
  direccion: 'MUSIC_DIRECTOR',
  'direccion musical': 'MUSIC_DIRECTOR',
  'director musical': 'MUSIC_DIRECTOR',
};

function fixMojibake(value: string) {
  // UTF-8 leido como Latin-1: "Ã³" -> "ó". Si no aplica, se deja igual.
  try {
    return /Ã|Â/.test(value) ? Buffer.from(value, 'latin1').toString('utf8') : value;
  } catch {
    return value;
  }
}

export function normalizeLegacyInstrument(value: string) {
  return fixMojibake(value).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function mapLegacyInstrument(value: string | null | undefined): SetlistMusicalRole | null {
  if (!value?.trim()) return null;
  return LEGACY_INSTRUMENT_MAP[normalizeLegacyInstrument(value)] ?? null;
}
