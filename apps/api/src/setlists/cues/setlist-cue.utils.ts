import { z } from 'zod';
import type { SetlistCuePhase, SetlistCuePriority, SetlistCueStatus, SetlistCueType } from '@prisma/client';
import type { CueCategory } from '@harmonyhub/contracts';

/** Las listas de valores viven en @harmonyhub/contracts (una prueba verifica que coincidan con Prisma). */
export {
  CUE_CATEGORIES,
  SETLIST_CUE_PHASES,
  SETLIST_CUE_PRIORITIES,
  SETLIST_CUE_STATUSES,
  SETLIST_CUE_TYPES,
  type CueCategory,
} from '@harmonyhub/contracts';


const CATEGORY_BY_TYPE: Record<SetlistCueType, CueCategory> = {
  COUNT_IN: 'MUSICAL',
  MUSIC_ENTRY: 'MUSICAL',
  MUSIC_STOP: 'MUSICAL',
  DYNAMICS_UP: 'MUSICAL',
  DYNAMICS_DOWN: 'MUSICAL',
  REPEAT_SECTION: 'MUSICAL',
  SKIP_SECTION: 'MUSICAL',
  MODULATION: 'MUSICAL',
  TEMPO_CHANGE: 'MUSICAL',
  FREE_TIME: 'MUSICAL',
  HOLD: 'MUSICAL',
  ENDING: 'MUSICAL',

  CLICK_START: 'TRACKS',
  CLICK_STOP: 'TRACKS',
  PAD_START: 'TRACKS',
  PAD_STOP: 'TRACKS',
  TRACK_START: 'TRACKS',
  TRACK_STOP: 'TRACKS',

  SPEAKING: 'SPEAKING',
  PRAYER: 'SPEAKING',
  ANNOUNCEMENT: 'SPEAKING',
  SILENCE: 'SPEAKING',

  VIDEO_START: 'VIDEO',
  VIDEO_STOP: 'VIDEO',
  SLIDE_CHANGE: 'VIDEO',
  LYRICS_ON: 'VIDEO',
  LYRICS_OFF: 'VIDEO',

  LIGHTS_SCENE: 'LIGHTING',
  LIGHTS_BLACKOUT: 'LIGHTING',
  LIGHTS_FADE: 'LIGHTING',

  AUDIO_MUTE: 'AUDIO',
  AUDIO_UNMUTE: 'AUDIO',
  AUDIO_LEVEL: 'AUDIO',
  MONITOR_CHANGE: 'AUDIO',

  INSTRUMENT_CHANGE: 'INSTRUMENT',
  CAPO_CHANGE: 'INSTRUMENT',
  PATCH_CHANGE: 'INSTRUMENT',
  TUNING_CHANGE: 'INSTRUMENT',

  ENTER_STAGE: 'LOGISTICS',
  EXIT_STAGE: 'LOGISTICS',
  POSITION_CHANGE: 'LOGISTICS',
  TIMER: 'LOGISTICS',
  MARKER: 'LOGISTICS',

  CUSTOM: 'CUSTOM',
};

export function getCueCategory(type: SetlistCueType): CueCategory {
  return CATEGORY_BY_TYPE[type];
}

export function isCriticalPriority(priority: SetlistCuePriority): boolean {
  return priority === 'CRITICAL';
}

/** Si el cue no esta ligado a un item, la fase siempre es GLOBAL; si lo esta, GLOBAL no aplica y cae a BEFORE. */
export function normalizePhaseForItem(setlistItemId: string | null | undefined, phase: SetlistCuePhase): SetlistCuePhase {
  if (!setlistItemId) return 'GLOBAL';
  if (phase === 'GLOBAL') return 'BEFORE';
  return phase;
}

/**
 * Calcula la posicion en el timeline sin persistir nada:
 * GLOBAL usa offsetSec desde el inicio del setlist; BEFORE/DURING usan itemStartSec + offsetSec;
 * AFTER usa itemStartSec + itemDurationSec + offsetSec.
 */
