import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chordLineToInline, inlineToChordLine, parseChordPro, songContentSchema, songToChordPro, type ChordProContent } from '@harmonyhub/contracts';

/** Para comparar contenidos sin mirar los ids (se generan al importar). */
const shape = (content: ChordProContent) =>
  content.sections.map((section) => ({ type: section.type, name: section.name, notes: section.notes ?? '', lines: section.lines.map((line) => [line.chords, line.lyrics]) }));

test('acordes: en linea <-> alineados por columna', () => {
  assert.deepEqual(inlineToChordLine('[G]Amazing [C]grace how [D7]sweet'), { chords: 'G       C         D7', lyrics: 'Amazing grace how sweet' });
  assert.equal(chordLineToInline('G       C         D7', 'Amazing grace how sweet'), '[G]Amazing [C]grace how [D7]sweet');
  // Acorde despues del final de la letra y linea solo de acordes.
  assert.deepEqual(inlineToChordLine('Fin   [C]'), { chords: '      C', lyrics: 'Fin' });
  assert.equal(chordLineToInline('      C', 'Fin'), 'Fin   [C]');
  // Los espacios entre acordes son columnas de letra: si no alcanzan, el acorde siguiente se corre.
  assert.deepEqual(inlineToChordLine('[G]  [D/F#]  [Em]'), { chords: 'G D/F# Em', lyrics: '' });
  assert.deepEqual(inlineToChordLine('[G]   [D/F#]      [Em]'), { chords: 'G  D/F#  Em', lyrics: '' });
  // Dos acordes pegados: el segundo se corre para no pisar al primero.
  assert.deepEqual(inlineToChordLine('[Am7]a[G]b'), { chords: 'Am7 G', lyrics: 'ab' });
  assert.equal(chordLineToInline('', 'Solo letra'), 'Solo letra');
});

test('importa directivas comunes, secciones y acordes', () => {
  const parsed = parseChordPro(`{title: Sublime Gracia}
{artist: John Newton}
{key: G}
{tempo: 72}
{time: 3/4}
# comentario del archivo: se ignora

{start_of_verse}
[G]Sublime [C]gracia
del Se[G]ñor
{end_of_verse}

{soc: Coro}
{c: Suave}
[C]Oh [G]gracia
{eoc}

{start_of_bridge}
[Em]Puente
{end_of_bridge}`);
  assert.deepEqual(parsed.metadata, { title: 'Sublime Gracia', artist: 'John Newton', key: 'G', tempo: 72, time: '3/4' });
  assert.deepEqual(shape(parsed.content), [
    { type: 'VERSE', name: 'Verso 1', notes: '', lines: [['G       C', 'Sublime gracia'], ['      G', 'del Señor']] },
    { type: 'CHORUS', name: 'Coro', notes: 'Suave', lines: [['C  G', 'Oh gracia']] },
    { type: 'BRIDGE', name: 'Puente', notes: '', lines: [['Em', 'Puente']] },
  ]);
  assert.deepEqual(parsed.warnings, []);
  assert.ok(songContentSchema.safeParse(parsed.content).success, 'el resultado se puede guardar como contenido de una version');
});

test('sin entornos: estrofas separadas por lineas en blanco, con su nombre en un comentario', () => {
  const parsed = parseChordPro('{t: Sin entornos}\r\n\r\n{c: Verso 1}\r\n[D]Uno\r\n\r\n{c: Coro}\r\n[A]Dos\r\n[G]Tres\r\n\r\nCuatro\r\n');
  assert.deepEqual(shape(parsed.content), [
    { type: 'VERSE', name: 'Verso 1', notes: '', lines: [['D', 'Uno']] },
    { type: 'CHORUS', name: 'Coro', notes: '', lines: [['A', 'Dos'], ['G', 'Tres']] },
    { type: 'VERSE', name: 'Verso 2', notes: '', lines: [['', 'Cuatro']] },
  ]);
});

