import { useState } from 'react';
import { Check, ExternalLink, Pencil, Star, Trash2 } from 'lucide-react';
import type { SongLink, SongVersion } from '../../../../shared/types';
import { LinkEmbed } from './LinkEmbed';
import { LinkProviderBadge } from './LinkProviderBadge';
import { copyToClipboard } from './link.utils';

export function LinkCard({
  link,
  versions,
  canManage,
  onEdit,
  onDelete,
  onSetPrimary,
}: {
  link: SongLink;
  versions: SongVersion[];
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetPrimary: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const versionLabel = link.versionId ? versions.find((version) => version.id === link.versionId)?.name || link.version?.name || 'Versión' : 'General';

  async function handleCopy() {
    const ok = await copyToClipboard(link.url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <article className={`rounded-2xl border p-4 transition ${link.isPrimary ? 'border-[#00E6A3]/35 bg-[#0c1e22]' : 'border-[#1b2c40] bg-[#091522]'}`}>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <LinkEmbed link={link} />
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <LinkProviderBadge provider={link.provider} />
            {link.isPrimary && <span className="rounded-full border border-[#00E6A3]/25 bg-[#00E6A3]/12 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7ef7cc]">Principal</span>}
            {!link.active && <span className="badge">Inactivo</span>}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{link.title || link.url}</p>
            <p className="mt-1 truncate text-xs text-muted">{versionLabel} · {link.url}</p>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <a className="btn-ghost h-9 px-3" href={link.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Abrir</a>
            <button type="button" className="btn-ghost h-9 px-3" onClick={() => void handleCopy()}>
              {copied ? <Check className="h-4 w-4" /> : null} {copied ? 'Copiado' : 'Copiar URL'}
            </button>
            {canManage && (
              <>
                <button type="button" className="btn-ghost h-9 px-3" onClick={onEdit}><Pencil className="h-4 w-4" /> Editar</button>
                {!link.isPrimary && <button type="button" className="btn-ghost h-9 px-3" onClick={onSetPrimary}><Star className="h-4 w-4" /> Principal</button>}
                <button type="button" className="btn-danger h-9 w-9 p-0" onClick={onDelete} aria-label="Eliminar enlace"><Trash2 className="h-4 w-4" /></button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
