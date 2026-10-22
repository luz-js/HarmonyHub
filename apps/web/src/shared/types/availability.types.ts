/** Una fecha (o rango de fechas) en que la persona no puede tocar. Dias AAAA-MM-DD, ambos incluidos. */
export type Unavailability = {
  id: string;
  startsOn: string;
  endsOn: string;
  /** Privada: solo la ve la propia persona en "Mi perfil". */
  note: string | null;
  createdAt: string;
};

export type CreateUnavailabilityInput = { startsOn: string; endsOn: string; note?: string | null };

export type AvailabilityConflict = { eventId: string; name: string; startsAt: string };

/** Lo que un lider ve de cada miembro para un evento: nunca la nota, solo si esta disponible. */
export type MemberAvailability = {
  membershipId: string;
  userId: string;
  name: string;
  unavailable: boolean;
  conflicts: AvailabilityConflict[];
};

export type TeamAvailability = {
  /** El evento con el que se compara (para un setlist, su proximo evento; null si no tiene). */
  event: { id: string; name: string; startsAt: string; endsAt: string | null } | null;
  members: MemberAvailability[];
  suggestions: { membershipId: string; name: string; isPrimary: boolean }[];
};
