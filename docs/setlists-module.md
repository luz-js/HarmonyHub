# Módulo Setlists — Fase 1 (dominio)

Documentación de la Fase 1 del módulo Setlists de HarmonyHub: base de datos, relaciones, reglas de negocio, endpoints, permisos y hooks mínimos. Deja el dominio preparado para el editor visual, cues, asignaciones, historial y plantillas de fases posteriores.

## Dominio

```text
Setlist
└── SetlistItem
    ├── SONG -> SongVersion (referencia, nunca copia contenido)
    ├── SPEAKING
    ├── PRAYER
    ├── VIDEO
    ├── ANNOUNCEMENT
    ├── SILENCE
    ├── TRANSITION
    ├── BREAK
    └── CUSTOM
```

Un `Setlist` no se relaciona directamente con `Song`. La entidad central es `SetlistItem`, que representa cómo se ejecutará una canción o bloque en ese setlist específico (versión elegida, tonalidad/BPM/duración/capo particulares, notas de transición). `Event` mantiene su relación existente con `Setlist` sin cambios (`Event.setlistId`, `onDelete: SetNull`).

## `Setlist`

| Campo | Descripción |
| --- | --- |
| `status` | `DRAFT` \| `READY` \| `PUBLISHED` \| `ARCHIVED`. Única fuente de estado "archivado" (no existe un booleano `isArchived` separado). |
| `estimatedSec` / `itemCount` | Cache calculada por el backend tras cada mutación de items (`recalculateStats`); el frontend nunca la mantiene. |
| `isTemplate` | Reservado para la fase de plantillas; no usado todavía. |
| `createdById` / `updatedById` | Usuario autenticado en creación/última edición. |

## `SetlistItem`

Reglas por `type`:

- **SONG**: requiere `songId` + `songVersionId` (se valida que la versión pertenezca a esa canción y a la organización activa). El título inicial se toma de `Song.title` si no se indica uno explícito. `estimatedSec` se inicializa desde `SongVersion.durationSec` si no hay `durationOverrideSec` explícito (actúa como snapshot de duración, ver más abajo).
- **Resto de tipos**: no usan `songId`/`songVersionId`/`keyOverride`/`bpmOverride`/`capo`/`includeClick`/`includePad` — el backend los normaliza a `null`/`false` siempre (`normalizeSetlistItemInput`, `apps/api/src/setlists/setlist.utils.ts`), sin importar lo que envíe el cliente.

No se copia `contentJson`, `lyrics`, `chords`, tracks, files ni links al `SetlistItem`: solo se referencia la versión.

## Overrides y valores efectivos

Los overrides son exclusivos del setlist y **nunca modifican la `SongVersion`**. Se calculan en el backend (`resolveSetlistItemEffectiveValues`) y se exponen en cada respuesta como `item.effective`, nunca se guardan duplicados en base de datos:

```text
effectiveKey = keyOverride ?? songVersion.key
effectiveBpm = bpmOverride ?? songVersion.bpm
effectiveDurationSec = durationOverrideSec ?? estimatedSec ?? songVersion.durationSec
```

Si la `SongVersion` cambia después (por ejemplo, se ajusta el BPM en el editor), los `SetlistItem` que no tengan override siguen esa versión dinámicamente — es intencional, no un bug. La única asimetría es `estimatedSec`: al agregar el item se snapshotea la duración de la versión en ese momento: si más tarde la versión cambia su duración, el item ya no la sigue en vivo (queda "fijada" salvo que se limpie `estimatedSec` explícitamente). Se documenta aquí porque no es obvio a partir del código.

`capo` se guarda y se muestra (rango 0–12); no hay cálculo automático de transposición por capo en esta fase.

## Duración estimada del setlist

`Setlist.estimatedSec` = suma de `effectiveDurationSec` de todos los items con `isHidden = false` (los items ocultos no cuentan; los items no musicales con `estimatedSec` sí cuentan). Se recalcula junto con `itemCount` (`SetlistsRepository.recalculateStats`) después de: crear, editar, eliminar, ocultar/mostrar y duplicar un item. El frontend nunca es responsable de mantener este total.

## Orden

`order` es 0-based, consecutivo y sin huecos. Toda operación que afecta el orden (reordenar, eliminar, duplicar) renumera **todos** los items del setlist en una transacción de dos pasadas (offset temporal + valores finales) para no violar nunca la restricción única `(setlistId, order)` — un `UPDATE` que desplaza varias filas a la vez no garantiza que Postgres las procese en el orden lógico correcto.

Endpoint de reordenamiento — acepta la lista completa de IDs en el orden deseado (reduce errores frente a enviar pares `{id, order}` sueltos):

```text
PATCH /api/setlists/:setlistId/items/reorder
{ "itemIds": ["item-3", "item-1", "item-2"] }
```

