import {
  ArrowRight,
  CalendarDays,
  Clock3,
  List,
  ListMusic,
  MapPin,
  Music2,
  Pause,
  Plus,
  SkipBack,
  SkipForward,
  UserPlus,
  Users,
  Volume2,
} from 'lucide-react';
import { events, songs } from './data';

type User = { name: string };
type Navigate = (href: string) => void;

const stageImages = [
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80',
];

const avatarImages = [
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=80&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=80&q=80',
];

export function Dashboard({ user, navigate }: { user: User; navigate: Navigate }) {
  const nextEvent = events[0];
  const currentSong = songs[0];

  return (
    <div className="pb-20">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,8fr)_minmax(320px,4fr)]">
        <div className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">¡Buenas noches, {user.name.split(' ')[0]}!</h1>
              <p className="mt-2 text-sm text-muted">Que tu música inspire y tu equipo siga unido.</p>
            </div>
            <button className="btn-primary" onClick={() => navigate('/events')}><Plus className="h-4 w-4" /> Nuevo</button>
          </div>

          <DashboardHeroEventCard event={nextEvent} navigate={navigate} />
          <QuickActions navigate={navigate} />
          <UpcomingEventsSection navigate={navigate} />
        </div>

        <aside className="space-y-5">
          <RecentActivityPanel />
          <PendingTasksPanel />
        </aside>
      </section>

      <BottomMusicPlayer song={currentSong} />
    </div>
  );
}

function DashboardHeroEventCard({ event, navigate }: { event: typeof events[number]; navigate: Navigate }) {
  return (
    <section className="panel relative min-h-[300px] overflow-hidden p-6">
      <img src={stageImages[0]} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#141518] via-[#141518]/78 to-[#141518]/20" />
      <div className="relative max-w-[520px]">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Próximo evento</p>
        <h2 className="mt-4 text-3xl font-bold text-white">{event.name}</h2>
        <div className="mt-5 space-y-3 text-sm text-white/90">
          <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> {new Date(event.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /> {event.time}</p>
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {event.location}</p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <MemberAvatarStack count={5} />
          <span className="text-sm font-semibold text-white">12 / 14 músicos confirmados</span>
        </div>
        <button className="btn-primary mt-6" onClick={() => navigate('/events')}>Ver detalles del evento <ArrowRight className="h-4 w-4" /></button>
      </div>
    </section>
  );
}

function QuickActions({ navigate }: { navigate: Navigate }) {
  const actions = [
    { title: 'Nueva canción', description: 'Agrega una canción a tu repertorio', icon: Music2, href: '/songs', accent: 'text-[#B79CFF]' },
    { title: 'Crear setlist', description: 'Prepara la música del próximo evento', icon: ListMusic, href: '/setlists', accent: 'text-primary' },
    { title: 'Programar evento', description: 'Organiza fecha, hora y lugar', icon: CalendarDays, href: '/events', accent: 'text-primary' },
    { title: 'Invitar músico', description: 'Agrega miembros a tu equipo', icon: UserPlus, href: '/musicians', accent: 'text-[#57C98F]' },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button key={action.title} onClick={() => navigate(action.href)} className="panel group p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/45">
            <Icon className={`h-6 w-6 ${action.accent}`} />
            <h3 className="mt-5 font-bold text-white">{action.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{action.description}</p>
          </button>
        );
      })}
    </section>
  );
}

function UpcomingEventsSection({ navigate }: { navigate: Navigate }) {
  const upcoming = events.map((event, index) => ({ ...event, image: stageImages[index + 1] || stageImages[0], confirmed: [12, 8, 10][index] || 7 }));

  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="section-title">Próximos eventos</h2>
        <button className="text-sm font-semibold text-primary" onClick={() => navigate('/calendar')}>Ver calendario →</button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {upcoming.map((event, index) => <UpcomingEventCard key={event.id} event={event} highlighted={index === 0} />)}
      </div>
    </section>
  );
}

