// Lịch tập lấy từ Google Calendar (cập nhật 24/11/2026).
// Sửa file này nếu bạn thay đổi lịch trên Google Calendar.
// day: 0 = Chủ nhật, 1 = Thứ 2, ... 6 = Thứ 7

export const WORKOUTS = {
  1: {
    title: 'Push Day',
    subtitle: 'Ngực · Vai · Tay sau',
    start: '11:45', end: '13:15', location: 'VinUni', type: 'gym',
    exercises: [
      { name: 'Incline Dumbbell Press', sets: 4, reps: '8–10', rest: 90 },
      { name: 'Flat Machine Press', sets: 3, reps: '10–12', rest: 60 },
      { name: 'Pec Deck Fly', sets: 3, reps: '12–15', rest: 0, superset: 'A', note: 'Superset với Dips, làm liền không nghỉ' },
      { name: 'Dips (thân ngả trước)', sets: 3, reps: '10–12', rest: 60, superset: 'A' },
      { name: 'Dumbbell / Cable Lateral Raise', sets: 4, reps: '12–15', rest: 45, note: 'Ép vai giữa' },
      { name: 'Triceps Rope Pushdown', sets: 3, reps: '12–15', rest: 45 },
      { name: 'Incline Close-Grip Press', sets: 3, reps: '10–12', rest: 45, note: 'Tay sau / ngực trên' },
    ],
  },
  2: {
    title: 'Pull Day & Heavy Core',
    subtitle: 'Lưng · Xô · Tay trước · Bụng',
    start: '11:00', end: '12:30', location: 'VinUni', type: 'gym',
    exercises: [
      { name: 'Lat Pulldown', sets: 4, reps: '8–10', rest: 75 },
      { name: 'Seated Cable Row (tay hẹp)', sets: 3, reps: '10–12', rest: 60, note: 'Max 23kg' },
      { name: 'Reverse Lat Pulldown', sets: 3, reps: '10–12', rest: 60 },
      { name: 'EZ-Bar Cable Curl', sets: 3, reps: '10–12', rest: 0, superset: 'A', note: '9kg · superset với Face Pull' },
      { name: 'Face Pull', sets: 3, reps: '15–20', rest: 45, superset: 'A', note: '18kg' },
      { name: 'Hammer Curl (cáp / tạ đơn)', sets: 3, reps: '12', rest: 30 },
      { name: 'Cable Crunch (nặng)', sets: 4, reps: '12–15', rest: 45 },
    ],
  },
  3: {
    title: 'Upper Body Focus & Fat Burner',
    subtitle: 'Thân trên · Đốt mỡ',
    start: '12:00', end: '13:30', location: 'VinUni', type: 'gym',
    exercises: [
      { name: 'Incline Dumbbell Press', sets: 4, reps: '8–10', rest: 90, note: '15–20kg. Hạ chậm 3s, đẩy bùng nổ, không khóa cùi chỏ' },
      { name: 'Lat Pulldown / Neutral Row', sets: 3, reps: '10–12', rest: 75, note: 'Kéo về ngực trên, siết xô' },
      { name: 'Cable Lateral Raise', sets: 4, reps: '12–15', rest: 45, note: 'Dang cáp xéo 30° về trước' },
      { name: 'Pec Deck Fly', sets: 3, reps: '12–15', rest: 60, note: 'Giữ 1s ở điểm ép' },
      { name: 'Cable Crunch', sets: 4, reps: '12–15', rest: 45, note: 'Tạ nặng, cuộn gập cột sống' },
      { name: 'Incline Treadmill Walk', sets: 1, reps: '20 phút', rest: 0, note: 'Dốc 10–12%, 5.0 km/h' },
    ],
  },
  4: {
    title: 'Thể thao / Cardio',
    subtitle: 'Chạy · Golf · Bóng rổ · Pickleball',
    start: '16:00', end: '18:00', location: '', type: 'sport',
    exercises: [
      { name: 'Chạy / Golf / Bóng rổ / Pickleball', sets: 1, reps: '60–120 phút', rest: 0, note: 'Chọn 1 môn, giữ nhịp tim vừa phải' },
    ],
  },
  5: {
    title: 'Upper Detail',
    subtitle: 'Cable Fly · Vai · Tay · Bụng',
    start: '12:30', end: '13:45', location: '', type: 'gym',
    exercises: [
      { name: 'Low Cable Chest Fly', sets: 3, reps: '12–15', rest: 60, note: 'Kéo từ dưới lên ngang ngực, ăn ngực trên' },
      { name: 'High Cable Chest Fly', sets: 3, reps: '12–15', rest: 60, note: 'Kéo từ trên xuống hông, ăn ngực dưới' },
      { name: 'Cable Lateral Raise', sets: 4, reps: '12–15', rest: 45, note: 'Dang cáp xéo 30° về trước' },
      { name: 'Face Pull', sets: 3, reps: '15–20', rest: 60, note: 'Kéo về ngang mắt, mở cùi chỏ' },
      { name: 'Overhead Cable Extension', sets: 3, reps: '12', rest: 0, superset: 'A', note: 'Superset với Cable Biceps Curl' },
      { name: 'Cable Biceps Curl', sets: 3, reps: '12', rest: 60, superset: 'A' },
      { name: 'Decline Weighted Crunch / Hanging Leg Raise', sets: 3, reps: '12–15', rest: 45 },
    ],
  },
  0: {
    title: 'Core, Tay & Cardio',
    subtitle: 'Bụng · Tay · Đi bộ dốc',
    start: '08:00', end: '09:10', location: 'VinUni', type: 'gym',
    exercises: [
      { name: 'Hanging Leg Raise / Knee Raise', sets: 4, reps: '12–15', rest: 45, note: 'Cuộn hông kéo đùi sát ngực' },
      { name: 'Decline Weighted Crunch', sets: 4, reps: '12–15', rest: 45, note: 'Ôm đĩa 5–10kg, giữ 1s ở đỉnh' },
      { name: 'Russian Twist', sets: 3, reps: '15/bên', rest: 45, note: 'Ngồi nghiêng 45°, ôm đĩa tạ' },
      { name: 'Dumbbell Hammer Curl', sets: 3, reps: '12–15', rest: 0, superset: 'A', note: 'Superset với French Press' },
      { name: 'Dumbbell French Press', sets: 3, reps: '12–15', rest: 60, superset: 'A' },
      { name: 'Incline Treadmill Walk', sets: 1, reps: '25–30 phút', rest: 0, note: 'Dốc 10–12%, 4.8–5.2 km/h, không bám tay' },
    ],
  },
};

