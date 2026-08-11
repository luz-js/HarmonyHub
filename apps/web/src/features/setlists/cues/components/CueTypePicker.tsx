import type { SetlistCueType } from '../../../../shared/types';
import { CUE_CATEGORIES, CUE_CATEGORY_LABELS } from '../utils/cueCategory';
import { getCueTypeLabel } from '../utils/cueLabels';

const TYPES_BY_CATEGORY: Record<string, SetlistCueType[]> = {
  MUSICAL: ['COUNT_IN', 'MUSIC_ENTRY', 'MUSIC_STOP', 'DYNAMICS_UP', 'DYNAMICS_DOWN', 'REPEAT_SECTION', 'SKIP_SECTION', 'MODULATION', 'TEMPO_CHANGE', 'FREE_TIME', 'HOLD', 'ENDING'],
  TRACKS: ['CLICK_START', 'CLICK_STOP', 'PAD_START', 'PAD_STOP', 'TRACK_START', 'TRACK_STOP'],
  SPEAKING: ['SPEAKING', 'PRAYER', 'ANNOUNCEMENT', 'SILENCE'],
  VIDEO: ['VIDEO_START', 'VIDEO_STOP', 'SLIDE_CHANGE', 'LYRICS_ON', 'LYRICS_OFF'],
  LIGHTING: ['LIGHTS_SCENE', 'LIGHTS_BLACKOUT', 'LIGHTS_FADE'],
  AUDIO: ['AUDIO_MUTE', 'AUDIO_UNMUTE', 'AUDIO_LEVEL', 'MONITOR_CHANGE'],
  INSTRUMENT: ['INSTRUMENT_CHANGE', 'CAPO_CHANGE', 'PATCH_CHANGE', 'TUNING_CHANGE'],
  LOGISTICS: ['ENTER_STAGE', 'EXIT_STAGE', 'POSITION_CHANGE', 'TIMER', 'MARKER'],
  CUSTOM: ['CUSTOM'],
};

export function CueTypePicker({ value, onChange }: { value: SetlistCueType | ''; onChange: (type: SetlistCueType) => void }) {
  return (
    <select className="select" value={value} onChange={(event) => onChange(event.target.value as SetlistCueType)}>
      <option value="" disabled>
        Selecciona un tipo
      </option>
      {CUE_CATEGORIES.map((category) => (
        <optgroup key={category} label={CUE_CATEGORY_LABELS[category]}>
          {TYPES_BY_CATEGORY[category].map((type) => (
            <option key={type} value={type}>
              {getCueTypeLabel(type)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
