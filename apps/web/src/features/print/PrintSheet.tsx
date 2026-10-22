import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Exportar a PDF desde el navegador: se dibuja una hoja solo para imprimir (fuera de la app, que se oculta al
 * imprimir) y se abre el dialogo de impresion, donde se elige "Guardar como PDF". Sin librerias ni carga en la API:
 * la letra sale como texto (se puede copiar y buscar), con tildes y saltos de pagina por CSS (ver index.css).
 * El titulo del documento se usa como nombre sugerido del PDF.
 */
export function PrintSheet({ title, onDone, children }: { title: string; onDone: () => void; children: ReactNode }) {
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    const finish = () => {
      document.title = previousTitle;
      done.current();
    };
    window.addEventListener('afterprint', finish, { once: true });
    // Un cuadro para que la hoja ya este en el DOM antes de abrir el dialogo.
    const frame = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', finish);
      document.title = previousTitle;
    };
  }, [title]);

  return createPortal(<div className="print-sheet">{children}</div>, document.body);
}
