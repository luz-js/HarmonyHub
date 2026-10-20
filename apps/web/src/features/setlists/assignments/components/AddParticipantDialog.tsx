import { useState } from 'react';
import { OverlayDialog } from '../../../../shared/components/OverlayDialog';
import { useAddSetlistParticipant } from '../hooks/useSetlistParticipantMutations';
import { MemberPicker } from './MemberPicker';

export function AddParticipantDialog({
  organizationId,
  setlistId,
  excludeMembershipIds,
  onClose,
}: {
  organizationId: string;
  setlistId: string;
  excludeMembershipIds: string[];
  onClose: () => void;
}) {
  const addMutation = useAddSetlistParticipant(organizationId, setlistId);
  const [error, setError] = useState('');

  function handleSelect(membershipId: string) {
    setError('');
    addMutation.mutate(
      { membershipId },
      {
        onSuccess: () => onClose(),
        onError: (err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo agregar al participante'),
      },
    );
  }

  return (
    <OverlayDialog title="Agregar participante" subtitle="Selecciona un músico de la organización" onClose={onClose}>
      {error && <p className="mb-2 text-sm text-[#F7A39A]">{error}</p>}
      <MemberPicker organizationId={organizationId} excludeMembershipIds={excludeMembershipIds} onSelect={handleSelect} />
    </OverlayDialog>
  );
}
