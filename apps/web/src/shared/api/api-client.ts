import type {
  CreateInvitationInput,
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
  TrackProvider,
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
import { buildAuthHeaders, ensureFreshAccessToken, http, requestBlob, setAuthToken, setCurrentOrganizationId } from './http';

export async function loginRequest(input: { email: string; password: string }) {
  const data = await http<{ ok: boolean; user: CurrentUser; accessToken: string }>('/api/login', { method: 'POST', body: JSON.stringify(input) });
  setAuthToken(data.accessToken);
  if (data.user.currentOrganizationId) setCurrentOrganizationId(data.user.currentOrganizationId);
  return data.user;
}

export function registerRequest(input: { name: string; email: string; password: string; confirmPassword: string }) {
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

export function reorderSongFiles(songId: string, input: { versionId?: string | null; items: Array<{ id: string; sortOrder: number }> }) {
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

export function createSongLink(songId: string, input: { url: string; title: string; isPrimary?: boolean; versionId?: string | null }) {
  return http<SongLink>(`/api/songs/${songId}/links`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSongLink(songId: string, linkId: string, input: Partial<{
  url: string;
  title: string;
  isPrimary: boolean;
  versionId: string | null;
  active: boolean;
  sortOrder: number;
}>) {
  return http<SongLink>(`/api/songs/${songId}/links/${linkId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteSongLink(songId: string, linkId: string) {
  return http<{ ok: boolean }>(`/api/songs/${songId}/links/${linkId}`, { method: 'DELETE' });
}

export function setPrimarySongLink(songId: string, linkId: string) {
  return http<SongLink>(`/api/songs/${songId}/links/${linkId}/set-primary`, { method: 'POST' });
}

export function reorderSongLinks(songId: string, input: { versionId?: string | null; items: Array<{ id: string; sortOrder: number }> }) {
  return http<SongLink[]>(`/api/songs/${songId}/links/reorder`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function createSongNote(songId: string, input: { title?: string; content: string; visibility: SongNoteVisibility; versionId?: string | null; isPinned?: boolean }) {
  return http<SongNote>(`/api/songs/${songId}/notes`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSongNote(songId: string, noteId: string, input: Partial<{
  title: string | null;
  content: string;
  visibility: SongNoteVisibility;
  versionId: string | null;
}>) {
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

export function createSongThread(songId: string, input: {
  versionId?: string | null;
  targetType: SongCommentTarget;
  targetRef?: string | null;
  title?: string;
  content: string;
  mentionedUserIds?: string[];
}) {
  return http<SongCommentThread>(`/api/songs/${songId}/threads`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSongThread(songId: string, threadId: string, input: { title?: string | null }) {
  return http<SongCommentThread>(`/api/songs/${songId}/threads/${threadId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function resolveSongThread(songId: string, threadId: string) {
  return http<SongCommentThread>(`/api/songs/${songId}/threads/${threadId}/resolve`, { method: 'POST' });
}

export function reopenSongThread(songId: string, threadId: string) {
  return http<SongCommentThread>(`/api/songs/${songId}/threads/${threadId}/reopen`, { method: 'POST' });
}

export function createSongComment(songId: string, threadId: string, input: { content: string; mentionedUserIds?: string[] }) {
  return http<SongComment>(`/api/songs/${songId}/threads/${threadId}/comments`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSongComment(songId: string, threadId: string, commentId: string, input: { content: string }) {
  return http<SongComment>(`/api/songs/${songId}/threads/${threadId}/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteSongComment(songId: string, threadId: string, commentId: string) {
  return http<{ ok: boolean }>(`/api/songs/${songId}/threads/${threadId}/comments/${commentId}`, { method: 'DELETE' });
}

export function createSongTrack(songId: string, input: {
  name: string;
  type: SongTrackType;
  instrument?: string;
  url?: string;
  durationSec?: number;
  isPrimary?: boolean;
  versionId?: string | null;
  provider?: TrackProvider;
  volumeDefault?: number;
  panDefault?: number;
}) {
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

export function updateSongTrack(songId: string, trackId: string, input: Partial<{
  name: string;
  type: SongTrackType;
  instrument: string | null;
  url: string | null;
  durationSec: number | null;
  isPrimary: boolean;
  versionId: string | null;
  sortOrder: number;
  active: boolean;
  provider: TrackProvider;
  volumeDefault: number;
  panDefault: number;
}>) {
  return http<SongTrack>(`/api/songs/${songId}/tracks/${trackId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteSongTrack(songId: string, trackId: string) {
  return http<{ ok: boolean }>(`/api/songs/${songId}/tracks/${trackId}`, { method: 'DELETE' });
}

export function setPrimarySongTrack(songId: string, trackId: string) {
  return http<SongTrack>(`/api/songs/${songId}/tracks/${trackId}/set-primary`, { method: 'POST' });
}

export function reorderSongTracks(songId: string, input: { versionId?: string | null; items: Array<{ id: string; sortOrder: number }> }) {
  return http<SongTrack[]>(`/api/songs/${songId}/tracks/reorder`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function copySongTrackReferences(songId: string, input: { sourceVersionId: string; targetVersionId: string }) {
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

export function restoreSongRevision(songId: string, versionId: string, revisionNumber: number, input?: { reason?: string }) {
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
