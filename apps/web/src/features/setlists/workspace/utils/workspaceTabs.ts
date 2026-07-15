import { FileText, History, Link2, MessageSquare, Mic2, Music2, StickyNote } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type WorkspaceTab = 'lyrics' | 'tracks' | 'files' | 'links' | 'notes' | 'history' | 'collaboration';

export const WORKSPACE_TABS: Array<{ id: WorkspaceTab; label: string; icon: LucideIcon }> = [
  { id: 'lyrics', label: 'Letra', icon: Mic2 },
  { id: 'tracks', label: 'Pistas', icon: Music2 },
  { id: 'files', label: 'Archivos', icon: FileText },
  { id: 'links', label: 'Links', icon: Link2 },
  { id: 'notes', label: 'Notas', icon: StickyNote },
  { id: 'history', label: 'Historial', icon: History },
  { id: 'collaboration', label: 'Colaboración', icon: MessageSquare },
];
