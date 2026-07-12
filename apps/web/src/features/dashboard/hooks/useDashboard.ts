import { useQuery } from '@tanstack/react-query';
import { events, files, musicians, notifications, setlists, songs } from '../../../data';

function buildDashboardSnapshot() {
  const upcomingEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const nextEvent = upcomingEvents[0] ?? null;

  return {
    nextEvent,
    upcomingEvents,
    quickStats: {
      songs: songs.length,
      setlists: setlists.length,
      musicians: musicians.length,
      files: files.length,
    },
    recentActivity: notifications,
    pendingTasks: [
      { id: 'review-setlist', title: 'Revisar setlist con el equipo', due: 'Hoy', done: false },
      { id: 'send-tracks', title: 'Enviar pistas actualizadas', due: 'Hoy', done: false },
      { id: 'confirm-team', title: 'Confirmar asistencia de musicos', due: 'Manana', done: false },
      { id: 'general-rehearsal', title: 'Preparar ensayo general', due: '24 Jun', done: false },
      { id: 'print-charts', title: 'Imprimir letras y charts', due: '28 Jun', done: false },
    ],
    nowPlaying: songs[0] ?? null,
  };
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: buildDashboardSnapshot,
  });
}
