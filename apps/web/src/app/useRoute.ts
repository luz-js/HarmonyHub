import { useEffect, useState } from 'react';

export function useRoute() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  /** Acepta `?query` en el href (las paginas lo leen de window.location); la ruta es solo el pathname. Cada pantalla nueva empieza arriba. */
  function navigate(href: string) {
    window.history.pushState({}, '', href);
    setPath(new URL(href, window.location.origin).pathname);
    window.scrollTo(0, 0);
  }

  return { path, navigate };
}
