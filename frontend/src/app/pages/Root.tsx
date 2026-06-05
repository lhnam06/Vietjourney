import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import {
  Bell,
  ChevronDown,
  Compass,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Route as RouteIcon,
  Timer,
  User as UserIcon,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../components/ui/sheet';
import { useAuth } from '../context/AuthContext';
import { cacheClearAll } from '../lib/apiCache';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { useNotificationSocket } from '../hooks/useNotificationSocket';
import { getUnreadCountRequest } from '../lib/notificationApi';
import { cn } from '../components/ui/utils';
import logoUrl from '../../../photos/Vietjourney_logo.png';

function initialsFromDisplay(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

type NavEntry = {
  path: string;
  label: string;
  description: string;
  icon: LucideIcon;
  disabled?: boolean;
  isActive?: (pathname: string) => boolean;
};

const linkFocusRing =
  'rounded-md outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color-mix(in_oklab,var(--vj-accent)_80%,white)]';

export default function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, isAuthenticated, signOut } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useLocalStorageState('vj:ui:sidebar-open', true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { lastEvent: notificationEvent } = useNotificationSocket();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!token) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;
    const refreshUnread = async () => {
      try {
        const count = await getUnreadCountRequest(token);
        if (!cancelled) setUnreadCount(count);
      } catch {
        if (!cancelled) setUnreadCount(0);
      }
    };

    void refreshUnread();
    const timer = window.setInterval(refreshUnread, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token]);

  useEffect(() => {
    if (!notificationEvent) return;
    setUnreadCount((count) => count + (notificationEvent.status === 'UNREAD' ? 1 : 0));
    toast(notificationEvent.title, { description: notificationEvent.message });
  }, [notificationEvent]);

  useEffect(() => {
    const onUnreadChange = (event: Event) => {
      const next = (event as CustomEvent<number>).detail;
      if (typeof next === 'number') setUnreadCount(next);
    };
    window.addEventListener('vj:notifications-unread', onUnreadChange);
    return () => window.removeEventListener('vj:notifications-unread', onUnreadChange);
  }, []);

  const navItems: NavEntry[] = [
    {
      path: '/',
      label: 'Khám Phá',
      description: 'Tìm địa điểm và kéo vào lịch',
      icon: Compass,
      isActive: (p) => p === '/',
    },
    {
      path: '/mytrip',
      label: 'Chuyến Đi Của Tôi',
      description: 'Workspace và timeline của bạn',
      icon: RouteIcon,
      isActive: (p) => p === '/mytrip' || p.startsWith('/workspace/'),
    },
    {
      path: '/timelines',
      label: 'Quản lý Timeline',
      description: 'Tạo, mời và tham gia nhóm',
      icon: Timer,
      isActive: (p) => p === '/timelines',
    },
    {
      path: '/community',
      label: 'Cộng Đồng',
      description: 'Sắp ra mắt',
      icon: Users,
      disabled: true,
    },
  ];

  const renderSideNavLinks = () =>
    navItems.map((item) => {
      const isActive =
        item.disabled ? false : item.isActive
          ? item.isActive(location.pathname)
          : location.pathname.startsWith(item.path);

      const Icon = item.icon;
      const content = (
        <>
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-colors',
              isActive
                ? 'border-[var(--vj-accent)]/50 bg-[var(--vj-accent)] text-white shadow-lg shadow-orange-950/20'
                : item.disabled
                  ? 'border-white/10 bg-white/5 text-white/35'
                  : 'border-white/10 bg-white/8 text-white/75 group-hover:bg-white/14 group-hover:text-white'
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </span>
          <span className="min-w-0">
            <span className={cn('block truncate text-sm font-extrabold', isActive ? 'text-white' : 'text-white/85')}>
              {item.label}
            </span>
            <span className={cn('mt-0.5 block truncate text-[11px]', item.disabled ? 'text-white/30' : 'text-white/52')}>
              {item.description}
            </span>
          </span>
          {isActive ? (
            <span className="ml-auto h-8 w-1 rounded-full bg-[var(--vj-accent)] shadow-[0_0_16px_rgba(255,107,53,0.55)]" aria-hidden />
          ) : null}
        </>
      );

      if (item.disabled) {
        return (
          <div
            key={item.path}
            className="group flex items-center gap-3 rounded-3xl border border-white/8 bg-white/[0.04] px-3 py-3 opacity-70"
          >
            {content}
          </div>
        );
      }

      return (
        <Link
          key={item.path}
          to={item.path}
          className={cn(
            'group flex items-center gap-3 rounded-3xl border px-3 py-3 transition-all',
            isActive
              ? 'border-white/18 bg-white/16 shadow-[0_18px_40px_rgba(0,0,0,0.16)]'
              : 'border-white/8 bg-white/[0.06] hover:border-white/16 hover:bg-white/[0.10] hover:translate-x-0.5',
            linkFocusRing
          )}
        >
          {content}
        </Link>
      );
    });

  const renderMobileNavLinks = () =>
    navItems.map((item) => {
      const isActive =
        item.disabled ? false : item.isActive
          ? item.isActive(location.pathname)
          : location.pathname.startsWith(item.path);

      if (item.disabled) {
        return (
          <div
            key={item.path}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/35"
          >
            {item.label}
            <span className="mt-0.5 block text-xs font-normal text-white/30">Sắp có</span>
          </div>
        );
      }

      return (
        <Link
          key={item.path}
          to={item.path}
          onClick={() => setMobileNavOpen(false)}
          className={cn(
            'rounded-xl border px-4 py-3.5 text-base font-semibold transition-colors',
            isActive
              ? 'border-[var(--vj-accent)]/60 bg-white/10 text-white'
              : 'border-white/15 bg-white/5 text-[var(--vj-text-on-dark-muted)] hover:bg-white/10 hover:text-[var(--vj-text-on-dark)]',
            linkFocusRing
          )}
        >
          {item.label}
        </Link>
      );
    });

  return (
    <div className="vj-app-shell h-[100dvh] flex flex-col md:flex-row">
      <a
        href="#main-content"
        className="absolute left-[-10000px] top-3 z-[1200] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[var(--vj-primary)] shadow-lg transition-none focus:left-3 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--vj-accent)]"
      >
        Bỏ qua điều hướng
      </a>

      <header className="md:hidden shrink-0 min-h-14 bg-gradient-to-r from-[var(--vj-primary)] to-[var(--vj-primary-2)] border-b border-[var(--vj-border)] relative z-[1100] shadow-sm">
        <div className="h-full w-full px-[var(--vj-page-pad-x)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-10 w-10 border-white/25 bg-white/10 text-white hover:bg-white/15"
                  aria-label="Mở menu điều hướng"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[min(100%,20rem)] flex flex-col border-white/15 bg-gradient-to-b from-[var(--vj-primary)] to-[var(--vj-primary-2)] p-0 text-[var(--vj-text-on-dark)] [&>button]:text-white/80"
              >
                <SheetHeader className="border-b border-white/10 p-4 text-left">
                  <SheetTitle className="text-white text-lg">Điều hướng</SheetTitle>
                  <p className="text-xs font-medium text-white/65">Chọn mục nhanh</p>
                </SheetHeader>
                <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">{renderMobileNavLinks()}</nav>
                <div className="p-4 mt-auto border-t border-white/10 shrink-0">
                  {isAuthenticated && user ? (
                    <div className="flex flex-col gap-3">
                      <Link to="/profile" className="flex items-center gap-3 rounded-[1.5rem] border border-white/12 bg-white/10 p-3 text-left transition hover:bg-white/14" onClick={() => setMobileNavOpen(false)}>
                        <Avatar className="h-10 w-10 ring-2 ring-white/15">
                          <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                            {initialsFromDisplay(user.displayName || user.username)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-extrabold text-white">{user.displayName}</span>
                          <span className="block truncate text-[11px] text-white/55">{user.username}</span>
                        </span>
                      </Link>
                      <Button
                        variant="destructive"
                        className="w-full rounded-xl bg-red-500/20 text-red-100 hover:bg-red-500/30"
                        onClick={async () => {
                          try {
                            await signOut();
                            cacheClearAll();
                            toast.success('Đã đăng xuất');
                            navigate('/', { replace: true });
                            setMobileNavOpen(false);
                          } catch {
                            toast.error('Không thể đăng xuất');
                          }
                        }}
                      >
                        Đăng xuất
                      </Button>
                    </div>
                  ) : (
                    <Button asChild className="w-full h-12 rounded-[1.5rem] bg-white/14 text-white hover:bg-white/20 border border-white/12">
                      <Link to={`/auth?next=${encodeURIComponent(location.pathname + location.search + location.hash)}`} onClick={() => setMobileNavOpen(false)}>
                        Đăng nhập
                      </Link>
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Link
              to="/"
              className={cn(
                'h-11 min-w-0 flex items-center rounded-xl bg-white/18 border border-white/20 px-2 py-1.5 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:bg-white/22 transition-colors',
                linkFocusRing
              )}
              aria-label="Về trang chủ Vietjourney"
            >
              <img src={logoUrl} alt="" className="h-9 w-auto max-w-[9.5rem] object-contain object-left" loading="eager" decoding="async" />
              <span className="sr-only">Vietjourney</span>
            </Link>
          </div>

          <button
            type="button"
            className="relative h-10 w-10 rounded-full bg-white/10 border border-white/15 hover:bg-white/15 transition-colors flex items-center justify-center text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--vj-accent)_80%,white)]"
            aria-label="Thông báo"
            onClick={() => navigate(isAuthenticated ? '/notifications' : `/auth?next=${encodeURIComponent('/notifications')}`)}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[var(--vj-accent)] px-1.5 py-0.5 text-[10px] font-black leading-none text-white shadow">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      <aside
        className={cn(
          'hidden md:flex shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-[var(--vj-primary)] via-[var(--vj-primary-2)] to-[#063631] text-white shadow-[18px_0_50px_rgba(0,0,0,0.18)] transition-[width,padding] duration-300 ease-[var(--vj-ease-out-expo)]',
          sidebarOpen ? 'w-[18.5rem] p-4' : 'w-0 overflow-hidden p-0 border-r-0'
        )}
        aria-hidden={!sidebarOpen}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto hide-scrollbar">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-2xl border border-white/12 bg-white/10 text-white/75 transition hover:bg-white/16 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--vj-accent)_80%,white)]"
            aria-label="Ẩn thanh điều hướng"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>

          <Link
            to="/"
            className={cn(
              'rounded-[2rem] border border-white/15 bg-white/12 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:bg-white/16',
              linkFocusRing
            )}
            aria-label="Về trang chủ Vietjourney"
          >
            <img src={logoUrl} alt="" className="h-14 w-auto max-w-full object-contain object-left" loading="eager" decoding="async" />
            <p className="mt-2 text-xs font-semibold text-white/60">Travel planner for Vietnam</p>
          </Link>

          <nav className="flex flex-col gap-2 rounded-[2rem] border border-white/10 bg-black/10 p-2 shadow-inner" aria-label="Chính">
            {renderSideNavLinks()}
          </nav>

          <div className="mt-auto flex flex-col gap-3">
            <button
              type="button"
              className="group flex items-center gap-3 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-3 text-left transition hover:border-white/16 hover:bg-white/[0.10] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--vj-accent)_80%,white)]"
              onClick={() => navigate(isAuthenticated ? '/notifications' : `/auth?next=${encodeURIComponent('/notifications')}`)}
            >
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white/80 group-hover:text-white">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[var(--vj-accent)] px-1.5 py-0.5 text-[10px] font-black leading-none text-white shadow">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-white">Thông báo</span>
                <span className="block text-[11px] text-white/52">
                  {unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Không có thông báo mới'}
                </span>
              </span>
            </button>

            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.75rem] border border-white/12 bg-white/10 p-3 text-left transition hover:bg-white/14 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--vj-accent)_80%,white)]"
                  >
                    <Avatar className="h-11 w-11 ring-2 ring-white/15">
                      <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                        {initialsFromDisplay(user.displayName || user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-white">{user.displayName}</span>
                      <span className="block truncate text-[11px] text-white/55">{user.username}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-white/55" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="right" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      Hồ sơ
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={async () => {
                      try {
                        await signOut();
                        cacheClearAll();
                        toast.success('Đã đăng xuất');
                        navigate('/', { replace: true });
                      } catch {
                        toast.error('Không thể đăng xuất');
                      }
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild className="h-12 rounded-[1.5rem] bg-white/14 text-white hover:bg-white/20 border border-white/12">
                <Link to={`/auth?next=${encodeURIComponent(location.pathname + location.search + location.hash)}`}>
                  Đăng nhập
                </Link>
              </Button>
            )}
          </div>
        </div>
      </aside>

      {!sidebarOpen ? (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="hidden md:flex fixed left-3 top-3 z-[1200] h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-[var(--vj-primary)] text-white shadow-[0_16px_35px_rgba(0,0,0,0.25)] transition hover:bg-[var(--vj-primary-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vj-accent)]"
          aria-label="Hiện thanh điều hướng"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      ) : null}

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden pb-[var(--vj-safe-bottom)] outline-none"
      >
        <Outlet />
      </main>
    </div>
  );
}
