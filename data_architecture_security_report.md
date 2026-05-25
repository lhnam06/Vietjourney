# Đề Xuất Kiến Trúc Dữ Liệu & Bảo Mật Hệ Thống Vietjourney

> [!NOTE]
> Tài liệu này trình bày các đề xuất thiết kế kiến trúc dữ liệu và bảo mật tổng thể cho hệ thống Vietjourney, nhằm định hướng phát triển toàn diện và bền vững cho tất cả các phân hệ tính năng của dự án.

## 1. Đề xuất quy hoạch dữ liệu lưu trữ lâu dài (Persistent Data)

Dữ liệu lưu trữ lâu dài của hệ thống là những dữ liệu cốt lõi đóng vai trò duy trì trạng thái, nghiệp vụ của ứng dụng và lịch sử hoạt động của người dùng. Để đảm bảo tính mở rộng, chúng tôi đề xuất phân bổ các nhóm dữ liệu này vào các domain chính sau:

### A. Domain Quản Lý Người Dùng & Phân Quyền (`backend-feature-auth`)
- **User Profile:** Thông tin định danh của người dùng (ID, username, displayName). Đề xuất quản lý tập trung qua model `User`.
- **Role & Permission:** Các vai trò và quyền hạn thao tác trên hệ thống. Cần được thiết kế qua model `Role` và `Permission` để hỗ trợ RBAC (Role-Based Access Control).
- **Session & Security:** Trạng thái đăng nhập và danh sách các token đã bị thu hồi/hết hạn nhằm ngăn chặn Replay Attack. Đề xuất theo dõi qua model `InvalidatedToken`.

### B. Domain Quản Lý Hành Trình (`backend-feature-timeline`)
Đây sẽ là trung tâm nghiệp vụ của hệ thống, chuyên lưu trữ dữ liệu liên quan đến các chuyến đi.
- **Timeline:** Thông tin tổng quan của một chuyến đi (Tiêu đề, mô tả, ngày bắt đầu/kết thúc, trạng thái hiển thị). Thiết kế cốt lõi qua model `Timeline`.
- **Timeline Event:** Các điểm đến, sự kiện hoặc lịch trình chi tiết diễn ra trong chuyến đi. Quản lý qua model `TimelineEvent`.
- **Timeline Member:** Danh sách các thành viên cùng tham gia hoặc được chia sẻ hành trình. Được lưu trữ thông qua `TimelineMember`.

### C. Domain Giao Tiếp & Thời Gian Thực (`chat-service` & `timeline-websocket`)
- **Chat Room & Member:** Cần xây dựng cấu trúc các phòng chat (nhóm hoặc cá nhân) liên kết chặt chẽ với các Timeline cụ thể.
- **Chat Message:** Nội dung tin nhắn, thời gian gửi, và trạng thái đã đọc/chưa đọc của các thành viên trong hành trình.
- **Websocket Session:** Đề xuất theo dõi trạng thái online/offline của người dùng để hỗ trợ các phiên làm việc thời gian thực một cách tối ưu.

### D. Domain Thông Báo Hệ Thống (`backend-feature-notification`)
- **Notification History:** Hệ thống cần lưu trữ lịch sử các thông báo hệ thống, lời mời tham gia hành trình và cảnh báo thay đổi lịch trình.
- **Device & Push Tokens:** Cần xây dựng bảng lưu trữ các mã token của thiết bị (FCM/APNs) để phục vụ việc đẩy thông báo Push Notification tới điện thoại/trình duyệt người dùng.
- **Notification Preferences:** Cấu hình tùy chọn nhận thông báo của từng người dùng (bật/tắt thông báo qua email, push, in-app).

### E. Domain Bộ Lọc & Gợi Ý Cá Nhân Hóa (`backend-feature-filter` & `backend-feature-recommendation-history`)
- **Place/Location Directory (Danh mục địa điểm):** Dữ liệu định danh các địa điểm du lịch (tọa độ GPS, danh mục, đánh giá, metadata). Đề xuất xây dựng như một kho dữ liệu trung tâm (Master Data) để các tính năng bộ lọc và AI so khớp, tìm kiếm, đưa ra các gợi ý phù hợp.
- **Search & Filter Criteria:** Cần ghi nhận lịch sử các bộ lọc địa điểm, tiêu chí tìm kiếm (giá cả, loại hình du lịch) mà người dùng thường xuyên sử dụng.
- **Interaction Log:** Ghi chép dữ liệu hành vi người dùng (click, xem chi tiết địa điểm, thời gian dừng lại ở mỗi địa điểm).
- **User Preferences (Sở thích):** Xây dựng hồ sơ sở thích du lịch từ lịch sử tương tác, làm dữ liệu đầu vào (Features) cho các thuật toán gợi ý AI/Machine Learning sau này.

---

## 2. Đề xuất quy chuẩn bảo mật dữ liệu (Sensitive/Confidential Data)

Hệ thống Vietjourney sẽ tiếp nhận và xử lý rất nhiều thông tin nhạy cảm. Việc rò rỉ các thông tin này có thể dẫn đến việc chiếm quyền điều khiển hệ thống hoặc vi phạm quyền riêng tư của người dùng. Chúng tôi đề xuất các tiêu chuẩn bảo mật sau cho các loại dữ liệu nhạy cảm:

