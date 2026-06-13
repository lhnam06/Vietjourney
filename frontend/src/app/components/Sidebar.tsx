import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Clock,
  Compass,
  ListChecks,
  Map,
  Navigation,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { AppView } from "../App";
import { cn } from "../lib/utils";

const navItems = [
  { icon: Compass, label: "Khám phá", view: "explore" as const },
  { icon: Map, label: "Chuyến đi của tôi", view: "trips" as const },
  { icon: Clock, label: "Timeline" },
  { icon: ListChecks, label: "Quản lý Timeline" },
  { icon: Users, label: "Cộng đồng" },
];

interface SidebarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setIsMenuOpen(false);
  }

  function scheduleCloseMenu() {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsMenuOpen(false);
      closeTimerRef.current = null;
    }, 160);
  }

  useEffect(() => clearCloseTimer, []);

  return (
    <div className="hidden h-screen w-[72px] shrink-0 lg:block">
      {isMenuOpen ? (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={closeMenu}
          className="fixed inset-0 z-30 cursor-default bg-foreground/[0.025]"
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
          "fixed bottom-0 left-0 top-0 z-40 flex flex-col border-r border-border/70 bg-card/95 shadow-[0_24px_80px_oklch(0.22_0.02_270_/_0.12)] backdrop-blur-xl transition-[width,border-radius,box-shadow] duration-300 ease-out",
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
            onClick={openMenu}
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-[18px] bg-primary text-primary-foreground transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:scale-95",
              isMenuOpen
                ? "shadow-[0_14px_34px_oklch(0.515_0.22_277_/_0.25)]"
                : "shadow-[0_10px_22px_oklch(0.515_0.22_277_/_0.16)]",
            )}
          >
            <Navigation className="size-6" />
          </button>

          <div
            className={cn(
              "min-w-0 overflow-hidden transition-all duration-200",
              isMenuOpen
                ? "flex-1 translate-x-0 pl-4 opacity-100 delay-100"
                : "pointer-events-none w-0 -translate-x-2 p-0 opacity-0",
            )}
          >
            <h1 className="truncate text-lg font-bold leading-tight text-foreground">
              VietJourney
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              Travel planner for Vietnam
            </p>
          </div>

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
          onClick={openMenu}
          className={cn(
            "group relative flex h-12 items-center rounded-[18px] text-sm font-medium text-muted-foreground transition-all duration-[250ms] ease-out hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:scale-[0.98]",
            isMenuOpen ? "w-full gap-4 px-4" : "w-12 justify-center px-0",
          )}
        >
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
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold tabular-nums text-white transition-all duration-300",
              isMenuOpen ? "ml-auto" : "absolute right-0 top-0",
            )}
          >
            1
          </span>
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

        <img
          src="/avatar.png"
          alt="Ảnh đại diện"
          className={cn(
            "mt-4 size-10 shrink-0 rounded-full object-cover ring-2 ring-card shadow-sm transition-all duration-300",
            isMenuOpen ? "self-start" : "self-center",
          )}
        />
      </aside>
    </div>
  );
}
