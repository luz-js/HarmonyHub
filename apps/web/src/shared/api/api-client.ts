import type {
  AcceptedInvitation,
  AppNotification,
  ImportChordProInput,
  ImportChordProResult,
  AdvanceLiveStageInput,
  HandoverLiveStageInput,
  LiveStageState,
  StartLiveStageInput,
  ArchiveOrganizationInput,
  TransferOrganizationInput,
  LoginInput,
  RegisterInput,
  CreateUnavailabilityInput,
  SetlistMusicalRole,
  TeamAvailability,
  Unavailability,
  NotificationsPage,
  CreateInvitationInput,
  MyInvitation,
  CurrentUser,
  InvitationSummary,
  OrganizationFile,
  OrganizationMember,
  OrganizationSummary,
  ReplaceMyInstrumentsInput,
  UpdateMembershipInput,
  UpdateMeInput,
  UserInstrument,
  SongActivityPage,
  SongActivityType,
  SongComment,
  SongCommentTarget,
  SongCommentThread,
  SongDetail,
  SongEntityType,
  SongFile,
  SongFileCategory,
  SongLink,
  SongNote,
  SongNoteVisibility,
  SongPayload,
  SongRevisionDiffResult,
  SongSummary,
  SongThreadStatus,
  SongTrack,
  SongTrackType,
  SongVersion,
  SongVersionRevision,
  AddEventMusicianInput,
  AddSetlistParticipantInput,
  CreateEventInput,
  DashboardActivityItem,
  DashboardSummary,
  EventDetail,
  EventListFilters,
  EventListResponse,
  UpdateEventInput,
  UpdateEventMusicianInput,
  CopySetlistAssignmentsInput,
  CopySetlistCuesInput,
  CreateSetlistAssignmentInput,
  CreateSetlistCueInput,
  CreateSetlistInput,
  CreateSetlistItemInput,
  CreateSetlistRoleRequirementInput,
  ReorderSetlistCuesInput,
  SaveSetlistAsTemplateInput,
  MemberLoadStats,
  RepertoireStats,
  StatsPeriodMonths,
  CreatedShareLink,
  CreateShareLinkInput,
  ShareLinkList,
  SetlistAssignment,
  SetlistCue,
  SetlistDetail,
  SetlistItem,
  SetlistListResponse,
  SetlistParticipant,
  SetlistProduction,
  SetlistRoleRequirement,
  SetlistStatus,
  SetlistTeam,
  UpdateAssignmentPreparationInput,
  UpdateSetlistAssignmentInput,
  UpdateSetlistCueInput,
  UpdateSetlistCueStatusInput,
  UpdateSetlistItemInput,
  UpdateSetlistParticipantInput,
  UpdateSetlistRoleRequirementInput,
} from '../types';
import { assertOnlineForChanges, buildAuthHeaders, ensureFreshAccessToken, http, requestBlob, setAuthToken, setCurrentOrganizationId } from './http';
import type {
  CopySongTracksInput,
  CreateSongCommentInput,
  CreateSongLinkInput,
  CreateSongNoteInput,
  CreateSongThreadInput,
  CreateSongTrackInput,
  ReorderSongFilesInput,
  ReorderSongLinksInput,
  ReorderSongTracksInput,
  RestoreSongRevisionInput,
  UpdateSongCommentInput,
  UpdateSongLinkInput,
  UpdateSongNoteInput,
  UpdateSongThreadInput,
  UpdateSongTrackInput,
} from '@harmonyhub/contracts';

export async function loginRequest(input: LoginInput) {
  const data = await http<{ ok: boolean; user: CurrentUser; accessToken: string }>('/api/login', { method: 'POST', body: JSON.stringify(input) });
  setAuthToken(data.accessToken);
  if (data.user.currentOrganizationId) setCurrentOrganizationId(data.user.currentOrganizationId);
  return data.user;
}

export function registerRequest(input: RegisterInput) {
  return http<{ ok: boolean; user: CurrentUser; accessToken: string; next: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(input) }).then((data) => {
    setAuthToken(data.accessToken);
    if (data.user.currentOrganizationId) setCurrentOrganizationId(data.user.currentOrganizationId);
    return data;
  });
}

export function getCurrentUser() {
  return http<{ ok: boolean; user: CurrentUser }>('/api/auth/me');
}

/** Cierra la sesion en el servidor (revoca el refresh token de la cookie). Si falla, el cierre local sigue igual. */
export function logoutRequest() {
  return http<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }).catch(() => null);
}

/** Avisos de la persona: los de la organizacion activa y sus invitaciones. Paginado por cursor. */
export function getNotifications(options: { cursor?: string | null; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.limit) params.set('limit', String(options.limit));
  const query = params.toString();
  return http<NotificationsPage>(`/api/notifications${query ? `?${query}` : ''}`);
}

