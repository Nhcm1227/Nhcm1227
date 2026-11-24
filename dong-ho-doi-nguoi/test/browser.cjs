const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const SP = process.argv[2];
(async () => {
  const env = { ...process.env, PORT: '3998', DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'dhdnb-')), SESSION_SECRET: 'browser-test-secret-browser-test-secret', ADMIN_CLAIM_CODE: 'MA-THU', VNPAY_TMN_CODE: 'TESTTMN1', VNPAY_HASH_SECRET: 'SECRET' };
  delete env.BLOB_READ_WRITE_TOKEN;
  const srv = spawn(process.execPath, ['dev-server.js'], { env, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const b = await chromium.launch();
  try {
    for (const w of [1200, 390]) {
      const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
      const p = await ctx.newPage();
      const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/fonts\.g/.test(m.text()) && errs.push(m.text()));
      await p.goto('http://localhost:3998/'); await p.waitForTimeout(1200);
      console.log(w, 'guest planbar:', (await p.textContent('#planText')).slice(0, 60), '| acct:', await p.textContent('#acctBtn'), '| overflow', await p.evaluate(() => document.documentElement.scrollWidth));
      await p.fill('#newTitle', 'Việc khách tạo'); await p.click('#addBtn');
      await p.click('#acctBtn'); await p.click('#tabReg');
      await p.fill('#authEmail', `nguoi${w}@test.vn`); await p.fill('#authPass', 'matkhau123'); await p.fill('#authName', 'Minh');
      if (w === 390) await p.screenshot({ path: SP + '/auth390.png' });
      await Promise.all([p.waitForEvent('load'), p.click('#authSubmit')]); await p.waitForTimeout(1200);
      console.log(w, 'after register:', await p.textContent('#who'), '|', (await p.textContent('#planText')).slice(0, 50));
      const tasks = await p.evaluate(() => fetch('/api/data').then((r) => r.json()).then((j) => j.data && j.data.tasks.map((t) => t.t)));
      console.log(w, 'server tasks after register:', tasks);
      await p.fill('#newTitle', 'Việc sau đăng ký'); await p.click('#addBtn'); await p.waitForTimeout(1800);
      console.log(w, 'server tasks after add:', await p.evaluate(() => fetch('/api/data').then((r) => r.json()).then((j) => j.data.tasks.length)));
      await p.click('#subBtn'); await p.waitForTimeout(300);
      if (w === 390) await p.screenshot({ path: SP + '/pay390.png' });
      await p.click('label:has(#pack-3)');
      let target = null;
      await p.route('https://sandbox.vnpayment.vn/**', (route) => { target = route.request().url(); route.abort(); });
      await p.click('#payCard'); await p.waitForTimeout(1200);
      const u = target && new URL(target);
      console.log(w, 'redirected to VNPAY:', !!u, u && u.searchParams.get('vnp_Amount'), u && u.searchParams.get('vnp_BankCode'));
      console.log(w, 'errors:', errs);
      if (w === 1200) {
        const a = await ctx.newPage();
        await a.goto('http://localhost:3998/admin'); await a.waitForTimeout(800);
        await a.fill('#claimCode', 'MA-THU'); await a.click('#claimForm button'); await a.waitForTimeout(1200);
        console.log('admin stats:', (await a.textContent('#stats')).replace(/\s+/g, ' ').slice(0, 120));
        console.log('orders rows:', await a.locator('#orders tr').count(), '| users rows:', await a.locator('#users tr').count());
        await a.selectOption('#users tr:first-child select', 'grant'); await a.click('#users tr:first-child .act button'); await a.waitForTimeout(800);
        console.log('admin action msg:', await a.textContent('#actMsg'));
        await a.screenshot({ path: SP + '/admin.png', fullPage: true });
        await p.goto('http://localhost:3998/'); await p.waitForTimeout(1000);
        console.log('after grant planbar:', (await p.textContent('#planText')).slice(0, 60), '| admin link visible:', await p.isVisible('#adminLink'));
        await p.screenshot({ path: SP + '/home1200.png' });
      }
      await ctx.close();
    }
  } finally { await b.close(); srv.kill(); }
})();
