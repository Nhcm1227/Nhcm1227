// Người dùng được VNPAY đưa quay lại đây sau khi thanh toán.
import { handle, allow, query, redirect } from '../_lib/http.js';
import { getDoc } from '../_lib/store.js';
import { providers, vnpVerify, orderPath, markPaid } from '../_lib/pay.js';

export default handle(async (req, res) => {
  allow(req, 'GET');
  const q = query(req);
  const code = Number(q.vnp_TxnRef) || 0;
  if (!providers().vnpay || !vnpVerify(q)) return redirect(res, `/?pay=fail&order=${code}`);
  const success = q.vnp_ResponseCode === '00' && q.vnp_TransactionStatus === '00';
  if (success) {
    const doc = await getDoc(orderPath(code));
    if (doc && Number(q.vnp_Amount) / 100 === doc.data.amount) {
      await markPaid(code, { amount: doc.data.amount, ref: q.vnp_TransactionNo });
    }
  }
  redirect(res, `/?pay=${success ? 'return' : 'cancel'}&order=${code}`);
});