Al duplicar un item (`POST /api/setlists/:setlistId/items/:itemId/duplicate`), la copia se inserta inmediatamente después del original (no se agrega "Copia" al título) y se recalculan orden y stats.

## Estados y transiciones

```text
DRAFT -> READY -> PUBLISHED
READY -> DRAFT
PUBLISHED -> READY
DRAFT | READY | PUBLISHED -> ARCHIVED
ARCHIVED -> DRAFT
```

Centralizado en `assertSetlistStatusTransition` (`apps/api/src/setlists/setlist.utils.ts`); no se permiten saltos arbitrarios (p. ej. `DRAFT -> PUBLISHED` directo se rechaza). Publicar (`POST /api/setlists/:id/publish`) exige además que el setlist tenga al menos un item visible y que todo item `SONG` visible tenga una `songVersionId` válida.

## Endpoints

```text
GET    /api/setlists                       lista resumida (paginada, filtros status/search/includeArchived)
POST   /api/setlists
GET    /api/setlists/:id                   detalle completo con items
PATCH  /api/setlists/:id
DELETE /api/setlists/:id                   solo OWNER/ADMIN; rechaza si tiene eventos asociados
POST   /api/setlists/:id/archive
POST   /api/setlists/:id/publish

GET    /api/setlists/:setlistId/items
POST   /api/setlists/:setlistId/items
GET    /api/setlists/:setlistId/items/:itemId
PATCH  /api/setlists/:setlistId/items/:itemId
DELETE /api/setlists/:setlistId/items/:itemId
PATCH  /api/setlists/:setlistId/items/reorder      (registrado antes que :itemId por el mismo motivo que en Canciones)
POST   /api/setlists/:setlistId/items/:itemId/duplicate
```

El listado (`GET /api/setlists`) nunca incluye los items completos de cada setlist; expone `songsCount`/`nonSongItemsCount` derivados (no se guardan como campo aparte).

## Permisos (centralizados en `PermissionsService`)

| Acción | OWNER | ADMIN | LEADER | MUSICIAN | GUEST |
| --- | :-: | :-: | :-: | :-: | :-: |
| Ver setlists | Sí | Sí | Sí | Sí | Sí |
| Crear / editar / agregar items / reordenar / duplicar | Sí | Sí | Sí | No | No |
| Publicar | Sí | Sí | Sí | No | No |
| Archivar | Sí | Sí | Sí | No | No |
| Eliminar definitivamente | Sí | Sí | No | No | No |

Métodos: `canViewSetlists`, `canManageSetlists` (ya existía, reutilizado), `canPublishSetlists`, `canArchiveSetlists`, `canDeleteSetlists`. Los controllers nunca comparan roles directamente.

## Multi-organización

- `SetlistsRepository.findById`/`findDetail` siempre filtran por `organizationId` además de `id`.
- Todo lookup de `SetlistItem` filtra por `setlistId` (nunca por `id` a secas).
- Al agregar un item `SONG`, tanto la canción como la versión se validan contra la organización activa (`findSongForValidation`, `findVersionForValidation`) y se verifica que la versión pertenezca realmente a esa canción — un ID de otra organización u otra canción nunca resuelve por coincidencia.

## Integridad con el módulo Canciones

- `SetlistItem.songVersionId` usa `onDelete: Restrict`: no es posible eliminar físicamente una `SongVersion` referenciada por un item de setlist. El endpoint existente `DELETE /api/songs/:id/versions/:versionId` ahora traduce esa violación en un `400` legible ("está siendo usada en un setlist") en vez de un error 500 crudo — único cambio hecho dentro del módulo Canciones para esta fase.
  - Nota de implementación: con el adaptor `@prisma/adapter-pg` (Prisma 7), una violación de una FK `RESTRICT` no llega como `Prisma.PrismaClientKnownRequestError` con `code: 'P2003'` (a diferencia de una violación de unicidad `P2002`, que sí llega así) — llega como un `DriverAdapterError` con el código SQLSTATE original en `error.cause.code` (`23503`/`23001`). El catch en `songs.service.ts` revisa ambas formas.
- `SetlistItem.songId` usa `onDelete: SetNull` (no hay borrado físico de `Song` expuesto por la API hoy; es una protección defensiva, no una ruta activa).

## Migración desde el modelo legacy `SetlistSong`

El proyecto tenía un modelo plano `Setlist 1:N SetlistSong -> Song` (sin tipos de item, sin overrides estructurados). La migración (`prisma/migrations/202607140001_setlist_domain_phase1/migration.sql`) es idempotente y no destructiva:

