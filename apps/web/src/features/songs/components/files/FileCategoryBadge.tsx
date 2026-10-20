import { Drum, File, FileCode, FileImage, FileMusic, FileText, FileVideo, Guitar, ListMusic, Mic2, Piano, Presentation } from 'lucide-react';
import type { SongFileCategory } from '../../../../shared/types';
import { fileCategoryLabels } from './file.utils';

const ICON_BY_CATEGORY: Record<SongFileCategory, typeof File> = {
  LYRIC_PDF: FileText,
  CHORD_CHART: ListMusic,
  SHEET_MUSIC: FileMusic,
  LEAD_SHEET: FileMusic,
  PIANO_SCORE: Piano,
  GUITAR_SCORE: Guitar,
  BASS_SCORE: Guitar,
  DRUM_SCORE: Drum,
  VOCAL_SCORE: Mic2,
  IMAGE: FileImage,
  DOCUMENT: FileText,
  PRESENTATION: Presentation,
  MIDI: FileMusic,
  MUSIC_XML: FileCode,
  VIDEO: FileVideo,
  OTHER: File,
  AUDIO: FileMusic,
  STEM: FileMusic,
  BACKING_TRACK: FileMusic,
};

export function FileCategoryBadge({ category }: { category: SongFileCategory }) {
  const Icon = ICON_BY_CATEGORY[category] || File;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#30333A] bg-[#1C2436] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8FB4FF]">
      <Icon className="h-3.5 w-3.5" />
      {fileCategoryLabels[category]}
    </span>
  );
}
