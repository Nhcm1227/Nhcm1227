// Trang web hỏi lại trạng thái đơn sau khi người dùng quay về từ cổng thanh toán.
import { handle, allow, query, ok, HttpError } from '../_lib/http.js';
import { getDoc } from '../_lib/store.js';
import { requireUser, publicUser, userPath } from '../_lib/auth.js';
import { providers, payos, orderPath, markPaid, markStatus } from '../_lib/pay.js';

export default handle(async (req, res) => {
  allow(req, 'GET');
  const u = await requireUser(req);
  const code = Number(query(req).order);
  const doc = code ? await getDoc(orderPath(code)) : null;
  if (!doc || doc.data.uid !== u.id) throw new HttpError(404, 'Không tìm thấy đơn hàng.');
  let order = doc.data;
  if (order.status === 'PENDING' && order.provider === 'payos' && providers().payos) {
    try {
      const link = await (await payos()).paymentRequests.get(code);
      if (link.status === 'PAID') order = (await markPaid(code, { amount: link.amountPaid })).order || order;
      else if (link.status === 'CANCELLED' || link.status === 'EXPIRED') order = (await markStatus(code, link.status)) || order;
    } catch (e) {
      console.error('payos get failed', e);
    }
  }
  const fresh = (await getDoc(userPath(u.id))).data;
  ok(res, {
    order: { orderCode: order.orderCode, status: order.status, months: order.months, amount: order.amount, method: order.method },
    user: publicUser(fresh),
  });
});
