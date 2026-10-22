import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { saveBlob } from '../../../shared/utils/download';

type CalendarDownloadButtonProps = {
  label: string;
  fileName: string;
  /** Pide el .ics a la API (con la sesion normal; no hay URL publica de suscripcion). */
  download: () => Promise<Blob>;
  className?: string;
};

/** Descarga un .ics para abrirlo en Google Calendar, Apple Calendar, Outlook... */
export function CalendarDownloadButton({ label, fileName, download, className = 'btn-ghost' }: CalendarDownloadButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setBusy(true);
    setError('');
    try {
      saveBlob(await download(), fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo descargar el calendario');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" className={className} disabled={busy} onClick={() => void handleClick()} title="Descarga un archivo .ics para tu calendario">
        <CalendarPlus className="h-4 w-4" /> {busy ? 'Descargando…' : label}
      </button>
      {error && <span role="alert" className="text-xs text-[#F7A39A]">{error}</span>}
    </span>
  );
}
