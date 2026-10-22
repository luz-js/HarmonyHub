import { useState, type ReactNode } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  CalendarRange,
  FolderOpen,
  Home,
  ListMusic,
  LogOut,
  Mail,
  Menu,
  MoreHorizontal,
  Music2,
  Settings,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { getInitials } from '../features/dashboard/utils';
import { useMyInvitations } from '../features/invitations/hooks';
import { NotificationBell } from '../features/notifications/components/NotificationBell';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { getRoleLabel } from './session';
import type { AppOrganization, AppUser, Navigate } from './types';

type NavItem = { href: string; label: string; icon: LucideIcon };

const navItems: NavItem[] = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/songs', label: 'Canciones', icon: Music2 },
  { href: '/setlists', label: 'Setlists', icon: ListMusic },
  { href: '/events', label: 'Eventos', icon: CalendarDays },
  { href: '/calendar', label: 'Calendario', icon: CalendarRange },
  { href: '/musicians', label: 'Músicos', icon: Users },
  { href: '/archives', label: 'Archivos', icon: FolderOpen },
  { href: '/activity', label: 'Actividad', icon: Activity },
  { href: '/stats', label: 'Estadísticas', icon: BarChart3 },
];

const settingsItem: NavItem = { href: '/settings', label: 'Ajustes', icon: Settings };

/** Pestanas fijas del menu inferior en el celular; el resto vive en "Mas". */
const mobileTabs = ['/', '/songs', '/events', '/setlists'];

function isActive(path: string, href: string) {
  return path === href || (href !== '/' && path.startsWith(`${href}/`));
}

function NavLink({
  href,
  navigate,
  className = '',
  onNavigate,
  children,
}: {
  href: string;
  navigate: Navigate;
  className?: string;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        onNavigate?.();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary text-on-primary">
        <Music2 className="h-[18px] w-[18px]" strokeWidth={2.4} />
      </span>
      <span className="font-display text-xl font-bold tracking-tight text-white">HarmonyHub</span>
    </span>
  );
}