1. Agrega los nuevos campos a `Setlist` (`status`, `itemCount`, `isTemplate`, `createdById`, `updatedById`) y crea la tabla `SetlistItem`.
2. Copia cada fila de `SetlistSong` a un `SetlistItem` tipo `SONG`, renumerando `order` a 0-based consecutivo. Si la fila legacy no tenía `songVersionId`, se usa la versión default de la canción (o la más reciente); si la canción no tiene ninguna versión, la fila se omite (no se asigna una versión arbitraria).
3. Recalcula `itemCount`/`estimatedSec` de cada `Setlist` afectado.
4. Elimina `SetlistSong` solo después de copiar los datos.

En el entorno de desarrollo, dado que el flujo real de sincronización es `prisma db push` (no hay tabla `_prisma_migrations`), el mismo backfill se ejecutó una vez de forma manual antes de correr el `db push` que introdujo el nuevo esquema; el `migration.sql` documentado aquí es la versión SQL idempotente pensada para entornos que sí corren migraciones reales.

## React Query

Convención de query keys: `[dominio, organizationId, ...]`.

```text
['setlists', organizationId, filters]
['setlist', organizationId, setlistId]
['setlistItems', organizationId, setlistId]
```

Toda mutación de items invalida `setlistItems`, `setlist` (para refrescar `estimatedSec`/`itemCount`) y `setlists` (para refrescar la lista resumida) del setlist afectado — nunca `invalidateQueries()` global.

## Frontend — Fase 1 (dominio, CRUD mínimo)

`apps/web/src/features/setlists/` sigue la misma arquitectura por features que Canciones (api client, hooks, pages, components, schemas, types, utils).

- Lista de setlists con búsqueda/filtro por estado, tarjetas con conteo de canciones/bloques y duración.
- Detalle: cabecera con acciones (editar, publicar, archivar, eliminar) según permisos, y lista de items con mover arriba/abajo, editar, duplicar, eliminar y ocultar/mostrar (`SetlistItemsList`/`SetlistItemRow`, hoy solo accesibles como fallback — ver Fase 2).
- Selector de canción reutiliza los hooks públicos de Canciones (`useSongs`, `useSongVersions`) — nunca componentes internos de la carpeta `components/` de Canciones. El componente genérico `OverlayDialog` (antes privado de Canciones) se extrajo a `shared/components/` para que ambos módulos lo reutilicen sin acoplarse entre sí.

## Frontend — Fase 2 (Editor Visual)

`apps/web/src/features/setlists/editor/` reemplaza la lista mínima por un editor visual profesional, montado en `SetlistDetailPage`:

- Drag & drop con `@dnd-kit` (overlay flotante, zona de drop animada, accesible por teclado vía `KeyboardSensor`), reordenamiento de cualquier tipo de item entre sí sobre el mismo endpoint `reorder` de Fase 1.
- Quick Insert: botón "+" entre cards que inserta un item exactamente en esa posición (`insertIndex`, único cambio aditivo de backend de esta fase, en `setlist.utils.ts`/`setlist-items.service.ts`).
- Inspector lateral no-modal (general/overrides/notas, selector rápido de versión), timeline y estadísticas calculadas en cliente a partir de `item.effective.*`, colapso de runs consecutivos del mismo tipo.
- Persistencia de layout de UI (`setlist-editor-layout` en localStorage) y responsive (panel/drawer/bottom-sheet).

## Frontend — Fase 3 (Workspace Musical)

`apps/web/src/features/setlists/workspace/` convierte el Setlist en un **workspace musical**: cada `SetlistItem` de tipo SONG se puede expandir inline (sin navegar, sin modal) para consultar todos los recursos de esa canción sin salir del Setlist.

```text
Setlist
│
├── SetlistItem
│     │
│     └── SongVersion
│            │
│            ├── Lyrics
│            ├── Chords
│            ├── Tracks
│            ├── Files
│            ├── Links
│            ├── Notes
│            ├── History
│            └── Collaboration
│
└── Workspace UI
      │
      ├── Lazy Loading
      ├── Shared React Query Cache
      ├── Global Audio Player
      └── Expandable Song Cards
```

Puntos clave de implementación:

