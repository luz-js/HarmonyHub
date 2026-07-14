import { Disc, Globe, Headphones, Link2, Music, Music2, Video, Youtube } from 'lucide-react';
import type { SongLinkProvider } from '../../../../shared/types';
import { linkProviderLabels } from './link.utils';

const ICON_BY_PROVIDER: Record<SongLinkProvider, typeof Youtube> = {
  YOUTUBE: Youtube,
  SPOTIFY: Music2,
  APPLE_MUSIC: Music,
  SOUNDCLOUD: Headphones,
  VIMEO: Video,
  BANDCAMP: Disc,
  WEBSITE: Globe,
  OTHER: Link2,
};

export function LinkProviderBadge({ provider }: { provider: SongLinkProvider }) {
  const Icon = ICON_BY_PROVIDER[provider] || Link2;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#173347] bg-[#081821] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8cdff0]">
      <Icon className="h-3.5 w-3.5" />
      {linkProviderLabels[provider]}
    </span>
  );
}
