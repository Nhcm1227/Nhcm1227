import { handle, allow, ok } from '../../_lib/http.js';
import { clearSession } from '../../_lib/auth.js';

export default handle(async (req, res) => {
  allow(req, 'POST');
  clearSession(req, res);
  ok(res, { ok: true });
});
