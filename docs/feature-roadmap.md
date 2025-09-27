# Lộ Trình Phát Triển Tính Năng NeoTrade

Tài liệu này mô tả định hướng mở rộng cho giao diện Binary Options MVP, ưu tiên trải nghiệm người dùng chuyên nghiệp, tính bảo mật, và khả năng mở rộng sản phẩm.

## 1. Mục Tiêu Tổng Quát

- Hoàn thiện trải nghiệm giao dịch BO thời gian thực với dữ liệu chuẩn xác và thông tin phong phú.
- Nâng cao độ tin cậy cho các thao tác nhập lệnh, quản trị rủi ro và theo dõi lịch sử.
- Mở rộng khả năng cá nhân hóa, báo cáo và tích hợp hệ sinh thái (API, đối tác thanh khoản, mobile).

## 2. Lộ Trình Theo Giai Đoạn

### Giai đoạn 1 • Củng cố nền tảng (Tuần 1-2)

| Tính năng | Mục tiêu | Ghi chú |
| --- | --- | --- |
| **Streaming Price Feed nâng cao** | Chuyển từ feed Binance demo sang adapter trừu tượng hỗ trợ đa nguồn (Binance, Deribit, Synthetic). | Triển khai retry exponential và circuit breaker để ổn định. |
| **Trạng thái kết nối và cảnh báo** | Hiển thị badge kết nối ở header, toast khi mất/khôi phục tín hiệu. | Kết hợp hệ thống notification hiện có. |
| **Kiểm thử tự động** | Thêm Jest/RTL cho store, hooks, và snapshot cho UI quan trọng. | Thiết lập GitHub Actions lint + test. |

### Giai đoạn 2 • Trải nghiệm giao dịch nâng cao (Tuần 3-4)

| Tính năng | Mục tiêu | Ghi chú |
| --- | --- | --- |
| **Bảng lịch sử lệnh (Order History)** | Lưu trữ, phân trang và lọc theo symbol/kết quả. | Dùng indexedDB cục bộ hoặc mock API. |
| **Quản trị rủi ro** | Cho phép đặt giới hạn Daily Loss, Max Concurrent Orders, Cảnh báo drawdown. | Kết nối trade panel để khóa thao tác khi vượt hạn mức. |
| **Tùy biến giao diện (Layout Presets)** | Cho phép drag/drop panel, lưu preset theo user. | Cân nhắc sử dụng Zustand persist. |

### Giai đoạn 3 • Phân tích & báo cáo (Tuần 5-6)

| Tính năng | Mục tiêu | Ghi chú |
| --- | --- | --- |
| **Dashboard hiệu suất** | Biểu đồ Equity Curve, Win Rate, Profit Factor, Heatmap theo khung giờ. | Tận dụng lightweight-charts bổ sung hoặc Recharts. |
| **Phân tích cảm xúc thị trường** | Tích hợp dữ liệu sentiment (Fear & Greed, funding rate). | Trình bày dạng widget tùy chỉnh. |
| **Báo cáo PDF/CSV** | Xuất dữ liệu lệnh và PnL theo phạm vi chọn. | Tạo job client-side tạm thời, chuẩn bị nền tảng cho backend. |

### Giai đoạn 4 • Mở rộng hệ sinh thái (Tuần 7-8)

| Tính năng | Mục tiêu | Ghi chú |
| --- | --- | --- |
| **Tích hợp API đặt lệnh** | Kết nối mock REST để thực thi lệnh thực, đồng bộ trạng thái bảng điều khiển. | Thiết kế service layer tách biệt UI. |
| **Chế độ cộng đồng / Copy Trading** | Cho phép theo dõi “Top Traders” và copy theo tỷ lệ. | Cần cơ chế follow/stop, cảnh báo rủi ro. |
| **Ứng dụng mobile (PWA)** | PWA với thông báo đẩy, tối ưu hiệu năng trên thiết bị cảm ứng. | Rà soát lại bố cục responsive. |

## 3. Ưu Tiên Nhanh (Fast Wins)

- **Dark mode fine-tuning**: Bổ sung preset độ sáng nền, hỗ trợ accessibility (contrast AA/AAA).
- **Shortcut & Macro**: Thiết lập phím tắt (Q/W cho Call/Put, +/- cho stake) và macro staking.
- **Onboarding tour**: Hướng dẫn từng khu vực UI cho người dùng mới, dùng Framer Motion để highlight.

## 4. Yêu Cầu Kỹ Thuật

- **State & Data**: Tái cấu trúc store theo module (market, orders, notifications, user prefs). Chuẩn bị selectors memoized.
- **Caching & Storage**: Local persistence (IndexedDB/LocalStorage) với chiến lược sync khi có backend thực.
- **Testing**: Thiết lập coverage tối thiểu 80% cho store logic; smoke test end-to-end với Playwright.
- **Observability**: Thêm logging trung tâm, thống kê latency websocket, capture lỗi quan trọng qua Sentry (hoặc tương đương).

## 5. Phụ Thuộc & Rủi Ro

- **Nguồn dữ liệu thị trường**: Cần quyết định provider chính và cơ chế failover.
- **Quản lý pháp lý**: Khi triển khai copy trading và API thực, xem xét tuân thủ tiêu chuẩn KYC/AML.
- **Hiệu năng**: Tải dữ liệu lớn cho dashboard yêu cầu tối ưu virtualization và batching render.

## 6. KPI Thành Công

- Thời gian hiển thị kết quả giao dịch (spotlight) < 200ms sau khi nhận settle.
- Độ trễ cập nhật chart trung bình < 1s khi stream ổn định.
- Tỷ lệ giữ chân người dùng (7 ngày) > 35% sau khi ra mắt tính năng quản trị rủi ro.
- 90% người dùng đánh giá onboarding tour “Rõ ràng” trở lên trong khảo sát in-app.

## 7. Lộ Trình Tiếp Theo

- Chuẩn bị bản thiết kế UI cho Order History & Dashboard trước khi vào sprint.
- Định nghĩa API contract sơ bộ (OpenAPI/Swagger) cho backend.
- Lên kế hoạch kiểm thử UAT với nhóm trader nội bộ sau Giai đoạn 3.

---

> *Tài liệu sẽ được cập nhật vào cuối mỗi sprint căn cứ vào tiến độ thực tế và phản hồi người dùng.*
