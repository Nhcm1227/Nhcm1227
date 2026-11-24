// Thanh toán qua bên thứ ba.
//  - Quét mã QR: payOS (VietQR, chuyển khoản từ mọi app ngân hàng). Nếu chưa có payOS thì dùng VNPAY-QR.
//  - Thẻ Visa / Mastercard: VNPAY (cổng thẻ quốc tế).
import crypto from 'node:crypto';
import { updateDoc } from './store.js';
import { userPath } from './auth.js';
import { addMonths } from './plan.js';

export const orderPath = (code) => `orders/${code}.json`;

export function providers() {
  return {
    payos: !!(process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY),
    vnpay: !!(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET),
  };
}
export function methods() {
  const p = providers();
  return { qr: p.payos || p.vnpay, card: p.vnpay };
}

let payosClient;
export async function payos() {
  if (!payosClient) {
    const { PayOS } = await import('@payos/node');
    payosClient = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
      logLevel: 'off',
    });
  }
  return payosClient;
}

// Mã đơn là số nguyên duy nhất (payOS yêu cầu kiểu số).
export function newOrderCode() {
  return Number(String(Date.now()).slice(-10) + String(crypto.randomInt(100, 1000)));
}

// ---------- VNPAY ----------
const vnpUrl = () => process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
function vnpQuery(params) {
  return Object.keys(params).sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)
    .join('&');
}
export function vnpSign(params) {
  return crypto.createHmac('sha512', process.env.VNPAY_HASH_SECRET).update(Buffer.from(vnpQuery(params), 'utf-8')).digest('hex');
}
function vnDate(d) {
  const t = new Date(d.getTime() + 7 * 3600e3);
  const p = (n) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}${p(t.getUTCHours())}${p(t.getUTCMinutes())}${p(t.getUTCSeconds())}`;
}
export function vnpayCheckoutUrl({ orderCode, amount, info, returnUrl, ip, bankCode }) {
  const now = new Date();
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: process.env.VNPAY_TMN_CODE,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: String(orderCode),
    vnp_OrderInfo: info,
    vnp_OrderType: 'other',
    vnp_Amount: String(amount * 100),
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ip.replace(/^::ffff:/, ''),
    vnp_CreateDate: vnDate(now),
    vnp_ExpireDate: vnDate(new Date(now.getTime() + 15 * 60e3)),
  };
  if (bankCode) params.vnp_BankCode = bankCode;
  return `${vnpUrl()}?${vnpQuery(params)}&vnp_SecureHash=${vnpSign(params)}`;
}
export function vnpVerify(q) {
  const given = String(q.vnp_SecureHash || '').toLowerCase();
  if (!given) return false;
  const params = {};
  for (const k of Object.keys(q)) {
    if (k.startsWith('vnp_') && k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType') params[k] = q[k];
  }
  const want = vnpSign(params);
  return want.length === given.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(given));
}

// ---------- Ghi nhận thanh toán (gọi nhiều lần vẫn chỉ cộng một lần) ----------
export async function markPaid(orderCode, { amount, ref } = {}) {
  let status = 'ok';
  const order = await updateDoc(orderPath(orderCode), (o) => {
    if (!o) return undefined;
    if (o.status === 'PAID') { status = 'already'; return undefined; }
    if (amount != null && Number(amount) < o.amount) { status = 'amount'; return undefined; }
    o.status = 'PAID';
    o.paidAt = Date.now();
    o.ref = ref ? String(ref).slice(0, 80) : '';
    return o;
  });
  if (!order) return { status: 'notfound' };
  if (order.status === 'PAID') await credit(order);
  return { status, order };
}

async function credit(order) {
  await updateDoc(userPath(order.uid), (u) => {
    if (!u) return undefined;
    u.credited = u.credited || [];
    if (u.credited.includes(order.orderCode)) return undefined;
    u.credited.push(order.orderCode);
    if (u.credited.length > 300) u.credited = u.credited.slice(-300);
    addMonths(u, order.months);
    return u;
  });
  if (!order.credited) {
    await updateDoc(orderPath(order.orderCode), (o) => {
      if (!o || o.credited) return undefined;
      o.credited = true;
      return o;
    });
  }
}

export async function markStatus(orderCode, status) {
  return updateDoc(orderPath(orderCode), (o) => {
    if (!o || o.status === 'PAID' || o.status === status) return undefined;
    o.status = status;
    o.updatedAt = Date.now();
    return o;
  });
}
