// Kiểm tra toàn bộ luồng API trên máy: đăng ký, đăng nhập, dữ liệu, thanh toán (giả lập cổng), quản trị.
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const PORT = 3999, BASE = `http://localhost:${PORT}`;
const env = {
  ...process.env, PORT: String(PORT),
  DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'dhdn-')),
  SESSION_SECRET: 'test-secret-test-secret-test-secret-123',
  ADMIN_CLAIM_CODE: 'MA-QUAN-TRI-THU',
  VNPAY_TMN_CODE: 'TESTTMN1', VNPAY_HASH_SECRET: 'VNPAYTESTSECRET',
  PAYOS_CLIENT_ID: 'x', PAYOS_API_KEY: 'x', PAYOS_CHECKSUM_KEY: 'payos-test-checksum',
};
delete env.BLOB_READ_WRITE_TOKEN;
const srv = spawn(process.execPath, ['dev-server.js'], { env, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((r) => srv.stdout.once('data', r));

function client() {
  let cookie = '';
  return async (p, { method = 'GET', body, headers = {} } = {}) => {
    const h = { ...headers };
    if (cookie) h.cookie = cookie;
    if (body !== undefined) h['content-type'] ??= 'application/json';
    const r = await fetch(BASE + p, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    let json = null;
    try { json = await r.json(); } catch {}
    return { status: r.status, json, location: r.headers.get('location') };
  };
}
const step = (name) => console.log('✓', name);
const vnpSign = (params) => crypto.createHmac('sha512', env.VNPAY_HASH_SECRET).update(Object.keys(params).sort().map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`).join('&')).digest('hex');

try {
  const a = client(), b = client();
  let r = await a('/api/me');
  assert.equal(r.json.user, null); step('khách chưa đăng nhập');

  r = await a('/api/auth/register', { method: 'POST', body: { email: 'Minh@Test.vn', password: 'matkhau123', name: 'Minh' } });
  assert.equal(r.status, 200); assert.equal(r.json.user.plan.kind, 'trial'); step('đăng ký được 3 ngày dùng thử');
  const trialDays = (r.json.user.trialEnds - Date.now()) / 864e5;
  assert.ok(trialDays > 2.99 && trialDays <= 3);

  r = await b('/api/auth/register', { method: 'POST', body: { email: 'minh@test.vn', password: 'matkhau123' } });
  assert.equal(r.status, 409); step('không cho trùng email (không phân biệt hoa thường)');

  r = await b('/api/auth/register', { method: 'POST', body: { email: 'ban@test.vn', password: 'ngan' } });
  assert.equal(r.status, 400); step('chặn mật khẩu ngắn');

  r = await a('/api/auth/register', { method: 'POST', body: { email: 'x@y.vn', password: '12345678' }, headers: { 'content-type': 'text/plain' } });
  assert.equal(r.status, 415);
  r = await a('/api/data', { method: 'PUT', body: { cfg: {} }, headers: { origin: 'https://ke-xau.example' } });
  assert.equal(r.status, 403); step('chặn yêu cầu gửi chéo trang');

  r = await a('/api/data', { method: 'PUT', body: { cfg: { birth: '2001-02-03' }, tasks: [{ id: 't1', t: 'Gọi mẹ' }], bought: [] } });
  assert.equal(r.status, 200);
  r = await a('/api/data');
  assert.equal(r.json.data.cfg.birth, '2001-02-03'); assert.equal(r.json.data.tasks[0].t, 'Gọi mẹ'); step('lưu và đọc dữ liệu người dùng');

  r = await b('/api/data');
  assert.equal(r.status, 401); step('chưa đăng nhập thì không đọc được dữ liệu');

  for (let i = 0; i < 5; i++) r = await b('/api/auth/login', { method: 'POST', body: { email: 'minh@test.vn', password: 'sai-mat-khau' } });
  r = await b('/api/auth/login', { method: 'POST', body: { email: 'minh@test.vn', password: 'matkhau123' } });
  assert.equal(r.status, 429); step('khóa 15 phút sau 5 lần sai mật khẩu');

  // ---- VNPAY: thẻ Visa / Mastercard ----
  r = await a('/api/pay/create', { method: 'POST', body: { months: 1, method: 'card' } });
  assert.equal(r.status, 200);
  const u = new URL(r.json.url);
  assert.equal(u.searchParams.get('vnp_BankCode'), 'INTCARD');
  assert.equal(u.searchParams.get('vnp_Amount'), '2400000');
  const sent = Object.fromEntries([...u.searchParams].filter(([k]) => k !== 'vnp_SecureHash'));
  assert.equal(vnpSign(sent), u.searchParams.get('vnp_SecureHash')); step('tạo link thanh toán thẻ VNPAY có chữ ký đúng');
  const code = r.json.orderCode;
  const ipn = { vnp_TmnCode: env.VNPAY_TMN_CODE, vnp_TxnRef: String(code), vnp_Amount: '2400000', vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: '14000001', vnp_OrderInfo: sent.vnp_OrderInfo, vnp_BankCode: 'VISA', vnp_PayDate: '20261124120000' };
  const qs = (o) => new URLSearchParams({ ...o, vnp_SecureHash: vnpSign(o) }).toString();
  r = await a('/api/pay/vnpay-ipn?' + new URLSearchParams({ ...ipn, vnp_SecureHash: 'abc' }));
  assert.equal(r.json.RspCode, '97'); step('IPN chữ ký sai bị từ chối');
  r = await a('/api/pay/vnpay-ipn?' + qs({ ...ipn, vnp_Amount: '100' }));
  assert.equal(r.json.RspCode, '04'); step('IPN sai số tiền bị từ chối');
  r = await a('/api/pay/vnpay-ipn?' + qs(ipn));
  assert.equal(r.json.RspCode, '00');
  r = await a('/api/pay/vnpay-ipn?' + qs(ipn));
  assert.equal(r.json.RspCode, '02'); step('IPN hợp lệ được ghi nhận đúng một lần');
  r = await a('/api/me');
  let paidDays = (r.json.user.paidUntil - Date.now()) / 864e5;
  assert.equal(r.json.user.plan.kind, 'paid'); assert.ok(paidDays > 29.9 && paidDays <= 30); step('tài khoản lên gói trả phí 30 ngày');
  r = await a('/api/pay/vnpay-return?' + qs(ipn));
  assert.equal(r.status, 302); assert.equal(r.location, `/?pay=return&order=${code}`);
  r = await a('/api/me');
  assert.ok(Math.abs((r.json.user.paidUntil - Date.now()) / 864e5 - paidDays) < 0.01); step('trang quay về không cộng thêm lần nữa');

  // ---- payOS: mã QR ----
  r = await a('/api/pay/create', { method: 'POST', body: { months: 3, method: 'qr' } });
  assert.equal(r.status, 502); step('payOS với khóa giả: báo lỗi rõ ràng, không treo');
  const orders = fs.readdirSync(path.join(env.DATA_DIR, 'orders')).map((f) => JSON.parse(fs.readFileSync(path.join(env.DATA_DIR, 'orders', f))));
  const qrOrder = orders.find((o) => o.provider === 'payos');
  const { PayOS } = await import('@payos/node');
  const po = new PayOS({ clientId: 'x', apiKey: 'x', checksumKey: env.PAYOS_CHECKSUM_KEY });
  const data = { orderCode: qrOrder.orderCode, amount: 72000, description: 'DHDN3T', accountNumber: '123', reference: 'FT123', transactionDateTime: '2026-11-24 12:00:00', currency: 'VND', paymentLinkId: 'abc', code: '00', desc: 'success', counterAccountBankId: '', counterAccountBankName: '', counterAccountName: '', counterAccountNumber: '', virtualAccountName: '', virtualAccountNumber: '' };
  const signature = await po.crypto.createSignatureFromObj(data, env.PAYOS_CHECKSUM_KEY);
  r = await a('/api/pay/payos-webhook', { method: 'POST', body: { code: '00', desc: 'success', success: true, data, signature: 'sai' } });
  assert.equal(r.status, 400); step('webhook payOS chữ ký sai bị từ chối');
  r = await a('/api/pay/payos-webhook', { method: 'POST', body: { code: '00', desc: 'success', success: true, data, signature } });
  assert.equal(r.status, 200); assert.equal(r.json.result, 'ok');
  r = await a('/api/pay/payos-webhook', { method: 'POST', body: { code: '00', desc: 'success', success: true, data, signature } });
  assert.equal(r.json.result, 'already');
  r = await a('/api/me');
  paidDays = (r.json.user.paidUntil - Date.now()) / 864e5;
  assert.ok(paidDays > 119.9 && paidDays <= 120); step('webhook payOS cộng 3 tháng đúng một lần');
  r = await a('/api/pay/payos-webhook', { method: 'POST', body: { code: '00', desc: 'success', success: true, data: { ...data, orderCode: 123 }, signature: await po.crypto.createSignatureFromObj({ ...data, orderCode: 123 }, env.PAYOS_CHECKSUM_KEY) } });
  assert.equal(r.status, 200); step('webhook thử của payOS (đơn 123) vẫn trả 200');

  // ---- Quản trị ----
  r = await a('/api/admin/overview');
  assert.equal(r.status, 403);
  r = await a('/api/admin/claim', { method: 'POST', body: { code: 'sai' } });
  assert.equal(r.status, 403);
  r = await a('/api/admin/claim', { method: 'POST', body: { code: 'MA-QUAN-TRI-THU' } });
  assert.equal(r.json.user.role, 'admin'); step('nhận quyền quản trị bằng mã');
  const c = client();
  await c('/api/auth/register', { method: 'POST', body: { email: 'khach@test.vn', password: 'matkhau456' } });
  r = await c('/api/admin/claim', { method: 'POST', body: { code: 'MA-QUAN-TRI-THU' } });
  assert.equal(r.status, 409); step('mã quản trị chỉ dùng được một lần');
  r = await a('/api/admin/overview');
  assert.equal(r.json.stats.users, 2); assert.equal(r.json.stats.revenue, 24000 + 72000); assert.equal(r.json.stats.paid, 1);
  const khach = r.json.users.find((x) => x.email === 'khach@test.vn'); step('trang tổng quan: số người dùng, doanh thu');
  r = await a('/api/admin/action', { method: 'POST', body: { uid: khach.id, action: 'grant', value: 2 } });
  assert.equal(r.json.user.plan.kind, 'paid');
  r = await a('/api/admin/action', { method: 'POST', body: { uid: khach.id, action: 'reset' } });
  assert.ok(r.json.tempPassword.length >= 10);
  const temp = r.json.tempPassword;
  r = await c('/api/me'); assert.equal(r.json.user, null); step('cấp tháng tay, đặt lại mật khẩu đăng xuất phiên cũ');
  r = await c('/api/auth/login', { method: 'POST', body: { email: 'khach@test.vn', password: temp } });
  assert.equal(r.status, 200);
  r = await a('/api/admin/action', { method: 'POST', body: { uid: khach.id, action: 'ban' } });
  r = await c('/api/me'); assert.equal(r.json.user, null);
  r = await c('/api/auth/login', { method: 'POST', body: { email: 'khach@test.vn', password: temp } });
  assert.equal(r.status, 403); step('khóa tài khoản: đá ra và không đăng nhập lại được');
  r = await c('/api/admin/overview'); assert.equal(r.status, 401);

  r = await a('/api/auth/logout', { method: 'POST' });
  r = await a('/api/me'); assert.equal(r.json.user, null); step('đăng xuất');
  console.log('\nTẤT CẢ ĐỀU ĐẠT');
} finally {
  srv.kill();
}
