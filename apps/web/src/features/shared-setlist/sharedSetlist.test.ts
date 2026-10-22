import { describe, expect, it, vi } from 'vitest';
import type { SharedSongContent } from '../../shared/types';
import { sharedSetlistToken } from './route';
import { getSharedSetlist, SharedSetlistError } from './sharedSetlist.client';
import { sharedSongView, shiftKey } from './sharedSongView';

const content: SharedSongContent = {
  version: 1,
  sections: [{ id: 's0', type: 'VERSE', name: 'Verso 1', order: 0, lines: [{ id: 's0l0', order: 0, chords: 'C   G/B   Am', lyrics: 'Sublime gracia' }] }],
};
const chords = (view: ReturnType<typeof sharedSongView>) => view.content?.sections[0].lines[0].chords;

describe('sharedSongView: tonalidad del setlist y transposicion local', () => {
  it('en la tonalidad original no cambia nada', () => {
    const view = sharedSongView({ key: 'C', originalKey: 'C', content });
    expect(view.keyLabel).toBe('C');
    expect(chords(view)).toBe('C   G/B   Am');
  });

  it('si el setlist usa otra tonalidad, transporta a esa', () => {
    const view = sharedSongView({ key: 'D', originalKey: 'C', content });
    expect(view.keyLabel).toBe('D');
    expect(chords(view)).toBe('D   A/C#   Bm');
  });

  it('subir o bajar en el navegador se suma a la del setlist', () => {
    expect(sharedSongView({ key: 'D', originalKey: 'C', content }, 1).keyLabel).toBe('Eb');
    expect(chords(sharedSongView({ key: 'D', originalKey: 'C', content }, 1))).toBe('Eb   Bb/D   Cm');
    const down = sharedSongView({ key: 'C', originalKey: 'C', content }, -2);
    expect(down.keyLabel).toBe('Bb');
    expect(chords(down)).toBe('Bb   F/A   Gm');
  });

  it('sin letra o sin tonalidad', () => {
    expect(sharedSongView({ key: 'G', originalKey: 'G', content: null }, 2)).toEqual({ keyLabel: 'A', content: null });
    expect(sharedSongView({ key: null, originalKey: null, content }).keyLabel).toBeNull();
  });

  it('shiftKey respeta menores y da la vuelta a la octava', () => {
    expect(shiftKey('Em', -1)).toBe('Ebm');
    expect(shiftKey('B', 1)).toBe('C');
    expect(shiftKey('A', 12)).toBe('A');
    expect(shiftKey('raro', 3)).toBe('raro');
  });
});

describe('getSharedSetlist: sin la sesion de quien abre', () => {
  it('no manda cookies, token ni organizacion, y no usa cache', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ name: 'x', eventStartsAt: null, items: [] }), { status: 200 }));
    await expect(getSharedSetlist('tok_en', fetcher)).resolves.toEqual({ name: 'x', eventStartsAt: null, items: [] });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('/api/public/shared-setlists/tok_en');
    expect(init).toEqual({ credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
  });

  it('404 y 429 dan mensajes para la persona', async () => {
    const answer = (status: number) => vi.fn().mockResolvedValue(new Response('{}', { status }));
    await expect(getSharedSetlist('t', answer(404))).rejects.toThrow('ya no está disponible');
    await expect(getSharedSetlist('t', answer(429))).rejects.toThrow('Demasiadas solicitudes');
    await expect(getSharedSetlist('t', answer(404))).rejects.toBeInstanceOf(SharedSetlistError);
  });
});

describe('sharedSetlistToken', () => {
  it('solo /compartido/<token>', () => {
    expect(sharedSetlistToken('/compartido/abc_DEF-1')).toBe('abc_DEF-1');
    expect(sharedSetlistToken('/compartido/')).toBeNull();
    expect(sharedSetlistToken('/setlists/abc')).toBeNull();
  });
});
