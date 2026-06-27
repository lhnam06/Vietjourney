import { Menu, Navigation, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface LandingNavbarProps {
  isAuthenticated: boolean;
  onStartPlanning: () => void;
  onExplore: () => void;
  onCommunity: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

export function LandingNavbar({
  isAuthenticated,
  onStartPlanning,
  onExplore,
  onCommunity,
  onLogin,
  onRegister,
}: LandingNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const marker = document.createElement("span");
    marker.className = "landing-nav-marker";
    marker.setAttribute("aria-hidden", "true");
    document.body.prepend(marker);

    const observer = new IntersectionObserver(([entry]) => setIsScrolled(!entry.isIntersecting));
    observer.observe(marker);

    return () => {
      observer.disconnect();
      marker.remove();
    };
  }, []);

  useEffect(() => {
    if (!isMobileOpen) return;

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsMobileOpen(false);
      menuButtonRef.current?.focus();
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !navRef.current?.contains(event.target)) {
        setIsMobileOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMobileOpen]);

  function closeMobileMenu() {
    setIsMobileOpen(false);
  }

  function runMobileAction(action: () => void) {
    closeMobileMenu();
    action();
  }

  return (
    <nav ref={navRef} className={`landing-navbar${isScrolled ? " is-scrolled" : ""}`} aria-label="Điều hướng trang giới thiệu">
      <div className="landing-container landing-navbar-inner">
        <a href="#landing-top" className="landing-brand" aria-label="Về đầu trang VietJourney" onClick={closeMobileMenu}>
          <span className="landing-brand-mark"><Navigation aria-hidden="true" /></span>
          <span>VietJourney</span>
        </a>

        <div className="landing-nav-links">
          <a href="#how-it-works">Cách hoạt động</a>
          <a href="#features">Tính năng</a>
          <button type="button" onClick={onExplore}>Khám phá</button>
          <button type="button" onClick={onCommunity}>Cộng đồng</button>
        </div>

        <div className="landing-nav-actions">
          {isAuthenticated ? (
            <button type="button" onClick={onStartPlanning} className="landing-nav-cta">
              Chuyến đi của tôi
            </button>
          ) : (
            <>
              <button type="button" onClick={onLogin} className="landing-login-button">Đăng nhập</button>
              <button type="button" onClick={onRegister} className="landing-nav-cta">Đăng ký</button>
            </>
          )}
          <button
            ref={menuButtonRef}
            type="button"
            className="landing-menu-button"
            aria-expanded={isMobileOpen}
            aria-controls="landing-mobile-menu"
            aria-label={isMobileOpen ? "Đóng menu" : "Mở menu"}
            onClick={() => setIsMobileOpen((current) => !current)}
          >
            {isMobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div id="landing-mobile-menu" className={`landing-mobile-menu${isMobileOpen ? " is-open" : ""}`} hidden={!isMobileOpen}>
        <div className="landing-container landing-mobile-menu-inner">
          <a href="#how-it-works" onClick={closeMobileMenu}>Cách hoạt động</a>
          <a href="#features" onClick={closeMobileMenu}>Tính năng</a>
          <button type="button" onClick={() => runMobileAction(onExplore)}>Khám phá địa điểm</button>
          <button type="button" onClick={() => runMobileAction(onCommunity)}>Cộng đồng</button>
          <div className="landing-mobile-auth">
            {isAuthenticated ? (
              <button type="button" className="landing-primary-button" onClick={() => runMobileAction(onStartPlanning)}>Chuyến đi của tôi</button>
            ) : (
              <>
                <button type="button" className="landing-secondary-button" onClick={() => runMobileAction(onLogin)}>Đăng nhập</button>
                <button type="button" className="landing-primary-button" onClick={() => runMobileAction(onRegister)}>Đăng ký</button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
