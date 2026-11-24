# Đồng hồ đời người

Web app đếm ngược thời gian sống, dự báo tuổi thọ, sổ việc có báo động và chợ giờ sống.
Có tài khoản người dùng, 3 ngày dùng thử, gói trả phí 24.000đ/tháng và trang quản trị.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `public/index.html` | Trang chính (người dùng) |
| `public/admin.html` | Trang quản trị, mở ở `/admin` |
| `public/dieu-khoan.html` | Điều khoản, bảo mật, hoàn tiền |
| `api/` | Các hàm máy chủ chạy trên Vercel |
| `api/_lib/store.js` | Lưu dữ liệu: Vercel Blob riêng tư khi chạy trên Vercel, tệp trong `.data/` khi chạy trên máy |
| `app.html`, `index.html` | Bản demo một tệp, không cần máy chủ (không được triển khai) |

## Chạy trên máy

```bash
npm install
```

```bash
npm run dev
```

Mở http://localhost:3000. Chạy bộ kiểm tra API:

```bash
npm test
```

## Biến môi trường trên Vercel

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `SESSION_SECRET` | Có | Chuỗi ngẫu nhiên dài ít nhất 32 ký tự, dùng ký phiên đăng nhập |
| `ADMIN_CLAIM_CODE` | Có | Mã dùng một lần để tài khoản đầu tiên nhận quyền quản trị ở `/admin` |
| `BLOB_READ_WRITE_TOKEN` | Có | Tự có khi gắn kho Vercel Blob (chế độ private) vào dự án |
| `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | Để nhận QR | Lấy ở my.payos.vn, mục Kênh thanh toán |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | Để nhận thẻ Visa/Mastercard | VNPAY gửi qua email khi duyệt hợp đồng |
| `VNPAY_URL` | Khi chạy thật | `https://pay.vnpay.vn/vpcpay.html`. Bỏ trống là dùng môi trường thử (sandbox) |
| `APP_URL` | Không | Địa chỉ chính thức, ví dụ `https://tenmiencuaban.vn`, dùng làm link quay về sau thanh toán |
| `PRICE_VND` | Không | Giá mỗi tháng, mặc định 24000 |

Sau khi thêm hoặc đổi biến, bấm Redeploy để có hiệu lực.

## Bật thanh toán

**Mã QR (payOS)**
1. Đăng ký tại payos.vn, liên kết tài khoản ngân hàng nhận tiền, tạo kênh thanh toán.
2. Dán 3 khóa vào biến môi trường ở trên, Redeploy.
3. Trong kênh thanh toán payOS, đặt Webhook URL là địa chỉ hiện ở trang `/admin` (dạng `https://<tên miền>/api/pay/payos-webhook`).

**Thẻ Visa / Mastercard (VNPAY)**
1. Đăng ký merchant với VNPAY và yêu cầu mở thanh toán thẻ quốc tế. Có thể thử trước với tài khoản sandbox tại sandbox.vnpayment.vn.
2. Dán `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` (và `VNPAY_URL` khi chạy thật), Redeploy.
3. Gửi VNPAY địa chỉ IPN hiện ở trang `/admin` (dạng `https://<tên miền>/api/pay/vnpay-ipn`).

Khi chưa có payOS, nút "Quét mã QR" sẽ dùng VNPAY-QR. Khi chưa có cổng nào, quản trị viên vẫn cấp tháng tay được ở `/admin`.

## Quản trị

1. Tạo tài khoản ở trang chính.
2. Mở `/admin`, nhập `ADMIN_CLAIM_CODE`. Mã chỉ dùng được một lần.
3. Từ đây: xem số người dùng, doanh thu, đơn thanh toán; cấp thêm tháng, thêm ngày dùng thử, hủy gói, khóa/mở khóa, đặt lại mật khẩu, cấp quyền quản trị cho người khác.

## Giới hạn hiện tại

- Chưa gửi email (quên mật khẩu thì quản trị viên đặt lại giúp ở `/admin`).
- Một người có thể tạo nhiều email để dùng thử nhiều lần.
- Trang quản trị đọc toàn bộ người dùng mỗi lần tải: ổn đến vài nghìn tài khoản, nhiều hơn thì nên chuyển sang cơ sở dữ liệu (Postgres).
- Gói Hobby (miễn phí) của Vercel chỉ cho dự án phi thương mại. Trước khi thu tiền thật, nâng tài khoản Vercel lên gói Pro.
