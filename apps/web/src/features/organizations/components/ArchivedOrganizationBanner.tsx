import { useState } from 'react';
import { Archive } from 'lucide-react';
import type { AppOrganization } from '../../../app/types';
import { useRestoreOrganization } from '../hooks';

/** Aviso fijo dentro de una organizacion archivada: es de solo lectura; un propietario la puede restaurar desde aqui. */
export function ArchivedOrganizationBanner({ organization, onRestored }: { organization: AppOrganization; onRestored: () => void }) {
  const restore = useRestoreOrganization();
  const [error, setError] = useState('');
  const canRestore = organization.role === 'OWNER';

  async function run() {
    setError('');
    try {
      await restore.mutateAsync(organization.id);
      onRestored();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo restaurar la organización');
    }
  }

  return (
    <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#F5A66B]/30 bg-[#2D1D12] px-4 py-3.5 text-[#F5C9A5] sm:flex-row sm:items-center sm:px-5" role="status">
      <span className="flex items-start gap-3">
        <Archive className="mt-0.5 h-5 w-5 shrink-0 text-[#F5A66B]" />
        <span className="text-sm">
          <strong className="text-white">{organization.name} está archivada.</strong> Puedes consultar todo, pero nadie puede hacer cambios.
          {error && <span className="mt-1 block text-[#F7A39A]">{error}</span>}
        </span>
      </span>
      {canRestore && (
        <button type="button" className="btn-ghost shrink-0 sm:ml-auto" onClick={run} disabled={restore.isPending}>
          {restore.isPending ? 'Restaurando...' : 'Restaurar'}
        </button>
      )}
    </section>
  );
}
