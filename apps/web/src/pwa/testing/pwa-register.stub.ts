/** Reemplazo de `virtual:pwa-register` en las pruebas (vitest no usa el plugin PWA). */
export function registerSW() {
  return async () => {};
}
