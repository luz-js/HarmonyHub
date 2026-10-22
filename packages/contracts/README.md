# @harmonyhub/contracts

Lo que la API y la web acuerdan: **un solo lugar** para la forma de los datos que viajan entre las dos.

- **Pedidos (requests):** esquemas [zod](https://zod.dev). La API los usa para validar el cuerpo o la query
  (`ZodPipe` en los controllers) y la web usa `z.input<typeof esquema>` como tipo de lo que envía.
- **Respuestas:** tipos TypeScript con las fechas como `string` (así llegan por JSON). En la API, archivos
  `*.contract-check.ts` comprueban al compilar que lo que devuelven los servicios encaja con estos tipos.

## Cómo lo usa cada app

| App | Tipos (tsc) | Código en ejecución |
| --- | --- | --- |
| API (Nest, CommonJS) | `dist/index.d.ts` | `dist/index.js` (se compila antes de `dev`, `test`, `typecheck` y `build` de la API) |
| Web (Vite) | `src/index.ts` (alias en `tsconfig.json`) | `src/index.ts` (alias en `vite.config.ts`) |

`npm ci` / `npm install` lo compilan solos (`postinstall` en la raíz). Si cambias un esquema con `npm run dev`
corriendo, reinicia la API para que tome la versión nueva.

## Reglas

- Nada de Prisma, Nest ni React aquí: solo zod y tipos. Las listas de valores (roles, estados) se copian como
  arrays y una prueba de la API verifica que sigan iguales a los enums de Prisma.
- Los mensajes de error de los esquemas son los que ve la persona: cambiarlos cambia la app.

## Excepciones (validan en el servicio, con el esquema del contrato)

En estas rutas el cuerpo se valida con `parseOrBadRequest` **dentro del servicio**, no con `ZodPipe`, porque
antes hay que comprobar otra cosa y esa respuesta tiene que llegar primero:

| Ruta | Qué se comprueba antes |
| --- | --- |
| Estado de preparación de una asignación | que la asignación sea tuya (o seas líder) → 403 |
| Estado de un cue | que seas responsable del cue (o líder) → 403 |
| Editar una conversación / un comentario | que seas el autor (o líder) → 403 |
| Editar una nota | que puedas modificarla → 403 |
| Subir una pista / un archivo | el archivo (que venga, tipo y tamaño) → 400 |

Sin esquema (como antes): la lista de canciones (`GET /api/songs`, filtros sueltos) y duplicar un item
(`includeCues`). Los `metadata` de los cues se validan por tipo de cue en el servicio.

## Comprobar las respuestas

Cada módulo de la API tiene un `*.contract-check.ts` que solo existe para el compilador: compara lo que devuelve
el servicio (con las fechas como texto, `Wire<T>`) contra el tipo de respuesta. Las columnas JSON
(`contentJson`, `structureJson`, `metadata`) no se pueden comprobar así y quedan afuera.
