import { handle, allow, ok, originOf } from '../_lib/http.js';
import { listPaths, getMany, usingBlob } from '../_lib/store.js';
import { requireAdmin } from '../_lib/auth.js';
import { planOf, PRICE } from '../_lib/plan.js';
import { providers } from '../_lib/pay.js';

export default handle(async (req, res) => {
  allow(req, 'GET');
  await requireAdmin(req);
  const now = Date.now();
  const [users, orders] = await Promise.all([
    listPaths('users/').then((p) => getMany(p)),
    listPaths('orders/').then((p) => getMany(p)),
  ]);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const paid = orders.filter((o) => o.status === 'PAID');
  const plans = users.map((u) => planOf(u, now).kind);
  const origin = originOf(req);
  ok(res, {
    stats: {
      users: users.length,
      trial: plans.filter((k) => k === 'trial').length,
      paid: plans.filter((k) => k === 'paid').length,
      free: plans.filter((k) => k === 'free').length,
      banned: users.filter((u) => u.banned).length,
      newToday: users.filter((u) => now - u.createdAt < 864e5).length,
      revenue: paid.reduce((s, o) => s + o.amount, 0),
      revenueMonth: paid.filter((o) => o.paidAt >= monthStart.getTime()).reduce((s, o) => s + o.amount, 0),
      ordersPaid: paid.length,
    },
    users: users
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((u) => ({
        id: u.id, email: u.email, name: u.name || '', role: u.role || 'user', banned: !!u.banned,
        createdAt: u.createdAt, lastLoginAt: u.lastLoginAt || 0, trialEnds: u.trialEnds || 0,
        paidUntil: u.paidUntil || 0, plan: planOf(u, now),
      })),
    orders: orders
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 300)
      .map((o) => ({
        orderCode: o.orderCode, email: o.email, months: o.months, amount: o.amount, method: o.method,
        provider: o.provider, status: o.status, createdAt: o.createdAt, paidAt: o.paidAt || 0, ref: o.ref || '',
      })),
    config: {
      storage: usingBlob() ? 'Vercel Blob (riêng tư)' : 'Tệp trên máy (chỉ để thử)',
      payments: providers(),
      price: PRICE,
      payosWebhook: `${origin}/api/pay/payos-webhook`,
      vnpayIpn: `${origin}/api/pay/vnpay-ipn`,
      vnpayReturn: `${origin}/api/pay/vnpay-return`,
    },
  });
});
