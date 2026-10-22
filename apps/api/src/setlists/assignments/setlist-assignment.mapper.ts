import type { AssignmentPreparationStatus, MembershipRole, SetlistMusicalRole, SetlistParticipantStatus } from '@prisma/client';
import type { UserInstrumentRef } from '../../shared/user-instruments';

/** `instruments` = lo que la persona sabe tocar segun su perfil (principal primero). */
type MapperUserRef = { id: string; name: string; email?: string; avatarUrl: string | null; instruments: UserInstrumentRef[] };

type MapperMembership = { id: string; role: MembershipRole; status?: string; user: MapperUserRef };

type MapperParticipant = {
  id: string;
  status: SetlistParticipantStatus;
  generalRole: string | null;
  generalNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  membership: MapperMembership;
};

export type ParticipantAssignmentCountRow = { participantId: string; preparationStatus: string; _count: number };

export function mapSetlistParticipant(participant: MapperParticipant, counts: ParticipantAssignmentCountRow[]) {
  const ownCounts = counts.filter((row) => row.participantId === participant.id);
  const assignmentsCount = ownCounts.reduce((sum, row) => sum + row._count, 0);
  const readyCount = ownCounts.find((row) => row.preparationStatus === 'READY')?._count ?? 0;
  const pendingCount = ownCounts.find((row) => row.preparationStatus === 'PENDING')?._count ?? 0;

  return {
    id: participant.id,
    status: participant.status,
    generalRole: participant.generalRole,
    generalNote: participant.generalNote,
    membership: {
      id: participant.membership.id,
      role: participant.membership.role,
      user: participant.membership.user,
    },
    assignmentsCount,
    readyCount,
    pendingCount,
    createdAt: participant.createdAt.toISOString(),
    updatedAt: participant.updatedAt.toISOString(),
  };
}

type MapperAssignment = {
  id: string;
  setlistItemId: string;
  participantId: string;
  role: SetlistMusicalRole;
  instrument: string | null;
  label: string | null;
  isPrimary: boolean;
  isRequired: boolean;
  preparationStatus: AssignmentPreparationStatus;
  preparationNote: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  participant: {
    id: string;
    status: SetlistParticipantStatus;
    membership: { id: string; user: Omit<MapperUserRef, 'email'> };
  };
};

export function mapSetlistAssignment(assignment: MapperAssignment) {
  return {
    id: assignment.id,
    setlistItemId: assignment.setlistItemId,
    participantId: assignment.participantId,
    role: assignment.role,
    instrument: assignment.instrument,
    label: assignment.label,
    isPrimary: assignment.isPrimary,
    isRequired: assignment.isRequired,
    preparationStatus: assignment.preparationStatus,
    preparationNote: assignment.preparationNote,
    sortOrder: assignment.sortOrder,
    participant: {
      id: assignment.participant.id,
      status: assignment.participant.status,
      membership: {
        id: assignment.participant.membership.id,
        user: assignment.participant.membership.user,
      },
    },
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  };
}

type MapperRequirement = {
  id: string;
  setlistItemId: string;
  role: SetlistMusicalRole;
  label: string | null;
  minimumCount: number;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function mapSetlistRoleRequirement(requirement: MapperRequirement) {
  return {
    id: requirement.id,
    setlistItemId: requirement.setlistItemId,
    role: requirement.role,
    label: requirement.label,
    minimumCount: requirement.minimumCount,
    isRequired: requirement.isRequired,
    createdAt: requirement.createdAt.toISOString(),
    updatedAt: requirement.updatedAt.toISOString(),
  };
}