- **Reutilización, no duplicación**: los tabs Pistas/Archivos/Links son wrappers de una línea sobre `SongTracksPanel`/`SongFilesPanel`/`SongLinksPanel` existentes (`canManage={false}`, `versions={[liveVersion]}`). El tab Letra reutiliza `SongPreview` (el renderer existente más liviano, sin listeners globales ni diálogos, a diferencia de `SongEditor readOnly`). El tab Notas es nuevo (no reutiliza `SongNotesPanel`, que trae todas las versiones sin filtro) y llama `useSongNotes(organizationId, songId, { versionId })` directamente, mostrando solo las notas de la versión del `SetlistItem` + generales. Historial/Colaboración son resúmenes livianos nuevos (`useSongActivity`/`useSongThreads` con `pageSize`/`versionId` acotado) con un botón que abre el panel completo existente dentro de `OverlayDialog`.
- **Carga perezosa por tab**: los hooks de Canciones no aceptan un `enabled` externo, así que la pereza se logra por **montaje condicional** — `ExpandedSongWorkspace` solo monta el componente del tab activo, nunca los siete a la vez.
- **Reproductor de audio único global**: `AudioPlayerProvider` se subió de `SongDetailPage` a `App.tsx` (antes vivía por página, lo que permitía que dos canciones expandidas reprodujeran audio simultáneamente). `PersistentAudioPlayer` se extrajo de `SongTracksPanel` a `features/songs/player/` y se monta una sola vez en la raíz de la app, sobreviviendo a que se colapse o cambie de tab una canción puntual.
- **Original → Override**: `SongWorkspaceHeader` obtiene el valor vigente de la versión vía `useSongVersion` (misma query key que usa el resto de Canciones) y lo compara contra los overrides del `SetlistItem` — nunca snapshotea, cualquier cambio en la versión se refleja automáticamente.
- **Resource badges**: no existen contadores de links/notas/threads/actividad en el backend (solo `tracksCount`/`filesCount`/`versionsCount` en `SongSummary`, y ni siquiera esos viajan en `SetlistItem`). Por eso los badges de recursos solo se muestran para canciones que ya fueron expandidas al menos una vez en la sesión (conteo en memoria, no persistido); las canciones nunca expandidas no muestran badges.
- **Persistencia de UI**: `setlist-workspace-state` en localStorage (mismo patrón que `setlist-editor-layout` de Fase 2) — qué canciones están expandidas y su tab activa por item.
- **Responsive/accesibilidad**: desktop/tablet usan un `role="tablist"` con roving `tabindex` y flechas/Home/End; en móvil (`< 640px`, vía `useMediaQuery`) se reemplaza por un accordion sobre el mismo estado `activeTab`, sin duplicar el montaje de paneles entre ambos layouts.

## Fase 4 (Asignaciones musicales y preparación del equipo)

Convierte el Setlist en el centro de coordinación del equipo: quién dirige, canta, toca cada instrumento o controla pistas/click en cada item, y su estado individual de preparación.

```text
Setlist
└── SetlistParticipant (Membership + estado general: invitado/confirmado/rechazado/tentativo)
      │
      └── SetlistAssignment (por SetlistItem: rol musical, instrumento, ¿principal?, estado de preparación)

SetlistItem
└── SetlistRoleRequirement (rol requerido + cantidad mínima, opcional — define "cobertura")
```

- **Participante vs. asignación**: `SetlistParticipant` referencia siempre una `Membership` (nunca un `User` directo), porque el rol/instrumento de una persona es específico de cada organización. Ser participante del setlist ("está en el equipo") es independiente de tener asignaciones concretas por canción ("qué toca en cada una") — un participante puede existir sin ninguna asignación todavía.
- **Roles musicales**: enum cerrado `SetlistMusicalRole` (director musical, líder de banda, voz principal, coro, cada instrumento, pistas/click/pad, ingeniero de audio/monitores, iluminación, video, orador, guía de oración, anunciante, otro). `ROLES_BY_ITEM_TYPE` (duplicado deliberadamente en frontend y backend) solo filtra las opciones sugeridas en el selector según el tipo de item — el backend acepta cualquier rol del enum, no es una restricción de integridad.
- **Rol "principal" único, nunca un rechazo**: `MUSIC_DIRECTOR`, `BAND_LEADER`, `LEAD_VOCAL`, `TRACKS` y `CLICK` (`isSinglePrimaryRole`) solo admiten un `isPrimary = true` a la vez por item. Marcar a alguien como principal **reemplaza** silenciosamente al anterior (misma transacción), nunca se rechaza la operación — permite correcciones rápidas sin fricción.
- **Cobertura de roles** (`computeCoverage` en `setlist-assignment.utils.ts`, espejado en el frontend en `utils/coverage.ts`): sin `SetlistRoleRequirement` definidos, un item con al menos una asignación se considera `COMPLETE` (no se impone una banda completa universal). Con requisitos definidos, cada uno exige `assignedCount >= minimumCount`; el resultado es `COMPLETE` (todos cubiertos), `PARTIAL` (algunos) o `EMPTY` (ninguno). Se expone vía `GET /api/setlists/:setlistId/team` agregado por todo el setlist y también recalculado en el cliente para un solo item (Inspector).
- **Preparación individual**: `AssignmentPreparationStatus` (pendiente, en preparación, listo, necesita revisión, bloqueado, no aplica) vive en la asignación, no en el participante — la misma persona puede estar "lista" en una canción y "pendiente" en otra. Un `MUSICIAN` solo puede cambiar el estado de **sus propias** asignaciones (`canUpdateOwnPreparationStatus`); roles de liderazgo pueden cambiar cualquiera (`canUpdateAnyPreparationStatus`). Copiar asignaciones entre items (`POST .../assignments/copy`) siempre resetea el estado copiado a `PENDING`, nunca copia `READY` — el equipo del destino siempre empieza a preparar de nuevo.
- **Advertencias suaves, nunca bloqueos**: sobrecarga de un músico (asignado en la mayoría de los items del setlist) y acumulación de 3+ roles distintos en el mismo item (`assignmentConflicts.ts`, frontend únicamente) son solo indicadores visuales — nunca impiden guardar. Publicar un setlist con roles sin cubrir muestra una confirmación nativa con el conteo de roles faltantes, pero permite continuar (mismo criterio ya usado para otras confirmaciones del editor).

