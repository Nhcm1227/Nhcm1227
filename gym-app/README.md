# GymTrack: nhắc tập, theo dõi ăn uống và uống nước

Web app (PWA) cho iPhone. Lịch tập được lấy từ Google Calendar (24/11/2026).

## Tính năng
- **Hôm nay**: đếm ngược tới buổi tập tiếp theo, lịch trong ngày (chuẩn bị đi tập, giờ tập, protein sau tập, bữa ăn, giờ ngủ), tóm tắt nước và kcal.
- **Tập luyện**: bài tập của từng ngày (T2 Push, T3 Pull & Core, T4 Upper & Fat Burner, T5 thể thao, T6 Upper Detail, CN Core & Tay). Bấm vào từng set để đánh dấu, đồng hồ nghỉ tự chạy và kêu khi hết giờ. App ghi nhớ mức tạ của từng bài.
- **Ăn uống**: ghi món theo bữa, có sẵn danh sách món Việt hoặc tự nhập. Theo dõi kcal, protein, carb, fat so với mục tiêu (tự tính theo cân nặng và mục tiêu giảm mỡ, giữ cân hoặc tăng cơ). Có biểu đồ 7 ngày.
- **Nước**: bấm +150, +250 hoặc +500 ml. App so với tiến độ trong ngày. Ngày có tập, mục tiêu tự cộng 500 ml. Có biểu đồ 7 ngày.
- **Hồi phục · Tải tập · Giấc ngủ** (ý tưởng tham khảo từ các thiết bị đeo theo dõi phục hồi, nhưng dùng check-in thay cho cảm biến):
  - *Check-in buổi sáng* (khoảng 30 giây): giờ ngủ, chất lượng giấc ngủ, mức đau cơ, năng lượng, stress, các thói quen tối hôm trước. Có thể nhập thêm cân nặng, vòng eo, HRV và nhịp tim nghỉ (lấy từ Apple Watch).
  - *Hồi phục 0–100%*: điểm xanh, vàng hoặc đỏ kèm gợi ý cường độ tập. Khi điểm đỏ, app tự bật chế độ nhẹ (bớt 1 set mỗi bài).
  - *Tải tập 0–100*: tính bằng sRPE (RPE × số phút tập).
  - *Nhu cầu ngủ*: 7,5 giờ, cộng thêm theo tải tập hôm trước và số giờ ngủ còn thiếu. App gợi ý giờ đi ngủ dựa vào giờ phải dậy hôm sau (lấy theo lịch).
- **Tổng quan**: 3 vòng Giấc ngủ, Hồi phục và Tải tập (bấm vào vòng để xem chi tiết). Có nút ‹ › để xem các ngày trước, thanh định hướng tải tập theo vùng mục tiêu, nút ghi thêm hoạt động (chạy, bóng rổ…), và các ô HRV, nhịp tim nghỉ, calo, nước.
- **Giấc ngủ chi tiết**: nhập giờ đi ngủ và giờ dậy, app tính % hiệu quả ngủ, độ đều đặn (4 ngày), nợ ngủ và cách tính nhu cầu ngủ.
- **Tăng tạ dần**: ghi kg × rep cho từng set, tự điền kết quả buổi trước, và gợi ý tăng tạ khi bạn đạt đủ rep tối đa ở mọi set.
- **Xu hướng**: báo cáo tuần; biểu đồ Hồi phục và Tải tập trong 14 ngày; cân nặng với đường trung bình 7 ngày; xu hướng %/tuần và đề xuất kcal tự điều chỉnh (ước tính TDEE thực tế); 1RM ước tính của từng bài; ảnh hưởng của từng thói quen tới điểm hồi phục.
- **Ghi ăn nhanh**: món gần đây hiện lên đầu, có nút chép lại bữa ăn của hôm qua.
- **Sao lưu**: xuất và nhập dữ liệu dạng file JSON. Màn hình được giữ sáng trong lúc tập.
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
