# GymTrack: nhắc tập, theo dõi ăn uống và uống nước

Web app (PWA) cho iPhone. Lịch tập được lấy từ Google Calendar (24/11/2026).

## Tính năng
- **Hôm nay**: đếm ngược tới buổi tập tiếp theo, lịch trong ngày (chuẩn bị đi tập, giờ tập, protein sau tập, bữa ăn, giờ ngủ), tóm tắt nước và kcal.
- **Tập luyện**: bài tập của từng ngày (T2 Push, T3 Pull & Core, T4 Upper & Fat Burner, T5 thể thao, T6 Upper Detail, CN Core & Tay). Bấm vào từng set để đánh dấu, đồng hồ nghỉ tự chạy và kêu khi hết giờ. App ghi nhớ mức tạ của từng bài.
- **Ăn uống**: ghi món theo bữa, có sẵn danh sách món Việt hoặc tự nhập. Theo dõi kcal, protein, carb, fat so với mục tiêu (tự tính theo cân nặng và mục tiêu giảm mỡ, giữ cân hoặc tăng cơ). Có biểu đồ 7 ngày.
- **Nước**: bấm +150, +250 hoặc +500 ml. App so với tiến độ trong ngày. Ngày có tập, mục tiêu tự cộng 500 ml. Có biểu đồ 7 ngày.
- **Nhắc nhở**: thông báo trong app (khi app đang mở) và file `.ics` có báo thức để thêm vào app Lịch của iPhone, nên vẫn được nhắc khi đã tắt app.

## Cài lên iPhone
1. Đưa thư mục `gym-app/` lên một host tĩnh có HTTPS (GitHub Pages, Vercel, Netlify…).
2. Mở link bằng **Safari**, bấm **Chia sẻ**, rồi chọn **Thêm vào MH chính**.
3. Mở app từ biểu tượng, vào **Cài đặt** (bánh răng), sau đó:
   - bấm **Nhắc uống nước** và **Nhắc chuẩn bị tập & bữa ăn**, rồi chọn **Thêm tất cả** vào Lịch;
   - bấm **Bật thông báo trong app**.

Dữ liệu chỉ lưu trên máy (localStorage).

## Khi đổi lịch tập
Sửa `data.js` rồi chạy lại lệnh tạo file `.ics`:

```bash
node gym-app/tools/gen-ics.mjs
```

Chạy thử trên máy:

```bash
cd gym-app && python3 -m http.server 8000
```