### A. Dữ liệu định danh và quyền riêng tư cá nhân (PII & User Privacy)
- **Mật khẩu người dùng:** Dữ liệu nhạy cảm nhất, sẽ được tiếp nhận qua API đăng ký/đăng nhập và bắt buộc phải được mã hóa trước khi lưu trữ.
- **Nội dung tin nhắn (Chat Messages):** Dữ liệu trao đổi cá nhân và nội bộ nhóm. Việc rò rỉ nội dung chat vi phạm nghiêm trọng quyền riêng tư nên cần cơ chế kiểm soát truy cập nghiêm ngặt.
- **Lịch sử di chuyển / Quyền riêng tư Timeline:** Trạng thái `Visibility` của Timeline xác định chuyến đi là công khai hay nội bộ. Việc kiểm tra quyền truy cập là bắt buộc để tránh lộ lọt dữ liệu các Timeline cá nhân (Private).
- **Lịch sử tìm kiếm & Sở thích du lịch:** Dữ liệu này phục vụ AI Recommendation nhưng có thể tiết lộ tình trạng tài chính và xu hướng cá nhân. Yêu cầu phải được ẩn danh hóa trong quá trình huấn luyện mô hình.

### B. Dữ liệu hạ tầng và định danh thiết bị
- **Device Push Tokens:** Các token dùng để gửi thông báo. Cần được bảo vệ để tránh việc kẻ gian lợi dụng spam thông báo lừa đảo (phishing) trực tiếp đến thiết bị người dùng.
- **JSON Web Tokens (JWT):** Token dùng để xác thực các request từ Client. Chỉ được truyền tải qua các kênh bảo mật (HTTPS/WSS).

### C. Bí mật hệ thống (System Secrets & API Keys)
- **JWT Signer Key:** Khóa bí mật dùng để ký và xác thực tính toàn vẹn của Token. Bắt buộc quản lý qua Biến môi trường (Environment Variables) hoặc Secret Vault.
- **Database Credentials:** Tên đăng nhập và mật khẩu kết nối cơ sở dữ liệu (PostgreSQL, Redis). Không bao giờ được hardcode trong mã nguồn.
- **Third-party API Keys:** Các API key tích hợp dịch vụ bên thứ 3 (Firebase Cloud Messaging, Maps API) phải được lưu trữ an toàn.

### D. Luồng xử lý thông tin nhạy cảm đề xuất
- **Luồng Auth (Java Spring Boot):** Đề xuất sử dụng các class thuộc `SecurityConfig` và `AuthService` để chuyên trách tiếp nhận mật khẩu người dùng từ frontend, thực hiện băm và sinh ra JWT.
- **Luồng Real-time & WebSocket:** Service proxy (`websocket-proxy`) sẽ nhận JWT từ Query Parameters hoặc Header, thực hiện giải mã bằng `JWT_SIGNER_KEY` để quyết định có cho phép người dùng subcribe vào các channel Redis của `Timeline` hoặc `Chat` hay không.
- **Luồng Recommendation:** Yêu cầu luồng dữ liệu tương tác người dùng phải được ẩn danh hóa (anonymized) hoặc mã hóa phi định danh trước khi đưa vào kho dữ liệu phân tích.

---

## 3. Đề xuất kiến trúc lưu trữ và hạ tầng (Storage Methods)

Nhằm tối ưu hóa hiệu năng và đáp ứng đa dạng loại hình hình dữ liệu từ các microservices, chúng tôi đề xuất ứng dụng kiến trúc kết hợp các kho lưu trữ (Polyglot Persistence):

### A. Cấu trúc Relational Database (PostgreSQL)
Nên được sử dụng làm "Source of Truth" lưu trữ toàn bộ Persistent Data mang tính cấu trúc và quan hệ chặt chẽ.
- Đảm nhận quản lý các giao dịch (Transactions) với tính toàn vẹn dữ liệu cao (ACID) cho các nghiệp vụ: Phân quyền (`User`, `Role`), thiết lập nhóm (`TimelineMember`), và quản lý thông báo.
- **Khuyến nghị cho Dev:** Đối với môi trường phát triển (Dev), đề xuất tiếp tục sử dụng cấu hình fallback **H2 Database (In-memory)** giả lập PostgreSQL để tối ưu tốc độ build và test nội bộ.

### B. In-memory Cache & Message Broker (Redis)
Redis nên được sử dụng chuyên sâu làm xương sống cho các kiến trúc đòi hỏi tốc độ siêu tốc và xử lý phân tán:
- **Pub/Sub cho Real-time:** Đảm nhận việc broadcast các sự kiện thay đổi trên Timeline và tin nhắn Chat mới từ Java Backend sang Go Proxy, sau đó đẩy xuống các Client qua Websocket với độ trễ tối thiểu.
- **Session & Caching (Khuyến nghị mở rộng):** Đề xuất ứng dụng Redis để cache lịch sử tìm kiếm (`backend-feature-filter`) hoặc danh sách Recommendation đã được tính toán sẵn nhằm giảm tải cho Database chính.

### C. NoSQL/Document Storage cho dữ liệu phi cấu trúc (Khuyến nghị tương lai)
Để đáp ứng sự mở rộng của `chat-service` và `backend-feature-recommendation-history`, hệ thống cần chuẩn bị cho việc xử lý khối lượng lớn dữ liệu phi cấu trúc hoặc chuỗi thời gian (time-series).
- **Lưu trữ Chat/Log:** Các hệ thống RDBMS như PostgreSQL có thể bị nghẽn khi khối lượng tin nhắn và log tương tác tăng đột biến. Chúng tôi đề xuất kiến trúc trong tương lai nên mở rộng sử dụng **MongoDB** hoặc **Elasticsearch** để lưu trữ Chat History và User Logs nhằm đảm bảo hiệu năng tra cứu.
