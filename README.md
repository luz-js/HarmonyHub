# HarmonyHub

Plataforma para equipos musicales de iglesias y bandas: gestion de canciones
(letras, acordes, pistas, links, archivos, notas, colaboracion, historial) y
organizacion visual de setlists para servicios o eventos.

## Stack

- **Backend**: NestJS 11 + TypeScript, Prisma 7 (`@prisma/adapter-pg`) sobre PostgreSQL, Zod para validacion y JWT propio para auth.
- **Frontend**: React 18 + Vite, TanStack Query, Tailwind CSS, `@dnd-kit` y `lucide-react`.
- **Monorepo**: npm workspaces (`apps/api`, `apps/web`) con Prisma compartido en la raiz.
- **Tests**: `node:test` en backend, Vitest + Testing Library en frontend.

## Estructura

```text
apps/
  api/
    src/auth/             autenticacion (login/registro, JWT)
    src/organizations/    organizaciones, memberships, invitaciones
    src/permissions/      fuente de verdad de roles y permisos
    src/songs/            canciones, versiones, pistas, links, archivos,
                          notas, colaboracion, actividad e historial
    src/setlists/         setlists, items, asignaciones, cues y stage mode
    src/shared/           utilidades compartidas
  web/
    src/features/         una carpeta por feature (api, hooks, components,
                          pages, schemas, types, utils)
    src/shared/           cliente HTTP, tipos y utilidades compartidas
prisma/
  schema.prisma           esquema completo
  migrations/             migraciones versionadas
docs/
  songs-module.md
  setlists-module.md
```

Cada feature de `apps/web/src/features/` sigue la misma arquitectura:
`api/`, `hooks/`, `components/`, `pages/`, `schemas/`, `types/` y `utils/`.

## Requisitos

- Node 20+
- PostgreSQL disponible por `DATABASE_URL`

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:db:push
npm run dev
```

La web queda en `http://localhost:5173` y proxyea `/api` hacia
`http://localhost:4000`.

Todavia no hay flujo de registro por UI. Para crear el primer usuario y la
primera organizacion:

```bash
POST /api/auth/register
POST /api/organizations
```

## Variables de entorno

Ver `.env.example` para el detalle completo. Las mas relevantes:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexion PostgreSQL |
| `JWT_SECRET` / `JWT_TTL_SECONDS` | Firma y expiracion de sesion |
| `MAX_TRACK_UPLOAD_MB` / `MAX_SONG_FILE_UPLOAD_MB` | Limite de subida |
| `TRACK_STORAGE_DRIVER` | `local`, `s3`, `r2` o `supabase` |
| `TRACK_STORAGE_LOCAL_ROOT` | Carpeta local cuando el driver es `local` |
| `S3_*` | Credenciales y endpoint para storage compatible S3 |
| `PORT` | Puerto del API (por defecto 4000) |
| `CORS_ORIGINS` | Origenes permitidos separados por coma (vacio = localhost:5173) |

## Scripts

Desde la raiz:

| Script | Descripcion |
| --- | --- |
| `npm run dev` | API + web en paralelo |
| `npm run dev:api` / `npm run dev:web` | Solo una app |
| `npm run build` | Build de ambos workspaces |
| `npm run typecheck` | `tsc --noEmit` en ambos workspaces |
| `npm run prisma:generate` | Regenera el cliente Prisma |
| `npm run prisma:db:push` | Sincroniza schema sin generar migracion |
| `npm run prisma:migrate:dev` / `prisma:migrate:deploy` | Flujo de migraciones |
| `npm run prisma:studio` | Explorador visual de la base |

Por workspace:

```bash
npm test -w @harmonyhub/api
npm test -w @harmonyhub/web
```

## Estado del proyecto

**Canciones**: dominio completo (fases 1-7) con versiones, editor
estructurado con transposicion, pistas de audio, links externos, archivos
adjuntos, notas, colaboracion por hilos de comentarios, feed de actividad y
revisiones con diff y restauracion. Ver `docs/songs-module.md`.

**Setlists**: dominio base, editor visual, asignaciones musicales, cues de
produccion y Stage Mode inicial. Ver `docs/setlists-module.md`.

Plantillas de setlist: guardar un setlist como plantilla y crear nuevos desde
ella (las plantillas no se publican, no se archivan ni se usan en eventos).

**Eventos**: servicios, ensayos y conciertos con fecha, lugar, setlist
vinculado, ciclo de estados (borrador, por confirmar, confirmado, terminado,
cancelado) y equipo con asistencia (cada musico confirma la suya; los lideres
arman el equipo). Vistas de lista, detalle y calendario mensual.

**Dashboard y actividad**: resumen real de la organizacion (proximo evento,
contadores, asistencia pendiente propia y actividad reciente del repertorio).

**Cuenta y organizaciones**: registro, onboarding para crear la primera
organizacion, selector de organizacion activa, vuelta al login cuando la
sesion vence y limite de intentos de login (5 fallos por ip y correo bloquean
15 minutos).

Pendiente: historial de setlists, integracion mas profunda de recursos de
canciones dentro del editor de setlists, aceptar invitaciones desde la web y
pasar Musicos y Archivos a datos reales.
