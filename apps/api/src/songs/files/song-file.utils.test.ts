import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AudioNotAllowedFileError,
  FileTooLargeError,
  mapMimeTypeToFileType,
  maxSongFileUploadBytes,
  UnsupportedFileTypeError,
  validateSongFileUpload,
} from './song-file.utils';

test('acepta PDF, imagenes, documentos, presentaciones y MIDI/MusicXML', () => {
  assert.doesNotThrow(() => validateSongFileUpload({ mimetype: 'application/pdf', size: 1024, originalname: 'chart.pdf' }));
  assert.doesNotThrow(() => validateSongFileUpload({ mimetype: 'image/png', size: 1024, originalname: 'referencia.png' }));
  assert.doesNotThrow(() => validateSongFileUpload({ mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1024, originalname: 'letra.docx' }));
  assert.doesNotThrow(() => validateSongFileUpload({ mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: 1024, originalname: 'guia.pptx' }));
  assert.doesNotThrow(() => validateSongFileUpload({ mimetype: 'audio/midi', size: 1024, originalname: 'guia.mid' }));
  assert.doesNotThrow(() => validateSongFileUpload({ mimetype: 'application/vnd.recordare.musicxml+xml', size: 1024, originalname: 'partitura.musicxml' }));
});

test('rechaza audio con mensaje que redirige a Pistas', () => {
  assert.throws(() => validateSongFileUpload({ mimetype: 'audio/mpeg', size: 1024, originalname: 'cancion.mp3' }), AudioNotAllowedFileError);
});

test('rechaza ejecutables y scripts por extension aunque el mimetype mienta', () => {
  assert.throws(() => validateSongFileUpload({ mimetype: 'application/pdf', size: 1024, originalname: 'virus.exe' }), UnsupportedFileTypeError);
  assert.throws(() => validateSongFileUpload({ mimetype: 'text/plain', size: 1024, originalname: 'script.js' }), UnsupportedFileTypeError);
  assert.throws(() => validateSongFileUpload({ mimetype: 'image/svg+xml', size: 1024, originalname: 'icon.svg' }), UnsupportedFileTypeError);
});

test('rechaza mimetypes no soportados', () => {
  assert.throws(() => validateSongFileUpload({ mimetype: 'application/zip', size: 1024, originalname: 'archivo.zip' }), UnsupportedFileTypeError);
});

test('rechaza archivos que superan el limite configurado', () => {
  const previous = process.env.MAX_SONG_FILE_UPLOAD_MB;
  process.env.MAX_SONG_FILE_UPLOAD_MB = '1';
  try {
    assert.throws(
      () => validateSongFileUpload({ mimetype: 'application/pdf', size: 2 * 1024 * 1024, originalname: 'grande.pdf' }),
      FileTooLargeError,
    );
    assert.equal(maxSongFileUploadBytes(), 1024 * 1024);
  } finally {
    if (previous === undefined) delete process.env.MAX_SONG_FILE_UPLOAD_MB;
    else process.env.MAX_SONG_FILE_UPLOAD_MB = previous;
  }
});

test('mapMimeTypeToFileType clasifica por tipo fisico generico', () => {
  assert.equal(mapMimeTypeToFileType('application/pdf'), 'PDF');
  assert.equal(mapMimeTypeToFileType('image/png'), 'IMAGE');
  assert.equal(mapMimeTypeToFileType('application/msword'), 'DOCUMENT');
  assert.equal(mapMimeTypeToFileType('audio/midi'), 'OTHER');
});