### Endpoints

```text
GET    /api/setlists/:setlistId/participants
POST   /api/setlists/:setlistId/participants
PATCH  /api/setlists/:setlistId/participants/:participantId
DELETE /api/setlists/:setlistId/participants/:participantId          (?removeAssignments=true si tiene asignaciones)

GET    /api/setlists/:setlistId/team          agregado: participantes + asignaciones + requisitos + cobertura por item

GET    /api/setlists/:setlistId/items/:itemId/assignments
POST   /api/setlists/:setlistId/items/:itemId/assignments
PATCH  /api/setlists/:setlistId/items/:itemId/assignments/:assignmentId
DELETE /api/setlists/:setlistId/items/:itemId/assignments/:assignmentId
PATCH  /api/setlists/:setlistId/items/:itemId/assignments/:assignmentId/preparation
POST   /api/setlists/:setlistId/items/:itemId/assignments/copy        { sourceItemId, mode?, replaceExisting? }

GET    /api/setlists/:setlistId/items/:itemId/requirements
POST   /api/setlists/:setlistId/items/:itemId/requirements
PATCH  /api/setlists/:setlistId/items/:itemId/requirements/:requirementId
DELETE /api/setlists/:setlistId/items/:itemId/requirements/:requirementId
```

Estructura backend: `apps/api/src/setlists/assignments/` (mismo patrón flat que `items/` — sin subcarpetas `dto/`/`mappers/`), con 3 controllers/services/repositories independientes (Participants, Assignments, Requirements) más `setlist-assignment.utils.ts` (reglas puras) y `setlist-assignment.mapper.ts` (shape de respuesta).

### Permisos

| Acción | OWNER | ADMIN | LEADER | MUSICIAN | GUEST |
| --- | :-: | :-: | :-: | :-: | :-: |
| Ver equipo/asignaciones | Sí | Sí | Sí | Sí | Sí |
| Gestionar participantes / asignaciones / requisitos | Sí | Sí | Sí | No | No |
| Cambiar preparación propia | Sí | Sí | Sí | Sí | Sí |
| Cambiar preparación de otro musico | Sí | Sí | Sí | No | No |

Métodos nuevos en `PermissionsService`: `canViewSetlistAssignments`, `canManageSetlistParticipants`, `canManageSetlistAssignments`, `canManageSetlistRequirements`, `canUpdateOwnPreparationStatus`, `canUpdateAnyPreparationStatus`.

### Frontend

`apps/web/src/features/setlists/assignments/` — hooks (`useSetlistTeam`, `useSetlistParticipants`, mutaciones de participantes/asignaciones/requisitos con optimistic update + rollback para cambios de preparación/principal/eliminación), componentes (`ItemAssignmentsSection` integrado como 4ª sección "Equipo" en `SetlistInspector`; `TeamSummaryRow` bajo el título de cada `SongSetlistCard`, calculado desde una única query `useSetlistTeam` por setlist en `SetlistCanvas`, no una query por card; `SetlistTeamPanel` con 4 tabs — Equipo/Por canción/Por músico/Mi preparación — accesible desde un botón nuevo en `SetlistToolbar`).

Query keys nuevas: `['setlistTeam', organizationId, setlistId]`, `['setlistParticipants', ...]`, `['setlistItemAssignments', ..., itemId]`, `['setlistRoleRequirements', ..., itemId]`.

### Multi-organización

- `SetlistParticipant.membershipId` se valida contra la organización activa al crearse (`findMembershipForValidation`) y debe estar `ACTIVE`.
- `SetlistAssignment.participantId` se valida contra el `setlistId` del item (`findParticipantInSetlist`) — nunca se acepta un participante de otro setlist u organización.
- Igual que en fases anteriores, todo lookup por `id` a secas se evita: siempre se filtra por la entidad padre (`setlistId`/`setlistItemId`) primero.

## Fase 5 (Cues y flujo de producción)

Convierte el Setlist en un guion de producción: qué ocurre antes/durante/después de cada item, quién es responsable de cada instrucción (luces, click, pad, video, conteo, cambio de instrumento...) y qué cues críticos siguen sin cubrir — preparando el dominio para una futura Fase 6 (Stage Mode en vivo), sin implementar nada de eso todavía.

