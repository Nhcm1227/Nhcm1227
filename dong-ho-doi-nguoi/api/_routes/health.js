import { handle, ok } from '../_lib/http.js';
import { usingBlob } from '../_lib/store.js';
import { providers } from '../_lib/pay.js';

export default handle(async (req, res) => {
  ok(res, { ok: true, storage: usingBlob() ? 'vercel-blob' : 'file', payments: providers(), time: Date.now() });
});
