import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Compass,
  LogIn,
  LogOut,
  Map,
  Menu,
  Navigation,
  Settings,
  Sparkles,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { AppView } from "../App";
import { fetchNotificationUnreadCount, type CurrentUser } from "../lib/timelineApi";
import { cn } from "../lib/utils";

const navItems = [
  { icon: Compass, label: "Khám phá", view: "explore" as const },
  { icon: Map, label: "Chuyến đi của tôi", view: "trips" as const },
  { icon: Users, label: "Cộng đồng", view: "community" as const },
];

interface SidebarProps {
  activeView: AppView;
  currentUser: CurrentUser | null;
  isAuthenticated: boolean;
  onNavigate: (view: AppView) => void;
  onLogin: () => void;
  onLogout: () => void;
  onLogoClick?: () => void;
}

export function Sidebar({
  activeView,
  currentUser,
  isAuthenticated,
  onNavigate,
  onLogin,
  onLogout,
  onLogoClick,
}: SidebarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayName = currentUser?.displayName || currentUser?.username || "Tài khoản";

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openMenu() {
    clearCloseTimer();
    setIsMenuOpen(true);
  }

  function closeMenu() {
    clearCloseTimer();
    setIsAccountMenuOpen(false);
    setIsMenuOpen(false);
  }

  function scheduleCloseMenu() {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsAccountMenuOpen(false);
      setIsMenuOpen(false);
      closeTimerRef.current = null;
    }, 160);
  }

  useEffect(() => clearCloseTimer, []);

  useEffect(() => {
    if (!isMobileDrawerOpen) return undefined;

    const { overflow } = document.body.style;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileDrawerOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileDrawerOpen]);

  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [activeView]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const controller = new AbortController();
    fetchNotificationUnreadCount(controller.signal)
      .then((result) => setUnreadCount(result.unreadCount))
      .catch(() => setUnreadCount(0));

    return () => controller.abort();
  }, [activeView, isAuthenticated]);

  return (
    <>
      <div className="hidden h-screen w-[72px] shrink-0 lg:block">
        {isMenuOpen ? (
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={closeMenu}
            className="fixed inset-0 z-[1090] cursor-default bg-foreground/[0.025]"
          />
        ) : null}

        <aside
          aria-label="Thanh điều hướng chính"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleCloseMenu}
          onFocus={openMenu}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeMenu();
            }
          }}
          className={cn(
            "fixed bottom-0 left-0 top-0 z-[1100] flex flex-col border-r border-border/70 bg-card/95 shadow-[0_24px_80px_oklch(0.22_0.02_270_/_0.12)] backdrop-blur-xl transition-[width,border-radius,box-shadow] duration-300 ease-out",
            isMenuOpen
              ? "w-[344px] overflow-hidden rounded-r-[28px] border-white/80 px-5 py-5 shadow-[0_24px_90px_oklch(0.22_0.02_270_/_0.18)]"
              : "w-[72px] overflow-visible rounded-r-none px-3 py-5 shadow-none",
          )}
        >
        <div
          className={cn(
            "flex h-12 shrink-0 items-center transition-all duration-300",
            isMenuOpen ? "justify-between" : "justify-center",
          )}
        >
          <button
            type="button"
            aria-label="VietJourney"
            aria-expanded={isMenuOpen}
            onClick={() => {
              if (onLogoClick) onLogoClick();
              else openMenu();
            }}
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-[18px] bg-primary text-primary-foreground transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:scale-95",
              isMenuOpen
                ? "shadow-[0_14px_34px_oklch(0.515_0.22_277_/_0.25)]"
                : "shadow-[0_10px_22px_oklch(0.515_0.22_277_/_0.16)]",
            )}
          >
            <Navigation className="size-6" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (onLogoClick) onLogoClick();
            }}
            className={cn(
              "min-w-0 flex-col items-start overflow-hidden text-left transition-all duration-200 hover:opacity-80",
              isMenuOpen
                ? "flex flex-1 translate-x-0 pl-4 opacity-100 delay-100"
                : "pointer-events-none w-0 -translate-x-2 p-0 opacity-0",
            )}
          >
            <h1 className="truncate text-lg font-bold leading-tight text-foreground">
              VietJourney
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              Travel planner for Vietnam
            </p>
          </button>

          <button
            type="button"
            aria-label="Đóng menu"
            onClick={closeMenu}
            className={cn(
              "flex shrink-0 items-center justify-center overflow-hidden rounded-xl text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:scale-95",
              isMenuOpen
                ? "size-9 translate-x-0 opacity-100 delay-100"
                : "pointer-events-none size-0 -translate-x-2 opacity-0",
            )}
          >
            <X className="size-5" />
          </button>
        </div>

        <nav
          aria-label="Menu"
          className={cn(
            "flex flex-col transition-[gap,margin] duration-300",
            isMenuOpen ? "mt-8 gap-2" : "mt-12 gap-7",
          )}
        >
          {navItems.map(({ icon: Icon, label, view }) => {
            const active = view === activeView;

            return (
              <button
                key={label}
                type="button"
                aria-label={label}
                onClick={() => {
                  if (view) {
                    onNavigate(view);
                  }
                  closeMenu();
                }}
                className={cn(
                  "group relative flex h-12 items-center rounded-[18px] text-sm font-medium transition-all duration-[250ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:scale-[0.98]",
                  isMenuOpen ? "w-full gap-4 px-4" : "w-12 justify-center px-0",
                  active
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                )}
              >
                {active ? (
                  <span
                    className={cn(
                      "absolute rounded-r-full bg-primary transition-all duration-300",
                      isMenuOpen ? "left-0 h-8 w-1" : "hidden",
                    )}
                  />
                ) : null}
                <Icon className="size-5 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                <span
                  className={cn(
                    "overflow-hidden truncate whitespace-nowrap text-left transition-all duration-200",
                    isMenuOpen
                      ? "max-w-56 translate-x-0 opacity-100 delay-100"
                      : "pointer-events-none w-0 max-w-0 -translate-x-2 opacity-0",
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

        <div
          className={cn(
            "transition-all duration-300",
            isMenuOpen ? "my-6 border-t border-border" : "my-7 border-t-0",
          )}
        />

        <button
          type="button"
          aria-label="Thông báo"
          onClick={() => {
            onNavigate("notifications");
            closeMenu();
          }}
          className={cn(
            "group relative flex h-12 items-center rounded-[18px] text-sm font-medium text-muted-foreground transition-all duration-[250ms] ease-out hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:scale-[0.98]",
            isMenuOpen ? "w-full gap-4 px-4" : "w-12 justify-center px-0",
            activeView === "notifications" ? "bg-accent text-primary" : "",
          )}
        >
          {activeView === "notifications" && isMenuOpen ? (
            <span className="absolute left-0 h-8 w-1 rounded-r-full bg-primary" />
          ) : null}
          <Bell className="size-5 shrink-0 transition-transform duration-200 group-hover:scale-105" />
          <span
            className={cn(
              "overflow-hidden truncate whitespace-nowrap text-left transition-all duration-200",
              isMenuOpen
                ? "max-w-56 translate-x-0 opacity-100 delay-100"
                : "pointer-events-none w-0 max-w-0 -translate-x-2 opacity-0",
            )}
          >
            Thông báo
          </span>
          {unreadCount ? (
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold tabular-nums text-white transition-all duration-300",
                isMenuOpen ? "ml-auto" : "absolute right-0 top-0",
              )}
            >
              {Math.min(unreadCount, 9)}
            </span>
          ) : null}
        </button>

        <div className="min-h-6 flex-1" />

        <div
          className={cn(
            "overflow-hidden rounded-[22px] bg-accent shadow-[inset_0_1px_0_oklch(1_0_0_/_0.55)] transition-all duration-300 ease-out",
            isMenuOpen
              ? "max-h-56 p-4 opacity-100"
              : "pointer-events-none max-h-0 p-0 opacity-0",
          )}
        >
          <div className="flex items-center gap-3 text-primary">
            <Sparkles className="size-5 shrink-0" />
            <span className="text-sm font-semibold leading-tight">
              Gợi ý lịch trình
              <br />
              bằng dữ liệu thật
            </span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Tạo danh sách địa điểm từ dữ liệu đã đồng bộ với backend.
          </p>
          <button
            type="button"
            onClick={() => {
              onNavigate("trips");
              closeMenu();
            }}
            className="mt-4 w-full rounded-[16px] bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_oklch(0.515_0.22_277_/_0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:translate-y-0"
          >
            Tạo ngay
          </button>
        </div>

        <div className={cn("relative mt-4", isMenuOpen ? "w-full" : "self-center")}>
          {isAuthenticated ? (
            <>
              <button
                type="button"
                aria-label="Menu người dùng"
                aria-expanded={isAccountMenuOpen}
                aria-controls="account-menu"
                onClick={() => {
                  openMenu();
                  setIsAccountMenuOpen((current) => !current);
                }}
                className={cn(
                  "group flex h-12 items-center rounded-[18px] text-sm font-semibold text-foreground transition-all duration-[250ms] ease-out hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:scale-[0.98]",
                  isMenuOpen ? "w-full gap-4 px-4" : "w-12 justify-center px-0",
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold uppercase text-primary-foreground ring-2 ring-card shadow-sm transition-transform duration-200 group-hover:scale-105">
                  {userInitial(displayName)}
                </span>
                <span
                  className={cn(
                    "min-w-0 overflow-hidden truncate whitespace-nowrap text-left transition-all duration-200",
                    isMenuOpen
                      ? "max-w-44 translate-x-0 opacity-100 delay-100"
                      : "pointer-events-none w-0 max-w-0 -translate-x-2 opacity-0",
                  )}
                >
                  {displayName}
                </span>
              </button>

              <div
                id="account-menu"
                className={cn(
                  "fixed z-50 w-56 overflow-hidden rounded-[18px] border border-border/80 bg-card/98 p-1.5 shadow-[0_20px_60px_oklch(0.22_0.02_270_/_0.18)] backdrop-blur-xl transition-all duration-200",
                  isMenuOpen ? "bottom-[78px] left-5" : "bottom-[78px] left-[76px]",
                  isAccountMenuOpen
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-2 opacity-0",
                )}
              >
                <AccountMenuButton
                  icon={UserRound}
                  label="Hồ sơ"
                  onClick={() => {
                    onNavigate("profile");
                    closeMenu();
                  }}
                />
                <AccountMenuButton
                  icon={Settings}
                  label="Cài đặt"
                  onClick={() => {
                    onNavigate("settings");
                    closeMenu();
                  }}
                />
                <div className="my-1 h-px bg-border/70" />
                <AccountMenuButton
                  icon={LogOut}
                  label="Đăng xuất"
                  danger
                  onClick={() => {
                    closeMenu();
                    onLogout();
                  }}
                />
              </div>
            </>
          ) : (
            <button
              type="button"
              aria-label="Đăng nhập"
              onClick={() => {
                closeMenu();
                onLogin();
              }}
              className={cn(
                "group flex h-12 items-center rounded-[18px] text-sm font-semibold text-primary transition-all duration-[250ms] ease-out hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:scale-[0.98]",
                isMenuOpen ? "w-full gap-4 px-4" : "w-12 justify-center px-0",
              )}
            >
              <LogIn className="size-5 shrink-0 transition-transform duration-200 group-hover:scale-105" />
              <span
                className={cn(
                  "min-w-0 overflow-hidden truncate whitespace-nowrap text-left transition-all duration-200",
                  isMenuOpen
                    ? "max-w-44 translate-x-0 opacity-100 delay-100"
                    : "pointer-events-none w-0 max-w-0 -translate-x-2 opacity-0",
                )}
              >
                Đăng nhập
              </span>
            </button>
          )}
        </div>
        </aside>
      </div>

      <div className="lg:hidden">
        {isMobileDrawerOpen ? (
          <button
            type="button"
            aria-label="Đóng menu điều hướng"
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 z-[1090] bg-slate-950/40 backdrop-blur-[2px]"
          />
        ) : null}

        <aside
          className={cn(
            "fixed inset-x-0 bottom-0 z-[1110] rounded-t-[30px] border border-border/80 bg-card/98 shadow-[0_-24px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-transform duration-300 ease-out",
            isMobileDrawerOpen ? "translate-y-0" : "pointer-events-none translate-y-full",
          )}
          aria-label="Menu điều hướng trên điện thoại"
        >
          <div className="mx-auto flex max-h-[78vh] w-full max-w-md flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  if (onLogoClick) onLogoClick();
                }}
                className="flex min-w-0 items-center gap-3 text-left"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[18px] bg-primary text-primary-foreground shadow-[0_12px_28px_oklch(0.515_0.22_277_/_0.22)]">
                  <Navigation className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-bold text-foreground">VietJourney</span>
                  <span className="block truncate text-xs text-muted-foreground">Travel planner for Vietnam</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 rounded-[24px] border border-border bg-background/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tài khoản</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold uppercase text-primary-foreground shadow-sm">
                  {userInitial(displayName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{displayName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {isAuthenticated ? "Quản lý chuyến đi, cộng đồng và cài đặt." : "Đăng nhập để đồng bộ lịch trình của bạn."}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex-1 space-y-6 overflow-y-auto pb-3">
              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Điều hướng</p>
                <div className="mt-3 space-y-2">
                  {navItems.map(({ icon: Icon, label, view }) => {
                    const active = view === activeView;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          onNavigate(view);
                          setIsMobileDrawerOpen(false);
                        }}
                        className={cn(
                          "flex h-14 w-full items-center gap-4 rounded-[20px] px-4 text-left text-sm font-semibold transition-colors",
                          active ? "bg-primary text-primary-foreground shadow-sm" : "bg-background text-foreground hover:bg-accent",
                        )}
                      >
                        <Icon className="size-5 shrink-0" />
                        <span className="flex-1 truncate">{label}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate("notifications");
                      setIsMobileDrawerOpen(false);
                    }}
                    className={cn(
                      "flex h-14 w-full items-center gap-4 rounded-[20px] px-4 text-left text-sm font-semibold transition-colors",
                      activeView === "notifications"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-background text-foreground hover:bg-accent",
                    )}
                  >
                    <Bell className="size-5 shrink-0" />
                    <span className="flex-1 truncate">Thông báo</span>
                    {unreadCount ? (
                      <span className="flex size-6 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-white">
                        {Math.min(unreadCount, 9)}
                      </span>
                    ) : null}
                  </button>
                </div>
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tiện ích</p>
                <div className="mt-3 rounded-[24px] border border-border bg-accent/60 p-4">
                  <div className="flex items-center gap-3 text-primary">
                    <Sparkles className="size-5 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Gợi ý lịch trình</p>
                      <p className="text-sm text-muted-foreground">Tạo chuyến đi từ dữ liệu địa điểm thật.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate("trips");
                      setIsMobileDrawerOpen(false);
                    }}
                    className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_26px_oklch(0.515_0.22_277_/_0.22)]"
                  >
                    Tạo ngay
                  </button>
                </div>
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tài khoản</p>
                <div className="mt-3 space-y-2">
                  {isAuthenticated ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate("profile");
                          setIsMobileDrawerOpen(false);
                        }}
                        className="flex h-12 w-full items-center gap-3 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                      >
                        <UserRound className="size-4 shrink-0" />
                        Hồ sơ
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate("settings");
                          setIsMobileDrawerOpen(false);
                        }}
                        className="flex h-12 w-full items-center gap-3 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                      >
                        <Settings className="size-4 shrink-0" />
                        Cài đặt
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileDrawerOpen(false);
                          onLogout();
                        }}
                        className="flex h-12 w-full items-center gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <LogOut className="size-4 shrink-0" />
                        Đăng xuất
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileDrawerOpen(false);
                        onLogin();
                      }}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                    >
                      <LogIn className="size-4" />
                      Đăng nhập
                    </button>
                  )}
                </div>
              </section>
            </div>
          </div>
        </aside>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[1080] px-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))]">
          <nav className="pointer-events-auto mx-auto grid max-w-md grid-cols-5 gap-2 rounded-[28px] border border-border/80 bg-card/96 p-2 shadow-[0_18px_44px_rgba(15,23,42,0.16)] backdrop-blur-xl">
            {navItems.map(({ icon: Icon, label, view }) => {
              const active = view === activeView;
              return (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  onClick={() => onNavigate(view)}
                  className={cn(
                    "flex min-h-[60px] items-center justify-center rounded-[20px] px-1 transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-5" />
                </button>
              );
            })}
            <button
              type="button"
              aria-label="Thêm"
              onClick={() => setIsMobileDrawerOpen(true)}
              className={cn(
                "relative flex min-h-[60px] items-center justify-center rounded-[20px] px-1 transition-colors",
                isMobileDrawerOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <div className="relative">
                <Menu className="size-5" />
                {unreadCount ? (
                  <span className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                    {Math.min(unreadCount, 9)}
                  </span>
                ) : null}
              </div>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}

function userInitial(name: string) {
  return name.trim().charAt(0) || "U";
}

function AccountMenuButton({
  icon: Icon,
  label,
  danger = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-[12px] px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 active:scale-[0.99]",
        danger
          ? "text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/30"
          : "text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-primary/30",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