```text
Setlist
├── SetlistCue GLOBAL (no ligado a ningun item: "Abrir puertas", "Iniciar musica ambiental")
│
├── SetlistParticipant
├── SetlistAssignment
│
└── SetlistItem
      ├── SetlistCue BEFORE  (antes de que empiece el item)
      ├── SetlistCue DURING  (durante el item)
      └── SetlistCue AFTER   (al terminar el item)
```

- **Tipos, categorías y fases**: `SetlistCueType` (44 valores: musicales, pistas, habla, video, luces, audio, instrumento, logística, personalizado) se agrupa en 9 `CueCategory` calculadas (`getCueCategory`, nunca almacenadas) — usadas para agrupar la vista "Por departamento" y para filtrar `copy`. `SetlistCuePhase` (`BEFORE`/`DURING`/`AFTER`/`GLOBAL`) se normaliza en el backend: un cue sin `setlistItemId` siempre es `GLOBAL`; uno con item nunca puede serlo (cae a `BEFORE`).
- **Timeline calculado, nunca persistido**: `calculateCueTimelinePosition` (duplicado deliberadamente en backend y frontend) traduce `offsetSec` + `phase` a un segundo absoluto usando el inicio acumulado de cada item (`calculateItemStartTimes`, espejo exacto de `calculateRunningTimeline` del editor — los items ocultos heredan el reloj del último visible sin avanzarlo, para que ambos cálculos coincidan siempre). `BEFORE`/`DURING` = `itemStartSec + offsetSec`; `AFTER` = `itemStartSec + itemDurationSec + offsetSec`; `GLOBAL` = `offsetSec` desde el inicio del setlist.
- **Prioridad, no un booleano separado**: se eliminó `isCritical` del modelo (el propio dominio recomienda no tener dos fuentes de verdad) — un cue es crítico cuando `priority === 'CRITICAL'` (`isCriticalPriority`).
- **Responsable**: un cue puede tener `responsibleParticipantId` (responsable general del setlist) y/o `responsibleAssignmentId` (una asignación específica de un item — ej. "Carlos, asignación VIDEO de esta canción"). Si se envía un `responsibleAssignmentId`, el `responsibleParticipantId` siempre se deriva de esa asignación (nunca se aceptan valores contradictorios). El picker del frontend (`CueResponsiblePicker`) solo expone la elección de participante general — simplificación deliberada para no duplicar la complejidad del selector de asignaciones de Fase 4.
- **Metadata JSON validada solo para 8 tipos principales** (`COUNT_IN`, `CLICK_START`, `PAD_START`, `LIGHTS_SCENE`, `VIDEO_START`, `PATCH_CHANGE`, `CAPO_CHANGE`, `TIMER`); el resto acepta un objeto JSON genérico acotado en tamaño (`MAX_METADATA_JSON_LENGTH`).
- **Warnings suaves, nunca bloqueos** (`buildCueWarnings`, duplicado en frontend para el Inspector y en backend para `/production`): crítico sin responsable, bloqueado, offset `DURING` más allá de la duración efectiva del item, ligado a un item oculto, responsable con participación rechazada (`DECLINED`), y duplicado probable (mismo item+fase+tipo+offset+título normalizado).
- **Publicar con riesgos**: igual que en Fase 4, esto es una advertencia frontend-only (`window.confirm` en `SetlistToolbar`, nunca un bloqueo backend) — ahora combina roles de equipo faltantes _y_ cues críticos/bloqueados/en revisión en un solo mensaje.
- **Reordenamiento con botones, no drag&drop**: cada fase tiene su propio `sortOrder` (transacción de dos pasadas, mismo patrón que `SetlistItem`/`SetlistAssignment`) reordenable con subir/bajar — se omitió `@dnd-kit` para cues deliberadamente para controlar el alcance de una fase ya muy grande.
- **Duplicar item con cues**: `POST .../items/:itemId/duplicate` acepta un body opcional `{ includeCues?: boolean }`. Al incluir cues, el responsable general (`responsibleParticipantId`) se conserva (pertenece a todo el setlist) pero `responsibleAssignmentId` siempre se descarta (es específico del item origen, que no tiene equivalente en el nuevo item). El Inspector expone esto como un checkbox junto a un nuevo botón "Duplicar item" (no existía ahí antes de esta fase).
- **Copiar cues entre items** (`POST .../items/:targetItemId/cues/copy`): filtra por fases y/o categorías opcionalmente; si `includeResponsibles`, intenta resolver una asignación equivalente (mismo participante+rol) en el item destino, y si no existe, deja el responsable en `null` en vez de referenciar una asignación ajena.

### Endpoints

