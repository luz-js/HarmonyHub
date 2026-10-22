import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import type { Navigate } from '../../app/types';
import { queryClient } from '../../shared/api/query-client';
import type { AppNotification } from '../../shared/types';
import { getNotifications, getUnreadNotificationsCount, markAllNotificationsRead, markNotificationRead } from './api/notifications.client';

/** Sin websockets: el contador se vuelve a pedir cada minuto (y al volver a la pestaña). */
export const UNREAD_POLL_MS = 60_000;

const keys = {
  all: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
  latest: (limit: number) => ['notifications', 'latest', limit] as const,
  list: ['notifications', 'list'] as const,
};

function refreshNotifications() {
  return queryClient.invalidateQueries({ queryKey: keys.all });
}

export function useUnreadNotifications() {
  return useQuery({ queryKey: keys.unread, queryFn: getUnreadNotificationsCount, refetchInterval: UNREAD_POLL_MS });
}

/** Los ultimos avisos, para el panel de la campana. */
export function useLatestNotifications(limit: number, enabled: boolean) {
  return useQuery({ queryKey: keys.latest(limit), queryFn: () => getNotifications({ limit }), enabled });
}

/** La lista completa, de a una pagina por vez ("Cargar más"). */
export function useNotificationsList(pageSize = 20) {
  return useInfiniteQuery({
    queryKey: keys.list,
    queryFn: ({ pageParam }) => getNotifications({ cursor: pageParam, limit: pageSize }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useMarkNotificationRead() {
  return useMutation({ mutationFn: (id: string) => markNotificationRead(id), onSuccess: refreshNotifications });
}

/** Abrir un aviso: lo marca como leido (si hacia falta) y lleva a su pantalla. */
export function useOpenNotification(navigate: Navigate) {
  const markRead = useMarkNotificationRead();
  return (notification: AppNotification) => {
    if (!notification.readAt) markRead.mutate(notification.id);
    if (notification.link) navigate(notification.link);
  };
}

export function useMarkAllNotificationsRead() {
  return useMutation({ mutationFn: () => markAllNotificationsRead(), onSuccess: refreshNotifications });
}
