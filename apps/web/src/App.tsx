import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { CalendarPage } from './features/calendar';
import { ActivityPage, DashboardPage as HomeDashboard } from './features/dashboard';
import { EventDetailPage, EventsPage } from './features/events';
import { SongDetailPage, SongsPage } from './features/songs';
import { AudioPlayerProvider, PersistentAudioPlayer } from './features/songs/player';
import { SetlistDetailPage, SetlistsPage as RealSetlistsPage } from './features/setlists';
import { SettingsPage } from './app/LegacyPages';
import { LoginPage } from './app/LoginPage';
import { OnboardingPage } from './app/OnboardingPage';
import { ArchivesPage } from './features/files';
import { MyInvitationsPage } from './features/invitations';
import { MusiciansPage } from './features/musicians';
import { ProfilePage } from './features/profile';
import { readStoredUser, storeUser, withOrganization } from './app/session';
import { Shell } from './app/Shell';
import type { AppOrganization, AppUser, Navigate } from './app/types';
import { useRoute } from './app/useRoute';
import { logoutRequest } from './shared/api/api-client';
import { clearAuthSession, SESSION_EXPIRED_EVENT, setCurrentOrganizationId } from './shared/api/http';
import { queryClient } from './shared/api/query-client';

function resolvePage(path: string, user: AppUser, navigate: Navigate, onProfileUpdated: (changes: { name: string }) => void): ReactNode {
  if (path.startsWith('/songs/')) {
    return <SongDetailPage id={path.replace('/songs/', '')} navigate={navigate} />;
  }

  if (path.startsWith('/setlists/')) {
    return <SetlistDetailPage id={path.replace('/setlists/', '')} navigate={navigate} />;
  }

  if (path.startsWith('/events/')) {
    return <EventDetailPage id={path.replace('/events/', '')} navigate={navigate} />;
  }

  const pages: Record<string, ReactNode> = {
    '/': <HomeDashboard user={user} navigate={navigate} />,
    '/songs': <SongsPage user={user} navigate={navigate} />,
    '/events': <EventsPage navigate={navigate} />,
    '/setlists': <RealSetlistsPage navigate={navigate} />,
    '/musicians': <MusiciansPage organizationId={user.currentOrganizationId || ''} currentUserId={user.id} currentRole={user.role} />,
    '/archives': <ArchivesPage organizationId={user.currentOrganizationId || ''} navigate={navigate} />,
    '/calendar': <CalendarPage navigate={navigate} />,
    '/notifications': <ActivityPage navigate={navigate} />,
    '/settings': <SettingsPage />,
    '/profile': <ProfilePage onUserUpdated={onProfileUpdated} />,
  };

  return pages[path] ?? <HomeDashboard user={user} navigate={navigate} />;
}

function App() {
  const { path, navigate } = useRoute();
  const [user, setUser] = useState<AppUser | null>(() => readStoredUser());

  // Un 401 de cualquier request limpia la sesion en http.ts; aqui se vuelve al login y se descarta la cache.
  useEffect(() => {
    const onSessionExpired = () => {
      queryClient.clear();
      setUser(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);

  function logout() {
    void logoutRequest();
    clearAuthSession();
    queryClient.clear();
    setUser(null);
    navigate('/login');
  }

  /** Activa otra organizacion (o la recien creada): guarda el rol de esa membresia y recarga los datos. */
  function activateOrganization(organization: AppOrganization) {
    if (!user) return;
    const nextUser = withOrganization(user, organization);
    storeUser(nextUser);
    setCurrentOrganizationId(organization.id);
    queryClient.clear();
    setUser(nextUser);
    navigate('/');
  }

  /** Mi perfil cambio el nombre: se actualiza la sesion guardada para que el menu lo muestre al instante. */
  const updateProfile = useCallback((changes: { name: string }) => {
    setUser((current) => {
      if (!current) return current;
      const nextUser = { ...current, ...changes };
      storeUser(nextUser);
      return nextUser;
    });
  }, []);

  const page = useMemo(() => {
    if (!user || path === '/login') {
      return <LoginPage onLogin={setUser} />;
    }

    return resolvePage(path, user, navigate, updateProfile);
  }, [navigate, path, updateProfile, user]);

  if (!user || path === '/login') {
    return <>{page}</>;
  }

  // Sin organizacion todavia: puede aceptar una invitacion en vez de crear una.
  if (!user.currentOrganizationId && path === '/invitations') {
    return (
      <main className="min-h-screen bg-background px-5 py-10 text-white subtle-grid">
        <div className="mx-auto max-w-2xl space-y-5">
          <button type="button" className="btn-ghost h-8 px-2 text-xs" onClick={() => navigate('/')}>
            <ArrowLeft className="h-3.5 w-3.5" /> Volver
          </button>
          <MyInvitationsPage onAccepted={activateOrganization} />
        </div>
      </main>
    );
  }

  if (!user.currentOrganizationId || path === '/onboarding') {
    return (
      <OnboardingPage
        user={user}
        onCreated={activateOrganization}
        onCancel={user.currentOrganizationId ? () => navigate('/') : undefined}
        onLogout={logout}
        onOpenInvitations={() => navigate('/invitations')}
      />
    );
  }

  return (
    <AudioPlayerProvider>
      <Shell
        user={user}
        path={path}
        navigate={navigate}
        onLogout={logout}
        onSwitchOrganization={activateOrganization}
      >
        {path === '/invitations' ? <MyInvitationsPage onAccepted={activateOrganization} /> : page}
      </Shell>
      <PersistentAudioPlayer />
    </AudioPlayerProvider>
  );
}

export default App;
