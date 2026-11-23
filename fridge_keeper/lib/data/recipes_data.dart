import '../models/food_item.dart';
import '../models/recipe.dart';

// ---------------------------------------------------------------------------
// Nguyên liệu dùng chung. Từ khoá đã bỏ dấu, viết thường.
// ---------------------------------------------------------------------------

const _trung = RecipeIngredient('Trứng',
    keywords: ['trung', 'trung ga', 'trung vit', 'trung cut', 'egg', 'eggs']);
const _caChua = RecipeIngredient('Cà chua', keywords: ['ca chua', 'tomato']);
const _hanhLa = RecipeIngredient('Hành lá',
    keywords: ['hanh la', 'hanh ngo', 'spring onion', 'green onion']);
const _hanhTay = RecipeIngredient('Hành tây',
    keywords: ['hanh tay', 'onion'], excludes: ['spring', 'green']);
const _thitHeo = RecipeIngredient('Thịt heo', keywords: [
  'thit heo', 'thit lon', 'ba chi', 'ba roi', 'thit bam', 'thit xay',
  'nac vai', 'nac dam', 'thit nac', 'pork', 'minced pork',
]);
const _thitBo = RecipeIngredient('Thịt bò', keywords: [
  'thit bo', 'bap bo', 'than bo', 'bo my', 'bo uc', 'bo bit tet', 'beef',
]);
const _thitGa = RecipeIngredient('Thịt gà',
    keywords: [
      'thit ga', 'uc ga', 'dui ga', 'canh ga', 'ga ta', 'ga ri',
      'ga cong nghiep', 'chicken', '=ga',
    ],
    excludes: ['trung', 'egg', 'eggs']);
const _suon = RecipeIngredient('Sườn heo',
    keywords: ['suon', 'suon non', 'suon heo', 'ribs']);
const _ca = RecipeIngredient('Cá', keywords: [
  '=ca', 'ca loc', 'ca basa', 'ca thu', 'ca hoi', 'ca ro', 'ca dieu hong',
  'ca nuc', 'ca trich', 'ca chim', 'ca bac ma', 'ca kho', 'phi le ca',
  'fish', 'salmon', 'tuna', 'mackerel',
]);
const _tom = RecipeIngredient('Tôm',
    keywords: ['tom', 'tom su', 'tom the', 'shrimp', 'prawn'],
    excludes: ['mi tom', 'mi goi', 'banh phong tom']);
const _muc = RecipeIngredient('Mực', keywords: ['muc', 'squid']);
const _dauPhu = RecipeIngredient('Đậu phụ',
    keywords: ['dau phu', 'dau hu', 'tau hu', 'tofu']);
const _com = RecipeIngredient('Cơm / gạo',
    keywords: ['gao', 'com', 'com nguoi', 'rice']);
const _mi = RecipeIngredient('Mì',
    keywords: [
      'mi', 'mi goi', 'mi trung', 'mi tom', 'my goi', 'my trung', 'my tom',
      'noodle', 'noodles', 'pasta', 'spaghetti',
    ],
    excludes: ['banh mi']);
const _banhMi = RecipeIngredient('Bánh mì',
    keywords: ['banh mi', 'bread', 'banh sandwich', 'sandwich']);
const _xucXich = RecipeIngredient('Xúc xích / lạp xưởng',
    keywords: ['xuc xich', 'lap xuong', 'sausage', 'giam bong', 'ham']);
const _caRot = RecipeIngredient('Cà rốt', keywords: ['ca rot', 'carrot']);
const _khoaiTay =
    RecipeIngredient('Khoai tây', keywords: ['khoai tay', 'potato']);
const _dauHaLan = RecipeIngredient('Đậu Hà Lan',
    keywords: ['dau ha lan', 'peas', 'bap ngot', 'ngo ngot', 'corn']);
