import { useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import type { SongLink } from '../../../../shared/types';
import { canEmbed, getEmbedFrameConfig } from './link.utils';

/**
 * Monta el iframe solo cuando el usuario pulsa "Reproducir" (nunca automaticamente
 * al listar), usa `loading="lazy"`, `referrerPolicy` y `sandbox` restrictivo, y
 * jamas usa `dangerouslySetInnerHTML` ni HTML devuelto por el backend.
 */
export function LinkEmbed({ link }: { link: SongLink }) {
  const [mounted, setMounted] = useState(false);
  const embeddable = canEmbed(link);

  if (mounted && embeddable && link.embedUrl) {
    const { sandbox, allow } = getEmbedFrameConfig(link.provider);
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-[#30333A] bg-black">
        <iframe
          key={link.embedUrl}
          src={link.embedUrl}
          title={link.title || link.provider}
          className="h-full w-full"
          loading="lazy"
          sandbox={sandbox}
          allow={allow}
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-[#30333A] bg-[#1C2436]">
      {link.thumbnailUrl ? (
        <img src={link.thumbnailUrl} alt={link.title || link.provider} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="p-6 text-center text-xs text-muted">Sin preview disponible para este enlace.</div>
      )}
      {embeddable ? (
        <button
          type="button"
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition hover:opacity-100"
          onClick={() => setMounted(true)}
          aria-label="Reproducir"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary">
            <Play className="h-6 w-6" />
          </span>
        </button>
      ) : (
        <a
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition hover:opacity-100"
          href={link.url}
          target="_blank"
          rel="noreferrer"
          aria-label="Abrir enlace externo"
        >
          <span className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#141518]">
            <ExternalLink className="h-4 w-4" /> Abrir
          </span>
        </a>
      )}
    </div>
  );
}
