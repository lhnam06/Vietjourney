# Lược đồ tuần tự (Sequence Diagrams) cho các Use Cases

Dựa trên tài liệu `bao_cao_usergroup_usecase.pdf` và kiến trúc hiện tại của dự án trên nhánh `main`, dưới đây là danh sách các lược đồ tuần tự (Sequence Diagrams) sử dụng cú pháp Mermaid để hiện thực hóa các Use Cases.

## Các Components & Modules (Dựa trên nhánh `main`):
- **Client**: Ứng dụng Frontend (Web/App)
- **Spring Boot Backend**: Backend nguyên khối (Monolith) xử lý chính, bao gồm các modules:
  - **Auth Module**: Xác thực và quản lý người dùng
  - **Place Module**: Quản lý dữ liệu địa điểm du lịch (POI)
  - **Timeline Module**: Quản lý lịch trình, chuyến đi, và nhóm du lịch
  - **Notification Module**: Xử lý gửi thông báo
- **Go WebSocket Proxy**: Tầng proxy xử lý kết nối WebSocket thời gian thực (Chat, Tương tác)
- **Database**: Hệ quản trị cơ sở dữ liệu PostgreSQL
- **Redis**: Bộ nhớ cache và hỗ trợ Pub/Sub kết nối giữa Go Proxy và Spring Boot

---

## 1. UC01: Tìm kiếm & Lọc địa điểm (Khách vãng lai & Thành viên)

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Place_Module as Spring Boot (Place Module)
    participant Redis
    participant Database

    Client->>Place_Module: Gửi request tìm kiếm (Từ khóa, Vị trí, Tags)
    Place_Module->>Redis: Kiểm tra Cache (nếu có)
    alt Cache Hit
        Redis-->>Place_Module: Trả về dữ liệu địa điểm
    else Cache Miss
        Place_Module->>Database: Query địa điểm theo điều kiện
        Database-->>Place_Module: Trả về danh sách địa điểm
        Place_Module->>Redis: Lưu dữ liệu vào Cache
    end
    Place_Module-->>Client: Trả về danh sách địa điểm (JSON) và hiển thị trên bản đồ
```

---

## 2. UC02 & UC03: Đăng nhập/Đăng ký & Tạo lịch trình nháp

### Đăng ký / Đăng nhập
```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Auth_Module as Spring Boot (Auth Module)
    participant Database

    Client->>Auth_Module: Gửi thông tin Đăng nhập/Đăng ký
    Auth_Module->>Database: Xác thực / Tạo mới user
    Database-->>Auth_Module: Kết quả (User ID, Role)
    Auth_Module-->>Client: Trả về Access Token (JWT)
```

### Tạo lịch trình nháp (Khách vãng lai)
```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Local_Storage

    Client->>Client: Tạo lịch trình mới
    Client->>Local_Storage: Lưu lịch trình nháp (Session/Local Storage)
    Local_Storage-->>Client: Cập nhật UI
    Note over Client, Local_Storage: Dữ liệu sẽ mất khi đóng trình duyệt hoặc hết phiên
```

---

## 3. UC04: Quản lý Lộ trình / Timeline chuyến đi (Thành viên cá nhân)

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Auth_Module as Spring Boot (Auth Module)
    participant Timeline_Module as Spring Boot (Timeline Module)
    participant Database

    Client->>Timeline_Module: Kéo-thả địa điểm, cập nhật giờ/ghi chú (kèm Token)
    Timeline_Module->>Auth_Module: Validate Token (Internal Call)
    Auth_Module-->>Timeline_Module: Hợp lệ
    Timeline_Module->>Timeline_Module: Tính toán tổng thời gian & quãng đường
    Timeline_Module->>Database: Lưu thông tin chi tiết Timeline
    Database-->>Timeline_Module: Xác nhận lưu thành công
    Timeline_Module-->>Client: Trả về dữ liệu Timeline mới (Cập nhật UI)
```

---

## 4. UC05: Tạo và Quản lý Nhóm du lịch (Nhóm du lịch)

```mermaid
sequenceDiagram
    autonumber
    actor Host (Trưởng nhóm)
    participant Timeline_Module as Spring Boot (Timeline Module)
    participant Notification_Module as Spring Boot (Notification Module)
    participant Database

    Host->>Timeline_Module: Yêu cầu tạo nhóm & Mời thành viên (Email/Username)
    Timeline_Module->>Database: Lưu thông tin nhóm & Phân quyền
    Database-->>Timeline_Module: Xác nhận
    Timeline_Module->>Notification_Module: Yêu cầu gửi lời mời (Internal Call)
    Notification_Module-->>Invitee (Người được mời): Gửi Notification / Email
    Invitee (Người được mời)->>Timeline_Module: Bấm "Chấp nhận"
    Timeline_Module->>Database: Cập nhật trạng thái thành viên nhóm
    Database-->>Timeline_Module: Cập nhật thành công
    Timeline_Module-->>Host: Thông báo thành viên đã tham gia
```

---

## 5. UC06: Tương tác & Biểu quyết nhóm (Real-time)

```mermaid
sequenceDiagram
    autonumber
    actor Member
    participant Go_Proxy as Go WebSocket Proxy
    participant Redis_PubSub as Redis Pub/Sub
    participant Timeline_Module as Spring Boot (Timeline Module)
    participant Database
    actor Other_Members

    Member->>Go_Proxy: Gửi Vote / Comment (Qua WebSocket)
    Go_Proxy->>Redis_PubSub: Publish Event (Inbound Channel)
    
    par Xử lý bất đồng bộ
        Redis_PubSub->>Timeline_Module: Nhận Event từ Inbound
        Timeline_Module->>Database: Lưu Vote / Comment vào DB
        Database-->>Timeline_Module: Xác nhận
        Timeline_Module->>Redis_PubSub: Publish Event cập nhật (Outbound Channel)
    and Phát trực tiếp (Tùy cấu hình)
        Redis_PubSub->>Go_Proxy: Broadcast Event cho các Client khác trong nhóm
    end

    Go_Proxy-->>Other_Members: Cập nhật UI (Real-time syncing)
```

---

## 6. UC07: Quản lý Tài khoản người dùng (System Admin)

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant Auth_Module as Spring Boot (Auth Module)
    participant Database

    Admin->>Auth_Module: Yêu cầu Khóa/Mở khóa/Xóa tài khoản (Kèm lý do)
    Auth_Module->>Auth_Module: Kiểm tra quyền Admin
    Auth_Module->>Database: Cập nhật trạng thái User (Active -> Banned)
    Auth_Module->>Database: Ghi Log thao tác Admin (Audit)
    Database-->>Auth_Module: Xác nhận
    Auth_Module-->>Admin: Hiển thị thông báo thành công
```

---

## 7. UC08: Quản lý Dữ liệu Địa điểm - POI (System Admin)

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant Place_Module as Spring Boot (Place Module)
    participant Database
    participant Redis

    Admin->>Place_Module: Tạo/Cập nhật/Xóa địa điểm POI
    Place_Module->>Place_Module: Kiểm tra quyền Admin
    Place_Module->>Database: Cập nhật dữ liệu POI vào CSDL
    Database-->>Place_Module: Trạng thái cập nhật
    Place_Module->>Redis: Xóa / Cập nhật Cache liên quan
    Place_Module->>Database: Ghi Log thay đổi (Audit)
    Place_Module-->>Admin: Hiển thị cập nhật thành công trên Admin Panel
```
