import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/food_item.dart';
import '../services/expiry_date_parser.dart';
import '../services/scan_service.dart';
import '../state/inventory_store.dart';
import '../widgets/expiry_style.dart';

class AddItemScreen extends StatefulWidget {
  const AddItemScreen({super.key, this.existing});

  final FoodItem? existing;

  @override
  State<AddItemScreen> createState() => _AddItemScreenState();
}

class _AddItemScreenState extends State<AddItemScreen> {
  final _picker = ImagePicker();
  final _scan = ScanService();
  final _dateFmt = DateFormat('EEEE, dd/MM/yyyy', 'vi');

  late final TextEditingController _name;
  late final TextEditingController _qty;
  late final TextEditingController _unit;
  late final TextEditingController _note;

  FoodCategory _category = FoodCategory.other;
  DateTime? _expiry;
  String? _newImagePath; // ảnh mới chụp (đường dẫn tạm)
  bool _removeImage = false;

  bool _busy = false;
  String? _busyText;
  List<String> _suggestions = [];
  ParsedExpiry? _detected;
  String? _ocrText;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _name = TextEditingController(text: e?.name ?? '');
    _qty = TextEditingController(text: e == null ? '1' : formatQuantity(e.quantity));
    _unit = TextEditingController(text: e?.unit ?? 'cái');
    _note = TextEditingController(text: e?.note ?? '');
    if (e != null) {
      _category = e.category;
      _expiry = e.expiryDate;
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _qty.dispose();
    _unit.dispose();
    _note.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Chụp ảnh

  Future<String?> _pick(ImageSource source) async {
    try {
      final file = await _picker.pickImage(
        source: source,
        maxWidth: 2000,
        imageQuality: 85,
      );
      return file?.path;
    } catch (e) {
      _toast('Không mở được ${source == ImageSource.camera ? 'camera' : 'thư viện ảnh'}: $e');
      return null;
    }
  }

  Future<ImageSource?> _askSource() => showModalBottomSheet<ImageSource>(
        context: context,
        showDragHandle: true,
        builder: (ctx) => SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.photo_camera),
                title: const Text('Chụp ảnh'),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Chọn từ thư viện'),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
            ],
          ),
        ),
      );

  Future<void> _captureProduct() async {
    final source = await _askSource();
    if (source == null) return;
    final path = await _pick(source);
    if (path == null) return;
    setState(() {
      _newImagePath = path;
      _removeImage = false;
      _busy = true;
      _busyText = 'Đang nhận diện sản phẩm...';
    });
    try {
      final r = await _scan.scanProduct(path);
      if (!mounted) return;
      setState(() {
        _suggestions = r.nameSuggestions;
        if (r.category != null && !_isEdit) _category = r.category!;
        if (_name.text.trim().isEmpty && r.nameSuggestions.isNotEmpty) {
          _name.text = r.nameSuggestions.first;
        }
        if (_expiry == null && r.expiry != null) {
          _expiry = r.expiry!.date;
          _detected = r.expiry;
        }
      });
    } catch (e) {
      _toast('Không nhận diện được ảnh: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _captureExpiry() async {
    final source = await _askSource();
    if (source == null) return;
    final path = await _pick(source);
    if (path == null) return;
    setState(() {
      _busy = true;
      _busyText = 'Đang đọc hạn sử dụng...';
    });
    try {
      final r = await _scan.scanExpiry(path);
      if (!mounted) return;
      setState(() {
        _ocrText = r.rawText;
        _detected = r.expiry;
        if (r.expiry != null) _expiry = r.expiry!.date;
      });
      if (r.expiry == null) {
        _toast('Không tìm thấy ngày hết hạn. Hãy chụp gần hơn hoặc chọn ngày thủ công.');
      }
    } catch (e) {
      _toast('Lỗi khi đọc chữ: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  // ---------------------------------------------------------------------------

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _expiry ?? now.add(Duration(days: _category.defaultShelfDays)),
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 10),
      helpText: 'Chọn hạn sử dụng',
    );
    if (picked != null) {
      setState(() {
        _expiry = picked;
        _detected = null;
      });
    }
  }

  void _setDaysFromToday(int days) {
    final n = DateTime.now();
    setState(() {
      _expiry = DateTime(n.year, n.month, n.day + days);
      _detected = null;
    });
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    if (name.isEmpty) {
      _toast('Hãy nhập tên món đồ');
      return;
    }
    if (_expiry == null) {
      _toast('Hãy chọn hạn sử dụng');
      return;
    }
    final qty = double.tryParse(_qty.text.replaceAll(',', '.')) ?? 1;
    final store = context.read<InventoryStore>();
    setState(() {
      _busy = true;
      _busyText = 'Đang lưu...';
    });

    String? imageName = widget.existing?.imageFileName;
    if (_removeImage) imageName = null;
    if (_newImagePath != null) {
      imageName = await store.storage.saveImage(_newImagePath!);
    }

    final unit = _unit.text.trim().isEmpty ? 'cái' : _unit.text.trim();
    final note = _note.text.trim();
    final item = widget.existing == null
        ? FoodItem.create(
            name: name,
            category: _category,
            expiryDate: _expiry!,
            quantity: qty,
            unit: unit,
            imageFileName: imageName,
            note: note,
          )
        : widget.existing!.copyWith(
            name: name,
            category: _category,
            expiryDate: _expiry,
            quantity: qty,
            unit: unit,
            imageFileName: imageName,
            clearImage: imageName == null,
            note: note,
          );

    await store.addOrUpdate(item);
    if (mounted) Navigator.pop(context);
  }

  void _toast(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final store = context.read<InventoryStore>();
    final existingFile = _removeImage || widget.existing == null
        ? null
        : store.imageFor(widget.existing!);
    final File? previewFile =
        _newImagePath != null ? File(_newImagePath!) : existingFile;

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Sửa món đồ' : 'Thêm món đồ'),
        actions: [
          TextButton(onPressed: _busy ? null : _save, child: const Text('Lưu')),
        ],
      ),
      body: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _photoSection(previewFile),
              const SizedBox(height: 16),
              TextField(
                controller: _name,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Tên món đồ',
                  hintText: 'VD: Sữa tươi Vinamilk, Thịt bò, Trứng gà',
                  border: OutlineInputBorder(),
                ),
              ),
              if (_suggestions.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final s in _suggestions)
                      ActionChip(
                        label: Text(s),
                        onPressed: () => setState(() => _name.text = s),
                      ),
                  ],
                ),
              ],
              const SizedBox(height: 16),
              Text('Nhóm', style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final c in FoodCategory.values)
                    ChoiceChip(
                      label: Text('${c.emoji} ${c.label}'),
                      selected: _category == c,
                      onSelected: (_) => setState(() => _category = c),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              _expirySection(),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _qty,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Số lượng',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _unit,
                      decoration: const InputDecoration(
                        labelText: 'Đơn vị',
                        hintText: 'cái, hộp, kg, quả...',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _note,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Ghi chú (tuỳ chọn)',
                  hintText: 'VD: ngăn đá, đã mở nắp...',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: _busy ? null : _save,
                icon: const Icon(Icons.check),
                label: Text(_isEdit ? 'Lưu thay đổi' : 'Thêm vào tủ lạnh'),
              ),
              const SizedBox(height: 32),
            ],
          ),
          if (_busy)
            Container(
              color: Colors.black26,
              alignment: Alignment.center,
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(),
                      const SizedBox(height: 16),
                      Text(_busyText ?? 'Đang xử lý...'),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _photoSection(File? file) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      elevation: 0,
      color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            GestureDetector(
              onTap: _busy ? null : _captureProduct,
              child: file != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.file(file,
                          width: 96, height: 96, fit: BoxFit.cover),
                    )
                  : Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        color: scheme.surface,
                      ),
                      child: Icon(Icons.add_a_photo,
                          size: 36, color: scheme.primary),
                    ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  OutlinedButton.icon(
                    onPressed: _busy ? null : _captureProduct,
                    icon: const Icon(Icons.photo_camera),
                    label: const Text('Chụp sản phẩm'),
                  ),
                  const SizedBox(height: 8),
                  FilledButton.tonalIcon(
                    onPressed: _busy ? null : _captureExpiry,
                    icon: const Icon(Icons.document_scanner),
                    label: const Text('Chụp hạn sử dụng'),
                  ),
                  if (file != null)
                    TextButton(
                      onPressed: () => setState(() {
                        _newImagePath = null;
                        _removeImage = true;
                      }),
                      child: const Text('Xoá ảnh'),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _expirySection() {
    final theme = Theme.of(context);
    final preview = _expiry == null
        ? null
        : FoodItem(
            id: '',
            name: '',
            category: _category,
            expiryDate: _expiry!,
            addedAt: DateTime.now(),
            notificationId: 0,
          );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Hạn sử dụng', style: theme.textTheme.titleSmall),
        const SizedBox(height: 8),
        InkWell(
          onTap: _pickDate,
          borderRadius: BorderRadius.circular(8),
          child: InputDecorator(
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              suffixIcon: Icon(Icons.calendar_month),
            ),
            child: Text(
              _expiry == null
                  ? 'Chạm để chọn ngày (hoặc chụp hạn sử dụng)'
                  : _dateFmt.format(_expiry!),
              style: _expiry == null
                  ? theme.textTheme.bodyLarge
                      ?.copyWith(color: theme.hintColor)
                  : theme.textTheme.bodyLarge,
            ),
          ),
        ),
        if (preview != null)
          Padding(
            padding: const EdgeInsets.only(top: 6, left: 4),
            child: Text(
              describeDaysLeft(preview.daysLeft()),
              style: TextStyle(
                  color: expiryColor(context, preview.status()),
                  fontWeight: FontWeight.w600),
            ),
          ),
        if (_detected != null)
          Padding(
            padding: const EdgeInsets.only(top: 4, left: 4),
            child: Text(
              '📷 Đọc từ ảnh: ${_detected!.reason} '
              '(độ tin cậy ${(_detected!.confidence * 100).round()}%). '
              'Hãy kiểm tra lại.',
              style: theme.textTheme.bodySmall,
            ),
          ),
        if (_ocrText != null && _ocrText!.trim().isNotEmpty)
          ExpansionTile(
            tilePadding: EdgeInsets.zero,
            title: Text('Chữ đọc được từ ảnh',
                style: theme.textTheme.bodySmall),
            children: [
              SelectableText(_ocrText!, style: theme.textTheme.bodySmall),
            ],
          ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            ActionChip(
                label: const Text('+3 ngày'),
                onPressed: () => _setDaysFromToday(3)),
            ActionChip(
                label: const Text('+1 tuần'),
                onPressed: () => _setDaysFromToday(7)),
            ActionChip(
                label: const Text('+2 tuần'),
                onPressed: () => _setDaysFromToday(14)),
            ActionChip(
                label: const Text('+1 tháng'),
                onPressed: () => _setDaysFromToday(30)),
            ActionChip(
              avatar: Text(_category.emoji),
              label: Text(
                  'Thường để được ${_category.defaultShelfDays} ngày'),
              onPressed: () => _setDaysFromToday(_category.defaultShelfDays),
            ),
          ],
        ),
      ],
    );
  }
}