```text
GET    /api/setlists/:setlistId/cues                        cues del setlist completo (incluye GLOBAL)
POST   /api/setlists/:setlistId/cues
GET    /api/setlists/:setlistId/cues/:cueId
PATCH  /api/setlists/:setlistId/cues/:cueId
DELETE /api/setlists/:setlistId/cues/:cueId
PATCH  /api/setlists/:setlistId/cues/:cueId/status           setea/limpia completedAt+completedById
PATCH  /api/setlists/:setlistId/cues/reorder                 { setlistItemId, phase, cueIds }
POST   /api/setlists/:setlistId/cues/:cueId/duplicate
POST   /api/setlists/:setlistId/items/:targetItemId/cues/copy { sourceItemId, phases?, categories?, replaceExisting?, includeResponsibles? }
GET    /api/setlists/:setlistId/items/:itemId/cues            cues de un item especifico (Inspector)
GET    /api/setlists/:setlistId/production                    agregado: cues + cobertura + por-categoria + por-responsable + warnings
```

Se optó por no crear un endpoint genérico `GET /cues?filtro=...` con los 8 query params sugeridos: las tres formas de arriba (setlist completo, por item, agregado de producción) cubren todas las vistas reales sin N+1 — "no crear endpoints redundantes si ya existe un patrón genérico".

### Permisos

| Acción | OWNER | ADMIN | LEADER | MUSICIAN | GUEST |
| --- | :-: | :-: | :-: | :-: | :-: |
| Ver cues/producción | Sí | Sí | Sí | Sí | Sí |
| Crear / editar / eliminar / reordenar / copiar cues | Sí | Sí | Sí | No | No |
| Cambiar estado de un cue propio (responsable) | Sí | Sí | Sí | Sí | Sí |
| Cambiar estado de un cue ajeno | Sí | Sí | Sí | No | No |

Métodos nuevos: `canViewSetlistCues`, `canManageSetlistCues`, `canUpdateOwnCueStatus`, `canUpdateAnyCueStatus`. Se omitieron deliberadamente `canManageSetlistProduction` (redundante con `canManageSetlistCues`) y `canPublishWithCueWarnings` (la advertencia al publicar ya está gateada por el `canPublishSetlists` existente, igual que en Fase 4).

### Frontend

`apps/web/src/features/setlists/cues/` — hooks (`useSetlistCues`, `useSetlistItemCues`, `useSetlistProduction`, mutaciones con optimistic update + rollback para status/reorder/responsable/prioridad/eliminación, scoped a la cache del item afectado), componentes (`ItemCuesSection` integrado como sección "Cues y producción" en `SetlistInspector`, con 3 `CuePhaseSection` — Antes/Durante/Después; `CuesSummaryRow` bajo el título de cada `SongSetlistCard` **y** `BlockSetlistCard` — a diferencia de Fase 4, los cues aplican a cualquier tipo de item; `SetlistProductionPanel` con 4 tabs — Producción/Por departamento/Por responsable/Mis cues — accesible desde un botón nuevo "Producción" en `SetlistToolbar`).

Query keys nuevas: `['setlistCues', organizationId, setlistId]`, `['setlistItemCues', ..., itemId]`, `['setlistProduction', organizationId, setlistId]`.

### Multi-organización

- `SetlistCue.setlistId`/`setlistItemId` se validan contra la organización activa igual que el resto del módulo (`assertSetlistInOrg`/`assertItemInSetlist`).
- `responsibleParticipantId` se valida contra el mismo setlist (`SetlistParticipantsRepository.findById`); `responsibleAssignmentId` se valida vía su item (`findAssignmentInSetlist`, un `SetlistAssignment` solo puede resolverse a través de `setlistItem.setlistId`).
- Cascade: eliminar un `SetlistItem` elimina sus cues específicos (`onDelete: Cascade`); los cues generales (`GLOBAL`, sin item) sobreviven porque no dependen de ningún item.

### Integración futura con Stage Mode

El modelo ya expone todo lo que una futura pantalla de operación en vivo necesitará: orden consecutivo por fase, responsable resuelto, estado de preparación, prioridad/criticidad y posición en el timeline — sin haber implementado ejecución en vivo, WebSockets, control de hardware (DMX/MIDI/OSC) ni integraciones externas (ProPresenter, Ableton), todo explícitamente fuera de alcance de esta fase.

## Fase 6 (Stage Mode — modo de ejecución en vivo)

Convierte el Setlist en la pantalla que se usa *durante* el servicio: limpia, rápida, navegable por teclado/touch, sin CRUD ni paneles administrativos visibles.

```text
Editor
  │
  ▼
Workspace
  │
  ▼
Assignments
  │
  ▼
Production
  │
  ▼
Stage Mode
  │
  ▼
Live Execution
```

