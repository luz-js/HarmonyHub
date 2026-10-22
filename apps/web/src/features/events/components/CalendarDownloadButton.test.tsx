import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/utils/download', async (original) => ({ ...(await original<object>()), saveBlob: vi.fn() }));

import { saveBlob } from '../../../shared/utils/download';
import { CalendarDownloadButton } from './CalendarDownloadButton';

afterEach(() => vi.mocked(saveBlob).mockClear());

describe('CalendarDownloadButton', () => {
  it('descarga el .ics que devuelve la API con el nombre indicado', async () => {
    const blob = new Blob(['BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n'], { type: 'text/calendar' });
    const download = vi.fn().mockResolvedValue(blob);
    render(<CalendarDownloadButton label="Agregar a mi calendario" fileName="culto.ics" download={download} />);

    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Agregar a mi calendario/ })));

    expect(download).toHaveBeenCalledTimes(1);
    expect(saveBlob).toHaveBeenCalledWith(blob, 'culto.ics');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('si la API falla muestra el error y no descarga nada', async () => {
    const download = vi.fn().mockRejectedValue(new Error('Evento no encontrado'));
    render(<CalendarDownloadButton label="Exportar mis eventos (.ics)" fileName="mis-eventos.ics" download={download} />);

    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Exportar mis eventos/ })));

    expect(await screen.findByRole('alert')).toHaveTextContent('Evento no encontrado');
    expect(saveBlob).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Exportar mis eventos/ })).toBeEnabled();
  });
});
