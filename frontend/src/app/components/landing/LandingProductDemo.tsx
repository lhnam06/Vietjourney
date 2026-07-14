import {
  BellRing,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  GripVertical,
  Map,
  MapPin,
  MessageSquareText,
  Route,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

type DemoTab = "timeline" | "map" | "collaboration" | "budget";

const demoTabs = [
  { id: "timeline", label: "Lịch trình", icon: CalendarDays },
  { id: "map", label: "Bản đồ", icon: Map },
  { id: "collaboration", label: "Cộng tác", icon: UsersRound },
  { id: "budget", label: "Chi phí", icon: WalletCards },
] as const satisfies ReadonlyArray<{ id: DemoTab; label: string; icon: typeof CalendarDays }>;

const timelineStops = [
  { time: "08:00", title: "Bánh mì Bà Lan", meta: "Ăn sáng · Hải Châu", tone: "amber" },
  { time: "10:30", title: "Bán đảo Sơn Trà", meta: "Khám phá · 32 phút", tone: "blue" },
  { time: "15:00", title: "Biển Mỹ Khê", meta: "Thư giãn · Sơn Trà", tone: "cyan" },
] as const;

export function LandingProductDemo() {
  const [activeTab, setActiveTab] = useState<DemoTab>("timeline");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;

    if (event.key === "ArrowRight") nextIndex = (index + 1) % demoTabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + demoTabs.length) % demoTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = demoTabs.length - 1;
    else return;

    event.preventDefault();
    const nextTab = demoTabs[nextIndex];
    setActiveTab(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="landing-demo-shell" aria-label="Bản xem trước không gian lập kế hoạch VietJourney">
      <div className="landing-demo-chrome">
        <div className="landing-demo-window-dots" aria-hidden="true"><i /><i /><i /></div>
        <div className="landing-demo-trip">
          <span>Đà Nẵng cuối tuần</span>
          <small>15 – 17 tháng 8</small>
        </div>
        <div className="landing-demo-presence" aria-label="Ba thành viên đang cùng lập kế hoạch">
          <span>LA</span><span>MN</span><span>+1</span>
        </div>
      </div>

      <div className="landing-demo-tabs" role="tablist" aria-label="Xem tính năng">
        {demoTabs.map(({ id, label, icon: Icon }, index) => (
          <button
            key={id}
            ref={(element) => { tabRefs.current[index] = element; }}
            type="button"
            role="tab"
            id={`landing-demo-tab-${id}`}
            aria-selected={activeTab === id}
            aria-controls={`landing-demo-panel-${id}`}
            aria-label={label}
            tabIndex={activeTab === id ? 0 : -1}
            onClick={() => setActiveTab(id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div
        key={activeTab}
        className={`landing-demo-panel is-${activeTab}`}
        role="tabpanel"
        id={`landing-demo-panel-${activeTab}`}
        aria-labelledby={`landing-demo-tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === "timeline" && (
          <div className="landing-demo-timeline-layout">
            <div className="landing-demo-agenda">
              <div className="landing-demo-panel-heading">
                <div><span>Thứ bảy</span><strong>16 tháng 8</strong></div>
                <span className="landing-demo-live"><i /> Đang đồng bộ</span>
              </div>
              <div className="landing-demo-stop-list">
                {timelineStops.map((stop) => (
                  <div className="landing-demo-stop" key={stop.time}>
                    <time>{stop.time}</time>
                    <span className={`landing-demo-stop-dot is-${stop.tone}`} aria-hidden="true" />
                    <div><strong>{stop.title}</strong><small>{stop.meta}</small></div>
                    <GripVertical aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>
            <div className="landing-demo-map" aria-label="Tuyến đường minh họa qua ba điểm dừng">
              <span className="landing-demo-map-label"><Route aria-hidden="true" /> 18,4 km</span>
              <svg viewBox="0 0 280 250" aria-hidden="true">
                <path className="landing-demo-road landing-demo-road-shadow" d="M35 215 C75 170 62 122 124 112 S204 126 242 42" />
                <path className="landing-demo-road landing-demo-road-main" d="M35 215 C75 170 62 122 124 112 S204 126 242 42" />
              </svg>
              <i className="landing-demo-pin pin-one">1</i>
              <i className="landing-demo-pin pin-two">2</i>
              <i className="landing-demo-pin pin-three">3</i>
            </div>
          </div>
        )}

        {activeTab === "map" && (
          <div className="landing-demo-map-focus">
            <div className="landing-demo-map landing-demo-map-large" aria-label="Bản đồ tuyến đường minh họa">
              <span className="landing-demo-map-label"><Route aria-hidden="true" /> Tuyến tối ưu · 18,4 km</span>
              <svg viewBox="0 0 620 300" aria-hidden="true">
                <path className="landing-demo-road landing-demo-road-shadow" d="M55 250 C155 260 154 138 254 156 S382 230 442 116 S518 78 572 42" />
                <path className="landing-demo-road landing-demo-road-main" d="M55 250 C155 260 154 138 254 156 S382 230 442 116 S518 78 572 42" />
              </svg>
              <i className="landing-demo-pin pin-map-one">1</i>
              <i className="landing-demo-pin pin-map-two">2</i>
              <i className="landing-demo-pin pin-map-three">3</i>
              <div className="landing-demo-place-card">
                <span><MapPin aria-hidden="true" /></span>
                <div><strong>Bán đảo Sơn Trà</strong><small>Điểm tiếp theo · 10:30</small></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "collaboration" && (
          <div className="landing-demo-collaboration">
            <div className="landing-demo-panel-heading">
              <div><span>Đề xuất của thành viên</span><strong>Cùng chốt kế hoạch</strong></div>
              <span className="landing-demo-count">2 mới</span>
            </div>
            <div className="landing-demo-proposals">
              <article>
                <span className="landing-demo-avatar">MN</span>
                <div><small>Minh Ngọc đề xuất</small><strong>Thêm Chợ Cồn vào chiều thứ bảy</strong><p><Clock3 aria-hidden="true" /> 16:30 – 18:00 · Không xung đột</p></div>
                <span className="landing-demo-approved"><Check aria-hidden="true" /> Phù hợp</span>
              </article>
              <article>
                <span className="landing-demo-avatar is-warm">LA</span>
                <div><small>Lan Anh bình luận</small><strong>“Mình đổi biển sang sáng chủ nhật nhé?”</strong><p><MessageSquareText aria-hidden="true" /> 3 phản hồi</p></div>
                <span className="landing-demo-realtime"><BellRing aria-hidden="true" /> Vừa xong</span>
              </article>
            </div>
          </div>
        )}

        {activeTab === "budget" && (
          <div className="landing-demo-budget">
            <div className="landing-demo-budget-summary">
              <span className="landing-demo-budget-icon"><CircleDollarSign aria-hidden="true" /></span>
              <div><small>Ngân sách nhóm</small><strong>6.480.000 ₫</strong><p>2.160.000 ₫ / người</p></div>
              <span className="landing-demo-budget-status"><Check aria-hidden="true" /> Trong kế hoạch</span>
            </div>
            <div className="landing-demo-budget-grid">
              <div className="landing-demo-costs">
                <div><span>Ăn uống</span><strong>1.840.000 ₫</strong><i style={{ "--cost-width": "62%" } as CSSProperties} /></div>
                <div><span>Di chuyển</span><strong>1.250.000 ₫</strong><i style={{ "--cost-width": "44%" } as CSSProperties} /></div>
                <div><span>Trải nghiệm</span><strong>980.000 ₫</strong><i style={{ "--cost-width": "34%" } as CSSProperties} /></div>
              </div>
              <div className="landing-demo-split">
                <small>Chia theo thành viên</small>
                <div><span>LA</span><span>MN</span><span>TN</span></div>
                <p>Mọi người cùng thấy một con số.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
