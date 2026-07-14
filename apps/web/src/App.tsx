import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Check,
  Clock3,
  FileArchive,
  Home,
  ListMusic,
  LogOut,
  Mail,
  Music2,
  Search,
  Settings,
  Users,
} from 'lucide-react';
import { events, files, musicians, notifications, setlists, songs } from './data';
import { loginRequest } from './api';
import { DashboardPage as HomeDashboard } from './features/dashboard';
import { SongDetailPage, SongsPage } from './features/songs';
import { SetlistDetailPage, SetlistsPage as RealSetlistsPage } from './features/setlists';
import { clearAuthSession } from './shared/api/http';

type User = {
  id: string;
  name: string;
  email: string;
  role?: string;
  currentOrganizationId?: string;
  currentOrganizationSlug?: string;
};

const routes = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/songs', label: 'Canciones', icon: Music2 },
  { href: '/events', label: 'Eventos', icon: CalendarDays },
  { href: '/setlists', label: 'Setlists', icon: ListMusic },
  { href: '/musicians', label: 'Músicos', icon: Users },
  { href: '/archives', label: 'Archivos', icon: FileArchive },
  { href: '/notifications', label: 'Actividad', icon: Bell },
  { href: '/settings', label: 'Ajustes', icon: Settings },
];

function useRoute() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(href: string) {
    window.history.pushState({}, '', href);
    setPath(href);
  }

  return { path, navigate };
}

function NavLink({ href, children, className = '', navigate }: { href: string; children: ReactNode; className?: string; navigate: (href: string) => void }) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}

