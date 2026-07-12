import type { CurrentUser, InvitationSummary, OrganizationSummary, SongDetail, SongPayload, SongSummary, SongVersion } from '../types';
import { http, setAuthToken, setCurrentOrganizationId } from './http';

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

export function getOrganizations() {
  return http<Array<{ organization: OrganizationSummary; role: string }>>('/api/organizations');
}

export function createOrganization(input: { name: string; type: string; description?: string; primaryColor?: string }) {
  return http<OrganizationSummary>('/api/organizations', { method: 'POST', body: JSON.stringify(input) });
}

export function getMemberships(organizationId: string) {
  return http(`/api/memberships?organizationId=${encodeURIComponent(organizationId)}`);
}

export function updateMembership(id: string, input: { role?: string; status?: string; instrument?: string }) {
  return http(`/api/memberships/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function getInvitations(organizationId: string) {
  return http<InvitationSummary[]>(`/api/invitations?organizationId=${encodeURIComponent(organizationId)}`);
}

export function createInvitation(input: { organizationId: string; email: string; role: string }) {
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

export function getSongTracks(songId: string) {
  return http<SongDetail['tracks']>(`/api/songs/${songId}/tracks`);
}

export function getSongLinks(songId: string) {
  return http<SongDetail['links']>(`/api/songs/${songId}/links`);
}

export function getSongFiles(songId: string) {
  return http<SongDetail['songFiles']>(`/api/songs/${songId}/files`);
}

export function getSongNotes(songId: string) {
  return http<SongDetail['songNotes']>(`/api/songs/${songId}/notes`);
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

export function createSongLink(songId: string, input: { provider: string; url: string; title?: string; isPrimary?: boolean; versionId?: string }) {
  return http(`/api/songs/${songId}/links`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSongLink(songId: string, linkId: string, input: { provider?: string; url?: string; title?: string; isPrimary?: boolean; versionId?: string }) {
  return http(`/api/songs/${songId}/links/${linkId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function createSongNote(songId: string, input: { content: string; visibility: string; versionId?: string }) {
  return http(`/api/songs/${songId}/notes`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSongNote(songId: string, noteId: string, input: { content?: string; visibility?: string }) {
  return http(`/api/songs/${songId}/notes/${noteId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function createSongTrack(songId: string, input: { name: string; type: string; instrument?: string; url?: string; durationSec?: number; isPrimary?: boolean; versionId?: string }) {
  return http(`/api/songs/${songId}/tracks`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateSongTrack(songId: string, trackId: string, input: Partial<{ name: string; type: string; instrument: string; url: string; durationSec: number; isPrimary: boolean; versionId: string; sortOrder: number }>) {
  return http(`/api/songs/${songId}/tracks/${trackId}`, { method: 'PATCH', body: JSON.stringify(input) });
}
