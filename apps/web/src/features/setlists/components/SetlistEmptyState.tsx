import { ReactNode } from 'react';
import { ListMusic } from 'lucide-react';

export function SetlistEmptyState({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#30333A] bg-[#141518] px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#30333A] bg-[#23252A] text-primary">
        <ListMusic className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">{subtitle}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
