export type SongSectionType =
  | 'INTRO'
  | 'VERSE'
  | 'PRE_CHORUS'
  | 'CHORUS'
  | 'BRIDGE'
  | 'INTERLUDE'
  | 'INSTRUMENTAL'
  | 'SOLO'
  | 'ENDING'
  | 'CUSTOM';

export interface SongContent {
  version: 1;
  sections: SongSection[];
}

export interface SongSection {
  id: string;
  type: SongSectionType;
  name: string;
  order: number;
  chords?: string[];
  lyrics?: string;
  notes?: string;
  lines: SongLine[];
  collapsed?: boolean;
}

export interface SongLine {
  id: string;
  order: number;
  chords: string;
  lyrics: string;
}

export interface SongStructure {
  version: 1;
  order: string[];
  sections: Array<Pick<SongSection, 'id' | 'type' | 'name' | 'order'>>;
}
