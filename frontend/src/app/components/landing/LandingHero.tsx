import { ArrowRight, Compass, MapPinned, Radio, UsersRound } from "lucide-react";
import { LandingProductDemo } from "./LandingProductDemo";

interface LandingHeroProps {
  onStartPlanning: () => void;
  onExplore: () => void;
}

export function LandingHero({ onStartPlanning, onExplore }: LandingHeroProps) {
  return (
    <section id="landing-top" className="landing-hero">
      <img
        className="landing-hero-backdrop"
        src="/images/vietjourney-ha-giang-hero.webp"
        alt=""
        loading="eager"
        fetchPriority="high"
        aria-hidden="true"
      />
      <div className="landing-hero-wash" aria-hidden="true" />
      <div className="landing-container landing-hero-grid">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow"><MapPinned aria-hidden="true" /> Dành cho những chuyến đi Việt Nam</p>
          <h1>Đi Việt Nam <em>theo cách của bạn.</em></h1>
          <p className="landing-hero-description">
            Từ nơi muốn đến đến lịch trình cả nhóm cùng đồng ý. VietJourney giữ khám phá, bản đồ, chi phí và mọi thay đổi trong một hành trình liền mạch.
          </p>
          <div className="landing-hero-actions">
            <button type="button" onClick={onStartPlanning} className="landing-primary-button">
              Tạo chuyến đi <ArrowRight aria-hidden="true" />
            </button>
            <button type="button" onClick={onExplore} className="landing-secondary-button">
              <Compass aria-hidden="true" /> Khám phá địa điểm
            </button>
          </div>
          <div className="landing-hero-notes" aria-label="Điểm nổi bật của VietJourney">
            <span><Radio aria-hidden="true" /> Đồng bộ thời gian thực</span>
            <span><UsersRound aria-hidden="true" /> Lập kế hoạch cùng nhóm</span>
          </div>
        </div>

        <div className="landing-hero-media">
          <LandingProductDemo />
        </div>
      </div>
    </section>
  );
}
