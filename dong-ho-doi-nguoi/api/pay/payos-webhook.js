// payOS gọi vào đây khi có người chuyển khoản xong.
import { handle, allow, readJson, ok, send } from '../_lib/http.js';
import { providers, payos, markPaid } from '../_lib/pay.js';

export default handle(async (req, res) => {
  allow(req, 'POST');
  if (!providers().payos) return ok(res, { ok: false, reason: 'payos-not-configured' });
  const body = await readJson(req);
  let data;
  try {
    data = await (await payos()).webhooks.verify(body);
  } catch {
    return send(res, 400, { ok: false, reason: 'invalid-signature' });
  }
  if (body.code === '00' && (data.code === undefined || data.code === '00')) {
    const r = await markPaid(Number(data.orderCode), { amount: data.amount, ref: data.reference });
    return ok(res, { ok: true, result: r.status });
  }
  ok(res, { ok: true, result: 'ignored' });
});
