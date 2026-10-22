import { useState } from 'react';
import { Printer } from 'lucide-react';
import type { SetlistDetail } from '../../shared/types';
import { PrintSheet } from './PrintSheet';
import { SetlistSheet } from './SetlistSheet';
import { loadSetlistPrintData, type SetlistPrintData } from './setlistPrintData';

/** "PDF" del setlist: trae la letra de cada cancion (en la tonalidad del setlist) y abre el dialogo de impresion. */
export function SetlistPdfButton({ setlist }: { setlist: SetlistDetail }) {
  const [data, setData] = useState<SetlistPrintData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    setLoading(true);
    setError('');
    try {
      setData(await loadSetlistPrintData(setlist));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo preparar el PDF');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" className="btn-ghost" disabled={loading} onClick={() => void start()} title="Imprimir o guardar como PDF: portada con el orden y cada canción">
        <Printer className="h-4 w-4" /> {loading ? 'Preparando…' : 'PDF'}
      </button>
      {error && <span className="self-center text-sm text-[#F7A39A]">{error}</span>}
      {data && (
        <PrintSheet title={setlist.name} onDone={() => setData(null)}>
          <SetlistSheet setlist={setlist} data={data} />
        </PrintSheet>
      )}
    </>
  );
}
