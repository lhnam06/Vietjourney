import { Outlet, Link, useLocation } from 'react-router';
import { Bell, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

function NonLaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 4.75c4.65 0 8.86 3.2 10.25 7.85a1 1 0 0 1-.96 1.3H2.71a1 1 0 0 1-.96-1.3C3.14 7.95 7.35 4.75 12 4.75Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 4.75v8.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M6.25 14.05c1.65 1.2 3.62 1.8 5.75 1.8s4.1-.6 5.75-1.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Root() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Khám Phá' },
    { path: '/workspace/trip-1', label: 'Chuyến Đi Của Tôi' },
    { path: '/community', label: 'Cộng Đồng', disabled: true },
  ];

  return (
    <div className="h-screen flex flex-col bg-[var(--vj-bg)]">
      {/* Top Navigation (matches reference screenshot) */}
      <header className="h-16 bg-gradient-to-r from-[var(--vj-primary)] to-[var(--vj-primary-2)] border-b border-[var(--vj-border)]">
        <div className="h-full max-w-[1400px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[var(--vj-text-on-dark)]">
              <NonLaIcon className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--vj-text-on-dark)] font-bold tracking-wide">VIETJOURNEY</span>
              <span className="text-xs text-[var(--vj-text-on-dark-muted)]" aria-label="Việt Nam">
                🇻🇳
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-8">
            {navItems.map((item) => {
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
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

          <div className="flex items-center gap-4">
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-white/10 border border-white/15 hover:bg-white/15 transition-colors flex items-center justify-center text-white"
              aria-label="Notifications"
            >
              <Bell className="w-4.5 h-4.5" />
            </button>
            <div className="flex items-center gap-2">
              <Avatar className="w-9 h-9 ring-2 ring-white/15">
                <AvatarImage src="https://i.pravatar.cc/100?img=12" />
                <AvatarFallback>HN</AvatarFallback>
              </Avatar>
              <ChevronDown className="w-4 h-4 text-[var(--vj-text-on-dark-muted)]" />
            </div>
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