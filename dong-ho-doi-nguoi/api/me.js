import { handle, allow, ok } from './_lib/http.js';
import { currentUser, publicUser } from './_lib/auth.js';
import { methods } from './_lib/pay.js';
import { PRICE, PACKS } from './_lib/plan.js';

export default handle(async (req, res) => {
  allow(req, 'GET');
  const u = await currentUser(req);
  ok(res, { user: u ? publicUser(u) : null, pay: methods(), price: PRICE, packs: PACKS, now: Date.now() });
});
