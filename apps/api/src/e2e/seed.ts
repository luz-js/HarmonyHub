import type { MembershipRole } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

/** Ids de todo lo que existe en una organizacion de prueba. Los textos llevan la marca SECRETO-<tag> para detectar fugas. */
export type SeededOrg = Awaited<ReturnType<typeof seedOrganization>>;

const ROLES: MembershipRole[] = ['OWNER', 'ADMIN', 'LEADER', 'MUSICIAN', 'GUEST'];

export async function seedOrganization(prisma: PrismaService, tag: string) {
  const secret = `SECRETO-${tag}`;
  const organization = await prisma.organization.create({ data: { name: `Org ${tag} ${secret}`, slug: `org-${tag.toLowerCase()}` } });

  const users = {} as Record<MembershipRole, { userId: string; membershipId: string; email: string }>;
  for (const role of ROLES) {
    const email = `${role.toLowerCase()}-${tag.toLowerCase()}@e2e.test`;
    const user = await prisma.user.create({ data: { name: `${role} ${tag} ${secret}`, email, passwordHash: 'e2e-sin-login', phone: `555-${tag}` } });
    const membership = await prisma.membership.create({ data: { userId: user.id, organizationId: organization.id, role } });
    users[role] = { userId: user.id, membershipId: membership.id, email };
  }
  const musician = users.MUSICIAN;

  const song = await prisma.song.create({
    data: { organizationId: organization.id, title: `Cancion ${secret}`, artist: secret, originalKey: 'C', currentKey: 'C' },
  });
  const version = await prisma.songVersion.create({ data: { songId: song.id, name: `Version ${secret}`, key: 'C', isDefault: true } });
  const track = await prisma.songTrack.create({ data: { songId: song.id, name: `Pista ${secret}`, url: 'https://example.com/pista.mp3' } });
  const link = await prisma.songLink.create({ data: { songId: song.id, url: 'https://example.com/enlace' } });
  const file = await prisma.file.create({ data: { organizationId: organization.id, name: `Archivo ${secret}.pdf`, type: 'PDF' } });
  const songFile = await prisma.songFile.create({ data: { songId: song.id, fileId: file.id } });
  const note = await prisma.songNote.create({
    data: { songId: song.id, organizationId: organization.id, authorId: musician.userId, content: `Nota ${secret}` },
  });
  const thread = await prisma.songCommentThread.create({ data: { songId: song.id, organizationId: organization.id, createdById: musician.userId } });
  const comment = await prisma.songComment.create({ data: { threadId: thread.id, authorId: musician.userId, content: `Comentario ${secret}` } });
  await prisma.songVersionRevision.create({
    data: { songId: song.id, versionId: version.id, organizationId: organization.id, revisionNumber: 1, source: 'MANUAL_SAVE', name: `Revision ${secret}`, contentHash: 'e2e' },
  });

  const setlist = await prisma.setlist.create({ data: { organizationId: organization.id, name: `Setlist ${secret}` } });
  const item = await prisma.setlistItem.create({ data: { setlistId: setlist.id, title: `Item ${secret}`, order: 1, type: 'SONG', songId: song.id, songVersionId: version.id } });
  const participant = await prisma.setlistParticipant.create({ data: { setlistId: setlist.id, membershipId: musician.membershipId } });
  const assignment = await prisma.setlistAssignment.create({ data: { setlistItemId: item.id, participantId: participant.id, role: 'BASS' } });
  const requirement = await prisma.setlistRoleRequirement.create({ data: { setlistItemId: item.id, role: 'BASS' } });
  const cue = await prisma.setlistCue.create({
    data: { setlistId: setlist.id, setlistItemId: item.id, type: 'COUNT_IN', title: `Cue ${secret}`, responsibleParticipantId: participant.id },
  });

  const event = await prisma.event.create({ data: { organizationId: organization.id, name: `Evento ${secret}`, startsAt: new Date(Date.now() + 7 * 86_400_000) } });
  const eventMusician = await prisma.eventMusician.create({ data: { eventId: event.id, membershipId: musician.membershipId } });
  const invitation = await prisma.invitation.create({
    data: { organizationId: organization.id, email: `invitado-${tag.toLowerCase()}@e2e.test`, token: `token-${tag}`, expiresAt: new Date(Date.now() + 86_400_000) },
  });

  return {
    tag,
    secret,
    organizationId: organization.id,
    users,
    songId: song.id,
    versionId: version.id,
    trackId: track.id,
    linkId: link.id,
    songFileId: songFile.id,
    noteId: note.id,
    threadId: thread.id,
    commentId: comment.id,
    setlistId: setlist.id,
    itemId: item.id,
    participantId: participant.id,
    assignmentId: assignment.id,
    requirementId: requirement.id,
    cueId: cue.id,
    eventId: event.id,
    eventMusicianId: eventMusician.id,
    invitationId: invitation.id,
    invitationToken: invitation.token,
  };
}

/** Foto de todo lo de una organizacion, para comprobar que nadie de afuera la modifico. */
export async function snapshotOrganization(prisma: PrismaService, organizationId: string) {
  const songs = await prisma.song.findMany({
    where: { organizationId },
    include: { versions: true, tracks: true, links: true, songFiles: true, songNotes: true, commentThreads: { include: { comments: true } }, revisions: true },
    orderBy: { id: 'asc' },
  });
  const setlists = await prisma.setlist.findMany({
    where: { organizationId },
    include: { items: { include: { assignments: true, roleRequirements: true } }, participants: true, cues: true },
    orderBy: { id: 'asc' },
  });
  const events = await prisma.event.findMany({ where: { organizationId }, include: { musicians: true }, orderBy: { id: 'asc' } });
  const memberships = await prisma.membership.findMany({ where: { organizationId }, orderBy: { id: 'asc' } });
  const invitations = await prisma.invitation.findMany({ where: { organizationId }, orderBy: { id: 'asc' } });
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  return JSON.parse(JSON.stringify({ organization, songs, setlists, events, memberships, invitations }));
}
