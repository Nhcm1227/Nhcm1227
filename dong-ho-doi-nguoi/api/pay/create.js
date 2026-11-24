import { handle, allow, sameOrigin, readJson, ok, HttpError, originOf, clientIp } from '../_lib/http.js';
import { putDoc } from '../_lib/store.js';
import { requireUser } from '../_lib/auth.js';
import { PRICE, PACKS } from '../_lib/plan.js';
import { providers, payos, vnpayCheckoutUrl, newOrderCode, orderPath, markStatus } from '../_lib/pay.js';

export default handle(async (req, res) => {
  allow(req, 'POST');
  sameOrigin(req);
  const u = await requireUser(req);
  const b = await readJson(req);
  const months = Number(b.months);
  const method = b.method === 'card' ? 'card' : 'qr';
  if (!PACKS.includes(months)) throw new HttpError(400, 'Gói không hợp lệ.');

  const p = providers();
  const provider = method === 'card' ? (p.vnpay ? 'vnpay' : null) : (p.payos ? 'payos' : p.vnpay ? 'vnpay' : null);
  if (!provider) {
    throw new HttpError(503, method === 'card'
      ? 'Thanh toán bằng thẻ Visa / Mastercard chưa được bật. Hãy chọn quét mã QR hoặc thử lại sau.'
      : 'Thanh toán bằng mã QR chưa được bật. Thử lại sau.');
  }

  const orderCode = newOrderCode();
  const amount = PRICE * months;
  const origin = originOf(req);
  const order = {
    orderCode, uid: u.id, email: u.email, months, amount, method, provider,
    status: 'PENDING', createdAt: Date.now(), credited: false,
  };
  await putDoc(orderPath(orderCode), order, { create: true });

  let url;
  try {
    if (provider === 'payos') {
      const link = await (await payos()).paymentRequests.create({
        orderCode,
        amount,
        description: `DHDN${months}T`,
        items: [{ name: `Goi Nguoi Song ${months} thang`, quantity: 1, price: amount }],
        returnUrl: `${origin}/?pay=return&order=${orderCode}`,
        cancelUrl: `${origin}/?pay=cancel&order=${orderCode}`,
      });
      url = link.checkoutUrl;
    } else {
      url = vnpayCheckoutUrl({
        orderCode,
        amount,
        info: `Thanh toan goi Nguoi Song ${months} thang, don ${orderCode}`,
        returnUrl: `${origin}/api/pay/vnpay-return`,
        ip: clientIp(req),
        bankCode: method === 'card' ? 'INTCARD' : 'VNPAYQR',
      });
    }
  } catch (e) {
    console.error('create payment failed', e);
    await markStatus(orderCode, 'FAILED');
    throw new HttpError(502, 'Không tạo được phiên thanh toán. Thử lại sau ít phút.');
  }
  ok(res, { url, orderCode });
});
