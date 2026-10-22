/**
 * Pruebas e2e de importar ChordPro: crea una cancion nueva o una version nueva, con permisos y por organizacion.
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { config } from 'dotenv';
import { CHORDPRO_MAX_LENGTH } from '@harmonyhub/contracts';
import { seedOrganization, type SeededOrg } from './seed';
import { getTestDatabaseUrl, MISSING_TEST_DATABASE_MESSAGE } from './test-database';
import { startTestApp, type TestApp } from './test-app';

config({ path: resolve(__dirname, '../../../../.env'), quiet: true });
const testDatabaseUrl = getTestDatabaseUrl();

type Role = keyof SeededOrg['users'];

const CHORDPRO = `{title: Sublime Gracia}
{artist: John Newton}
{key: G}
{tempo: 72}
{capo: 2}

{start_of_verse}
[G]Sublime [C]gracia
{end_of_verse}

{soc}
[D]Coro
{eoc}`;

if (!testDatabaseUrl) {
  test('importar ChordPro (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('importar ChordPro: API real contra la base de pruebas', () => {
    let api: TestApp;
    let org: SeededOrg;
    let other: SeededOrg;

    before(async () => {
      process.env.NOTIFICATION_REMINDERS_INTERVAL_MS = 'off';
      api = await startTestApp(testDatabaseUrl);
      org = await seedOrganization(api.prisma, 'A');
      other = await seedOrganization(api.prisma, 'B');
    });

    after(async () => {
      await api?.app.close();
    });

    async function importAs(o: SeededOrg, role: Role, body: unknown) {
      const response = await fetch(`${api.baseUrl}/api/songs/import/chordpro`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${api.sign({ userId: o.users[role].userId, email: o.users[role].email })}`,
          'x-organization-id': o.organizationId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- respuestas JSON variadas (resultado o error)
      return { status: response.status, body: (await response.json()) as any };
    }

    test('crea una cancion nueva con su contenido por secciones y avisa lo que no tiene lugar', async () => {
      const result = await importAs(org, 'LEADER', { text: CHORDPRO });
      assert.equal(result.status, 201);
      assert.equal(result.body.song.title, 'Sublime Gracia');
      assert.ok(result.body.warnings.some((warning: string) => warning.includes('capo')));

      const song = await api.prisma.song.findUniqueOrThrow({ where: { id: result.body.song.id }, include: { versions: true } });
      assert.equal(song.organizationId, org.organizationId);
      assert.equal(song.artist, 'John Newton');
      assert.equal(song.originalKey, 'G');
      assert.equal(song.bpm, 72);
      const [version] = song.versions;
      assert.equal(version.id, result.body.version.id);
      assert.equal(version.isDefault, true);
      assert.equal(version.notes, 'Capo: 2');
      const content = version.contentJson as { sections: Array<{ type: string; lines: Array<{ chords: string; lyrics: string }> }> };
      assert.deepEqual(
        content.sections.map((section) => [section.type, section.lines.map((line) => [line.chords, line.lyrics])]),
        [
          ['VERSE', [['G       C', 'Sublime gracia']]],
          ['CHORUS', [['D', 'Coro']]],
        ],
      );
    });

    test('con songId agrega una version nueva (no predeterminada) a una cancion existente', async () => {
      const result = await importAs(org, 'ADMIN', { text: CHORDPRO, songId: org.songId, versionName: 'Version acustica', key: 'A' });
      assert.equal(result.status, 201);
      assert.equal(result.body.song.id, org.songId);
      const version = await api.prisma.songVersion.findUniqueOrThrow({ where: { id: result.body.version.id } });
      assert.equal(version.songId, org.songId);
      assert.equal(version.name, 'Version acustica');
      assert.equal(version.key, 'A');
      assert.equal(version.isDefault, false);
    });

    test('sin titulo ni artista en el archivo: 400 claro, salvo que la vista previa los complete', async () => {
      const bare = '[C]Solo una linea';
      assert.match((await importAs(org, 'OWNER', { text: bare })).body.message, /titulo/);
      const fixed = await importAs(org, 'OWNER', { text: bare, title: 'Nueva', artist: 'Banda' });
      assert.equal(fixed.status, 201);
    });

    test('permisos, organizacion y limites', async () => {
      assert.equal((await importAs(org, 'MUSICIAN', { text: CHORDPRO })).status, 403);
      assert.equal((await importAs(org, 'GUEST', { text: CHORDPRO })).status, 403);
      assert.equal((await importAs(org, 'OWNER', { text: CHORDPRO, songId: other.songId })).status, 404, 'no se agregan versiones a canciones de otra organizacion');
      assert.equal((await importAs(org, 'OWNER', { text: '   ' })).status, 400);
      assert.equal((await importAs(org, 'OWNER', { text: '{title: Sin letra}\n{artist: X}' })).status, 400);
      const huge = await importAs(org, 'OWNER', { text: 'a'.repeat(CHORDPRO_MAX_LENGTH + 1) });
      assert.equal(huge.status, 400);
      assert.match(huge.body.message, /demasiado grande/);
      assert.equal(await api.prisma.song.count({ where: { organizationId: other.organizationId } }), 1, 'la otra organizacion no cambio');
    });
  });
}