export function calculateCueTimelinePosition({
  phase,
  offsetSec,
  itemStartSec,
  itemDurationSec,
}: {
  phase: SetlistCuePhase;
  offsetSec: number | null;
  itemStartSec: number | null;
  itemDurationSec: number | null;
}): number | null {
  const offset = offsetSec ?? 0;
  if (phase === 'GLOBAL') return offset;
  if (itemStartSec == null) return null;
  if (phase === 'AFTER') return itemStartSec + (itemDurationSec ?? 0) + offset;
  return itemStartSec + offset;
}

type TimelineSourceItem = {
  id: string;
  isHidden: boolean;
  durationOverrideSec?: number | null;
  estimatedSec?: number | null;
  songVersion?: { durationSec?: number | null } | null;
};

/**
 * Tiempo de inicio acumulado de cada item. Espejo exacto de `calculateRunningTimeline`
 * (frontend, `editor/utils/calculateTimeline.ts`): los items ocultos SI reciben una entrada
 * (heredan el reloj del ultimo item visible) pero no lo avanzan — necesario para calcular
 * `timelinePositionSec` de cada cue en las respuestas del API sin duplicar esa logica.
 */
export function calculateItemStartTimes(items: TimelineSourceItem[]): Map<string, number> {
  const startByItemId = new Map<string, number>();
  let cursor = 0;
  for (const item of items) {
    startByItemId.set(item.id, cursor);
    if (!item.isHidden) cursor += item.durationOverrideSec ?? item.estimatedSec ?? item.songVersion?.durationSec ?? 0;
  }
  return startByItemId;
}

const CountInMetadataSchema = z.object({
  count: z.number().int().min(1).max(16),
  subdivision: z.enum(['QUARTER', 'EIGHTH']).optional(),
});

const ClickStartMetadataSchema = z.object({
  bpm: z.number().min(20).max(300).optional(),
  subdivision: z.enum(['QUARTER', 'EIGHTH']).optional(),
});

const PadStartMetadataSchema = z.object({
  patchName: z.string().trim().max(120).optional(),
  fadeInSec: z.number().min(0).max(60).optional(),
});

const LightsSceneMetadataSchema = z.object({
  sceneName: z.string().trim().min(1).max(120),
  fadeSec: z.number().min(0).max(120).optional(),
});

const VideoStartMetadataSchema = z.object({
  videoName: z.string().trim().max(160).optional(),
  reference: z.string().trim().max(300).optional(),
});

const PatchChangeMetadataSchema = z.object({
  patchName: z.string().trim().min(1).max(120),
  device: z.string().trim().max(120).optional(),
});

const CapoChangeMetadataSchema = z.object({
  fromCapo: z.number().int().min(0).max(12).optional(),
  toCapo: z.number().int().min(0).max(12),
});

const TimerMetadataSchema = z.object({
  durationSec: z.number().int().min(1).max(3600),
  message: z.string().trim().max(200).optional(),
});

/** Generico para el resto de tipos (incluido CUSTOM): objeto JSON plano, sin estructura obligatoria. */
const GenericMetadataSchema = z.record(z.string(), z.unknown());

const METADATA_SCHEMA_BY_TYPE: Partial<Record<SetlistCueType, z.ZodType>> = {
  COUNT_IN: CountInMetadataSchema,
  CLICK_START: ClickStartMetadataSchema,
  PAD_START: PadStartMetadataSchema,
  LIGHTS_SCENE: LightsSceneMetadataSchema,
  VIDEO_START: VideoStartMetadataSchema,
  PATCH_CHANGE: PatchChangeMetadataSchema,
  CAPO_CHANGE: CapoChangeMetadataSchema,
  TIMER: TimerMetadataSchema,
};

