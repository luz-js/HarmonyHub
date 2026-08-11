import { AlertTriangle } from 'lucide-react';
import type { CueWarning } from '../../../../shared/types';

export function CueWarningsAlert({ warnings }: { warnings: CueWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-[#f3b33e]/30 bg-[#f3b33e]/10 px-3 py-2 text-xs text-[#ffd37b]">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>
        <p className="font-semibold">
          {warnings.length} advertencia{warnings.length === 1 ? '' : 's'} de produccion
        </p>
        <ul className="mt-1 space-y-0.5">
          {warnings.slice(0, 8).map((warning, index) => (
            <li key={`${warning.cueId}-${warning.code}-${index}`}>{warning.message}</li>
          ))}
          {warnings.length > 8 && <li>+ {warnings.length - 8} mas</li>}
        </ul>
      </div>
    </div>
  );
}