- **100% frontend, sin endpoint nuevo**: `SetlistCuesService.list()` (Fase 5) ya devuelve cada cue con `timelinePositionSec` calculado; `useSetlistTeam` (Fase 4) ya agrupa asignaciones por item; `useSetlistItems` (Fase 1/2) ya trae `effective.*`. Construir un agregado `GET /setlists/:id/stage` habría duplicado exactamente lo que esos tres endpoints ya resuelven sin N+1. Stage Mode (`apps/web/src/features/setlists/stage-mode/`) se compone enteramente de hooks ya existentes — cero cambios de backend salvo la línea aditiva descrita abajo.
- **Sin ruta nueva**: la app no tiene un router con parseo de segmentos (`App.tsx` hace `path.replace('/setlists/', '')` literal) — Stage Mode es un toggle de estado dentro de `SetlistDetailPage.tsx` que reemplaza `SetlistHeader`+`SetlistEditor` por `<StageMode />` a pantalla completa, sin tocar el sistema de navegación.
- **Navegación**: `useStageNavigation` recorre solo items visibles (`!item.isHidden`); `useCurrentCue` ordena los cues ya devueltos por `timelinePositionSec` y navega con un cursor independiente que se resincroniza automáticamente al primer cue de fase `BEFORE` del item actual al cambiar de canción.
- **Estado y persistencia**: `useStagePersistence` clona el patrón exacto de `useSetlistEditorLayout` (una clave de `localStorage`, `stage-mode-state`, `Record<setlistId, ...>`). Solo se persisten los timestamps mínimos (`isRunning`, `startedAt`, `pausedAt`, `accumulatedSec`) — `elapsedSec`/`remainingSec` se **derivan** en cada tick (`deriveElapsedSec`), nunca se guarda un número que quedaría desactualizado.
- **Layouts**: `SONG_ONLY` / `SONG_LYRICS` / `SONG_LYRICS_NEXT` / `PRODUCTION` / `CLEAN` (pantalla limpia para proyectar), persistido, cambiable desde `StageControls`.
- **Atajos de teclado** (centralizados en `useStageKeyboard`, nunca hardcodeados por componente): `→`/`←` cambian de canción, `↓`/`↑` cambian de cue, `Espacio` play/pause del cronómetro del show, `L`/`C`/`N` alternan letra/cues/siguiente, `F` pantalla completa, `Esc` sale. Mientras Stage Mode está montado, suspende los atajos globales de audio (Space/Flechas de `AudioPlayerProvider`, Fase 3) vía un flag mínimo y aditivo (`stageModeHotkeys.ts`) para que no se disparen ambos a la vez si hay una pista de audio activa — no cambia el comportamiento normal del reproductor en ningún otro caso.
- **Pantalla completa**: Fullscreen API nativa sobre el contenedor raíz de `StageMode.tsx` (`requestFullscreen`/`exitFullscreen`), sin librería.
- **Letra/acordes**: reutiliza `SongPreview` (Fase 3) tal cual, con `fontSize` como mecanismo de zoom (slider en Ajustes) — misma normalización de contenido que `LyricsPanel` (`SongContentSchema.safeParse` → `normalizeSongContent`/`legacyFieldsToSongContent`).
- **Pistas**: reutiliza el reproductor global (`useAudioPlayer`, Fase 3) — Stage Mode no crea un reproductor propio, solo un botón compacto de play/stop para la pista principal del item actual.
- **Responsables**: se leen del mismo agregado de equipo (`useSetlistTeam`) filtrado por el item actual; destaca "Tu responsabilidad" cuando el usuario autenticado participa.
- **Quick Jump**: búsqueda por substring (mismo patrón que `MemberPicker`/`CueResponsiblePicker`) sobre items y cues, salto inmediato sin abrir el editor.

### Corrección de infraestructura de tests (hallada durante esta fase)

Al escribir `QuickJumpDialog.test.tsx` se detectó que `vitest.config.ts` usa `globals: false`, lo que impedía que React Testing Library registrara su limpieza automática entre tests (su detección interna depende de `globalThis.afterEach`) — el DOM de tests anteriores quedaba acumulado dentro del mismo archivo. Se corrigió agregando `afterEach(cleanup)` explícito en `vitest.setup.ts`. Es un fix de infraestructura compartido por toda la suite, no específico de Stage Mode.

## Roadmap (fases siguientes, no implementado aquí)

- Stage Mode colaborativo en tiempo real: sincronización entre múltiples dispositivos, WebSockets, control de hardware (MIDI/OSC/DMX), teleprompter, integración con ProPresenter/Ableton, operación distribuida del evento.
- Historial de revisiones del setlist en sí (mismo patrón que `SongVersionRevision`, distinto del historial de Canciones ya integrado en el Workspace).
- Plantillas (`Setlist.isTemplate` ya reservado) y duplicación de un setlist completo.
- Integración más profunda con Eventos (hoy solo se conserva la relación `Event.setlistId` existente).
- Playback multipista sincronizado, checklists.
