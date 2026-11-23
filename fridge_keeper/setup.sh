#!/usr/bin/env bash
# Tạo thư mục android/ và ios/ rồi cấu hình quyền, thông báo, ML Kit.
set -euo pipefail
cd "$(dirname "$0")"

ORG="${1:-com.example}"

# Sinh code nền tảng (không ghi đè lib/, test/, pubspec.yaml đã có).
flutter create --platforms=android,ios --org "$ORG" --project-name fridge_keeper .

python3 tool/configure_platforms.py
flutter pub get

if [[ "$(uname)" == "Darwin" ]]; then
  (cd ios && pod install --repo-update)
fi

echo
echo "✅ Đã sẵn sàng. Cắm điện thoại rồi chạy:  flutter run"
