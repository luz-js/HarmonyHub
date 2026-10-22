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
