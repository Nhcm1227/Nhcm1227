# Đồng hồ đời người: app iOS / Android (Flutter)

App điện thoại dùng chung máy chủ và tài khoản với bản web (`../dong-ho-doi-nguoi`).
Đăng nhập cùng một email thì hồ sơ, sổ việc, giờ sống và bảng xếp hạng giống nhau ở cả hai nơi.

5 mục ở thanh dưới: **Đồng hồ**, **Việc**, **Mua giờ**, **Xếp hạng**, **Tôi**.

## 1. Chạy thử trên iPhone ảo (cần máy Mac)

Cài một lần:

1. Cài **Xcode** từ App Store, mở lên một lần để nó cài thêm thành phần.
2. Cài **Flutter**: làm theo https://docs.flutter.dev/get-started/install/macos (chọn iOS).
3. Mở Terminal, kiểm tra:

```bash
flutter doctor
```

Tạo phần khung iOS / Android cho dự án (chỉ làm lần đầu, lệnh này không đụng vào thư mục `lib/`):

```bash
cd dong_ho_app
```

```bash
flutter create --org vn.donghodoinguoi --project-name dong_ho_doi_nguoi --platforms ios,android .
```

Tải thư viện và chạy bài kiểm tra:

```bash
flutter pub get
```

```bash
flutter test
```

Mở iPhone ảo và chạy app:

```bash
open -a Simulator
```

```bash
flutter run
```

Sửa mã trong `lib/` rồi bấm `r` trong Terminal là app cập nhật ngay (hot reload), giống trong video.

Chạy trên iPhone thật: cắm cáp, mở `ios/Runner.xcworkspace` bằng Xcode, vào **Runner → Signing & Capabilities**, chọn **Team** là Apple ID của bạn, rồi `flutter run` và chọn iPhone.

## 2. Tên app và biểu tượng

- Tên dưới biểu tượng: mở `ios/Runner/Info.plist`, đặt `CFBundleDisplayName` là `Đồng hồ`.
- Biểu tượng: mở `ios/Runner/Assets.xcassets/AppIcon.appiconset` trong Xcode, kéo `assets/icon/app-icon-1024.png` vào ô 1024.

## 3. Đưa lên App Store

1. **Đăng ký Apple Developer Program**: https://developer.apple.com/programs/ (99 USD mỗi năm, cá nhân đăng ký được). Duyệt thường 1–2 ngày.
2. **Tạo app trên App Store Connect** (https://appstoreconnect.apple.com): My Apps → dấu + → New App. Bundle ID: `vn.donghodoinguoi.dongHoDoiNguoi` (hoặc đổi theo ý bạn, phải khớp với Xcode).
3. **Đóng gói**:

```bash
flutter build ipa
```

4. **Tải lên**: mở app **Transporter** (miễn phí trên Mac App Store), kéo tệp `.ipa` trong `build/ios/ipa/` vào, bấm Deliver.
5. **TestFlight**: trong App Store Connect, mục TestFlight, mời bạn bè cài thử trước.
6. **Điền thông tin và gửi duyệt**:
   - Ảnh chụp màn hình iPhone 6,9 inch (chụp từ iPhone ảo bằng `Cmd + S`).
   - Mô tả, từ khóa, danh mục **Health & Fitness** hoặc **Productivity**.
   - Privacy Policy URL: `https://dong-ho-doi-nguoi.vercel.app/dieu-khoan` (đổi sang tên miền riêng khi có).
   - App Privacy: khai báo có thu **Email**, **Health & Fitness** (hồ sơ sức khỏe), **User Content** (sổ việc), dùng cho chức năng app, không theo dõi quảng cáo.
   - Tài khoản thử cho người duyệt: tạo sẵn một email và mật khẩu, ghi vào mục App Review Information.
   - Bấm **Submit for Review**. Thường duyệt trong 1–3 ngày.

### Những điều Apple hay bắt lỗi (app đã xử lý sẵn)

| Quy định | App đã làm |
|---|---|
| 5.1.1(v): có đăng ký thì phải cho xóa tài khoản ngay trong app | Mục Tôi → Xóa tài khoản |
| 1.4.1: app sức khỏe không được nói như chẩn đoán | Ghi rõ "ước tính thống kê, không phải chẩn đoán", có nguồn nghiên cứu từng dòng |
| 3.1.1: bán gói số trong app phải dùng In-App Purchase của Apple | Bản app chưa bán gì, mọi tính năng mở sẵn (`kGatePremium = false` trong `lib/src/app_state.dart`) |
| 4.2: không chấp nhận app chỉ bọc trang web | App viết bằng Flutter, giao diện gốc, chạy được khi mất mạng |

Muốn thu 24.000đ/tháng trong app thì bước sau là thêm In-App Purchase (gói `in_app_purchase`), Apple thu 15% với nhà phát triển nhỏ. Bản web vẫn thu qua payOS / VNPAY như cũ.

## 4. Google Play

1. Tài khoản Google Play Console: 25 USD một lần.
2. `flutter build appbundle`, tải tệp `.aab` lên Play Console.
3. Tài khoản cá nhân mới thường phải cho ít nhất 12 người dùng thử kín trong 14 ngày trước khi phát hành công khai.

## Cấu trúc mã

| Tệp | Nội dung |
|---|---|
| `lib/src/lifespan.dart` | Công thức tuổi thọ, giống hệt bản web |
| `lib/src/app_state.dart` | Dữ liệu app, lưu trên máy, đồng bộ với máy chủ |
| `lib/src/api.dart` | Gọi máy chủ. Đổi máy chủ: `flutter run --dart-define=API_BASE=https://tenmien.vn` |
| `lib/src/screens/` | 5 màn hình |
| `test/lifespan_test.dart` | Đối chiếu kết quả với bản web |

Phông chữ (Grenze Gotisch, Spectral, IBM Plex Mono) dùng giấy phép SIL Open Font License, tệp giấy phép nằm cạnh phông trong `assets/fonts/`.