export function getUnreadNotificationsCount() {
  return http<{ unread: number }>('/api/notifications/unread-count');
}

export function markNotificationRead(id: string) {
  return http<AppNotification>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead() {
  return http<{ updated: number }>('/api/notifications/read-all', { method: 'POST' });
}

/** "Mi perfil" > No disponible: las fechas bloqueadas de la persona (valen en todas sus organizaciones). */
export function getMyUnavailability() {
  return http<Unavailability[]>('/api/me/unavailability');
}

export function createMyUnavailability(input: CreateUnavailabilityInput) {
  return http<Unavailability>('/api/me/unavailability', { method: 'POST', body: JSON.stringify(input) });
}

export function deleteMyUnavailability(id: string) {
  return http<{ ok: boolean }>(`/api/me/unavailability/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Zona horaria del navegador: el servidor la usa para saber que dia cae un evento para quien consulta. */
function availabilityQuery(role?: SetlistMusicalRole) {
  const params = new URLSearchParams({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' });
  if (role) params.set('role', role);
  return params.toString();
}

/** Quien no esta disponible o ya tiene otro evento a esa hora (solo lideres; nunca incluye notas privadas). */
export function getEventAvailability(eventId: string, role?: SetlistMusicalRole) {
  return http<TeamAvailability>(`/api/events/${encodeURIComponent(eventId)}/availability?${availabilityQuery(role)}`);
}

/** Igual que el de eventos, comparando con el proximo evento que usa el setlist. */
export function getSetlistAvailability(setlistId: string, role?: SetlistMusicalRole) {
  return http<TeamAvailability>(`/api/setlists/${encodeURIComponent(setlistId)}/availability?${availabilityQuery(role)}`);
}

/** Modo escenario en vivo (el stream se abre aparte, con openAuthorizedStream). */
export function getLiveStage(setlistId: string) {
  return http<LiveStageState>(`/api/setlists/${encodeURIComponent(setlistId)}/live`);
}

export function startLiveStage(setlistId: string, input: StartLiveStageInput = {}) {
  return http<LiveStageState>(`/api/setlists/${encodeURIComponent(setlistId)}/live/start`, { method: 'POST', body: JSON.stringify(input) });
}

export function advanceLiveStage(setlistId: string, input: AdvanceLiveStageInput) {
  return http<LiveStageState>(`/api/setlists/${encodeURIComponent(setlistId)}/live/advance`, { method: 'POST', body: JSON.stringify(input) });
}

export function handoverLiveStage(setlistId: string, input: HandoverLiveStageInput) {
  return http<LiveStageState>(`/api/setlists/${encodeURIComponent(setlistId)}/live/handover`, { method: 'POST', body: JSON.stringify(input) });
}

export function endLiveStage(setlistId: string) {
  return http<LiveStageState>(`/api/setlists/${encodeURIComponent(setlistId)}/live/end`, { method: 'POST', body: '{}' });
}

/** Importar una cancion (o una version nueva) desde texto ChordPro. */
export function importChordPro(input: ImportChordProInput) {
  return http<ImportChordProResult>('/api/songs/import/chordpro', { method: 'POST', body: JSON.stringify(input) });
}

/** Guarda en la cuenta la organizacion activa, para abrirla en cualquier dispositivo. */
export function saveActiveOrganization(organizationId: string) {
  return http<{ ok: boolean; activeOrganizationId: string }>('/api/me/active-organization', { method: 'PUT', body: JSON.stringify({ organizationId }) });
}

/** "Mi perfil": siempre sobre el usuario de la sesion. */
export function updateMe(input: UpdateMeInput) {
  return http<{ ok: boolean; user: Pick<CurrentUser, 'id' | 'name' | 'email' | 'phone' | 'avatarUrl'> }>('/api/me', { method: 'PATCH', body: JSON.stringify(input) });
}

export function replaceMyInstruments(input: ReplaceMyInstrumentsInput) {
  return http<{ ok: boolean; instruments: UserInstrument[] }>('/api/me/instruments', { method: 'PUT', body: JSON.stringify(input) });
}

export function getOrganizations() {
  return http<Array<{ organization: OrganizationSummary; role: string }>>('/api/organizations');
}

export function createOrganization(input: { name: string; type: string; description?: string; primaryColor?: string }) {
  return http<OrganizationSummary>('/api/organizations', { method: 'POST', body: JSON.stringify(input) });
}

/** Salir de una organizacion: la membresia queda inactiva. El ultimo propietario no puede. */
export function leaveOrganization(id: string) {
  return http<{ ok: boolean }>(`/api/organizations/${encodeURIComponent(id)}/leave`, { method: 'POST' });
}

export function transferOrganization(id: string, input: TransferOrganizationInput) {
  return http<{ ok: boolean }>(`/api/organizations/${encodeURIComponent(id)}/transfer`, { method: 'POST', body: JSON.stringify(input) });
}

export function archiveOrganization(id: string, confirmName: string) {
  const input: ArchiveOrganizationInput = { confirmName };
  return http<OrganizationSummary>(`/api/organizations/${encodeURIComponent(id)}/archive`, { method: 'POST', body: JSON.stringify(input) });
}

export function restoreOrganization(id: string) {
  return http<OrganizationSummary>(`/api/organizations/${encodeURIComponent(id)}/restore`, { method: 'POST' });
}

export function getMemberships(organizationId: string) {
  return http<OrganizationMember[]>(`/api/memberships?organizationId=${encodeURIComponent(organizationId)}`);
}

export function updateMembership(id: string, input: UpdateMembershipInput) {
  return http<Pick<OrganizationMember, 'id' | 'role' | 'status'>>(`/api/memberships/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function getInvitations(organizationId: string) {
  return http<InvitationSummary[]>(`/api/invitations?organizationId=${encodeURIComponent(organizationId)}`);
}

export function createInvitation(input: CreateInvitationInput) {
  return http<InvitationSummary>('/api/invitations', { method: 'POST', body: JSON.stringify(input) });
}

export function acceptInvitation(token: string) {
  return http<InvitationSummary>(`/api/invitations/${token}/accept`, { method: 'POST' });
}

/** "Mis invitaciones": las del correo de la sesion, en cualquier organizacion. */
export function getMyInvitations() {
  return http<MyInvitation[]>('/api/me/invitations');
}

export function acceptMyInvitation(id: string) {
  return http<AcceptedInvitation>(`/api/me/invitations/${encodeURIComponent(id)}/accept`, { method: 'POST' });
}

export function declineMyInvitation(id: string) {
  return http<InvitationSummary>(`/api/me/invitations/${encodeURIComponent(id)}/decline`, { method: 'POST' });
}

export function cancelInvitation(id: string) {
  return http<InvitationSummary>(`/api/invitations/${id}/cancel`, { method: 'PATCH' });
}

export function listSongs(organizationId: string, filters: Record<string, string> = {}) {
  const params = new URLSearchParams({ organizationId });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return http<SongSummary[]>(`/api/songs?${params.toString()}`);
}

export function getSong(id: string) {
  return http<SongDetail>(`/api/songs/${id}`);
}

export function getSongVersions(songId: string) {
  return http<SongVersion[]>(`/api/songs/${songId}/versions`);
}

export function getSongVersion(songId: string, versionId: string) {
  return http<SongVersion>(`/api/songs/${songId}/versions/${versionId}`);
}

export function getSongTracks(songId: string, filters?: { versionId?: string | null; includeGeneral?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.versionId) params.set('versionId', filters.versionId);
  if (filters?.includeGeneral === false) params.set('includeGeneral', 'false');
  const query = params.toString();
  return http<SongTrack[]>(`/api/songs/${songId}/tracks${query ? `?${query}` : ''}`);
}

export function getSongTrack(songId: string, trackId: string) {
  return http<SongTrack>(`/api/songs/${songId}/tracks/${trackId}`);
}

export function getSongLinks(songId: string, filters?: { versionId?: string | null }) {
  const params = new URLSearchParams();
  if (filters?.versionId) params.set('versionId', filters.versionId);
  const query = params.toString();
  return http<SongLink[]>(`/api/songs/${songId}/links${query ? `?${query}` : ''}`);
}

export function getSongLink(songId: string, linkId: string) {
  return http<SongLink>(`/api/songs/${songId}/links/${linkId}`);
}

/** Archivos de todas las canciones de la organizacion activa (pagina Archivos). */
export function listOrganizationFiles() {
  return http<{ items: OrganizationFile[] }>('/api/files?limit=200');
}

export function getSongFiles(songId: string, filters?: { versionId?: string | null; category?: SongFileCategory }) {
  const params = new URLSearchParams();
  if (filters?.versionId) params.set('versionId', filters.versionId);
  if (filters?.category) params.set('category', filters.category);
  const query = params.toString();
  return http<SongFile[]>(`/api/songs/${songId}/files${query ? `?${query}` : ''}`);
}

export function getSongFile(songId: string, songFileId: string) {
  return http<SongFile>(`/api/songs/${songId}/files/${songFileId}`);
}

export function uploadSongFile(
  songId: string,
  input: {
    file: File;
    title?: string;
    description?: string;
    category: SongFileCategory;
    versionId?: string | null;
    isPrimary?: boolean;
  },
  onProgress?: (progress: number) => void,
) {
  // La subida usa XMLHttpRequest (para el progreso), que no pasa por http(): se renueva el token antes si hace falta.
  assertOnlineForChanges();
  return ensureFreshAccessToken().then(() => new Promise<SongFile>((resolve, reject) => {
    const formData = new FormData();
    formData.set('file', input.file);
    formData.set('category', input.category);
    if (input.title) formData.set('title', input.title);
    if (input.description) formData.set('description', input.description);
    if (input.versionId) formData.set('versionId', input.versionId);
    if (input.isPrimary !== undefined) formData.set('isPrimary', String(input.isPrimary));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/songs/${songId}/files/upload`);
    const headers = buildAuthHeaders();
    headers.forEach((value, key) => xhr.setRequestHeader(key, value));
    xhr.responseType = 'json';

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onerror = () => reject(new Error('No se pudo subir el archivo'));
    xhr.onload = () => {
      const response = typeof xhr.response === 'string' ? JSON.parse(xhr.response) : xhr.response || JSON.parse(xhr.responseText || 'null');
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(response as SongFile);
        return;
      }
      reject(new Error(response?.message || 'No se pudo subir el archivo'));
    };

    xhr.send(formData);
  }));
}

export function updateSongFile(songId: string, songFileId: string, input: Partial<{
  title: string;
  description: string | null;
  category: SongFileCategory;
  versionId: string | null;
  isPrimary: boolean;
  active: boolean;
  sortOrder: number;
}>) {
  return http<SongFile>(`/api/songs/${songId}/files/${songFileId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteSongFile(songId: string, songFileId: string) {
  return http<{ ok: boolean }>(`/api/songs/${songId}/files/${songFileId}`, { method: 'DELETE' });
}

export function setPrimarySongFile(songId: string, songFileId: string) {
  return http<SongFile>(`/api/songs/${songId}/files/${songFileId}/set-primary`, { method: 'POST' });
}

export function reorderSongFiles(songId: string, input: ReorderSongFilesInput) {
  return http<SongFile[]>(`/api/songs/${songId}/files/reorder`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function streamSongFile(songId: string, songFileId: string) {
  return requestBlob(`/api/songs/${songId}/files/${songFileId}/stream`);
}

export function downloadSongFile(songId: string, songFileId: string) {
  return requestBlob(`/api/songs/${songId}/files/${songFileId}/download`);
}

export function getSongNotes(songId: string, filters?: { versionId?: string | null; visibility?: SongNoteVisibility; includeArchived?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.versionId) params.set('versionId', filters.versionId);
  if (filters?.visibility) params.set('visibility', filters.visibility);
  if (filters?.includeArchived) params.set('includeArchived', 'true');
  const query = params.toString();
  return http<SongNote[]>(`/api/songs/${songId}/notes${query ? `?${query}` : ''}`);
}

export function getSongNote(songId: string, noteId: string) {
  return http<SongNote>(`/api/songs/${songId}/notes/${noteId}`);
}

export function createSong(input: SongPayload) {
  return http<SongSummary>('/api/songs', { method: 'POST', body: JSON.stringify(input) });
}

export function updateSong(id: string, input: SongPayload) {
  return http<SongSummary>(`/api/songs/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function archiveSong(id: string) {
  return http<SongSummary>(`/api/songs/${id}`, { method: 'DELETE' });
}

export function createSongVersion(songId: string, input: Partial<SongVersion>) {
  return http<SongVersion>(`/api/songs/${songId}/versions`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSongVersion(songId: string, versionId: string, input: Partial<SongVersion>) {
  return http<SongVersion>(`/api/songs/${songId}/versions/${versionId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteSongVersion(songId: string, versionId: string) {
  return http<{ ok: boolean }>(`/api/songs/${songId}/versions/${versionId}`, { method: 'DELETE' });
}

export function setDefaultSongVersion(songId: string, versionId: string) {
  return http<SongVersion>(`/api/songs/${songId}/versions/${versionId}/set-default`, { method: 'POST' });
}

export function createSongLink(songId: string, input: CreateSongLinkInput) {
  return http<SongLink>(`/api/songs/${songId}/links`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSongLink(songId: string, linkId: string, input: UpdateSongLinkInput) {
  return http<SongLink>(`/api/songs/${songId}/links/${linkId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteSongLink(songId: string, linkId: string) {
  return http<{ ok: boolean }>(`/api/songs/${songId}/links/${linkId}`, { method: 'DELETE' });
}

export function setPrimarySongLink(songId: string, linkId: string) {
  return http<SongLink>(`/api/songs/${songId}/links/${linkId}/set-primary`, { method: 'POST' });
}

export function reorderSongLinks(songId: string, input: ReorderSongLinksInput) {
  return http<SongLink[]>(`/api/songs/${songId}/links/reorder`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function createSongNote(songId: string, input: CreateSongNoteInput) {
  return http<SongNote>(`/api/songs/${songId}/notes`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSongNote(songId: string, noteId: string, input: UpdateSongNoteInput) {
  return http<SongNote>(`/api/songs/${songId}/notes/${noteId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteSongNote(songId: string, noteId: string) {
  return http<{ ok: boolean }>(`/api/songs/${songId}/notes/${noteId}`, { method: 'DELETE' });
}

export function pinSongNote(songId: string, noteId: string) {
  return http<SongNote>(`/api/songs/${songId}/notes/${noteId}/pin`, { method: 'POST' });
}

export function archiveSongNote(songId: string, noteId: string) {
  return http<SongNote>(`/api/songs/${songId}/notes/${noteId}/archive`, { method: 'POST' });
}

export function getSongThreads(songId: string, filters?: { versionId?: string | null; status?: SongThreadStatus; targetType?: SongCommentTarget; targetRef?: string }) {
  const params = new URLSearchParams();
  if (filters?.versionId) params.set('versionId', filters.versionId);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.targetType) params.set('targetType', filters.targetType);
  if (filters?.targetRef) params.set('targetRef', filters.targetRef);
  const query = params.toString();
  return http<SongCommentThread[]>(`/api/songs/${songId}/threads${query ? `?${query}` : ''}`);
}

export function getSongThread(songId: string, threadId: string) {
  return http<SongCommentThread>(`/api/songs/${songId}/threads/${threadId}`);
}

export function createSongThread(songId: string, input: CreateSongThreadInput) {
  return http<SongCommentThread>(`/api/songs/${songId}/threads`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSongThread(songId: string, threadId: string, input: UpdateSongThreadInput) {
  return http<SongCommentThread>(`/api/songs/${songId}/threads/${threadId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function resolveSongThread(songId: string, threadId: string) {
  return http<SongCommentThread>(`/api/songs/${songId}/threads/${threadId}/resolve`, { method: 'POST' });
}

export function reopenSongThread(songId: string, threadId: string) {
  return http<SongCommentThread>(`/api/songs/${songId}/threads/${threadId}/reopen`, { method: 'POST' });
}

export function createSongComment(songId: string, threadId: string, input: CreateSongCommentInput) {
  return http<SongComment>(`/api/songs/${songId}/threads/${threadId}/comments`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSongComment(songId: string, threadId: string, commentId: string, input: UpdateSongCommentInput) {
  return http<SongComment>(`/api/songs/${songId}/threads/${threadId}/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteSongComment(songId: string, threadId: string, commentId: string) {
  return http<{ ok: boolean }>(`/api/songs/${songId}/threads/${threadId}/comments/${commentId}`, { method: 'DELETE' });
}

export function createSongTrack(songId: string, input: CreateSongTrackInput) {
  return http<SongTrack>(`/api/songs/${songId}/tracks`, { method: 'POST', body: JSON.stringify(input) });
}

export function uploadSongTrack(
  songId: string,
  input: {
    file: File;
    name?: string;
    type: SongTrackType;
    instrument?: string;
    versionId?: string | null;
    isPrimary?: boolean;
    durationSec?: number;
  },
  onProgress?: (progress: number) => void,
) {
  // La subida usa XMLHttpRequest (para el progreso), que no pasa por http(): se renueva el token antes si hace falta.
  assertOnlineForChanges();
  return ensureFreshAccessToken().then(() => new Promise<SongTrack>((resolve, reject) => {
    const formData = new FormData();
    formData.set('file', input.file);
    formData.set('type', input.type);
    if (input.name) formData.set('name', input.name);
    if (input.instrument) formData.set('instrument', input.instrument);
    if (input.versionId) formData.set('versionId', input.versionId);
    if (input.isPrimary !== undefined) formData.set('isPrimary', String(input.isPrimary));
    if (input.durationSec !== undefined) formData.set('durationSec', String(input.durationSec));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/songs/${songId}/tracks/upload`);
    const headers = buildAuthHeaders();
    headers.forEach((value, key) => xhr.setRequestHeader(key, value));
    xhr.responseType = 'json';

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onerror = () => reject(new Error('No se pudo subir la pista'));
    xhr.onload = () => {
      const response = typeof xhr.response === 'string' ? JSON.parse(xhr.response) : xhr.response || JSON.parse(xhr.responseText || 'null');
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(response as SongTrack);
        return;
      }
      reject(new Error(response?.message || 'No se pudo subir la pista'));
    };

    xhr.send(formData);
  }));
}

export function updateSongTrack(songId: string, trackId: string, input: UpdateSongTrackInput) {
  return http<SongTrack>(`/api/songs/${songId}/tracks/${trackId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteSongTrack(songId: string, trackId: string) {
  return http<{ ok: boolean }>(`/api/songs/${songId}/tracks/${trackId}`, { method: 'DELETE' });
}

export function setPrimarySongTrack(songId: string, trackId: string) {
  return http<SongTrack>(`/api/songs/${songId}/tracks/${trackId}/set-primary`, { method: 'POST' });
}

export function reorderSongTracks(songId: string, input: ReorderSongTracksInput) {
  return http<SongTrack[]>(`/api/songs/${songId}/tracks/reorder`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function copySongTrackReferences(songId: string, input: CopySongTracksInput) {
  return http<{ copied: number; tracks: SongTrack[] }>(`/api/songs/${songId}/tracks/copy`, { method: 'POST', body: JSON.stringify(input) });
}

export function streamSongTrack(songId: string, trackId: string) {
  return requestBlob(`/api/songs/${songId}/tracks/${trackId}/stream`);
}

export function downloadSongTrack(songId: string, trackId: string) {
  return requestBlob(`/api/songs/${songId}/tracks/${trackId}/download`);
}

export function getSongActivity(songId: string, filters?: {
  action?: SongActivityType;
  entityType?: SongEntityType;
  versionId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.action) params.set('action', filters.action);
  if (filters?.entityType) params.set('entityType', filters.entityType);
  if (filters?.versionId) params.set('versionId', filters.versionId);
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  const query = params.toString();
  return http<SongActivityPage>(`/api/songs/${songId}/activity${query ? `?${query}` : ''}`);
}

export function getSongRevisions(songId: string, versionId: string) {
  return http<SongVersionRevision[]>(`/api/songs/${songId}/versions/${versionId}/revisions`);
}

export function getSongRevision(songId: string, versionId: string, revisionNumber: number) {
  return http<SongVersionRevision>(`/api/songs/${songId}/versions/${versionId}/revisions/${revisionNumber}`);
}

export function diffSongRevision(songId: string, versionId: string, revisionNumber: number, compareTo?: number) {
  const query = compareTo ? `?compareTo=${compareTo}` : '';
  return http<SongRevisionDiffResult>(`/api/songs/${songId}/versions/${versionId}/revisions/${revisionNumber}/diff${query}`);
}

export function restoreSongRevision(songId: string, versionId: string, revisionNumber: number, input?: RestoreSongRevisionInput) {
  return http<SongVersionRevision>(`/api/songs/${songId}/versions/${versionId}/revisions/${revisionNumber}/restore`, { method: 'POST', body: JSON.stringify(input || {}) });
}

export function getSetlists(filters?: { status?: SetlistStatus; search?: string; includeArchived?: boolean; isTemplate?: boolean; page?: number; pageSize?: number }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.includeArchived) params.set('includeArchived', 'true');
  if (filters?.isTemplate !== undefined) params.set('isTemplate', String(filters.isTemplate));
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  const query = params.toString();
  return http<SetlistListResponse>(`/api/setlists${query ? `?${query}` : ''}`);
}

export function getSetlist(id: string) {
  return http<SetlistDetail>(`/api/setlists/${id}`);
}

export function createSetlist(input: CreateSetlistInput) {
  return http<SetlistDetail>('/api/setlists', { method: 'POST', body: JSON.stringify(input) });
}

/** Estadisticas del repertorio de la organizacion activa (cualquier miembro). */
export function getRepertoireStats(months: StatsPeriodMonths) {
  return http<RepertoireStats>(`/api/stats/repertoire?months=${months}`);
}

/** Carga por musico (solo quien arma equipos). */
export function getMemberLoadStats(months: StatsPeriodMonths) {
  return http<MemberLoadStats>(`/api/stats/members?months=${months}`);
}

/** Enlaces de solo lectura de un setlist (activos). */
export function getShareLinks(setlistId: string) {
  return http<ShareLinkList>(`/api/setlists/${encodeURIComponent(setlistId)}/share-links`);
}

/** Crea un enlace: el token solo viene en esta respuesta. */
export function createShareLink(setlistId: string, input: CreateShareLinkInput) {
  return http<CreatedShareLink>(`/api/setlists/${encodeURIComponent(setlistId)}/share-links`, { method: 'POST', body: JSON.stringify(input) });
}

export function revokeShareLink(setlistId: string, linkId: string) {
  return http<{ ok: true }>(`/api/setlists/${encodeURIComponent(setlistId)}/share-links/${encodeURIComponent(linkId)}`, { method: 'DELETE' });
}

export function saveSetlistAsTemplate(id: string, input: SaveSetlistAsTemplateInput) {
  return http<SetlistDetail>(`/api/setlists/${id}/save-as-template`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSetlist(id: string, input: { name?: string; description?: string | null; status?: SetlistStatus }) {
  return http<SetlistDetail>(`/api/setlists/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function archiveSetlist(id: string) {
  return http<SetlistDetail>(`/api/setlists/${id}/archive`, { method: 'POST' });
}

export function publishSetlist(id: string) {
  return http<SetlistDetail>(`/api/setlists/${id}/publish`, { method: 'POST' });
}

export function deleteSetlist(id: string) {
  return http<{ ok: boolean }>(`/api/setlists/${id}`, { method: 'DELETE' });
}

export function getSetlistItems(setlistId: string) {
  return http<SetlistItem[]>(`/api/setlists/${setlistId}/items`);
}

export function createSetlistItem(setlistId: string, input: CreateSetlistItemInput) {
  return http<SetlistItem>(`/api/setlists/${setlistId}/items`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSetlistItem(setlistId: string, itemId: string, input: UpdateSetlistItemInput) {
  return http<SetlistItem>(`/api/setlists/${setlistId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteSetlistItem(setlistId: string, itemId: string) {
  return http<{ ok: boolean }>(`/api/setlists/${setlistId}/items/${itemId}`, { method: 'DELETE' });
}

export function duplicateSetlistItem(setlistId: string, itemId: string, includeCues?: boolean) {
  return http<SetlistItem>(`/api/setlists/${setlistId}/items/${itemId}/duplicate`, { method: 'POST', body: JSON.stringify({ includeCues: includeCues ?? false }) });
}

export function reorderSetlistItems(setlistId: string, itemIds: string[]) {
  return http<SetlistItem[]>(`/api/setlists/${setlistId}/items/reorder`, { method: 'PATCH', body: JSON.stringify({ itemIds }) });
}

export function getSetlistTeam(setlistId: string) {
  return http<SetlistTeam>(`/api/setlists/${setlistId}/team`);
}

export function getSetlistParticipants(setlistId: string) {
  return http<SetlistParticipant[]>(`/api/setlists/${setlistId}/participants`);
}

export function addSetlistParticipant(setlistId: string, input: AddSetlistParticipantInput) {
  return http<SetlistParticipant>(`/api/setlists/${setlistId}/participants`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSetlistParticipant(setlistId: string, participantId: string, input: UpdateSetlistParticipantInput) {
  return http<SetlistParticipant>(`/api/setlists/${setlistId}/participants/${participantId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function removeSetlistParticipant(setlistId: string, participantId: string, removeAssignments?: boolean) {
  const query = removeAssignments ? '?removeAssignments=true' : '';
  return http<{ ok: boolean }>(`/api/setlists/${setlistId}/participants/${participantId}${query}`, { method: 'DELETE' });
}

export function getSetlistItemAssignments(setlistId: string, itemId: string) {
  return http<SetlistAssignment[]>(`/api/setlists/${setlistId}/items/${itemId}/assignments`);
}

export function createSetlistAssignment(setlistId: string, itemId: string, input: CreateSetlistAssignmentInput) {
  return http<SetlistAssignment>(`/api/setlists/${setlistId}/items/${itemId}/assignments`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSetlistAssignment(setlistId: string, itemId: string, assignmentId: string, input: UpdateSetlistAssignmentInput) {
  return http<SetlistAssignment>(`/api/setlists/${setlistId}/items/${itemId}/assignments/${assignmentId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteSetlistAssignment(setlistId: string, itemId: string, assignmentId: string) {
  return http<{ ok: boolean }>(`/api/setlists/${setlistId}/items/${itemId}/assignments/${assignmentId}`, { method: 'DELETE' });
}

export function updateSetlistAssignmentPreparation(setlistId: string, itemId: string, assignmentId: string, input: UpdateAssignmentPreparationInput) {
  return http<SetlistAssignment>(`/api/setlists/${setlistId}/items/${itemId}/assignments/${assignmentId}/preparation`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function copySetlistAssignments(setlistId: string, itemId: string, input: CopySetlistAssignmentsInput) {
  return http<SetlistAssignment[]>(`/api/setlists/${setlistId}/items/${itemId}/assignments/copy`, { method: 'POST', body: JSON.stringify(input) });
}

export function getSetlistRoleRequirements(setlistId: string, itemId: string) {
  return http<SetlistRoleRequirement[]>(`/api/setlists/${setlistId}/items/${itemId}/requirements`);
}

export function createSetlistRoleRequirement(setlistId: string, itemId: string, input: CreateSetlistRoleRequirementInput) {
  return http<SetlistRoleRequirement>(`/api/setlists/${setlistId}/items/${itemId}/requirements`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSetlistRoleRequirement(setlistId: string, itemId: string, requirementId: string, input: UpdateSetlistRoleRequirementInput) {
  return http<SetlistRoleRequirement>(`/api/setlists/${setlistId}/items/${itemId}/requirements/${requirementId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteSetlistRoleRequirement(setlistId: string, itemId: string, requirementId: string) {
  return http<{ ok: boolean }>(`/api/setlists/${setlistId}/items/${itemId}/requirements/${requirementId}`, { method: 'DELETE' });
}

export function getSetlistProduction(setlistId: string) {
  return http<SetlistProduction>(`/api/setlists/${setlistId}/production`);
}

export function getSetlistCues(setlistId: string) {
  return http<SetlistCue[]>(`/api/setlists/${setlistId}/cues`);
}

export function getSetlistItemCues(setlistId: string, itemId: string) {
  return http<SetlistCue[]>(`/api/setlists/${setlistId}/items/${itemId}/cues`);
}

export function createSetlistCue(setlistId: string, input: CreateSetlistCueInput) {
  return http<SetlistCue>(`/api/setlists/${setlistId}/cues`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSetlistCue(setlistId: string, cueId: string, input: UpdateSetlistCueInput) {
  return http<SetlistCue>(`/api/setlists/${setlistId}/cues/${cueId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function updateSetlistCueStatus(setlistId: string, cueId: string, input: UpdateSetlistCueStatusInput) {
  return http<SetlistCue>(`/api/setlists/${setlistId}/cues/${cueId}/status`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteSetlistCue(setlistId: string, cueId: string) {
  return http<{ ok: boolean }>(`/api/setlists/${setlistId}/cues/${cueId}`, { method: 'DELETE' });
}

export function reorderSetlistCues(setlistId: string, input: ReorderSetlistCuesInput) {
  return http<SetlistCue[]>(`/api/setlists/${setlistId}/cues/reorder`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function duplicateSetlistCue(setlistId: string, cueId: string) {
  return http<SetlistCue>(`/api/setlists/${setlistId}/cues/${cueId}/duplicate`, { method: 'POST' });
}

export function copySetlistCues(setlistId: string, itemId: string, input: CopySetlistCuesInput) {
  return http<SetlistCue[]>(`/api/setlists/${setlistId}/items/${itemId}/cues/copy`, { method: 'POST', body: JSON.stringify(input) });
}

export function getEvents(filters: EventListFilters = {}) {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  if (filters.includeCancelled) params.set('includeCancelled', 'true');
  if (filters.order) params.set('order', filters.order);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  const query = params.toString();
  return http<EventListResponse>(`/api/events${query ? `?${query}` : ''}`);
}

export function getEvent(id: string) {
  return http<EventDetail>(`/api/events/${id}`);
}

/** Un evento como calendario (.ics). */
export function downloadEventIcs(id: string) {
  return requestBlob(`/api/events/${encodeURIComponent(id)}/ical`);
}

/** Mis proximos eventos de la organizacion activa (donde estoy en el equipo) como calendario (.ics). */
export function downloadMyEventsIcs() {
  return requestBlob('/api/calendar/my-events.ics');
}

export function createEvent(input: CreateEventInput) {
  return http<EventDetail>('/api/events', { method: 'POST', body: JSON.stringify(input) });
}

export function updateEvent(id: string, input: UpdateEventInput) {
  return http<EventDetail>(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteEvent(id: string) {
  return http<{ ok: boolean }>(`/api/events/${id}`, { method: 'DELETE' });
}

export function addEventMusician(eventId: string, input: AddEventMusicianInput) {
  return http<EventDetail>(`/api/events/${eventId}/musicians`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateEventMusician(eventId: string, musicianId: string, input: UpdateEventMusicianInput) {
  return http<EventDetail>(`/api/events/${eventId}/musicians/${musicianId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function removeEventMusician(eventId: string, musicianId: string) {
  return http<EventDetail>(`/api/events/${eventId}/musicians/${musicianId}`, { method: 'DELETE' });
}

export function getDashboardSummary() {
  return http<DashboardSummary>('/api/dashboard/summary');
}

export function getDashboardActivity(limit?: number) {
  return http<{ items: DashboardActivityItem[] }>(`/api/dashboard/activity${limit ? `?limit=${limit}` : ''}`);
}
