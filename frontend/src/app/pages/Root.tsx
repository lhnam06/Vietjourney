import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { Bell, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { useAuth } from '../context/AuthContext';
import { getLastTripId } from '../lib/tripStorage';
import logoUrl from '../../../photos/Vietjourney_logo.png';

function initialsFromDisplay(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuth();
  
  const lastTripId = getLastTripId();
  const isTripIdValid = lastTripId && lastTripId !== 'undefined';

  const navItems: {
    path: string;
    label: string;
    disabled?: boolean;
    isActive?: (pathname: string) => boolean;
  }[] = [
    { path: '/', label: 'Khám Phá', isActive: (p) => p === '/' },
    {
      path: isTripIdValid ? `/workspace/${lastTripId}` : '/profile',
      label: 'Chuyến Đi Của Tôi',
      isActive: (p) => p.startsWith('/workspace/') || (p === '/profile' && !isTripIdValid),
    },
    {
      path: isTripIdValid ? `/timetable/${lastTripId}` : '/profile',
      label: 'Thời khoá biểu',
      isActive: (p) => p.startsWith('/timetable/'),
      disabled: !isTripIdValid,
    },
    {
      path: '/timelines',
      label: 'Quản lý Timeline',
      isActive: (p) => p === '/timelines',
    },
    { path: '/community', label: 'Cộng Đồng', disabled: true },
  ];

  return (
    <div className="h-screen flex flex-col bg-[var(--vj-bg)]">
      {/* Top Navigation (matches reference screenshot) */}
      <header className="h-16 bg-gradient-to-r from-[var(--vj-primary)] to-[var(--vj-primary-2)] border-b border-[var(--vj-border)] relative z-[1100]">
        <div className="h-full max-w-[1400px] mx-auto px-6 flex items-center justify-between">
          <Link
            to="/"
            className="h-12 sm:h-14 flex items-center rounded-xl bg-white/18 border border-white/20 px-2.5 py-1.5 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:bg-white/22 transition-colors"
            aria-label="Về trang chủ Vietjourney"
          >
            <img
              src={logoUrl}
              alt="Vietjourney"
              className="h-10 sm:h-12 w-auto max-w-[11rem] sm:max-w-[13rem] object-contain object-left"
              loading="eager"
              decoding="async"
            />
          </Link>

          <nav className="flex items-center gap-8">
            {navItems.map((item) => {
              const isActive =
                item.disabled
                  ? false
                  : item.isActive
                    ? item.isActive(location.pathname)
                    : location.pathname.startsWith(item.path);

              const base =
                'relative text-sm font-semibold transition-colors';
              const active = 'text-white';
              const inactive = item.disabled
                ? 'text-white/40 cursor-not-allowed'
                : 'text-[var(--vj-text-on-dark-muted)] hover:text-[var(--vj-text-on-dark)]';

              const content = (
                <span className={`${base} ${isActive ? active : inactive}`}>
                  {item.label}
                  {isActive && (
                    <span className="absolute -bottom-5 left-0 right-0 h-0.5 bg-white/80 rounded-full" />
                  )}
                </span>
              );

              return item.disabled ? (
                <span key={item.path}>{content}</span>
              ) : (
                <Link key={item.path} to={item.path}>
                  {content}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-white/10 border border-white/15 hover:bg-white/15 transition-colors flex items-center justify-center text-white"
              aria-label="Notifications"
            >
              <Bell className="w-4.5 h-4.5" />
            </button>
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full pl-0.5 pr-2 py-0.5 hover:bg-white/10 transition-colors text-left"
                  >
                    <Avatar className="w-9 h-9 ring-2 ring-white/15">
                      <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                        {initialsFromDisplay(user.displayName || user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block max-w-[140px]">
                      <p className="text-sm font-semibold text-white leading-tight truncate">
                        {user.displayName}
                      </p>
                      <p className="text-[11px] text-[var(--vj-text-on-dark-muted)] truncate">
                        {user.username}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-[var(--vj-text-on-dark-muted)] shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
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
              <Button
                asChild
                className="bg-white/15 hover:bg-white/25 text-white border border-white/20 font-semibold"
              >
                <Link
                  to={`/auth?next=${encodeURIComponent(
                    location.pathname + location.search + location.hash
                  )}`}
                >
                  Đăng nhập
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
    </div>
  );
}