test('lo raro nunca rompe el import: directivas desconocidas, capo, tonalidad invalida, {chorus} y texto vacio', () => {
  const parsed = parseChordPro('{title: Raro}\n{capo: 2}\n{key: H}\n{tempo: rapido}\n{x_custom: algo}\n{textsize: 12}\n{soc}\n[C]Coro\n{eoc}\n{chorus}\n{start_of_tab: Riff}\ne|--0--|\n{end_of_tab}\n{start_of_weird}\nX\n{end_of_weird}');
  assert.equal(parsed.metadata.capo, 2);
  assert.equal(parsed.metadata.key, undefined);
  assert.deepEqual(parsed.notes, ['Capo: 2', '{x_custom: algo}']);
  assert.ok(parsed.warnings.some((warning) => warning.includes('capo')));
  assert.ok(parsed.warnings.some((warning) => warning.includes('Tonalidad "H"')));
  assert.ok(parsed.warnings.some((warning) => warning.includes('Tempo "rapido"')));
  assert.ok(parsed.warnings.some((warning) => warning.includes('{x_custom}')));
  assert.ok(parsed.warnings.some((warning) => warning.includes('"weird"')));
  assert.ok(!parsed.warnings.some((warning) => warning.includes('textsize')), 'las directivas de formato se ignoran sin aviso');
  assert.deepEqual(
    shape(parsed.content).map((section) => [section.type, section.name, section.lines.length]),
    [
      ['CHORUS', 'Coro', 1],
      ['CHORUS', 'Coro (repetición)', 1],
      ['CUSTOM', 'Riff', 1],
      ['CUSTOM', 'Personalizada 2', 1],
    ],
  );
  assert.deepEqual(parseChordPro('   \n\n').warnings, ['No se encontro letra ni acordes en el texto']);
});

test('ida y vuelta: contenido de HarmonyHub -> ChordPro -> HarmonyHub queda igual', () => {
  const original: ChordProContent = {
    version: 1,
    sections: [
      { id: 'a', type: 'INTRO', name: 'Intro', order: 0, lines: [{ id: 'l1', order: 0, chords: 'G  D/F#  Em  C', lyrics: '' }] },
      { id: 'b', type: 'VERSE', name: 'Verso 1', order: 1, notes: 'Suave\nSolo piano', lines: [{ id: 'l2', order: 0, chords: '   G         C', lyrics: 'Hoy vengo a ti, Señor' }, { id: 'l3', order: 1, chords: '', lyrics: 'linea sin acordes' }] },
      { id: 'c', type: 'PRE_CHORUS', name: 'Precoro', order: 2, lines: [{ id: 'l4', order: 0, chords: 'Am            F', lyrics: 'Y te alabaré' }] },
      { id: 'd', type: 'CHORUS', name: 'Coro', order: 3, lines: [{ id: 'l5', order: 0, chords: 'C       G     Am', lyrics: 'Santo, santo' }] },
      { id: 'e', type: 'BRIDGE', name: 'Puente', order: 4, lines: [{ id: 'l6', order: 0, chords: 'F', lyrics: 'Aleluya' }] },
      { id: 'f', type: 'CUSTOM', name: 'Tag', order: 5, lines: [{ id: 'l7', order: 0, chords: 'G', lyrics: 'Amén' }] },
      { id: 'g', type: 'ENDING', name: 'Final', order: 6, lines: [{ id: 'l8', order: 0, chords: 'G', lyrics: '' }] },
    ],
  };
  const text = songToChordPro({ title: 'Ida y vuelta', artist: 'HarmonyHub', key: 'G', tempo: 90, time: '4/4' }, original);
  const back = parseChordPro(text);
  assert.deepEqual(shape(back.content), shape(original));
  assert.deepEqual(back.metadata, { title: 'Ida y vuelta', artist: 'HarmonyHub', key: 'G', tempo: 90, time: '4/4' });
  assert.deepEqual(back.warnings, []);
});

test('ida y vuelta: ChordPro -> HarmonyHub -> ChordPro -> HarmonyHub es estable', () => {
  const first = parseChordPro('{title: Estable}\n{sov: Verso 1}\n[G]Hola [C]mundo\n{eov}\n{soc}\n[D]Coro\n{eoc}');
  const second = parseChordPro(songToChordPro(first.metadata, first.content));
  assert.deepEqual(shape(second.content), shape(first.content));
  assert.equal(songToChordPro(second.metadata, second.content), songToChordPro(first.metadata, first.content));
});
