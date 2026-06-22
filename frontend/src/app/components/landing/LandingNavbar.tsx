import { useEffect, useState } from "react";
import { Navigation } from "lucide-react";

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

  return (
    <nav className={`landing-navbar${isScrolled ? " is-scrolled" : ""}`} aria-label="Điều hướng trang giới thiệu">
      <div className="landing-container landing-navbar-inner">
        <a href="#landing-top" className="landing-brand" aria-label="Về đầu trang VietJourney">
          <span className="landing-brand-mark"><Navigation aria-hidden="true" /></span>
          <span>VietJourney</span>
        </a>

        <div className="landing-nav-links">
          <a href="#features">Tính năng</a>
          <a href="#how-it-works">Cách hoạt động</a>
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
        </div>
      </div>
    </nav>
  );
}
