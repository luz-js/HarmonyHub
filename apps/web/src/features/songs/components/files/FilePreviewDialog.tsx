import { useEffect, useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import type { SongFile } from '../../../../shared/types';
import { downloadSongFile, streamSongFile } from '../../api/songs.client';
import { OverlayDialog } from '../shared/OverlayDialog';
import { formatBytes, isImageFile, isPdfFile } from './file.utils';

async function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

/**
 * Carga el binario bajo demanda (solo cuando el dialogo se abre) mediante el
 * endpoint autenticado de stream, nunca con una URL publica permanente.
 */
export function FilePreviewDialog({ songFile, songTitle, onClose }: { songFile: SongFile; songTitle: string; onClose: () => void }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const previewable = isPdfFile(songFile.file.mimeType) || isImageFile(songFile.file.mimeType);

  useEffect(() => {
    let cancelled = false;
    let currentUrl: string | null = null;

    if (previewable) {
      setLoading(true);
      streamSongFile(songFile.songId, songFile.id)
        .then((blob) => {
          if (cancelled) return;
          currentUrl = URL.createObjectURL(blob);
          setObjectUrl(currentUrl);
        })
        .catch(() => {
          if (!cancelled) setError('No se pudo cargar la previsualización.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [songFile.songId, songFile.id, previewable]);

  async function handleDownload() {
    const blob = await downloadSongFile(songFile.songId, songFile.id);
    const extension = songFile.file.originalName?.split('.').pop() || songFile.file.name.split('.').pop() || 'archivo';
    await saveBlob(blob, `${songTitle} - ${songFile.title}.${extension}`.replace(/[<>:"/\\|?*\x00-\x1F]+/g, '-'));
  }

  return (
    <OverlayDialog title={songFile.title} subtitle={`${formatBytes(songFile.file.sizeBytes)} · ${songFile.file.mimeType || 'Tipo desconocido'}`} onClose={onClose}>
      <div className="space-y-4">
        {!previewable && (
          <div className="rounded-xl border border-dashed border-[#30333A] bg-[#1C2436] p-6 text-center text-sm text-muted">
            No hay un visor seguro disponible para este tipo de archivo. Descárgalo para abrirlo.
          </div>
        )}
        {previewable && loading && (
          <div className="flex h-72 items-center justify-center rounded-xl border border-[#30333A] bg-[#1C2436] text-muted">
            <LoaderCircle className="h-6 w-6 animate-spin" />
          </div>
        )}
        {previewable && error && <p className="text-sm text-[#F7A39A]">{error}</p>}
        {previewable && !loading && !error && objectUrl && isPdfFile(songFile.file.mimeType) && (
          <object data={objectUrl} type="application/pdf" className="h-[70vh] w-full rounded-xl border border-[#30333A]">
            <p className="p-4 text-sm text-muted">Tu navegador no puede previsualizar este PDF. Descárgalo para verlo.</p>
          </object>
        )}
        {previewable && !loading && !error && objectUrl && isImageFile(songFile.file.mimeType) && (
          <img src={objectUrl} alt={songFile.title} className="max-h-[70vh] w-full rounded-xl border border-[#30333A] object-contain" loading="lazy" />
        )}
        <div className="flex justify-end">
          <button type="button" className="btn-primary" onClick={() => void handleDownload()}><Download className="h-4 w-4" /> Descargar</button>
        </div>
      </div>
    </OverlayDialog>
  );
}