// Giờ ăn theo lịch (Lunch / Cooking Lunch / Breakfast / Cooking & Eat Dinner)
export const MEALS = {
  1: [{ label: 'Nấu bữa trưa', time: '09:00' }, { label: 'Bữa tối', time: '18:00' }],
  2: [{ label: 'Bữa trưa', time: '12:30' }, { label: 'Bữa tối', time: '18:00' }],
  3: [{ label: 'Bữa trưa', time: '13:45' }, { label: 'Bữa tối', time: '18:00' }],
  4: [{ label: 'Bữa trưa', time: '11:00' }, { label: 'Bữa tối', time: '18:00' }],
  5: [{ label: 'Bữa sáng', time: '09:00' }, { label: 'Bữa tối', time: '18:00' }],
  6: [],
  0: [],
};

export const BEDTIME = '23:00';

export const DAY_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
export const DAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// Món ăn nhanh (giá trị ước lượng / 1 phần)
export const FOODS = [
  { name: 'Cơm trắng (1 bát)', kcal: 200, p: 4, c: 44, f: 0.4 },
  { name: 'Ức gà luộc/áp chảo (150g)', kcal: 250, p: 46, c: 0, f: 5 },
  { name: 'Trứng gà (1 quả)', kcal: 75, p: 6, c: 0.5, f: 5 },
  { name: 'Lòng trắng trứng (1 quả)', kcal: 17, p: 3.6, c: 0.2, f: 0 },
  { name: 'Thịt bò xào (150g)', kcal: 300, p: 38, c: 3, f: 15 },
  { name: 'Thịt lợn nạc (150g)', kcal: 215, p: 33, c: 0, f: 9 },
  { name: 'Cá hồi (150g)', kcal: 310, p: 33, c: 0, f: 19 },
  { name: 'Cá basa (150g)', kcal: 170, p: 27, c: 0, f: 7 },
  { name: 'Tôm (150g)', kcal: 150, p: 32, c: 1, f: 2 },
  { name: 'Đậu phụ (150g)', kcal: 115, p: 12, c: 3, f: 7 },
  { name: 'Whey protein (1 scoop)', kcal: 120, p: 24, c: 3, f: 1.5 },
  { name: 'Sữa tươi không đường (250ml)', kcal: 150, p: 8, c: 12, f: 8 },
  { name: 'Sữa chua Hy Lạp (100g)', kcal: 60, p: 10, c: 4, f: 0.5 },
  { name: 'Yến mạch (50g)', kcal: 190, p: 6.5, c: 33, f: 3.5 },
  { name: 'Khoai lang (200g)', kcal: 170, p: 3, c: 40, f: 0.2 },
  { name: 'Chuối (1 quả)', kcal: 105, p: 1.3, c: 27, f: 0.4 },
  { name: 'Táo (1 quả)', kcal: 95, p: 0.5, c: 25, f: 0.3 },
  { name: 'Rau luộc/xào (1 đĩa)', kcal: 60, p: 3, c: 8, f: 2 },
  { name: 'Phở bò (1 tô)', kcal: 450, p: 25, c: 60, f: 12 },
  { name: 'Bún chả (1 suất)', kcal: 550, p: 25, c: 65, f: 20 },
  { name: 'Bánh mì thịt', kcal: 450, p: 18, c: 55, f: 17 },
  { name: 'Cơm tấm sườn', kcal: 650, p: 30, c: 80, f: 22 },
  { name: 'Hạt điều/hạnh nhân (30g)', kcal: 170, p: 5, c: 8, f: 14 },
  { name: 'Bơ đậu phộng (1 thìa)', kcal: 95, p: 4, c: 3, f: 8 },
];
