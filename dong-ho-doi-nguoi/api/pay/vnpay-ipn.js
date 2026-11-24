// VNPAY gọi vào đây (IPN) để báo kết quả giao dịch. Luôn trả HTTP 200 với RspCode.
import { handle, allow, query, ok } from '../_lib/http.js';
import { getDoc } from '../_lib/store.js';
import { providers, vnpVerify, orderPath, markPaid, markStatus } from '../_lib/pay.js';

export default handle(async (req, res) => {
  allow(req, 'GET', 'POST');
  if (!providers().vnpay) return ok(res, { RspCode: '99', Message: 'Not configured' });
  const q = query(req);
  if (!vnpVerify(q)) return ok(res, { RspCode: '97', Message: 'Invalid signature' });
  const code = Number(q.vnp_TxnRef);
  const doc = await getDoc(orderPath(code));
  if (!doc) return ok(res, { RspCode: '01', Message: 'Order not found' });
  const order = doc.data;
  if (Number(q.vnp_Amount) / 100 !== order.amount) return ok(res, { RspCode: '04', Message: 'Invalid amount' });
  if (order.status === 'PAID' || order.status === 'FAILED_PAYMENT') return ok(res, { RspCode: '02', Message: 'Order already confirmed' });
  if (q.vnp_ResponseCode === '00' && q.vnp_TransactionStatus === '00') {
    await markPaid(code, { amount: order.amount, ref: q.vnp_TransactionNo });
  } else {
    await markStatus(code, 'FAILED_PAYMENT');
  }
  ok(res, { RspCode: '00', Message: 'Confirm Success' });
});
