import { ArrowRight, Compass } from "lucide-react";

interface LandingHeroProps {
  onStartPlanning: () => void;
  onExplore: () => void;
}

export function LandingHero({ onStartPlanning, onExplore }: LandingHeroProps) {
  return (
    <section id="landing-top" className="landing-hero">
      <div className="landing-aurora landing-aurora-one" aria-hidden="true" />
      <div className="landing-aurora landing-aurora-two" aria-hidden="true" />
      <div className="landing-container landing-hero-grid">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Hành trình của bạn, theo cách của bạn</p>
          <h1>Lên lịch ít hơn. <span>Đi nhiều hơn.</span></h1>
          <p className="landing-hero-description">
            Khám phá, lên lịch và đi cùng nhau trong một không gian dành riêng cho những chuyến đi Việt Nam.
          </p>
          <div className="landing-hero-actions">
            <button type="button" onClick={onStartPlanning} className="landing-primary-button">
              Bắt đầu chuyến đi <ArrowRight aria-hidden="true" />
            </button>
            <button type="button" onClick={onExplore} className="landing-secondary-button">
              <Compass aria-hidden="true" /> Khám phá địa điểm
            </button>
          </div>
        </div>

        <div className="landing-hero-media">
          <div className="landing-hero-image-wrap">
            <img
              src="/images/vietjourney-ha-giang-hero.webp"
              alt="Hai người bạn dừng chân ngắm bình minh trên cung đường Hà Giang"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