const _rauCai = RecipeIngredient('Rau cải', keywords: [
  'cai ngot', 'cai thia', 'cai be xanh', 'rau cai', 'cai chip', 'bok choy',
  'cai xanh',
]);
const _rauMuong = RecipeIngredient('Rau muống', keywords: ['rau muong']);
const _rauNgot = RecipeIngredient('Rau ngót', keywords: ['rau ngot']);
const _xaLach = RecipeIngredient('Xà lách',
    keywords: ['xa lach', 'rau xa lach', 'lettuce', 'salad']);
const _duaLeo = RecipeIngredient('Dưa leo',
    keywords: ['dua leo', 'dua chuot', 'cucumber']);
const _biDo =
    RecipeIngredient('Bí đỏ', keywords: ['bi do', 'bi ngo', 'pumpkin']);
const _bapCai = RecipeIngredient('Bắp cải', keywords: ['bap cai', 'cabbage']);
const _dauQue = RecipeIngredient('Đậu que',
    keywords: ['dau que', 'dau co ve', 'green beans', 'green bean']);
const _nam = RecipeIngredient('Nấm', keywords: [
  'nam', 'nam huong', 'nam kim cham', 'nam rom', 'nam dui ga', 'nam bao ngu',
  'nam meo', 'moc nhi', 'mushroom', 'mushrooms',
]);
const _otChuong = RecipeIngredient('Ớt chuông',
    keywords: ['ot chuong', 'bell pepper', 'capsicum']);
const _gung = RecipeIngredient('Gừng', keywords: ['gung', 'ginger']);
const _sa = RecipeIngredient('Sả',
    keywords: ['sa', 'cay sa', 'lemongrass'], excludes: ['sa te']);
const _dua = RecipeIngredient('Dứa',
    keywords: ['=dua', 'qua dua', 'trai dua', 'thom', 'khom', 'pineapple']);
const _giaDo = RecipeIngredient('Giá đỗ',
    keywords: ['=gia', 'gia do', 'gia dau', 'gia song', 'bean sprouts']);
const _dauBap = RecipeIngredient('Đậu bắp', keywords: ['dau bap', 'okra']);
const _chuoi = RecipeIngredient('Chuối', keywords: ['chuoi', 'banana']);
const _sua = RecipeIngredient('Sữa',
    keywords: ['sua', 'sua tuoi', 'sua dac', 'sua hop', 'milk'],
    excludes: ['sua chua', 'yogurt']);
const _suaChua = RecipeIngredient('Sữa chua',
    keywords: ['sua chua', 'yogurt', 'yoghurt', 'yaourt']);
const _bo = RecipeIngredient('Quả bơ',
    keywords: ['qua bo', 'trai bo', 'bo sap', 'bo 034', 'avocado']);
const _traiCay = RecipeIngredient('Trái cây bất kỳ',
    keywords: [], categories: {FoodCategory.fruit});
const _phoMai =
    RecipeIngredient('Phô mai', keywords: ['pho mai', 'pho mat', 'cheese']);
const _pate = RecipeIngredient('Pate', keywords: ['pate', 'pa te']);
const _bi = RecipeIngredient('Bí xanh / bầu',
    keywords: ['bi xanh', 'bi dao', 'bau', 'qua bau', 'zucchini']);
const _caTim = RecipeIngredient('Cà tím', keywords: ['ca tim', 'eggplant']);

const _giaViCoBan = ['Dầu ăn', 'Muối', 'Nước mắm', 'Đường', 'Tiêu'];

// ---------------------------------------------------------------------------

