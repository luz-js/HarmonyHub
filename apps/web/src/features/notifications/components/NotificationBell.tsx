import { useState } from 'react';
import { Bell } from 'lucide-react';
import type { Navigate } from '../../../app/types';
import { useLatestNotifications, useMarkAllNotificationsRead, useOpenNotification, useUnreadNotifications } from '../hooks';
import { formatUnreadBadge } from '../utils/notification.utils';
import { NotificationItem } from './NotificationItem';

const PANEL_SIZE = 6;

/** Campana con el numero de avisos sin leer y un panel con los ultimos. */
export function NotificationBell({ navigate, placement }: { navigate: Navigate; placement: 'sidebar' | 'topbar' }) {
  const [open, setOpen] = useState(false);
  const unread = useUnreadNotifications().data?.unread ?? 0;
  const latest = useLatestNotifications(PANEL_SIZE, open);
  const markAll = useMarkAllNotificationsRead();
  const openNotification = useOpenNotification((href) => {
    setOpen(false);
    navigate(href);
  });
  const items = latest.data?.items ?? [];

  return (
    <div className="relative">
      <button
        type="button"
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[#D8D5CE] transition hover:bg-white/5 hover:text-white"
        aria-label={unread > 0 ? `Avisos (${unread} sin leer)` : 'Avisos'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[11px] font-bold text-[var(--on-primary)]">
            {formatUnreadBadge(unread)}
          </span>
        )}
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Cerrar avisos" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Avisos"
            className={`absolute z-50 w-[360px] max-w-[calc(100vw-32px)] rounded-2xl border border-[#30333A] bg-[#1A1B1F] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.55)] ${
              placement === 'sidebar' ? 'left-0 top-full mt-2' : 'right-0 top-full mt-2'
            }`}
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-sm font-bold text-white">Avisos</p>
              {unread > 0 && (
                <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
                  Marcar todas como leídas
                </button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {latest.isLoading && <p className="px-3 py-6 text-center text-sm text-muted">Cargando avisos...</p>}
              {!latest.isLoading && items.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">No tienes avisos por ahora.</p>}
              {items.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} onOpen={openNotification} />
              ))}
            </div>
            <button
              type="button"
              className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:bg-white/5"
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
            >
              Ver todos los avisos
            </button>
          </div>
        </>
      )}
    </div>
  );
}