export function getCueMetadataSchema(type: SetlistCueType): z.ZodType {
  return METADATA_SCHEMA_BY_TYPE[type] ?? GenericMetadataSchema;
}

/** Tamano maximo del JSON serializado; evita guardar payloads arbitrariamente grandes en la columna `metadata`. */
export const MAX_METADATA_JSON_LENGTH = 4000;

export type CueWarningCode =
  | 'CRITICAL_WITHOUT_RESPONSIBLE'
  | 'BLOCKED'
  | 'OFFSET_BEYOND_DURATION'
  | 'HIDDEN_ITEM'
  | 'DECLINED_RESPONSIBLE'
  | 'PROBABLE_DUPLICATE';

export interface CueWarning {
  cueId: string;
  code: CueWarningCode;
  message: string;
}

type WarningCue = {
  id: string;
  setlistItemId: string | null;
  phase: SetlistCuePhase;
  type: SetlistCueType;
  title: string;
  offsetSec: number | null;
  status: SetlistCueStatus;
  priority: SetlistCuePriority;
  responsibleParticipantId: string | null;
};

type WarningItem = { id: string; isHidden: boolean; effective: { durationSec: number | null } };
type WarningParticipant = { id: string; status: string };

function normalizeCueTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Warnings suaves, nunca bloqueos: cue critico sin responsable, bloqueado, offset DURING fuera de la
 * duracion efectiva del item, ligado a un item oculto, responsable que rechazo su participacion, y
 * duplicados probables (mismo item+fase+tipo+offset+titulo normalizado). El caso de "assignment eliminado"
 * del prompt no puede ocurrir en la practica: `responsibleAssignmentId` tiene `onDelete: SetNull`.
 */
export function buildCueWarnings(cues: WarningCue[], items: WarningItem[], participants: WarningParticipant[]): CueWarning[] {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const participantById = new Map(participants.map((participant) => [participant.id, participant]));
  const firstSeenByDuplicateKey = new Map<string, string>();
  const warnings: CueWarning[] = [];

  for (const cue of cues) {
    if (isCriticalPriority(cue.priority) && !cue.responsibleParticipantId) {
      warnings.push({ cueId: cue.id, code: 'CRITICAL_WITHOUT_RESPONSIBLE', message: 'Cue critico sin responsable' });
    }

    if (cue.status === 'BLOCKED') {
      warnings.push({ cueId: cue.id, code: 'BLOCKED', message: 'Cue bloqueado' });
    }

    const item = cue.setlistItemId ? itemById.get(cue.setlistItemId) : undefined;
    if (item) {
      if (item.isHidden) {
        warnings.push({ cueId: cue.id, code: 'HIDDEN_ITEM', message: 'Cue asociado a un item oculto' });
      }
      if (cue.phase === 'DURING' && cue.offsetSec != null && item.effective.durationSec != null && cue.offsetSec > item.effective.durationSec) {
        warnings.push({ cueId: cue.id, code: 'OFFSET_BEYOND_DURATION', message: 'Este cue esta programado despues de la duracion estimada del item' });
      }
    }

    if (cue.responsibleParticipantId) {
      const participant = participantById.get(cue.responsibleParticipantId);
      if (participant?.status === 'DECLINED') {
        warnings.push({ cueId: cue.id, code: 'DECLINED_RESPONSIBLE', message: 'El responsable de este cue rechazo su participacion en el setlist' });
      }
    }

    const duplicateKey = `${cue.setlistItemId ?? 'global'}:${cue.phase}:${cue.type}:${cue.offsetSec ?? 'null'}:${normalizeCueTitle(cue.title)}`;
    if (firstSeenByDuplicateKey.has(duplicateKey)) {
      warnings.push({ cueId: cue.id, code: 'PROBABLE_DUPLICATE', message: 'Posible cue duplicado' });
    } else {
      firstSeenByDuplicateKey.set(duplicateKey, cue.id);
    }
  }

  return warnings;
}
