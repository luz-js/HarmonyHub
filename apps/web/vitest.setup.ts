import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

/**
 * Con `globals: false` (vitest.config.ts), React Testing Library no puede auto-registrar su
 * limpieza entre tests (su deteccion interna depende de `globalThis.afterEach`, que no existe
 * aqui) — cada `render()` quedaba acumulado en el DOM entre tests dentro del mismo archivo.
 * Se registra explicitamente para que cada test empiece con un DOM limpio.
 */
afterEach(() => {
  cleanup();
});

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
