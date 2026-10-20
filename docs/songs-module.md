# Módulo Canciones

Documentación de dominio del módulo Canciones de HarmonyHub, cubriendo las fases 1–7 (dominio, editor, transposición, pistas, links, archivos, notas/colaboración, historial/revisiones).

## Diagrama de dominio

```text
Song
├── SongVersion
│   ├── SongTrack           (pistas de audio, asociables a versión o generales)
│   ├── SongLink            (referencias externas: YouTube/Spotify/Apple Music/SoundCloud/Vimeo/Bandcamp/Website)
│   ├── SongFile             -> File (metadata física: partituras, PDFs, imágenes, documentos)
│   ├── SongNote             (notas internas: privada/organización/líderes)
│   ├── SongCommentThread    (conversaciones sobre canción/versión/sección)
│   │   └── SongComment
│   │       └── SongCommentMention
│   └── SongVersionRevision (estado musical recuperable, append-only)
├── SongActivity             (auditoría: quién hizo qué, cuándo)
└── recursos generales sin versionId (tracks/links/files/notes/threads con versionId = null)
```

`Song` es la identidad general (título, artista, tonalidad/BPM "vigentes" como caché de conveniencia). `SongVersion` contiene el contenido musical real (letra, acordes, estructura). La mayoría de los recursos relacionados pueden asociarse a una versión específica **o** quedar "generales" (`versionId = null`), visibles desde cualquier versión.

## Modelos y responsabilidades

| Modelo | Responsabilidad |
| --- | --- |
| `Song` | Identidad, metadata general, favoritos, tags, estado (`ACTIVE/DRAFT/ARCHIVED`) |
| `SongVersion` | Contenido musical editable: `contentJson` (estructurado), `structureJson`, `lyrics`/`chords` (legacy plano), tonalidad, BPM |
| `SongTrack` | Audio propio (subido) o referencia externa reproducible como pista |
| `SongLink` | Referencia externa no reproducible como pista (video, streaming, tutorial) |
| `File` / `SongFile` | `File` = metadata física del binario (storageKey, mimeType, tamaño); `SongFile` = relación + semántica musical (categoría, título, principal) |
| `SongNote` | Nota de texto plano/Markdown limitado, con visibilidad (`PRIVATE/ORGANIZATION/LEADERS_ONLY`), fijado y archivado |
| `SongCommentThread` / `SongComment` / `SongCommentMention` | Conversaciones con estado (`OPEN/RESOLVED`), destino (`SONG/VERSION/SECTION/...`), menciones validadas por membresía |
| `SongActivity` | Línea de auditoría (acción + resumen humano + metadata mínima), nunca contenido sensible |
| `SongVersionRevision` | Snapshot inmutable del estado musical editable de una versión, deduplicado por hash, numerado secuencialmente por versión |

## Flujo de creación de una canción

1. `POST /api/songs` crea `Song` + `SongVersion` "Original" (`isDefault = true`) en una sola transacción.
2. Se registra `SONG_CREATED` y se crea la revisión #1 de la versión Original (best-effort para actividad, garantizado para la revisión).
3. Si se envía `youtubeUrl`, se crea automáticamente un `SongLink` principal (compatibilidad legacy).

## Editor y transposición

- El editor estructurado (`contentJson`) es la fuente de verdad; `lyrics`/`chords` planos se derivan y se mantienen por compatibilidad con datos legacy (canciones migradas sin `contentJson`).
- Guardar cambios reales en el editor dispara `updateVersion`, que compara el nuevo snapshot contra la última revisión (hash SHA-256) y solo crea una revisión nueva si hubo cambio real.
- Un cambio de tonalidad (`key`) en `updateVersion` se detecta automáticamente comparando contra el valor anterior; si difiere, la actividad se registra como `VERSION_TRANSPOSED` y la revisión usa `source = TRANSPOSE`, sin necesidad de un endpoint dedicado ni de que el frontend indique explícitamente "esto es una transposición".

## Storage

Todo binario (pistas, archivos) usa el mismo `TrackStorageProvider` (`apps/api/src/songs/storage/`), configurable vía `TRACK_STORAGE_DRIVER` (`local` por defecto, `s3`/`r2`/`supabase` sobre el mismo cliente S3). Rutas lógicas:

```text
organizations/{organizationId}/songs/{songId}/tracks/{trackId}/{filename}
organizations/{organizationId}/songs/{songId}/versions/{versionId}/tracks/{trackId}/{filename}
organizations/{organizationId}/songs/{songId}/files/{fileId}/{filename}
```

No se guardan binarios ni base64 en PostgreSQL; solo `storageKey`. `storageKey`/`checksum` nunca se exponen en las respuestas normalizadas al cliente.

## Permisos (centralizados en `PermissionsService`)

