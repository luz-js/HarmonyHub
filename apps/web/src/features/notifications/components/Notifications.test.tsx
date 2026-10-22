import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../../shared/api/query-client';
import type { AppNotification } from '../../../shared/types';
import { NotificationsPage } from '../pages/NotificationsPage';
import { formatNotificationTime, formatUnreadBadge } from '../utils/notification.utils';
import { NotificationBell } from './NotificationBell';

vi.mock('../api/notifications.client', () => ({
  getNotifications: vi.fn(),
  getUnreadNotificationsCount: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
}));

import { getNotifications, getUnreadNotificationsCount, markAllNotificationsRead, markNotificationRead } from '../api/notifications.client';

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

function notification(id: string, overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id,
    organizationId: 'org1',
    type: 'EVENT_TEAM_ADDED',
    title: `Aviso ${id}`,
    body: 'Confirma si vas desde el evento.',
    link: `/events/e${id}`,
    readAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('NotificationBell', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.mocked(getUnreadNotificationsCount).mockReset().mockResolvedValue({ unread: 2 });
    vi.mocked(getNotifications).mockReset().mockResolvedValue({ items: [notification('1'), notification('2', { readAt: new Date().toISOString() })], nextCursor: null, unread: 2 });
    vi.mocked(markNotificationRead).mockReset().mockResolvedValue(notification('1'));
    vi.mocked(markAllNotificationsRead).mockReset().mockResolvedValue({ updated: 2 });
  });

  it('muestra cuántos avisos hay sin leer', async () => {
    render(<NotificationBell navigate={vi.fn()} placement="topbar" />, { wrapper });
    expect(await screen.findByRole('button', { name: 'Avisos (2 sin leer)' })).toHaveTextContent('2');
  });

  it('abre el panel con los últimos; abrir uno lo marca leído y lleva a su pantalla', async () => {
    const navigate = vi.fn();
    render(<NotificationBell navigate={navigate} placement="topbar" />, { wrapper });
    fireEvent.click(await screen.findByRole('button', { name: /Avisos/ }));
    const panel = await screen.findByRole('dialog', { name: 'Avisos' });
    fireEvent.click(await within(panel).findByRole('button', { name: 'Sin leer: Aviso 1' }));
    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith('1'));
    expect(navigate).toHaveBeenCalledWith('/events/e1');
    expect(screen.queryByRole('dialog', { name: 'Avisos' })).not.toBeInTheDocument();
  });

  it('un aviso ya leído no se vuelve a marcar; "Marcar todas" y "Ver todos"', async () => {
    const navigate = vi.fn();
    render(<NotificationBell navigate={navigate} placement="sidebar" />, { wrapper });
    fireEvent.click(await screen.findByRole('button', { name: /Avisos/ }));
    const panel = await screen.findByRole('dialog', { name: 'Avisos' });
    fireEvent.click(within(panel).getByRole('button', { name: 'Marcar todas como leídas' }));
    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalled());
    fireEvent.click(await within(panel).findByRole('button', { name: 'Aviso 2' }));
    expect(markNotificationRead).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: /Avisos/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver todos los avisos' }));
    expect(navigate).toHaveBeenCalledWith('/notifications');
  });
});

describe('NotificationsPage', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.mocked(getNotifications).mockReset();
  });

  it('lista los avisos y carga más páginas', async () => {
    vi.mocked(getNotifications)
      .mockResolvedValueOnce({ items: [notification('1')], nextCursor: '1', unread: 1 })
      .mockResolvedValueOnce({ items: [notification('2', { title: 'Aviso viejo' })], nextCursor: null, unread: 1 });
    render(<NotificationsPage navigate={vi.fn()} />, { wrapper });
    expect(await screen.findByText('Aviso 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }));
    expect(await screen.findByText('Aviso viejo')).toBeInTheDocument();
    expect(getNotifications).toHaveBeenLastCalledWith({ cursor: '1', limit: 20 });
    expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument();
  });

  it('sin avisos muestra el estado vacío', async () => {
    vi.mocked(getNotifications).mockResolvedValue({ items: [], nextCursor: null, unread: 0 });
    render(<NotificationsPage navigate={vi.fn()} />, { wrapper });
    expect(await screen.findByText('No tienes avisos')).toBeInTheDocument();
  });
});

describe('notification.utils', () => {
  it('formatea el tiempo relativo y el contador', () => {
    const now = new Date('2026-10-22T12:00:00Z');
    expect(formatNotificationTime('2026-10-22T11:59:40Z', now)).toBe('hace un momento');
    expect(formatNotificationTime('2026-10-22T11:55:00Z', now)).toBe('hace 5 min');
    expect(formatNotificationTime('2026-10-22T09:00:00Z', now)).toBe('hace 3 h');
    expect(formatNotificationTime('2026-10-21T08:00:00Z', now)).toBe('ayer');
    expect(formatNotificationTime('2026-10-12T08:00:00Z', now)).toBe('12 oct');
    expect(formatUnreadBadge(3)).toBe('3');
    expect(formatUnreadBadge(12)).toBe('9+');
  });
});
