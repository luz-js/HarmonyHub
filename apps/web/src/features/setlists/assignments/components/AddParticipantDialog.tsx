import { useState } from 'react';
import { OverlayDialog } from '../../../../shared/components/OverlayDialog';
import { availabilityByMembership, useSetlistAvailability } from '../../../availability/hooks';
import { formatEventMoment } from '../../../availability/utils/availability.utils';
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
  const availabilityQuery = useSetlistAvailability(organizationId, setlistId, true);
  const nextEvent = availabilityQuery.data?.event;

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
      {nextEvent && (
        <p className="mb-2 text-xs text-muted">
          Disponibilidad para <span className="font-semibold text-white">{nextEvent.name}</span> ({formatEventMoment(nextEvent.startsAt)}), el próximo evento con este setlist.
        </p>
      )}
      <MemberPicker
        organizationId={organizationId}
        excludeMembershipIds={excludeMembershipIds}
        onSelect={handleSelect}
        availability={availabilityByMembership(availabilityQuery.data?.members)}
      />
    </OverlayDialog>
  );
}