| Acción | OWNER | ADMIN | LEADER | MUSICIAN | GUEST |
| --- | :-: | :-: | :-: | :-: | :-: |
| Ver canción | Sí | Sí | Sí | Sí | Limitado |
| Crear canción / editar versión | Sí | Sí | Sí | No | No |
| Transponer (vista temporal) | Sí | Sí | Sí | Sí | Sí |
| Guardar transposición | Sí | Sí | Sí | No | No |
| Subir pista / link / archivo | Sí | Sí | Sí | No | No |
| Crear nota privada | Sí | Sí | Sí | Sí | No |
| Crear nota de organización | Sí | Sí | Sí | Sí* | No |
| Crear nota de líderes | Sí | Sí | Sí | No | No |
| Ver nota de líderes | Sí | Sí | Sí | No | No |
| Ver nota privada ajena | No | No | No | No | No |
| Crear/gestionar thread | Sí | Sí | Sí | Sí (participar) | Limitado |
| Resolver/reabrir thread | Sí | Sí | Sí | Solo si es el creador | Solo si es el creador |
| Editar comentario propio | Sí | Sí | Sí | Sí | Sí |
| Moderar (borrar) comentario ajeno | Sí | Sí | No | No | No |
| Restaurar revisión | Sí | Sí | Sí | No | No |

\* Política actual: MUSICIAN puede crear notas ORGANIZATION.

Esta tabla es una guía; la fuente de verdad es siempre `PermissionsService` (`apps/api/src/permissions/permissions.service.ts`) — el frontend nunca debe usar esta tabla como autoridad, solo para ocultar acciones que de todas formas el backend rechazaría.

## Aislamiento multi-organización

Todo endpoint valida organización antes de tocar datos:

- `assertSongAccess(songsRepository, permissions, userId, organizationId, songId)` (`apps/api/src/songs/song-access.utils.ts`) valida membresía activa + que la canción pertenezca a la organización, y devuelve `{ song, membership }` para reutilizar el rol sin una segunda consulta.
- `assertSongVersionAccess(songsRepository, songId, versionId)` valida que la versión pertenezca a la canción ya validada.
- Todo lookup de un recurso hijo (track/link/file/note/thread/comment/revision) filtra siempre por `songId` (`findFirst({ where: { id, songId } })`), nunca por `id` a secas, evitando que un ID de otra organización resuelva por coincidencia.
- Las menciones (`SongCommentMention`) se validan contra `Membership` filtrando por `organizationId` + `status: ACTIVE`, rechazando usuarios de otra organización o inactivos.

## Query keys (React Query)

Convención: `[dominio, organizationId, songId, versionId ?? 'all', ...filtros]`. Ejemplos: `['songTracks', organizationId, songId, versionId, includeGeneral]`, `['songNotes', organizationId, songId, versionId, visibility, includeArchived]`, `['songRevisions', organizationId, songId, versionId]`. Las invalidaciones son siempre específicas (nunca `invalidateQueries()` sin key), y se limitan a las queries realmente afectadas por la mutación.

## Lazy loading

Cada tab del detalle de canción (`Pistas`, `Archivos`, `Links`, `Notas`, `Colaboración`, `Historial`) renderiza su panel solo cuando el tab está activo (`{tab === 'x' && <Panel />}`), y cada panel usa sus propios hooks de React Query independientes del fetch inicial de `GET /api/songs/:id`. Esto significa que tracks/links/files/notes/threads/revisions **nunca** se solicitan hasta que el usuario abre esa pestaña.

El listado de canciones (`GET /api/songs`) usa un DTO resumen (`select`, no `include` completo) que excluye `contentJson`/`structureJson`/`lyrics`/`chords` y expone `defaultVersion` (solo `id/name/key/bpm/durationSec`) más `versionsCount`/`tracksCount`/`filesCount` vía `_count`, evitando cargar el contenido completo de todas las versiones por defecto de todas las canciones en cada carga de la lista.

## Campos legacy

- `Song.lyrics`/`Song.chords`/`Song.notes`: preceden al modelo de versiones; se mantienen por compatibilidad pero el contenido vigente vive en `SongVersion`.
- `SongVersion.lyrics`/`SongVersion.chords`: representación plana derivada de `contentJson`, usada como fallback cuando `contentJson` no existe (versiones migradas) y para exportación/búsqueda simple.
- `File.songId`/`File.eventId`/`File.setlistId`: relación directa legacy previa a `SongFile`. Se conserva para no romper datos existentes; el flujo nuevo de `SongFile` no la usa (deja `File.songId` en `null`). Al eliminar un `SongFile`, si el `File` sigue teniendo un puntero legacy (`songId`/`eventId`/`setlistId`), el binario **no** se borra físicamente.
- `SongTrackType`/`SongFileCategory` conservan valores de audio legacy (`AUDIO`, `STEM`, `BACKING_TRACK` en `SongFileCategory`) que ya no se ofrecen para archivos nuevos (ese contenido usa `SongTrack`), pero se mantienen para no romper filas existentes.

## Roadmap futuro (no implementado en esta fase)

- Notificaciones reales para menciones (actualmente hay un punto de extensión listo: `SongCollaborationService.createComment` ya calcula `mentionedUserIds` validados; falta el disparo de notificación).
- Reemplazo de archivo (subir nueva versión de un `SongFile` conservando la relación) — fuera de alcance explícito de Fase 6/7.
- Paginación de `SongFile`/`SongTrack`/`SongLink` si el volumen crece (hoy no pagina; `SongActivity` sí pagina).
- Grid/list toggle persistente en `SongFilesPanel` (omitido deliberadamente por simplicidad).