function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('juan@email.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await loginRequest({ email, password });
      localStorage.setItem('hh_user', JSON.stringify(user));
      onLogin(user);
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err: any) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10 text-white subtle-grid">
      <section className="panel w-full max-w-[520px] p-8 shadow-soft">
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <span className="icon-tile h-8 w-8"><Music2 className="h-4 w-4" /></span>
            <span className="text-sm font-bold">Harmony<span className="text-primary">Hub</span></span>
          </div>
        </div>

        <div className="mt-10 text-center">
          <h1 className="text-2xl font-bold text-white">Inicia sesión</h1>
          <p className="mt-2 text-sm text-muted">Conectado al backend NestJS</p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <label className="label">Correo electrónico</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <input value={email} onChange={(event) => setEmail(event.target.value)} className="input pl-9" />
            </div>
          </div>

          <div>
            <label className="label">Contraseña</label>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="input" />
          </div>

          {error && <div className="rounded-md border border-[#ff5c77]/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}

function Shell({ user, path, navigate, onLogout, children }: { user: User; path: string; navigate: (href: string) => void; onLogout: () => void; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-white subtle-grid">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[220px] border-r border-[#1b2c40]/80 bg-[#06101a]/95 px-4 py-4 backdrop-blur-xl lg:block">
        <NavLink href="/" navigate={navigate} className="flex h-10 items-center gap-2 px-1">
          <span className="icon-tile h-7 w-7"><Music2 className="h-4 w-4" /></span>
          <span className="text-sm font-bold text-white">Harmony<span className="text-primary">Hub</span></span>
        </NavLink>

        <nav className="mt-7 space-y-1">
          {routes.map((item) => {
            const Icon = item.icon;
            const active = path === item.href || (item.href !== '/' && path.startsWith(`${item.href}/`));
            return (
              <NavLink
                key={item.href}
                href={item.href}
                navigate={navigate}
                className={`group flex h-9 items-center gap-3 rounded-md px-3 text-xs font-semibold transition ${
                  active ? 'border border-primary/20 bg-primary/10 text-primary' : 'border border-transparent text-muted hover:bg-white/[0.035] hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="min-h-screen lg:pl-[220px]">
        <header className="sticky top-0 z-30 border-b border-[#1b2c40]/80 bg-[#06101a]/95 backdrop-blur-xl">
          <div className="flex min-h-[62px] flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
            <button className="btn-ghost h-9 min-w-[168px] justify-between px-3">Banda Renacer</button>
            <label className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <input className="input h-9 pl-9 pr-4 text-xs" placeholder="Buscar / Ctrl + K" />
            </label>
            <button className="btn-ghost relative h-9 w-9 p-0"><Bell className="h-4 w-4" /></button>
            <button onClick={onLogout} className="flex h-9 items-center gap-3 rounded-md border border-[#1b2c40] bg-[#0a1420] px-2.5 text-left transition hover:border-[#24415a]">
              <span className="avatar h-7 w-7 text-[11px]">{user.name.slice(0, 1)}</span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-xs font-semibold text-white">{user.name}</span>
                <span className="block text-[10px] text-muted">{user.role}</span>
              </span>
              <LogOut className="h-4 w-4 text-muted" />
            </button>
          </div>
        </header>

        <main className="container pb-24 pt-5 lg:pb-5">{children}</main>
      </div>
    </div>
  );
}

function Dashboard({ navigate }: { navigate: (href: string) => void }) {
  const stats = [
    { label: 'Próximos eventos', value: events.length, icon: CalendarDays },
    { label: 'Canciones', value: songs.length, icon: Music2 },
    { label: 'Setlists', value: setlists.length, icon: ListMusic },
    { label: 'Músicos activos', value: musicians.length, icon: Users },
  ];

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">¡Bienvenido!</h1>
          <p className="mt-1 text-sm text-muted">Frontend Vite + backend NestJS.</p>
        </div>
        <button onClick={() => navigate('/songs')} className="btn-primary">Nueva canción</button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-muted">{stat.label}</p>
                  <p className="mt-3 text-3xl font-bold text-white">{stat.value}</p>
                </div>
                <span className="icon-tile"><Icon className="h-4 w-4" /></span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <PanelTable title="Canciones recientes" rows={songs.map((song) => [song.title, song.artist, song.key, `${song.bpm} BPM`, song.duration])} />
        <ActivityPanel />
      </section>
    </div>
  );
}

function PanelTable({ title, rows }: { title: string; rows: Array<Array<string | number>> }) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-[#1b2c40] px-5 py-4">
        <h2 className="section-title">{title}</h2>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <tbody>
            {rows.map((row) => (
              <tr key={row.join('-')}>
                {row.map((cell, index) => (
                  <td key={`${cell}-${index}`} className={index === 0 ? 'font-semibold text-white' : 'text-muted'}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ActivityPanel() {
  return (
    <section className="panel p-5">
      <h2 className="section-title">Actividad reciente</h2>
      <div className="mt-5 space-y-4">
        {notifications.map((item) => (
          <div key={item.id} className="flex gap-3">
            <span className="icon-tile h-8 w-8"><Bell className="h-4 w-4" /></span>
            <span>
              <span className="block text-sm font-semibold text-white">{item.title}</span>
              <span className="block text-xs text-muted">{item.description}</span>
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-faint"><Clock3 className="h-3 w-3" /> {item.time}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function EventsPage() {
  return <PanelTable title="Eventos" rows={events.map((event) => [event.name, event.date, event.time, event.location, event.status])} />;
}

function MusiciansPage() {
  return <PanelTable title="Músicos" rows={musicians.map((musician) => [musician.name, musician.instrument, musician.role, musician.status])} />;
}

function ArchivesPage() {
  return <PanelTable title="Archivos" rows={files.map((file) => [file.name, file.type, file.size, file.author])} />;
}

function CalendarPage() {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-[#1b2c40] px-5 py-4">
        <h1 className="text-2xl font-bold text-white">Calendario</h1>
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 35 }).map((_, index) => (
          <div key={index} className="min-h-[96px] border-b border-r border-[#1b2c40] p-3">
            <span className="text-xs text-muted">{index + 1}</span>
            {index === 23 && <div className="mt-4 rounded border border-primary/25 bg-primary/10 px-2 py-1 text-[11px] text-primary">Culto Dominical</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsPage() {
  return (
    <section className="panel p-5">
      <h1 className="text-2xl font-bold text-white">Ajustes</h1>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {['Oscuro', 'Claro', 'Sistema'].map((theme, index) => (
          <button key={theme} className={`rounded-md border p-4 text-left ${index === 0 ? 'border-primary bg-primary/10' : 'border-[#1b2c40] bg-[#091522]'}`}>
            <Check className="h-4 w-4 text-primary" />
            <span className="mt-4 block text-sm font-bold text-white">{theme}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function App() {
  const { path, navigate } = useRoute();
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('hh_user');
    return raw ? JSON.parse(raw) : null;
  });

  const page = useMemo(() => {
    if (!user || path === '/login') {
      return <LoginPage onLogin={setUser} />;
    }

    if (path.startsWith('/songs/')) {
      return <SongDetailPage id={path.replace('/songs/', '')} navigate={navigate} />;
    }

    if (path.startsWith('/setlists/')) {
      return <SetlistDetailPage id={path.replace('/setlists/', '')} navigate={navigate} />;
    }

    const pages: Record<string, ReactNode> = {
      '/': <HomeDashboard user={user} navigate={navigate} />,
      '/songs': <SongsPage user={user} navigate={navigate} />,
      '/events': <EventsPage />,
      '/setlists': <RealSetlistsPage navigate={navigate} />,
      '/musicians': <MusiciansPage />,
      '/archives': <ArchivesPage />,
      '/calendar': <CalendarPage />,
      '/notifications': <ActivityPanel />,
      '/settings': <SettingsPage />,
    };

    return pages[path] ?? <HomeDashboard user={user} navigate={navigate} />;
  }, [path, user]);

  if (!user || path === '/login') {
    return <>{page}</>;
  }

  return (
    <Shell
      user={user}
      path={path}
      navigate={navigate}
      onLogout={() => {
        clearAuthSession();
        setUser(null);
        navigate('/login');
      }}
    >
      {page}
    </Shell>
  );
}

export default App;
