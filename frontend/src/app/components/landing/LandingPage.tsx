import {
  ArrowRight,
  BellRing,
  Bot,
  CalendarDays,
  Compass,
  Heart,
  MapPinned,
  MessageCircleMore,
  Route,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useRef } from "react";
import { LandingHero } from "./LandingHero";
import { LandingMotion } from "./LandingMotion";
import { LandingNavbar } from "./LandingNavbar";
import { Reveal } from "./Reveal";
import "./LandingPage.css";

interface LandingPageProps {
  isAuthenticated: boolean;
  onStartPlanning: () => void;
  onExplore: () => void;
  onCommunity: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

const journeySteps = [
  {
    icon: Compass,
    title: "Chọn nơi thật sự hợp với bạn",
    description: "Lọc theo quận, loại hình và sở thích. Mỗi lần lưu giúp gợi ý sau hiểu bạn hơn.",
  },
  {
    icon: CalendarDays,
    title: "Biến cảm hứng thành lịch trình",
    description: "Kéo địa điểm vào từng ngày, đổi thứ tự và giữ nhịp di chuyển hợp lý trên một timeline.",
  },
  {
    icon: UsersRound,
    title: "Cùng nhau chốt chuyến đi",
    description: "Mời bạn đồng hành, nhận đề xuất thay đổi và cập nhật kế hoạch chung theo thời gian thực.",
  },
];

export default function LandingPage({
  isAuthenticated,
  onStartPlanning,
  onExplore,
  onCommunity,
  onLogin,
  onRegister,
}: LandingPageProps) {
  const pageRef = useRef<HTMLElement>(null);

  return (
    <main ref={pageRef} className="landing-page min-h-[100dvh] overflow-x-clip">
      <LandingMotion rootRef={pageRef} />
      <LandingNavbar
        isAuthenticated={isAuthenticated}
        onStartPlanning={onStartPlanning}
        onExplore={onExplore}
        onCommunity={onCommunity}
        onLogin={onLogin}
        onRegister={onRegister}
      />

      <LandingHero onStartPlanning={onStartPlanning} onExplore={onExplore} />

      <section className="landing-capability-strip" aria-label="Khả năng nổi bật">
        <div className="landing-container landing-capability-grid">
          <span><Compass aria-hidden="true" /> Khám phá đúng gu</span>
          <span><Heart aria-hidden="true" /> Lưu nơi yêu thích</span>
          <span><Route aria-hidden="true" /> Xếp lịch dễ dàng</span>
          <span><UsersRound aria-hidden="true" /> Đi cùng nhau</span>
        </div>
      </section>

      <section id="features" className="landing-section">
        <div className="landing-container">
          <Reveal className="landing-section-heading">
            <h2>Một nơi cho toàn bộ chuyến đi.</h2>
            <p>Từ ý tưởng đầu tiên đến lúc cả nhóm lên đường, mọi công cụ đều ở đúng chỗ.</p>
          </Reveal>

          <div className="landing-bento">
            <Reveal className="landing-feature landing-feature-explore" distance={46} animate={false}>
              <img
                src="https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1400&q=82"
                alt="Thuyền trên dòng sông giữa núi đá vôi ở Việt Nam"
                loading="lazy"
              />
              <div className="landing-feature-shade" />
              <div className="landing-feature-content landing-feature-content-light">
                <Compass aria-hidden="true" />
                <h3>Khám phá theo cách riêng</h3>
                <p>Tìm địa điểm theo khu vực, món ăn, hoạt động và những điều bạn thật sự thích.</p>
                <button type="button" onClick={onExplore} className="landing-text-link landing-text-link-light">
                  Mở bản đồ khám phá <ArrowRight aria-hidden="true" />
                </button>
              </div>
            </Reveal>

            <Reveal className="landing-feature landing-feature-planner" delay={80} animate={false}>
              <CalendarDays aria-hidden="true" />
              <h3>Lịch trình linh hoạt</h3>
              <p>Sắp từng ngày, kéo thả chặng đi và thay đổi kế hoạch mà không phải làm lại từ đầu.</p>
              <div className="landing-route-line" aria-hidden="true">
                <span>Ngày 1</span><i /><span>Ngày 2</span><i /><span>Ngày 3</span>
              </div>
            </Reveal>

            <Reveal className="landing-feature landing-feature-agent" delay={130} animate={false}>
              <Bot aria-hidden="true" />
              <h3>Trợ lý hành trình</h3>
              <p>Nhận gợi ý điểm đến và phương án lịch trình dựa trên sở thích, thời gian và nhịp đi của bạn.</p>
              <Sparkles className="landing-feature-spark" aria-hidden="true" />
            </Reveal>

            <Reveal className="landing-feature landing-feature-map" distance={52} animate={false}>
              <img
                src="/images/vietjourney-ha-giang-hero.webp"
                alt="Cung đường uốn quanh vùng núi xanh của Việt Nam"
                loading="lazy"
              />
              <div className="landing-feature-shade" />
              <div className="landing-feature-content landing-feature-content-light">
                <MapPinned aria-hidden="true" />
                <h3>Mọi chặng trên một bản đồ</h3>
                <p>Xem toàn tuyến, vị trí từng điểm dừng và mạch di chuyển của cả hành trình.</p>
              </div>
            </Reveal>

            <Reveal className="landing-feature landing-feature-collab" delay={90} animate={false}>
              <MessageCircleMore aria-hidden="true" />
              <h3>Lên kế hoạch cùng nhóm</h3>
              <p>Chia sẻ lịch trình, gửi đề xuất, duyệt thay đổi và giữ mọi người cùng một phiên bản kế hoạch.</p>
              <div className="landing-avatar-row" aria-label="Minh họa nhóm bạn đồng hành">
                <img src="https://i.pravatar.cc/96?img=12" alt="Thành viên nhóm" loading="lazy" />
                <img src="https://i.pravatar.cc/96?img=32" alt="Thành viên nhóm" loading="lazy" />
                <img src="https://i.pravatar.cc/96?img=47" alt="Thành viên nhóm" loading="lazy" />
                <span>+ bạn của bạn</span>
              </div>
            </Reveal>

            <Reveal className="landing-feature landing-feature-aware" delay={140} animate={false}>
              <BellRing aria-hidden="true" />
              <h3>Không bỏ lỡ thay đổi</h3>
              <p>Thông báo mới, lời mời và cập nhật từ nhóm luôn đến đúng lúc. Hồ sơ sở thích giúp gợi ý ngày càng sát hơn.</p>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="landing-section landing-how-section">
        <div className="landing-container landing-how-grid">
          <Reveal className="landing-how-intro">
            <div className="landing-how-photo">
              <img
                src="/images/vietjourney-ha-giang-hero.webp"
                alt="Hai người bạn ngắm bình minh trên cung đường Hà Giang"
                loading="lazy"
              />
            </div>
            <h2>Từ “đi đâu?” đến “đi thôi”.</h2>
            <p>VietJourney giữ các quyết định nối liền nhau để việc lên kế hoạch không làm mất hứng khám phá.</p>
          </Reveal>

          <div className="landing-journey-list">
            {journeySteps.map(({ icon: Icon, title, description }, index) => (
              <Reveal key={title} className="landing-journey-item" delay={index * 75}>
                <span className="landing-journey-icon"><Icon aria-hidden="true" /></span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </Reveal>
            ))}
            <Reveal delay={225}>
              <button type="button" onClick={onStartPlanning} className="landing-primary-button">
                Tạo chuyến đi đầu tiên <ArrowRight aria-hidden="true" />
              </button>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="community" className="landing-section landing-community-section">
        <div className="landing-container">
          <Reveal className="landing-community-panel" distance={56}>
            <img
              src="/images/vietjourney-community.webp"
              alt="Nhóm bạn Việt Nam trò chuyện bên cung đường ven biển"
              loading="lazy"
            />
            <div className="landing-community-overlay" />
            <div className="landing-community-copy">
              <UsersRound aria-hidden="true" />
              <h2>Cảm hứng không dừng ở một chuyến đi.</h2>
              <p>Khám phá hành trình từ cộng đồng, chia sẻ trải nghiệm và lưu lại những nơi bạn muốn đến tiếp theo.</p>
              <button type="button" onClick={onCommunity} className="landing-light-button">
                Vào cộng đồng <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="landing-final-section">
        <div className="landing-container landing-final-grid">
          <Reveal>
            <h2>Chuyến đi tiếp theo bắt đầu ở đây.</h2>
            <p>Giữ cảm hứng, kế hoạch và những người đồng hành trong cùng một hành trình.</p>
          </Reveal>
          <Reveal delay={90} className="landing-final-action">
            <button type="button" onClick={onStartPlanning} className="landing-primary-button">
              Bắt đầu lập chuyến đi <ArrowRight aria-hidden="true" />
            </button>
          </Reveal>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <a href="#landing-top" className="landing-footer-brand">VietJourney</a>
          <p>Lên lịch ít hơn. Đi nhiều hơn.</p>
          <div>
            <button type="button" onClick={onExplore}>Khám phá</button>
            <button type="button" onClick={onCommunity}>Cộng đồng</button>
            {!isAuthenticated && <button type="button" onClick={onLogin}>Đăng nhập</button>}
          </div>
        </div>
      </footer>
    </main>
  );
}
