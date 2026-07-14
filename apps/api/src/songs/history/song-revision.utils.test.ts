import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateSongVersionRevisionHash, diffSongVersionRevisions, SongVersionRevisionSnapshot } from './song-revision.utils';

function snapshot(overrides: Partial<SongVersionRevisionSnapshot> = {}): SongVersionRevisionSnapshot {
  return {
    name: 'Original',
    key: 'D',
    bpm: 72,
    durationSec: 240,
    contentJson: { version: 1, sections: [{ id: 'section-1', name: 'Verso 1', lines: [{ id: 'line-1', lyrics: 'Hola', chords: 'D' }] }] },
    structureJson: null,
    lyrics: 'Hola',
    chords: 'D',
    notes: null,
    ...overrides,
  };
}

test('calculateSongVersionRevisionHash es estable frente al orden de las claves', () => {
  const a = { name: 'X', key: 'D', bpm: 72 };
  const b = { bpm: 72, name: 'X', key: 'D' };
  assert.equal(calculateSongVersionRevisionHash(a as any), calculateSongVersionRevisionHash(b as any));
});

test('calculateSongVersionRevisionHash cambia cuando cambia el contenido', () => {
  const original = calculateSongVersionRevisionHash(snapshot());
  const changed = calculateSongVersionRevisionHash(snapshot({ key: 'E' }));
  assert.notEqual(original, changed);
});

test('calculateSongVersionRevisionHash es identico para snapshots identicos (deduplicacion)', () => {
  assert.equal(calculateSongVersionRevisionHash(snapshot()), calculateSongVersionRevisionHash(snapshot()));
});

test('diffSongVersionRevisions detecta cambios escalares (tonalidad y bpm)', () => {
  const diff = diffSongVersionRevisions(snapshot(), snapshot({ key: 'E', bpm: 76 }));
  assert.deepEqual(diff.scalarChanges.find((c) => c.field === 'key'), { field: 'key', before: 'D', after: 'E' });
  assert.deepEqual(diff.scalarChanges.find((c) => c.field === 'bpm'), { field: 'bpm', before: 72, after: 76 });
  assert.equal(diff.sectionsAdded.length, 0);
  assert.equal(diff.sectionsRemoved.length, 0);
});

test('diffSongVersionRevisions detecta secciones agregadas y eliminadas', () => {
  const before = snapshot();
  const after = snapshot({
    contentJson: {
      version: 1,
      sections: [{ id: 'section-2', name: 'Coro', lines: [] }],
    },
  });
  const diff = diffSongVersionRevisions(before, after);
  assert.deepEqual(diff.sectionsAdded, ['section-2']);
  assert.deepEqual(diff.sectionsRemoved, ['section-1']);
});

test('diffSongVersionRevisions detecta lineas agregadas y cambios de letra/acordes por seccion', () => {
  const before = snapshot();
  const after = snapshot({
    contentJson: {
      version: 1,
      sections: [{
        id: 'section-1',
        name: 'Verso 1',
        lines: [
          { id: 'line-1', lyrics: 'Hola mundo', chords: 'D' },
          { id: 'line-2', lyrics: 'Nueva linea', chords: 'G' },
        ],
      }],
    },
  });
  const diff = diffSongVersionRevisions(before, after);
  assert.equal(diff.sectionsChanged.length, 1);
  const change = diff.sectionsChanged[0];
  assert.equal(change.sectionId, 'section-1');
  assert.equal(change.linesAdded, 1);
  assert.equal(change.linesRemoved, 0);
  assert.equal(change.lyricsChanged, true);
  assert.equal(change.chordsChanged, true);
});

test('diffSongVersionRevisions no reporta cambios cuando el contenido es identico', () => {
  const diff = diffSongVersionRevisions(snapshot(), snapshot());
  assert.equal(diff.scalarChanges.length, 0);
  assert.equal(diff.sectionsAdded.length, 0);
  assert.equal(diff.sectionsRemoved.length, 0);
  assert.equal(diff.sectionsChanged.length, 0);
});