final List<Recipe> kRecipes = [
  Recipe(
    id: 'trung_chien_ca_chua',
    name: 'Trứng xào cà chua',
    emoji: '🍳',
    minutes: 15,
    ingredients: [_trung, _caChua, _hanhLa.asOptional()],
    pantry: _giaViCoBan,
    steps: [
      'Cà chua bổ múi cau, trứng đánh tan với chút nước mắm.',
      'Phi thơm hành, xào cà chua đến khi mềm, ra nước.',
      'Đổ trứng vào, đảo nhẹ đến khi trứng vừa chín, rắc hành lá.',
    ],
  ),
  Recipe(
    id: 'canh_ca_chua_trung',
    name: 'Canh cà chua trứng',
    emoji: '🍲',
    minutes: 15,
    ingredients: [_caChua, _trung, _hanhLa.asOptional()],
    pantry: _giaViCoBan,
    steps: [
      'Xào sơ cà chua cho mềm, thêm nước, đun sôi.',
      'Nêm nếm vừa ăn, đổ trứng đã đánh tan thành sợi.',
      'Tắt bếp, thêm hành lá.',
    ],
  ),
  Recipe(
    id: 'thit_kho_trung',
    name: 'Thịt kho trứng',
    emoji: '🥘',
    minutes: 60,
    ingredients: [_thitHeo, _trung],
    pantry: [..._giaViCoBan, 'Nước dừa (nếu có)'],
    steps: [
      'Luộc trứng, bóc vỏ. Thịt cắt miếng, ướp nước mắm, đường, tiêu 15 phút.',
      'Thắng đường làm nước màu, cho thịt vào đảo săn.',
      'Thêm nước (hoặc nước dừa) và trứng, kho lửa nhỏ 40 phút.',
    ],
  ),
  Recipe(
    id: 'rau_muong_xao_toi',
    name: 'Rau muống xào tỏi',
    emoji: '🥬',
    minutes: 10,
    ingredients: [_rauMuong],
    pantry: [..._giaViCoBan, 'Tỏi'],
    steps: [
      'Nhặt rau, rửa sạch, chần sơ qua nước sôi.',
      'Phi tỏi thật thơm, cho rau vào xào lửa lớn, nêm nước mắm.',
    ],
  ),
  Recipe(
    id: 'bo_xao_hanh_tay',
    name: 'Bò xào hành tây',
    emoji: '🥩',
    minutes: 20,
    ingredients: [_thitBo, _hanhTay, _otChuong.asOptional(), _caChua.asOptional()],
    pantry: [..._giaViCoBan, 'Tỏi', 'Dầu hào'],
    steps: [
      'Bò thái mỏng, ướp tỏi, dầu hào, tiêu, chút dầu ăn 10 phút.',
      'Xào bò lửa thật lớn đến tái, trút ra đĩa.',
      'Xào hành tây (và ớt chuông) vừa chín tới, cho bò vào đảo nhanh.',
    ],
  ),
  Recipe(
    id: 'ga_kho_gung',
    name: 'Gà kho gừng',
    emoji: '🍗',
    minutes: 35,
    ingredients: [_thitGa, _gung],
    pantry: _giaViCoBan,
    steps: [
      'Gà chặt miếng, ướp nước mắm, đường, gừng thái sợi 15 phút.',
      'Phi gừng, cho gà vào đảo săn, thêm ít nước, kho lửa nhỏ đến khi sệt.',
    ],
  ),
  Recipe(
    id: 'ga_xao_sa_ot',
    name: 'Gà xào sả ớt',
    emoji: '🌶️',
    minutes: 30,
    ingredients: [_thitGa, _sa],
    pantry: [..._giaViCoBan, 'Ớt'],
    steps: [
      'Sả băm nhỏ, gà ướp với một nửa sả, nước mắm, đường.',
      'Phi phần sả còn lại vàng thơm, cho gà vào xào đến khi săn và chín.',
    ],
  ),
  Recipe(
    id: 'canh_bi_do_thit_bam',
    name: 'Canh bí đỏ thịt bằm',
    emoji: '🎃',
    minutes: 25,
    ingredients: [_biDo, _thitHeo, _hanhLa.asOptional()],
    pantry: _giaViCoBan,
    steps: [
      'Xào sơ thịt bằm, thêm nước đun sôi.',
      'Cho bí đỏ cắt miếng vào nấu mềm, nêm vừa ăn, rắc hành.',
    ],
  ),
  Recipe(
    id: 'dau_phu_sot_ca_chua',
    name: 'Đậu phụ sốt cà chua',
    emoji: '🧈',
    minutes: 20,
    ingredients: [_dauPhu, _caChua, _hanhLa.asOptional(), _thitHeo.asOptional()],
    pantry: _giaViCoBan,
    steps: [
      'Đậu cắt miếng, chiên vàng.',
      'Xào cà chua nhừ thành sốt (thêm thịt bằm nếu có), nêm nếm.',
      'Cho đậu vào rim 5 phút cho thấm, rắc hành lá.',
    ],
  ),
  Recipe(
    id: 'ca_kho_to',
    name: 'Cá kho',
    emoji: '🐟',
    minutes: 45,
    ingredients: [_ca, _gung.asOptional()],
    pantry: [..._giaViCoBan, 'Ớt'],
    steps: [
      'Cá làm sạch, ướp nước mắm, đường, tiêu, nước màu 20 phút.',
      'Kho lửa nhỏ với ít nước đến khi nước sệt lại.',
    ],
  ),
  Recipe(
    id: 'canh_chua_ca',
    name: 'Canh chua cá',
    emoji: '🥣',
    minutes: 30,
    ingredients: [
      _ca,
      _caChua,
      _dua.asOptional(),
      _giaDo.asOptional(),
      _dauBap.asOptional(),
    ],
    pantry: [..._giaViCoBan, 'Me chua'],
    steps: [
      'Nấu nước me, lọc lấy nước chua, đun sôi.',
      'Cho cá vào nấu chín, thêm cà chua, dứa, đậu bắp.',
      'Nêm chua ngọt vừa ăn, cuối cùng cho giá và rau thơm.',
    ],
  ),
  Recipe(
    id: 'tom_rang_thit',
    name: 'Tôm rang thịt ba chỉ',
    emoji: '🦐',
    minutes: 25,
    ingredients: [_tom, _thitHeo, _hanhLa.asOptional()],
    pantry: _giaViCoBan,
    steps: [
      'Thịt thái mỏng, rang cho ra mỡ.',
      'Cho tôm vào rang cùng, nêm nước mắm, đường, đảo đến khi sệt.',
    ],
  ),
  Recipe(
    id: 'muc_xao',
    name: 'Mực xào thập cẩm',
    emoji: '🦑',
    minutes: 20,
    ingredients: [_muc, _hanhTay, _otChuong.asOptional(), _caRot.asOptional()],
    pantry: [..._giaViCoBan, 'Tỏi'],
    steps: [
      'Mực khía vảy rồng, chần sơ.',
      'Xào rau củ vừa chín, cho mực vào xào nhanh lửa lớn, nêm nếm.',
    ],
  ),
  Recipe(
    id: 'com_chien',
    name: 'Cơm chiên trứng',
    emoji: '🍚',
    minutes: 15,
    ingredients: [
      _com,
      _trung,
      _xucXich.asOptional(),
      _caRot.asOptional(),
      _dauHaLan.asOptional(),
      _hanhLa.asOptional(),
    ],
    pantry: [..._giaViCoBan, 'Tỏi'],
    steps: [
      'Phi tỏi, xào xúc xích và rau củ thái hạt lựu.',
      'Cho cơm nguội vào đảo tơi, đẩy sang một bên, đập trứng vào đảo đều.',
      'Nêm nước mắm, tiêu, rắc hành lá.',
    ],
  ),
  Recipe(
    id: 'mi_xao_bo',
    name: 'Mì xào bò rau cải',
    emoji: '🍜',
    minutes: 20,
    ingredients: [_mi, _thitBo, _rauCai, _caRot.asOptional()],
    pantry: [..._giaViCoBan, 'Dầu hào'],
    steps: [
      'Trụng mì, để ráo. Bò ướp dầu hào, tỏi.',
      'Xào bò tái, trút ra. Xào rau cải và cà rốt.',
      'Cho mì, bò vào đảo đều, nêm nếm.',
    ],
  ),
  Recipe(
    id: 'salad',
    name: 'Salad rau trộn',
    emoji: '🥗',
    minutes: 10,
    ingredients: [_xaLach, _caChua, _duaLeo.asOptional(), _trung.asOptional()],
    pantry: ['Dầu ô liu / mayonnaise', 'Giấm', 'Muối', 'Đường'],
    steps: [
      'Rửa sạch rau, để ráo, cắt vừa ăn.',
      'Pha sốt giấm đường dầu (hoặc mayonnaise), trộn đều trước khi ăn.',
    ],
  ),
  Recipe(
    id: 'sinh_to_chuoi',
    name: 'Sinh tố chuối sữa',
    emoji: '🍌',
    minutes: 5,
    ingredients: [_chuoi, _sua],
    pantry: ['Đá'],
    steps: ['Cho chuối, sữa, đá vào máy xay, xay nhuyễn.'],
  ),
  Recipe(
    id: 'sinh_to_bo',
    name: 'Sinh tố bơ',
    emoji: '🥑',
    minutes: 5,
    ingredients: [_bo, _sua],
    pantry: ['Đá', 'Đường'],
    steps: ['Xay bơ với sữa (sữa đặc hoặc sữa tươi) và đá.'],
  ),
  Recipe(
    id: 'sua_chua_trai_cay',
    name: 'Sữa chua trái cây',
    emoji: '🍓',
    minutes: 5,
    ingredients: [_suaChua, _traiCay],
    steps: ['Cắt trái cây thành miếng nhỏ, trộn với sữa chua, để lạnh.'],
  ),
  Recipe(
    id: 'canh_suon_khoai',
    name: 'Canh sườn khoai tây cà rốt',
    emoji: '🥔',
    minutes: 50,
    ingredients: [_suon, _khoaiTay, _caRot.asOptional(), _hanhLa.asOptional()],
    pantry: _giaViCoBan,
    steps: [
      'Sườn chần sơ, hầm 30 phút lấy nước ngọt.',
      'Cho khoai tây, cà rốt vào nấu mềm, nêm vừa ăn.',
    ],
  ),
  Recipe(
    id: 'khoai_tay_xao_bo',
    name: 'Khoai tây xào bò',
    emoji: '🍟',
    minutes: 25,
    ingredients: [_khoaiTay, _thitBo, _hanhTay.asOptional()],
    pantry: [..._giaViCoBan, 'Tỏi'],
    steps: [
      'Khoai tây thái que, chiên sơ vàng.',
      'Xào bò tái, cho khoai và hành tây vào đảo đều, nêm nếm.',
    ],
  ),
  Recipe(
    id: 'banh_mi_op_la',
    name: 'Bánh mì ốp la',
    emoji: '🥖',
    minutes: 10,
    ingredients: [
      _banhMi,
      _trung,
      _pate.asOptional(),
      _duaLeo.asOptional(),
      _xucXich.asOptional(),
    ],
    pantry: ['Dầu ăn', 'Xì dầu', 'Tiêu'],
    steps: [
      'Ốp la trứng lòng đào, rưới xì dầu, rắc tiêu.',
      'Ăn kèm bánh mì nướng giòn, pate, dưa leo.',
    ],
  ),
  Recipe(
    id: 'sandwich_pho_mai',
    name: 'Sandwich phô mai nướng',
    emoji: '🧀',
    minutes: 10,
    ingredients: [_banhMi, _phoMai, _xucXich.asOptional(), _caChua.asOptional()],
    pantry: ['Bơ thực vật'],
    steps: [
      'Kẹp phô mai (và giăm bông, cà chua) giữa 2 lát bánh mì.',
      'Áp chảo với chút bơ đến khi vàng 2 mặt và phô mai chảy.',
    ],
  ),
  Recipe(
    id: 'rau_cai_xao_nam',
    name: 'Cải xào nấm',
    emoji: '🍄',
    minutes: 15,
    ingredients: [_rauCai, _nam],
    pantry: [..._giaViCoBan, 'Tỏi', 'Dầu hào'],
    steps: [
      'Phi tỏi, xào nấm cho ra nước, thêm dầu hào.',
      'Cho cải vào xào lửa lớn đến khi vừa chín.',
    ],
  ),
  Recipe(
    id: 'canh_rau_ngot',
    name: 'Canh rau ngót thịt bằm',
    emoji: '🌿',
    minutes: 15,
    ingredients: [_rauNgot, _thitHeo],
    pantry: _giaViCoBan,
    steps: [
      'Rau ngót vò sơ. Xào thịt bằm, thêm nước đun sôi.',
      'Cho rau vào nấu 3 phút, nêm vừa ăn.',
    ],
  ),
  Recipe(
    id: 'bap_cai_xao_ca_chua',
    name: 'Bắp cải xào cà chua',
    emoji: '🥬',
    minutes: 15,
    ingredients: [_bapCai, _caChua.asOptional()],
    pantry: [..._giaViCoBan, 'Tỏi'],
    steps: [
      'Bắp cải thái miếng, cà chua bổ cau.',
      'Phi tỏi, xào cà chua rồi cho bắp cải vào đảo lửa lớn, nêm nếm.',
    ],
  ),
  Recipe(
    id: 'dau_que_xao_bo',
    name: 'Đậu que xào thịt bò',
    emoji: '🫛',
    minutes: 20,
    ingredients: [_dauQue, _thitBo, _caRot.asOptional()],
    pantry: [..._giaViCoBan, 'Tỏi'],
    steps: [
      'Đậu que tước xơ, cắt khúc, chần sơ.',
      'Xào bò tái, trút ra; xào đậu que chín tới rồi trộn bò vào.',
    ],
  ),
  Recipe(
    id: 'trung_hap_thit',
    name: 'Trứng hấp thịt',
    emoji: '🥚',
    minutes: 30,
    ingredients: [_trung, _thitHeo, _nam.asOptional(), _hanhLa.asOptional()],
    pantry: _giaViCoBan,
    steps: [
      'Trộn thịt bằm, trứng, nấm băm, hành lá, nêm nước mắm, tiêu.',
      'Hấp cách thủy 20–25 phút đến khi chín.',
    ],
  ),
  Recipe(
    id: 'chao_thit_bam',
    name: 'Cháo thịt bằm',
    emoji: '🥣',
    minutes: 40,
    ingredients: [_com, _thitHeo, _hanhLa.asOptional(), _gung.asOptional()],
    pantry: _giaViCoBan,
    steps: [
      'Gạo rang sơ rồi nấu với nhiều nước đến khi nhừ (hoặc dùng cơm nguội).',
      'Cho thịt bằm đã ướp vào khuấy tơi, nêm nếm, rắc hành, tiêu.',
    ],
  ),
  Recipe(
    id: 'canh_bi_xanh_tom',
    name: 'Canh bí nấu tôm',
    emoji: '🍵',
    minutes: 20,
    ingredients: [_bi, _tom, _hanhLa.asOptional()],
    pantry: _giaViCoBan,
    steps: [
      'Tôm bóc vỏ, băm sơ, xào thơm, thêm nước đun sôi.',
      'Cho bí vào nấu mềm, nêm vừa ăn.',
    ],
  ),
  Recipe(
    id: 'ca_tim_xao_thit',
    name: 'Cà tím xào thịt bằm',
    emoji: '🍆',
    minutes: 20,
    ingredients: [_caTim, _thitHeo.asOptional(), _hanhLa.asOptional()],
    pantry: [..._giaViCoBan, 'Tỏi'],
    steps: [
      'Cà tím cắt khúc, ngâm nước muối, chiên sơ.',
      'Xào thịt bằm, cho cà tím vào, nêm nước mắm, đường, rắc hành.',
    ],
  ),
];
