import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarPage } from './features/calendar';
import { ActivityPage, DashboardPage as HomeDashboard } from './features/dashboard';
import { EventDetailPage, EventsPage } from './features/events';
import { SongDetailPage, SongsPage } from './features/songs';
import { AudioPlayerProvider, PersistentAudioPlayer } from './features/songs/player';
import { SetlistDetailPage, SetlistsPage as RealSetlistsPage } from './features/setlists';
import { SettingsPage } from './app/LegacyPages';
import { LoginPage } from './app/LoginPage';
import { BackHomeFrame, NoOrganizationNotice } from './app/NoOrganizationPages';
import { organizationPageFor } from './app/noOrganizationRoutes';
import { OnboardingPage } from './app/OnboardingPage';
import { WelcomeHome } from './app/WelcomeHome';
import { ArchivesPage } from './features/files';
import { MyInvitationsPage } from './features/invitations';
import { NotificationsPage } from './features/notifications';
import { ArchivedOrganizationBanner } from './features/organizations/components/ArchivedOrganizationBanner';
import { OrganizationSettings } from './features/organizations/components/OrganizationSettings';
import { MusiciansPage } from './features/musicians';
import { ProfilePage } from './features/profile';
import { readStoredUser, reconcileSession, storeUser, withOrganization } from './app/session';
import { Shell } from './app/Shell';
import type { AppOrganization, AppUser, Navigate } from './app/types';
import { useRoute } from './app/useRoute';
import { getCurrentUser, logoutRequest, saveActiveOrganization } from './shared/api/api-client';
import { clearAuthSession, clearCurrentOrganizationId, ORGANIZATION_ACCESS_LOST_EVENT, SESSION_EXPIRED_EVENT, setCurrentOrganizationId } from './shared/api/http';
import { queryClient } from './shared/api/query-client';
import { clearOfflineData, syncOfflineDataOwner } from './pwa/offline-data';

/**
 * Sin organizacion activa (recien registrada, o la desactivaron/quitaron) se entra igual a la app: Inicio muestra la
 * bienvenida, las paginas de la organizacion explican como empezar (sin llamar a la API) y Mi perfil, Mis
 * invitaciones y Avisos funcionan normal.
 */
function resolveNoOrganizationPage(path: string, user: AppUser, navigate: Navigate, onProfileUpdated: (changes: { name: string }) => void, onJoined: (organization: AppOrganization) => void): ReactNode {
  const organizationPage = organizationPageFor(path);
  if (organizationPage) return <NoOrganizationNotice title={organizationPage.label} navigate={navigate} />;
  if (path === '/profile') {
    return (
      <BackHomeFrame navigate={navigate}>
        <ProfilePage onUserUpdated={onProfileUpdated} onGoHome={() => navigate('/')} />
      </BackHomeFrame>
    );
  }
  if (path === '/notifications') return <NotificationsPage navigate={navigate} />;
  return <WelcomeHome user={user} navigate={navigate} onJoined={onJoined} />;
}

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
    '/activity': <ActivityPage navigate={navigate} />,
    '/notifications': <NotificationsPage navigate={navigate} />,
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
      void clearOfflineData();
      setUser(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);

  /**
   * Trae del servidor las organizaciones activas y corrige la sesion guardada: si la activa ya no esta
   * (la desactivaron o la quitaron) pasa a otra o a la bienvenida, en vez de quedarse mostrando errores.
   */
  const syncSession = useCallback(async () => {
    try {
      const { user: server } = await getCurrentUser();
      const stored = readStoredUser();
      if (!stored) return;
      const next = reconcileSession(stored, server);
      if (next.currentOrganizationId !== stored.currentOrganizationId) {
        if (next.currentOrganizationId) setCurrentOrganizationId(next.currentOrganizationId);
        else clearCurrentOrganizationId();
        queryClient.clear();
      }
      storeUser(next);
      setUser(next);
    } catch {
      // Sin sesion valida http.ts ya avisa (SESSION_EXPIRED_EVENT); cualquier otro error deja la sesion como estaba.
    }
  }, []);

  const userId = user?.id;
  useEffect(() => {
    void syncOfflineDataOwner(userId ?? null);
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga asincrona: el estado cambia cuando responde el servidor, no durante el efecto
    if (userId) void syncSession();
  }, [userId, syncSession]);

  useEffect(() => {
    const onAccessLost = () => void syncSession();
    window.addEventListener(ORGANIZATION_ACCESS_LOST_EVENT, onAccessLost);
    return () => window.removeEventListener(ORGANIZATION_ACCESS_LOST_EVENT, onAccessLost);
  }, [syncSession]);

  function logout() {
    void logoutRequest();
    clearAuthSession();
    queryClient.clear();
    void clearOfflineData();
    setUser(null);
    navigate('/login');
  }

  /** Activa otra organizacion (o la recien creada, o la de una invitacion aceptada): guarda el rol y recarga los datos. */
  const activateOrganization = useCallback(
    (organization: AppOrganization) => {
      if (!user) return;
      const nextUser = withOrganization(user, organization);
      storeUser(nextUser);
      setCurrentOrganizationId(organization.id);
      queryClient.clear();
      setUser(nextUser);
      navigate('/');
      // La eleccion se guarda en la cuenta (otros dispositivos la abren igual). Si falla, en este navegador ya quedo.
      void saveActiveOrganization(organization.id).catch(() => null);
    },
    [navigate, user],
  );

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

    if (!user.currentOrganizationId) return resolveNoOrganizationPage(path, user, navigate, updateProfile, activateOrganization);
    return resolvePage(path, user, navigate, updateProfile);
  }, [activateOrganization, navigate, path, updateProfile, user]);

  if (!user || path === '/login') {
    return <>{page}</>;
  }

  // Crear una organizacion ya no es obligatorio: se llega aqui desde la bienvenida o desde el selector.
  if (path === '/onboarding') {
    return <OnboardingPage user={user} onCreated={activateOrganization} onCancel={() => navigate('/')} onLogout={logout} />;
  }

  const currentOrganization = user.organizations?.find((organization) => organization.id === user.currentOrganizationId);

  return (
    <AudioPlayerProvider>
      <Shell
        user={user}
        path={path}
        navigate={navigate}
        onLogout={logout}
        onSwitchOrganization={activateOrganization}
      >
        {currentOrganization?.archivedAt && <ArchivedOrganizationBanner organization={currentOrganization} onRestored={() => void syncSession()} />}
        {path === '/invitations' ? (
          user.currentOrganizationId ? (
            <MyInvitationsPage onAccepted={activateOrganization} />
          ) : (
            <BackHomeFrame navigate={navigate}>
              <MyInvitationsPage onAccepted={activateOrganization} />
            </BackHomeFrame>
          )
        ) : path === '/settings' ? (
          <div className="space-y-5">
            {page}
            {currentOrganization && <OrganizationSettings organization={currentOrganization} currentUserId={user.id} onChanged={() => void syncSession()} />}
          </div>
        ) : (
          page
        )}
      </Shell>
      <PersistentAudioPlayer />
    </AudioPlayerProvider>
  );
}

export default App;
