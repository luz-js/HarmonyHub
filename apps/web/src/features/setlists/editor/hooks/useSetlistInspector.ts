import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery';

export type InspectorMode = 'side' | 'drawer' | 'sheet';

/** Desktop: panel lateral siempre montado. Tablet: drawer. Movil: bottom sheet. */
export function useSetlistInspector({
  inspectorOpen,
  setInspectorOpen,
}: {
  inspectorOpen: boolean;
  setInspectorOpen: (value: boolean) => void;
}) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 768px)');

  const mode: InspectorMode = isDesktop ? 'side' : isTablet ? 'drawer' : 'sheet';

  return {
    mode,
    isOpen: mode === 'side' ? true : inspectorOpen,
    open: () => setInspectorOpen(true),
    close: () => setInspectorOpen(false),
  };
}