function UpcomingEventCard({ event, highlighted }: { event: typeof events[number] & { image: string; confirmed: number }; highlighted: boolean }) {
  const date = new Date(event.date);
  return (
    <article className={`overflow-hidden rounded-lg border bg-[#141518] ${highlighted ? 'border-primary/80' : 'border-white/10'}`}>
      <div className="relative h-28">
        <img src={event.image} alt="" className="h-full w-full object-cover opacity-65" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141518] to-transparent" />
        <div className="absolute left-4 top-4">
          <p className="text-3xl font-bold text-primary">{date.getDate()}</p>
          <p className="text-xs font-bold uppercase text-white">{date.toLocaleDateString('es-ES', { month: 'short' })}</p>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-white">{event.name}</h3>
        <p className="mt-2 text-sm text-muted">{event.time}</p>
        <p className="mt-1 text-sm text-muted">{event.location}</p>
        <div className="mt-4 flex items-center justify-between">
          <MemberAvatarStack count={3} small />
          <span className="flex items-center gap-1 text-xs text-muted"><Users className="h-3.5 w-3.5" /> {event.confirmed}</span>
        </div>
      </div>
    </article>
  );
}

function RecentActivityPanel() {
  const items = [
    ['Pedro confirmó su asistencia', 'Hace 15 min'],
    ['María editó el setlist “Culto de Jóvenes”', 'Hace 1 hora'],
    ['Andrés subió “Pistas - Ensayo 20.05”', 'Hace 2 horas'],
    ['Nueva canción agregada “Gratitud”', 'Hace 3 horas'],
  ];

  return (
    <section className="panel p-5">
      <h2 className="section-title">Actividad reciente</h2>
      <div className="mt-5 space-y-5">
        {items.map(([title, time], index) => (
          <div key={title} className="flex gap-3">
            <img src={avatarImages[index]} alt="" className="h-9 w-9 rounded-full object-cover" />
            <div><p className="text-sm font-semibold text-white">{title}</p><p className="mt-1 text-xs text-muted">{time}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PendingTasksPanel() {
  const tasks = [
    ['Revisar setlist con el equipo', 'Hoy'],
    ['Enviar pistas actualizadas', 'Hoy'],
    ['Confirmar asistencia de músicos', 'Mañana'],
    ['Preparar ensayo general', '23 may'],
    ['Imprimir letras y charts', '24 may'],
  ];

  return (
    <section className="panel p-5">
      <h2 className="section-title">Pendientes</h2>
      <div className="mt-4 divide-y divide-white/10">
        {tasks.map(([task, date]) => (
          <label key={task} className="flex items-center gap-3 py-3 text-sm">
            <span className="h-4 w-4 rounded-full border border-white/45" />
            <span className="flex-1 text-white">{task}</span>
            <span className="text-xs text-primary">{date}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

function BottomMusicPlayer({ song }: { song: typeof songs[number] }) {
  return (
    <section className="fixed bottom-3 left-3 right-3 z-40 rounded-lg border border-white/10 bg-[#141518]/95 p-3 shadow-soft backdrop-blur-xl lg:left-[232px]">
      <div className="flex flex-wrap items-center gap-4">
        <img src={stageImages[1]} alt="" className="h-12 w-12 rounded-md object-cover" />
        <div className="min-w-[170px]"><p className="text-sm font-bold text-white">{song.title}</p><p className="text-xs text-muted">{song.artist}</p></div>
        <span className="text-xs text-muted">2:34</span>
        <div className="h-1.5 min-w-[180px] flex-1 rounded-full bg-white/10"><div className="h-1.5 w-[42%] rounded-full bg-primary" /></div>
        <span className="text-xs text-muted">{song.duration}</span>
        <div className="flex items-center gap-2">
          <button className="btn-ghost h-9 w-9 p-0"><SkipBack className="h-4 w-4" /></button>
          <button className="icon-tile h-10 w-10"><Pause className="h-4 w-4" /></button>
          <button className="btn-ghost h-9 w-9 p-0"><SkipForward className="h-4 w-4" /></button>
          <button className="btn-ghost h-9 w-9 p-0"><Volume2 className="h-4 w-4" /></button>
          <button className="btn-ghost h-9 w-9 p-0"><List className="h-4 w-4" /></button>
        </div>
      </div>
    </section>
  );
}

function MemberAvatarStack({ count, small = false }: { count: number; small?: boolean }) {
  const size = small ? 'h-6 w-6' : 'h-9 w-9';
  return <div className="flex -space-x-2">{avatarImages.slice(0, count).map((src) => <img key={src} src={src} alt="" className={`${size} rounded-full border-2 border-[#141518] object-cover`} />)}</div>;
}
