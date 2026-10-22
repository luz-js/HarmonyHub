export type BarListItem = { id: string; label: string; detail?: string; value: number; onClick?: () => void };

/** Barras horizontales con CSS (sin librerias de graficos): el largo es proporcional al mayor valor. */
export function BarList({ items, valueLabel, emptyText }: { items: BarListItem[]; valueLabel: (value: number) => string; emptyText: string }) {
  if (items.length === 0) return <p className="text-sm text-muted">{emptyText}</p>;
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ol className="space-y-2.5">
      {items.map((item) => {
        const content = (
          <>
            <span className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-semibold text-white">
                {item.label}
                {item.detail && <span className="ml-1.5 font-normal text-muted">{item.detail}</span>}
              </span>
              <span className="shrink-0 text-[13px] text-[#D8D5CE]">{valueLabel(item.value)}</span>
            </span>
            <span className="mt-1 block h-2 overflow-hidden rounded-full bg-[#23252A]" aria-hidden="true">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }} />
            </span>
          </>
        );
        return (
          <li key={item.id}>
            {item.onClick ? (
              <button type="button" className="block w-full rounded-lg text-left transition hover:opacity-90" onClick={item.onClick}>
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
}
