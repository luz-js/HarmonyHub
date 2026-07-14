/**
 * Linea horizontal animada, puramente visual. El target real del drop sigue siendo cada
 * card (via useSortable) para no arriesgar un "solte y no paso nada" si el puntero cae
 * justo en una franja angosta; esto solo resalta el hueco donde caeria el item.
 */
export function SetlistDropZone({ active }: { active: boolean }) {
  return (
    <div className="relative my-0.5 h-2">
      <div
        className={`absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-full bg-[var(--primary)] transition-all duration-150 ${
          active ? 'h-1 opacity-90 shadow-[0_0_12px_rgba(24,224,174,0.6)]' : 'h-0 opacity-0'
        }`}
      />
    </div>
  );
}