function SidebarLink({ item, path, navigate }: { item: NavItem; path: string; navigate: Navigate }) {
  const Icon = item.icon;
  const active = isActive(path, item.href);
  return (
    <NavLink
      href={item.href}
      navigate={navigate}
      className={`flex h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] transition ${
        active ? 'bg-primary-tint font-bold text-primary' : 'font-semibold text-[#C9C5BD] hover:bg-white/[0.04] hover:text-white'
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {item.label}
    </NavLink>
  );
}

/** Punto turquesa sobre el avatar: hay invitaciones esperando respuesta. */
function PendingDot() {
  return <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-[var(--primary)] ring-2 ring-[#141518]" aria-hidden />;
}

/** Menu de la cuenta: muestra quien eres y deja cerrar sesion sin hacerlo por accidente. */
function AccountMenu({
  user,
  navigate,
  onLogout,
  placement,
}: {
  user: AppUser;
  navigate: Navigate;
  onLogout: () => void;
  placement: 'sidebar' | 'topbar';
}) {
  const [open, setOpen] = useState(false);
  const inSidebar = placement === 'sidebar';
  const pendingInvitations = useMyInvitations().data?.length ?? 0;

  return (
    <div className="relative">
      {inSidebar ? (
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl border border-[#23252A] px-3 py-2.5 text-left transition hover:border-[#30333A] hover:bg-white/[0.03]"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="avatar relative h-9 w-9 shrink-0 text-[13px]">
            {getInitials(user.name)}
            {pendingInvitations > 0 && <PendingDot />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-white">{user.name}</span>
            <span className="block text-xs text-muted">{getRoleLabel(user.role)}</span>
          </span>
          <MoreHorizontal className="h-4 w-4 shrink-0 text-muted" />
        </button>
      ) : (
        <button
          type="button"
          className="avatar relative h-11 w-11 shrink-0 text-sm"
          aria-label={pendingInvitations > 0 ? `Tu cuenta (${pendingInvitations} invitaciones pendientes)` : 'Tu cuenta'}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {getInitials(user.name)}
          {pendingInvitations > 0 && <PendingDot />}
        </button>
      )}
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Cerrar" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className={`absolute z-50 w-64 rounded-xl border border-[#30333A] bg-[#1A1B1F] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.55)] ${
              inSidebar ? 'bottom-full left-0 mb-2' : 'right-0 top-full mt-2'
            }`}
          >
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-bold text-white">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
            <div className="my-1 border-t border-[#30333A]" />
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#D8D5CE] hover:bg-white/5"
              onClick={() => {
                setOpen(false);
                navigate('/profile');
              }}
            >
              <UserRound className="h-4 w-4" /> Mi perfil
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#D8D5CE] hover:bg-white/5"
              onClick={() => {
                setOpen(false);
                navigate('/invitations');
              }}
            >
              <Mail className="h-4 w-4" /> Mis invitaciones
              {pendingInvitations > 0 && <span className="badge badge-primary ml-auto">{pendingInvitations}</span>}
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#D8D5CE] hover:bg-white/5"
              onClick={() => {
                setOpen(false);
                navigate('/settings');
              }}
            >
              <Settings className="h-4 w-4" /> Ajustes
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#F27A6E] hover:bg-white/5"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MobileMoreSheet({ path, navigate, onClose, onLogout }: { path: string; navigate: Navigate; onClose: () => void; onLogout: () => void }) {
  const items = [...navItems.filter((item) => !mobileTabs.includes(item.href)), settingsItem];
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="Cerrar menú" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-[#30333A] bg-[#1A1B1F] px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#3D4048]" />
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="font-display text-lg font-semibold text-white">Más secciones</p>
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-white/5" aria-label="Cerrar menú" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="grid grid-cols-1 gap-1">
          {items.map((item) => (
            <SidebarLinkMobile key={item.href} item={item} path={path} navigate={navigate} onNavigate={onClose} />
          ))}
        </nav>
        <div className="my-2 border-t border-[#30333A]" />
        <button
          type="button"
          className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-semibold text-[#F27A6E] hover:bg-white/5"
          onClick={() => {
            onClose();
            onLogout();
          }}
        >
          <LogOut className="h-[18px] w-[18px]" /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function SidebarLinkMobile({ item, path, navigate, onNavigate }: { item: NavItem; path: string; navigate: Navigate; onNavigate: () => void }) {
  const Icon = item.icon;
  const active = isActive(path, item.href);
  return (
    <NavLink
      href={item.href}
      navigate={navigate}
      onNavigate={onNavigate}
      className={`flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] ${active ? 'bg-primary-tint font-bold text-primary' : 'font-semibold text-[#D8D5CE] hover:bg-white/5'}`}
    >
      <Icon className="h-[18px] w-[18px]" />
      {item.label}
    </NavLink>
  );
}

function MobileTabBar({ path, navigate, onMore }: { path: string; navigate: Navigate; onMore: () => void }) {
  const tabs = mobileTabs.map((href) => navItems.find((item) => item.href === href)!);
  const moreActive = !tabs.some((item) => isActive(path, item.href));
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#23252A] bg-[#0C0D0F]/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label="Secciones"
    >
      {tabs.map((item) => {
        const Icon = item.icon;
        const active = isActive(path, item.href);
        return (
          <NavLink
            key={item.href}
            href={item.href}
            navigate={navigate}
            className={`flex h-16 flex-col items-center justify-center gap-1 text-xs ${active ? 'font-bold text-primary' : 'font-semibold text-muted'}`}
          >
            <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.3 : 2} />
            {item.label}
          </NavLink>
        );
      })}
      <button
        type="button"
        className={`flex h-16 flex-col items-center justify-center gap-1 text-xs ${moreActive ? 'font-bold text-primary' : 'font-semibold text-muted'}`}
        onClick={onMore}
      >
        <Menu className="h-[22px] w-[22px]" />
        Más
      </button>
    </nav>
  );
}

export function Shell({
  user,
  path,
  navigate,
  onLogout,
  onSwitchOrganization,
  children,
}: {
  user: AppUser;
  path: string;
  navigate: Navigate;
  onLogout: () => void;
  onSwitchOrganization: (organization: AppOrganization) => void;
  children: ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[256px] flex-col gap-6 border-r border-[#23252A] bg-[#0C0D0F] px-4 py-6 lg:flex">
        <div className="flex items-center justify-between gap-2 px-2">
          <NavLink href="/" navigate={navigate}>
            <Logo />
          </NavLink>
          <NotificationBell navigate={navigate} placement="sidebar" />
        </div>

        <OrganizationSwitcher user={user} onSwitch={onSwitchOrganization} onCreateNew={() => navigate('/onboarding')} />

        <nav className="flex flex-col gap-0.5 overflow-y-auto" aria-label="Secciones">
          {navItems.map((item) => (
            <SidebarLink key={item.href} item={item} path={path} navigate={navigate} />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <SidebarLink item={settingsItem} path={path} navigate={navigate} />
          <AccountMenu user={user} navigate={navigate} onLogout={onLogout} placement="sidebar" />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#23252A] bg-[#111214]/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <NavLink href="/" navigate={navigate} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary text-on-primary">
          <Music2 className="h-5 w-5" strokeWidth={2.4} />
          <span className="sr-only">Inicio</span>
        </NavLink>
        <OrganizationSwitcher user={user} onSwitch={onSwitchOrganization} onCreateNew={() => navigate('/onboarding')} variant="compact" />
        <NotificationBell navigate={navigate} placement="topbar" />
        <AccountMenu user={user} navigate={navigate} onLogout={onLogout} placement="topbar" />
      </header>

      <div className="min-h-screen lg:pl-[256px]">
        <main className="container pb-28 pt-6 lg:pb-14 lg:pt-10">{children}</main>
      </div>

      <MobileTabBar path={path} navigate={navigate} onMore={() => setMoreOpen(true)} />
      {moreOpen && <MobileMoreSheet path={path} navigate={navigate} onClose={() => setMoreOpen(false)} onLogout={onLogout} />}
    </div>
  );
}
