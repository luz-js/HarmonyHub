import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { WORKSPACE_TABS, type WorkspaceTab } from '../utils/workspaceTabs';

/** Tablist ARIA (desktop: pills en fila; tablet: scroll horizontal). Sin fetching propio. */
export function SongWorkspaceTabs({
  activeTab,
  onChange,
  idPrefix,
}: {
  activeTab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
  idPrefix: string;
}) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % WORKSPACE_TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + WORKSPACE_TABS.length) % WORKSPACE_TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = WORKSPACE_TABS.length - 1;
    if (nextIndex == null) return;

    event.preventDefault();
    const nextTab = WORKSPACE_TABS[nextIndex];
    onChange(nextTab.id);
    buttonRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Recursos de la canción"
      className="flex flex-nowrap gap-2 overflow-x-auto px-4 py-2 lg:flex-wrap lg:overflow-visible"
    >
      {WORKSPACE_TABS.map((tab, index) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            type="button"
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--secondary)] ${
              isActive ? 'bg-primary text-on-primary' : 'bg-white/5 text-muted hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <tab.icon className="h-3.5 w-3.5" /> {tab.label}
          </button>
        );
      })}
    </div>
  );
}
