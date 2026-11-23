# 🧊 Tủ lạnh của tôi (FridgeKeeper)

App **iOS + Android** (Flutter) giúp quản lý hạn sử dụng đồ ăn trong tủ lạnh, nhắc
trước khi hết hạn và gợi ý món ăn để dùng hết đồ sắp hỏng.

## Tính năng

| | |
|---|---|
| 📷 **Chụp sản phẩm** | Nhận diện ảnh trên máy (Google ML Kit) để gợi ý tên + nhóm món đồ. Nếu ảnh có in hạn sử dụng thì điền luôn. |
| 🔎 **Chụp hạn sử dụng** | OCR đọc chữ trên bao bì và tự tìm ngày hết hạn: `HSD 12/05/2027`, `EXP 12 JAN 2027`, `BB 02/2027`, `NSX… HSD…`, `HSD: 12 tháng kể từ NSX`… Phân biệt được NSX và HSD. |
| ✍️ **Nhập thủ công** | Chọn ngày trên lịch hoặc bấm nhanh `+3 ngày`, `+1 tuần`, hoặc "thời gian bảo quản thường gặp" theo nhóm (thịt 3 ngày, rau 5 ngày…). |
| 🔔 **Thông báo** | 9:00 sáng **trước 1 ngày** khi hết hạn và 8:00 sáng ngày hết hạn. Nội dung thông báo kèm luôn món ăn gợi ý. Chạy hoàn toàn trên máy, không cần server. |
| 🍳 **Gợi ý món ăn** | ~30 món Việt. Tính điểm theo % nguyên liệu đã có + mức độ sắp hết hạn → món "nấu được ngay" và món "thiếu ít nguyên liệu". |
| ♻️ **Kết hợp món** | Tìm tổ hợp tối đa 3 món dùng được **nhiều đồ sắp hết hạn nhất**, không dùng một món đồ cho 2 món (bài toán phủ tập hợp có trọng số, giải bằng tham lam). |
| 🥕 **Theo từng món đồ** | Chạm vào một món trong tủ → "Gợi ý món ăn với món này". |
| ✅ **Đã nấu** | Bấm "Đã nấu món này" → tự trừ nguyên liệu khỏi tủ. Vuốt để đánh dấu đã dùng / bỏ đi (có hoàn tác). |

Mọi dữ liệu (danh sách, ảnh) lưu ngay trên điện thoại.

## Cài đặt & chạy

Cần [Flutter SDK](https://docs.flutter.dev/get-started/install) (3.27 trở lên).

- **Android**: chạy được trên Windows / macOS / Linux, cần Android Studio.
- **iOS**: bắt buộc có **máy Mac + Xcode** (Apple không cho build iOS trên máy khác).
  Chạy trên iPhone thật cần đăng nhập Apple ID trong Xcode (miễn phí cũng được, app hết hạn sau 7 ngày).

```bash
cd fridge_keeper
./setup.sh com.tenban        # tạo android/ + ios/ và cấu hình tự động
```

```bash
flutter test                 # chạy unit test (đọc HSD, gợi ý món)
```

```bash
flutter run                  # chạy trên máy ảo / điện thoại đang cắm
```

`setup.sh` chạy `flutter create`, sau đó `tool/configure_platforms.py` tự sửa:

- **Android** `AndroidManifest.xml`: quyền `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`
  và receiver để thông báo vẫn chạy sau khi khởi động lại máy.
  `build.gradle.kts`: bật core library desugaring, `minSdk >= 21`.
- **iOS** `Info.plist`: lý do xin quyền camera / thư viện ảnh.
  `Podfile` và Xcode project: iOS tối thiểu **15.5** (ML Kit yêu cầu).
  `AppDelegate.swift`: hiện thông báo cả khi đang mở app.

Nếu script báo "cần kiểm tra tay", xem mục dưới.

<details>
<summary>Cấu hình thủ công (nếu script không sửa được)</summary>

**android/app/src/main/AndroidManifest.xml** — trong `<manifest>`:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
```
trong `<application>`:
```xml
<receiver android:exported="false" android:name="com.dexterous.flutterlocalnotifications.ScheduledNotificationReceiver" />
<receiver android:exported="false" android:name="com.dexterous.flutterlocalnotifications.ScheduledNotificationBootReceiver">
    <intent-filter>
        <action android:name="android.intent.action.BOOT_COMPLETED"/>
        <action android:name="android.intent.action.MY_PACKAGE_REPLACED"/>
    </intent-filter>
</receiver>
```

**android/app/build.gradle.kts**
```kotlin
android {
    compileOptions { isCoreLibraryDesugaringEnabled = true }
    defaultConfig { minSdk = 21 }
}
dependencies { coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4") }
```

**ios/Runner/Info.plist**: thêm `NSCameraUsageDescription` và `NSPhotoLibraryUsageDescription`.

**ios/Podfile**: `platform :ios, '15.5'`, và trong Xcode đặt *Minimum Deployments* = 15.5.
</details>

## Cấu trúc code

```
lib/
├── main.dart                     # khởi tạo storage, thông báo, Provider
├── models/
│   ├── food_item.dart            # món đồ, nhóm, số ngày còn lại
│   └── recipe.dart               # công thức + cách so khớp nguyên liệu
├── data/recipes_data.dart        # cơ sở dữ liệu món ăn (thêm món ở đây)
├── services/
│   ├── expiry_date_parser.dart   # đọc HSD từ chữ OCR (logic thuần Dart, có test)
│   ├── recipe_engine.dart        # chấm điểm món + kết hợp món (có test)
│   ├── scan_service.dart         # ML Kit OCR + nhận diện ảnh
│   ├── notification_service.dart # lên lịch thông báo
│   └── storage_service.dart      # lưu JSON + ảnh
├── state/inventory_store.dart    # trạng thái tủ lạnh
└── screens/                      # giao diện
```

### Thêm món ăn mới

Mở `lib/data/recipes_data.dart` và thêm một `Recipe`. Từ khoá nguyên liệu viết
**không dấu, chữ thường** (vd `'thit bo'`). App so khớp nguyên cụm từ trong tên
món đồ người dùng nhập, nên "Thịt bò Úc" sẽ khớp `'thit bo'`.

## Giới hạn hiện tại

- OCR chạy offline nên ảnh mờ, chữ in nổi/khắc laser trên nắp lon có thể đọc sai → app
  luôn cho xem & sửa ngày trước khi lưu.
- iOS chỉ giữ tối đa 64 thông báo đang chờ; app ưu tiên các món sắp hết hạn nhất
  và lên lịch lại mỗi lần mở app.
- Nhận diện ảnh sản phẩm của ML Kit chỉ ra nhãn chung (Food, Fruit, Egg…), nên tên chính xác
  lấy từ chữ in trên bao bì hoặc người dùng tự nhập.
