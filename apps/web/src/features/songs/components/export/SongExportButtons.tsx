import { useState } from 'react';
import { FileDown, Printer } from 'lucide-react';
import { songToChordPro } from '@harmonyhub/contracts';
import { fileSlug, saveBlob } from '../../../../shared/utils/download';
import type { SongContent } from '../../types/song-content.types';
import { PrintSheet } from '../../../print/PrintSheet';
import { SongSheet } from '../../../print/SongSheet';

type Props = {
  title: string;
  artist?: string | null;
  timeSignature?: string | null;
  bpm?: number | null;
  /** La version guardada (para ChordPro) y lo que se esta viendo, con la transposicion temporal si la hay (para PDF). */
  versionKey: string;
  versionContent: SongContent;
  viewKey: string;
  viewContent: SongContent;
};

/** Exportar la version que se ve: ChordPro (.cho, para importarlo en otra app o aqui de nuevo) y PDF (imprimir). */
export function SongExportButtons({ title, artist, timeSignature, bpm, versionKey, versionContent, viewKey, viewContent }: Props) {
  const [printing, setPrinting] = useState(false);

  function exportChordPro() {
    const text = songToChordPro({ title, artist: artist ?? undefined, key: versionKey, tempo: bpm ?? undefined, time: timeSignature ?? undefined }, versionContent);
    saveBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${fileSlug(title, 'cancion')}.cho`);
  }

  return (
    <>
      <button type="button" className="btn-ghost" onClick={exportChordPro} title="Descargar la versión como archivo ChordPro">
        <FileDown className="h-4 w-4" /> ChordPro
      </button>
      <button type="button" className="btn-ghost" onClick={() => setPrinting(true)} title="Imprimir o guardar como PDF (con la tonalidad que estás viendo)">
        <Printer className="h-4 w-4" /> PDF
      </button>
      {printing && (
        <PrintSheet title={title} onDone={() => setPrinting(false)}>
          <SongSheet song={{ title, artist, keyLabel: viewKey, bpm, timeSignature, content: viewContent }} />
        </PrintSheet>
      )}
    </>
  );
}
