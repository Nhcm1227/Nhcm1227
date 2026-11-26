# 📚 Study With Me — tự nhìn mình mà học

Web học tập tự quay camera của chính bạn: bạn thấy mình đang ngồi học (giống các livestream "study with me"), có đồng hồ Pomodoro in ngay trên video, ghi timelapse cả buổi và nhắc khi bạn rời bàn.

Tất cả chạy **trên máy bạn** — video không gửi lên server nào. Dữ liệu (nhiệm vụ, thống kê, cài đặt) lưu trong `localStorage` của trình duyệt.

## Chạy thử

Camera chỉ hoạt động trên `https://` hoặc `localhost`:

```bash
cd study-with-me && python3 -m http.server 8000
```

Rồi mở http://localhost:8000. Hoặc bật GitHub Pages cho repo và mở `/study-with-me/`.

## Tính năng (tham khảo StudyStream, Focusmate, Flocus, LifeAt, Focus Labs…)

| Nhóm | Tính năng |
|---|---|
| 🎥 Camera "gương" | Lật gương, chọn camera, bộ lọc (ấm, mát, đen trắng, sáng, mềm), chụp ảnh |
| 🪟 Cửa sổ nổi | Picture-in-Picture kèm đồng hồ — vẫn nhìn thấy mình khi chuyển sang app/tab khác |
| ⏱️ Pomodoro | Tập trung / nghỉ ngắn / nghỉ dài / bấm giờ tự do; mẫu 25/5, 50/10, 90/20; tự chuyển phiên; âm báo; thông báo máy |
| 🅰️ Lớp phủ trên video | Đồng hồ đếm ngược, giờ hiện tại, nhiệm vụ đang làm, câu động lực |
| ✅ Nhiệm vụ | Danh sách việc, ước lượng số pomodoro, đếm 🍅 đã làm cho từng việc |
| 🎞️ Timelapse | Tự chụp 1 khung mỗi 1–10 giây khi đồng hồ chạy, xuất thành video MP4/WebM tua nhanh |
| 👀 Nhắc rời bàn | Nhận diện khuôn mặt (FaceDetector / MediaPipe, chạy trên máy); không thấy bạn → cảnh báo, tự tạm dừng và tự chạy lại khi bạn quay về. Nếu không tải được mô hình thì dùng phát hiện chuyển động |
| 🧍 Sức khoẻ | Cứ 20 phút học nhắc ngồi thẳng, uống nước, quy tắc mắt 20-20-20 |
| 🎧 Âm thanh nền | Mưa, sóng biển, lửa trại, ồn nâu, ồn trắng — tạo bằng Web Audio, trộn âm lượng riêng |
| 📊 Thống kê | Phút & phiên hôm nay, chuỗi ngày liên tiếp, số lần rời bàn, mục tiêu ngày, biểu đồ 7 ngày, xuất CSV |
| 🎉 Hết phiên | Hộp thoại chúc mừng kèm ảnh chụp bạn lúc đó |
| ⛶ Chế độ tập trung | Toàn màn hình, chỉ còn video + đồng hồ |

## Phím tắt

`Space` chạy/dừng · `R` đặt lại · `M` lật gương · `P` cửa sổ nổi · `S` chụp ảnh · `F` chế độ tập trung · `N` thêm nhiệm vụ

## Cấu trúc

- `index.html` — giao diện
- `style.css` — giao diện sáng/tối, responsive
- `app.js` — toàn bộ logic (không cần build, không phụ thuộc thư viện; MediaPipe chỉ tải khi bật "Nhắc rời bàn")
