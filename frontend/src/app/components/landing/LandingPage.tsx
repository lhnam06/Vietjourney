import {
  ArrowRight,
  BellRing,
  Bookmark,
  Bot,
  CalendarCheck,
  Check,
  CircleDollarSign,
  Compass,
  MapPinned,
  MessageCircleMore,
  Navigation2,
  Radio,
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

const capabilityItems = [
  { icon: Compass, label: "Dữ liệu địa điểm Việt Nam" },
  { icon: Route, label: "Timeline và bản đồ trong một luồng" },
  { icon: UsersRound, label: "Phân quyền và đề xuất nhóm" },
  { icon: Radio, label: "Cập nhật theo thời gian thực" },
] as const;

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
          {capabilityItems.map(({ icon: Icon, label }) => (
            <span key={label}><Icon aria-hidden="true" /> {label}</span>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="landing-section landing-story-section">
        <div className="landing-container">
          <Reveal className="landing-section-heading landing-section-heading-split">
            <p className="landing-kicker">Một luồng liền mạch</p>
            <h2>Từ “đi đâu?” đến <em>“đi thôi”.</em></h2>
            <p>Không thêm một bảng tính nữa. VietJourney nối nơi bạn thích, thời gian cả nhóm có và những quyết định nhỏ thành một kế hoạch có thể thực hiện.</p>
          </Reveal>

          <div className="landing-story-list">
            <Reveal className="landing-story-step">
              <div className="landing-story-copy">
                <span className="landing-step-number">01</span>
                <p className="landing-kicker">Khám phá có chủ đích</p>
                <h3>Tìm nơi hợp gu, không chỉ nơi đang nổi.</h3>
                <p>Lọc theo khu vực, loại hình, mức giá và tag. Lưu lại điều bạn thích để những gợi ý sau ngày càng sát với chuyến đi thật.</p>
                <button type="button" onClick={onExplore} className="landing-text-link">
                  Mở trang khám phá <ArrowRight aria-hidden="true" />
                </button>
              </div>
              <div className="landing-story-visual landing-discovery-window" aria-label="Minh họa tìm kiếm địa điểm tại Đà Nẵng">
                <div className="landing-window-bar"><i /><i /><i /><span>Khám phá Đà Nẵng</span></div>
                <div className="landing-discovery-search"><Compass aria-hidden="true" /><span>Tìm món ăn, quận hoặc trải nghiệm...</span><kbd>⌘ K</kbd></div>
                <div className="landing-filter-row"><span className="is-active">Dành cho bạn</span><span>Ẩm thực</span><span>Cafe</span><span>Trải nghiệm</span></div>
                <div className="landing-place-grid">
                  <article className="landing-place-card is-food">
                    <div><span>4.8</span><Bookmark aria-hidden="true" /></div>
                    <strong>Mì Quảng Bà Mua</strong><small>Hải Châu · Ẩm thực</small>
                  </article>
                  <article className="landing-place-card is-coast">
                    <div><span>4.9</span><Bookmark aria-hidden="true" /></div>
                    <strong>Bán đảo Sơn Trà</strong><small>Sơn Trà · Khám phá</small>
                  </article>
                  <article className="landing-place-card is-cafe">
                    <div><span>4.7</span><Bookmark aria-hidden="true" /></div>
                    <strong>43 Factory Coffee</strong><small>Ngũ Hành Sơn · Cafe</small>
                  </article>
                </div>
                <span className="landing-recommendation-note"><Sparkles aria-hidden="true" /> Gợi ý dựa trên 6 địa điểm bạn đã lưu</span>
              </div>
            </Reveal>

            <Reveal className="landing-story-step is-reversed">
              <div className="landing-story-copy">
                <span className="landing-step-number">02</span>
                <p className="landing-kicker">Lịch trình nhìn là hiểu</p>
                <h3>Xếp ngày đi như cách bạn vẫn hình dung.</h3>
                <p>Kéo địa điểm vào đúng giờ, nhìn khoảng trống và xem tuyến đường cùng lúc. Thay đổi kế hoạch mà không phải làm lại từ đầu.</p>
              </div>
              <div className="landing-story-visual landing-schedule-window" aria-label="Minh họa timeline ba ngày">
                <div className="landing-schedule-days"><span>Thứ sáu<small>15/08</small></span><span className="is-active">Thứ bảy<small>16/08</small></span><span>Chủ nhật<small>17/08</small></span></div>
                <div className="landing-schedule-body">
                  <div className="landing-time-column"><span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span></div>
                  <div className="landing-schedule-grid">
                    <article className="landing-schedule-event event-breakfast"><small>08:00</small><strong>Bánh mì Bà Lan</strong><span>45 phút</span></article>
                    <article className="landing-schedule-event event-sontra"><small>10:30</small><strong>Bán đảo Sơn Trà</strong><span>2 giờ 30 phút</span></article>
                    <article className="landing-schedule-event event-beach"><small>15:00</small><strong>Biển Mỹ Khê</strong><span>Thư giãn</span></article>
                  </div>
                  <aside className="landing-schedule-route">
                    <span><Navigation2 aria-hidden="true" /> Tuyến trong ngày</span>
                    <strong>18,4 km</strong><small>47 phút di chuyển</small>
                    <svg viewBox="0 0 180 120" aria-hidden="true"><path d="M15 105 C40 72 62 92 78 56 S127 55 164 14" /></svg>
                    <i className="route-dot dot-a" /><i className="route-dot dot-b" /><i className="route-dot dot-c" />
                  </aside>
                </div>
              </div>
            </Reveal>

            <Reveal className="landing-story-step">
              <div className="landing-story-copy">
                <span className="landing-step-number">03</span>
                <p className="landing-kicker">Cùng chốt, không chồng chéo</p>
                <h3>Mọi ý kiến đều có chỗ để đi đến quyết định.</h3>
                <p>Phân quyền rõ ràng, nhận đề xuất từ thành viên và kiểm tra xung đột trước khi duyệt. Cả nhóm luôn nhìn cùng một phiên bản mới nhất.</p>
              </div>
              <div className="landing-story-visual landing-collab-window" aria-label="Minh họa đề xuất thay đổi lịch trình">
                <div className="landing-collab-heading"><div><span>Đề xuất của thành viên</span><strong>Hôm nay có 3 đề xuất mới</strong></div><span className="landing-collab-badge">Đang xem</span></div>
                <article className="landing-proposal-card">
                  <span className="landing-initial-avatar">MN</span>
                  <div><small>Minh Ngọc · 2 phút trước</small><strong>Thêm Chợ Cồn vào chiều thứ bảy</strong><p>16:30 – 18:00 · Không trùng lịch</p></div>
                  <span className="landing-state-good"><Check aria-hidden="true" /> Sẵn sàng duyệt</span>
                </article>
                <article className="landing-proposal-card is-ghost">
                  <span className="landing-initial-avatar is-warm">TN</span>
                  <div><small>Tuấn Nam · 8 phút trước</small><strong>Đổi Biển Mỹ Khê sang sáng chủ nhật</strong><p>Chưa chọn giờ bắt đầu</p></div>
                  <span className="landing-state-waiting">Chờ bổ sung</span>
                </article>
                <div className="landing-collab-footer"><span><Radio aria-hidden="true" /> Timeline vừa được đồng bộ</span><span>3 thành viên đang online</span></div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="features" className="landing-section landing-proof-section">
        <div className="landing-container">
          <Reveal className="landing-section-heading landing-proof-heading">
            <p className="landing-kicker">Những chi tiết giúp chuyến đi chạy êm</p>
            <h2>Ít công cụ hơn. <em>Nhiều ngữ cảnh hơn.</em></h2>
          </Reveal>

          <div className="landing-proof-grid">
            <article className="landing-proof-card landing-proof-recommendations">
              <span className="landing-proof-icon"><Bot aria-hidden="true" /></span>
              <p className="landing-kicker">Gợi ý cá nhân hóa</p>
              <h3>Gợi ý hiểu chuyến đi đang thành hình.</h3>
              <p>Đề xuất địa điểm dựa trên nơi đã lưu, khu vực và nhịp đi bạn chọn.</p>
              <div className="landing-recommendation-stack" aria-hidden="true">
                <span><i className="rec-thumb is-one" /><span><strong>Cafe view sông Hàn</strong><small>Hợp với buổi chiều ngày 2</small></span><em>92%</em></span>
                <span><i className="rec-thumb is-two" /><span><strong>Chợ đêm Sơn Trà</strong><small>Gần điểm cuối lịch trình</small></span><em>87%</em></span>
              </div>
            </article>

            <article className="landing-proof-card landing-proof-notifications">
              <span className="landing-proof-icon"><BellRing aria-hidden="true" /></span>
              <p className="landing-kicker">Thông báo đúng lúc</p>
              <h3>Biết điều gì thay đổi, không cần hỏi lại.</h3>
              <div className="landing-notification-list">
                <span><i><UsersRound aria-hidden="true" /></i><span><strong>Lan Anh đã tham gia chuyến đi</strong><small>Vừa xong</small></span></span>
                <span><i><CalendarCheck aria-hidden="true" /></i><span><strong>Đề xuất Chợ Cồn đã được duyệt</strong><small>5 phút trước</small></span></span>
                <span><i><MessageCircleMore aria-hidden="true" /></i><span><strong>2 bình luận mới trong timeline</strong><small>12 phút trước</small></span></span>
              </div>
            </article>

            <article className="landing-proof-card landing-proof-budget">
              <span className="landing-proof-icon"><CircleDollarSign aria-hidden="true" /></span>
              <p className="landing-kicker">Chi phí minh bạch</p>
              <h3>Cả nhóm cùng nhìn một ngân sách.</h3>
              <div className="landing-budget-proof">
                <div><small>Tổng dự kiến</small><strong>6.480.000 ₫</strong><span>2.160.000 ₫ / người</span></div>
                <div className="landing-budget-ring"><span>68%</span></div>
              </div>
              <div className="landing-budget-legend"><span><i /> Ăn uống</span><span><i /> Di chuyển</span><span><i /> Trải nghiệm</span></div>
            </article>

            <article className="landing-proof-card landing-proof-realtime">
              <span className="landing-proof-icon"><Radio aria-hidden="true" /></span>
              <p className="landing-kicker">Một kế hoạch đang sống</p>
              <h3>Thay đổi xuất hiện ngay khi cả nhóm đang xem.</h3>
              <p>Timeline, đề xuất và thông báo cập nhật theo thời gian thực để không ai làm việc trên bản cũ.</p>
              <div className="landing-live-row"><span><i /> Đang kết nối</span><div><span>LA</span><span>MN</span><span>TN</span></div></div>
            </article>
          </div>
        </div>
      </section>

      <section id="community" className="landing-section landing-community-section">
        <div className="landing-container">
          <Reveal className="landing-community-panel" distance={42}>
            <img src="/images/vietjourney-community.webp" alt="Nhóm bạn Việt Nam trò chuyện bên cung đường ven biển" loading="lazy" />
            <div className="landing-community-overlay" />
            <div className="landing-community-copy">
              <p className="landing-kicker">Hành trình từ người đã đi</p>
              <h2>Cảm hứng có thể trở thành <em>kế hoạch của riêng bạn.</em></h2>
              <p>Xem lịch trình công khai, lưu điểm dừng hay và bắt đầu một phiên bản phù hợp với nhóm của bạn.</p>
              <button type="button" onClick={onCommunity} className="landing-light-button">Khám phá cộng đồng <ArrowRight aria-hidden="true" /></button>
            </div>
            <article className="landing-community-itinerary">
              <div><span className="landing-initial-avatar">HA</span><span><strong>Hà Giang 4N3Đ</strong><small>Chia sẻ bởi Hoàng Anh</small></span></div>
              <div className="landing-community-days"><span>Ngày 1 <small>Hà Giang → Quản Bạ</small></span><span>Ngày 2 <small>Yên Minh → Đồng Văn</small></span><span>Ngày 3 <small>Mã Pí Lèng → Mèo Vạc</small></span></div>
              <span className="landing-community-meta"><MapPinned aria-hidden="true" /> 12 điểm dừng <i /> 388 km</span>
            </article>
          </Reveal>
        </div>
      </section>

      <section className="landing-final-section">
        <div className="landing-container landing-final-panel">
          <Reveal>
            <p className="landing-kicker">Chuyến tiếp theo</p>
            <h2>Bắt đầu với một nơi bạn muốn đến.</h2>
            <p>VietJourney sẽ giúp bạn biến nó thành kế hoạch cả nhóm có thể cùng thực hiện.</p>
          </Reveal>
          <Reveal delay={80} className="landing-final-actions">
            <button type="button" onClick={onStartPlanning} className="landing-primary-button">Tạo chuyến đi <ArrowRight aria-hidden="true" /></button>
            <button type="button" onClick={onExplore} className="landing-secondary-button"><Compass aria-hidden="true" /> Xem địa điểm</button>
          </Reveal>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <a href="#landing-top" className="landing-footer-brand"><span className="landing-brand-mark"><Navigation2 aria-hidden="true" /></span><span>VietJourney</span></a>
          <p>Lập kế hoạch ít hơn. Đi cùng nhau nhiều hơn.</p>
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
