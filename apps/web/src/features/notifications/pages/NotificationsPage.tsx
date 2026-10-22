import { Bell } from 'lucide-react';
import type { Navigate } from '../../../app/types';
import { NotificationItem } from '../components/NotificationItem';
import { useMarkAllNotificationsRead, useNotificationsList, useOpenNotification } from '../hooks';

/** Todos los avisos de la persona (organizacion activa e invitaciones), del mas nuevo al mas viejo. */
export function NotificationsPage({ navigate }: { navigate: Navigate }) {
  const list = useNotificationsList();
  const markAll = useMarkAllNotificationsRead();
  const openNotification = useOpenNotification(navigate);
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const unread = list.data?.pages[0]?.unread ?? 0;

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">Avisos</h1>
          <p className="page-subtitle">Lo que pasó en tus eventos, setlists e invitaciones.</p>
        </div>
        {unread > 0 && (
          <button type="button" className="btn-ghost self-start md:self-auto" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            Marcar todas como leídas
          </button>
        )}
      </section>

      {list.isLoading && <section className="panel p-5 text-muted">Cargando avisos...</section>}
      {list.error instanceof Error && <section className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-4 text-sm text-[#F7A39A]">{list.error.message}</section>}

      {!list.isLoading && !list.error && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#30333A] bg-[#141518] px-6 py-12 text-center">
          <span className="icon-tile mx-auto h-12 w-12 rounded-2xl">
            <Bell className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-lg font-bold text-white">No tienes avisos</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">Te avisaremos aquí cuando te sumen a un evento o setlist, cuando algo cambie o antes de un evento sin confirmar.</p>
        </div>
      )}

      {items.length > 0 && (
        <section className="panel space-y-1 p-2" aria-label="Lista de avisos">
          {items.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onOpen={openNotification} />
          ))}
        </section>
      )}

      {list.hasNextPage && (
        <div className="flex justify-center">
          <button type="button" className="btn-ghost" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
            {list.isFetchingNextPage ? 'Cargando...' : 'Cargar más'}
          </button>
        </div>
      )}
    </div>
  );
}
