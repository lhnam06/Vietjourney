# Báo cáo: Lưu trữ và Bảo mật Dữ liệu Hệ Thống Vietjourney

> [!NOTE]
> Báo cáo này được tổng hợp dựa trên việc scan toàn bộ các nhánh (bao gồm cả `main` và các branch tính năng đang phát triển như `backend-feature-auth`, `backend-feature-timeline`, `backend-feature-recommendation-history`, `chat-service`, v.v.), chỉ lọc ra những dữ liệu mà dự án **thực sự sử dụng và được định nghĩa thành Entity**. Nội dung cũng được cải tiến, đối chiếu với các tiêu chuẩn thiết kế kiến trúc bảo mật của dự án.

## 1. Danh sách Dữ liệu cần Lưu trữ lâu dài (Long-term Storage)

Các dữ liệu sau được lưu trữ bền vững trong cơ sở dữ liệu (chủ yếu là PostgreSQL, H2 cho môi trường Dev), ánh xạ trực tiếp từ các `@Entity`:

### A. Quản lý Người dùng & Phân quyền (Auth Module)
- **`User`**: Thông tin người dùng (Username, Password, Display Name).
- **`Role` & `Permission`**: Cấu hình vai trò và quyền hạn (RBAC).
- **`InvalidatedToken`**: Danh sách các JWT token đã bị thu hồi/đăng xuất (nhằm ngăn chặn Replay Attack).

### B. Lịch trình & Nhóm du lịch (Timeline Module)
- **`Timeline`**: Thông tin tổng quan của chuyến đi (Tiêu đề, mô tả, ngày bắt đầu/kết thúc, trạng thái hiển thị).
- **`TimelineEvent`**: Chi tiết lịch trình tại từng thời điểm.
- **`TimelineMember`**: Thành viên tham gia nhóm và vai trò của họ.
- **`TimelineProposal`**: Các đề xuất địa điểm từ thành viên để biểu quyết.
- **`TimelineInviteCode`**: Mã mời tham gia nhóm.

### C. Dữ liệu Địa điểm - POI (Place Module)
- **`PlaceBase`**: Dữ liệu cơ sở trung tâm của các địa điểm du lịch (Master Data).
- **`PlaceActivity`, `PlaceFood`, `PlaceDrink`**: Chi tiết phân loại theo từng nhóm loại hình địa điểm phục vụ tìm kiếm.

### D. Giao tiếp & Thời gian thực (Từ nhánh `chat-service`)
- **`ChatRoom` / `ChatRoomType`**: Dữ liệu định danh các phòng chat (nhóm theo Timeline hoặc cá nhân).
- **`Message` / `MessageType`**: Nội dung tin nhắn, thời gian gửi, và người gửi.

### E. Thông báo (Notification Module)
- **`Notification`**: Lịch sử nội dung và trạng thái thông báo hệ thống.
- **`NotificationPreference`**: Tùy chọn nhận thông báo của người dùng.

### F. Gợi ý & Lịch sử người dùng (Từ nhánh `backend-feature-recommendation-history`)
- **`UserPlaceInteraction`**: Lịch sử hành vi và tương tác của người dùng với địa điểm (View, Like, Vote).
- **`UserCategoryPreference`, `UserDistrictPreference`, `UserTagPreference`**: Dữ liệu phân tích sở thích cá nhân, làm input (features) cho thuật toán AI/Machine Learning.

---

## 2. Danh sách Dữ liệu Cần Bảo mật (Sensitive/Confidential Data)

Trong số các dữ liệu trên, những thông tin sau được phân loại là nhạy cảm, có rủi ro nếu bị lộ lọt:

### A. Dữ liệu Định danh & Quyền riêng tư (PII & User Privacy)
- **Mật khẩu (Password)**: Dữ liệu cực kỳ nhạy cảm trong bảng `users`.
- **Nội dung tin nhắn (Chat Messages)**: Thông tin trao đổi nội bộ, vi phạm nghiêm trọng quyền riêng tư nếu rò rỉ.
- **Lịch sử di chuyển / Quyền riêng tư Timeline**: Các `Timeline` và `TimelineEvent` (trạng thái Private) không được phép truy cập trái phép.
- **Lịch sử tìm kiếm & Sở thích**: Khắc họa xu hướng cá nhân, yêu cầu phải được ẩn danh hóa trong quá trình huấn luyện mô hình (AI Recommendation).

### B. Dữ liệu Hạ tầng & Trạng thái Hệ thống
- **Phiên đăng nhập (JWT Token)**: Token cấp cho người dùng sau khi đăng nhập.
- **Mã mời tham gia nhóm (`TimelineInviteCode`)**: Cần bảo vệ để tránh việc xâm nhập nhóm trái phép.

### C. Bí mật Hệ thống (System Secrets)
*(Không nằm trong DB nhưng cực kỳ nhạy cảm)*
- **`JWT_SIGNER_KEY`**: Khóa bí mật dùng để ký token.
- **Database Credentials**: Tài khoản và Mật khẩu kết nối PostgreSQL/Redis.

---

## 3. Phương thức Bảo mật đang được sử dụng trong codebase

Dựa trên file `SecurityConfig.java`, cấu trúc của `websocket-proxy`, và các module nghiệp vụ, dự án đang áp dụng các lớp bảo mật sau:

### 3.1. Mã hóa Dữ liệu (Encryption/Hashing)
- **Băm Mật khẩu**: Mật khẩu người dùng được băm một chiều tự động với thuật toán **`BCryptPasswordEncoder`** (độ khó/work factor = 10) trước khi lưu, chống lại các cuộc tấn công Rainbow Table.

### 3.2. Xác thực và Cấp quyền (Authentication & Authorization)
- **Stateless JWT (JSON Web Token)**: Quản lý phiên bản không trạng thái thay cho Session.
- **Chữ ký Token An Toàn**: Token được ký thuật toán **HMAC SHA-512 (`HS512`)** sử dụng secret key được truyền qua Biến môi trường.
- **Bảo vệ API Mặc định (SecurityFilterChain)**: Các API được khóa mặc định (`anyRequest().authenticated()`). Các API công khai (như `/api/v1/auth/login`, `/api/v1/users/register`, `/api/v1/places/filter`) được đưa vào whitelist (`PUBLIC_ENDPOINTS`).
- **RBAC (Role-Based Access Control)**: Phân quyền vai trò qua `@EnableMethodSecurity` và `JwtGrantedAuthoritiesConverter`.
- **Thu hồi Token (Blacklisting)**: Token đăng xuất sẽ được lưu vào `InvalidatedToken` để khóa truy cập ngay lập tức trước khi hết hạn.

### 3.3. Bảo mật Hạ tầng & Real-time (Infrastructure Security)
- **Bảo vệ CORS (Cross-Origin Resource Sharing)**: `CorsFilter` được cấu hình khắt khe, chỉ cho phép các yêu cầu xuất phát từ các Frontend Domain được chỉ định (`http://localhost:5173`, `http://localhost:3000`), giúp chặn CSRF.
- **Xác thực WebSocket (Go Proxy)**: Dịch vụ `websocket-proxy` tiếp nhận JWT từ request, dùng `JWT_SIGNER_KEY` để giải mã và xác thực. Chỉ khi hợp lệ, user mới được phép Subscribe vào các kênh Redis Pub/Sub của Timeline hoặc Chat Room.
- **Ẩn danh hóa dữ liệu (Anonymization)**: Khuyến nghị (hoặc đang thực hiện) tại luồng thu thập Recommendation để bảo vệ danh tính người dùng khi phân tích lịch sử `UserPlaceInteraction`.
