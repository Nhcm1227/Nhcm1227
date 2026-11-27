// Một hàm máy chủ duy nhất nhận mọi yêu cầu /api/* rồi chuyển đến đúng chỗ xử lý.
// (Gói Hobby của Vercel giới hạn 12 hàm cho mỗi lần triển khai.)
import register from './_routes/auth/register.js';
import login from './_routes/auth/login.js';
import logout from './_routes/auth/logout.js';
import me from './_routes/me.js';
import data from './_routes/data.js';
import health from './_routes/health.js';
import payCreate from './_routes/pay/create.js';
import payCheck from './_routes/pay/check.js';
import payosWebhook from './_routes/pay/payos-webhook.js';
import vnpayIpn from './_routes/pay/vnpay-ipn.js';
import vnpayReturn from './_routes/pay/vnpay-return.js';
import adminClaim from './_routes/admin/claim.js';
import adminOverview from './_routes/admin/overview.js';
import adminAction from './_routes/admin/action.js';
import board from './_routes/board.js';
import accountDelete from './_routes/account-delete.js';

const ROUTES = {
  'auth/register': register,
  'auth/login': login,
  'auth/logout': logout,
  'me': me,
  'data': data,
  'health': health,
  'pay/create': payCreate,
  'pay/check': payCheck,
  'pay/payos-webhook': payosWebhook,
  'pay/vnpay-ipn': vnpayIpn,
  'pay/vnpay-return': vnpayReturn,
  'admin/claim': adminClaim,
  'admin/overview': adminOverview,
  'admin/action': adminAction,
  'board': board,
  'account/delete': accountDelete,
};

export default async function router(req, res) {
  const url = new URL(req.url, 'http://local');
  let route = url.searchParams.get('__route');
  if (!route) route = url.pathname.replace(/^\/api\/?/, '');
  route = route.replace(/^\/+|\/+$/g, '');
  const fn = ROUTES[route];
  if (!fn) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'Không tìm thấy.' }));
  }
  return fn(req, res);
}
