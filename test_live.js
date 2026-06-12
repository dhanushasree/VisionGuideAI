const { chromium } = require('playwright');

const SITE    = 'https://visionguideai-app.vercel.app';
const BACKEND = 'https://visionguideai-backend.onrender.com';
const TS      = Date.now();
const EMAIL   = 'test_' + TS + '@test.com';
const PASS    = 'TestPass99';
const OWNER   = { email: 'dhanushasreeg20@gmail.com', pass: 'Dhanusha123' };

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const api = [], errs = [];
  page.on('response', r => {
    if (r.url().includes('onrender.com'))
      api.push(r.status() + ' ' + r.request().method() + ' ' + r.url().replace(BACKEND,''));
  });
  page.on('console', m => {
    if (m.type() === 'error'
      && !['wasm','chunk','tfhub','graph_model','401','409'].some(s => m.text().includes(s)))
      errs.push(m.text().slice(0, 100));
  });

  // 1. Owner login
  console.log('[1] Owner login — ' + OWNER.email);
  await page.goto(SITE + '/signin', { waitUntil: 'load' });
  await page.fill('input[type=email]',    OWNER.email);
  await page.fill('input[type=password]', OWNER.pass);
  await page.click('button[type=submit]');
  await page.waitForURL(/dashboard/, { timeout: 45000 });
  await page.waitForTimeout(600);
  const loginH1 = await page.locator('h1').first().textContent().catch(() => '?');
  console.log('  result:', loginH1.trim());
  await page.screenshot({ path: 't_01_login.png' });

  // 2. All pages
  console.log('\n[2] Pages');
  const pages = [
    ['/dashboard',            'Dashboard'         ],
    ['/dashboard/voice',      'Voice Assistant'   ],
    ['/dashboard/navigation', 'Navigation'        ],
    ['/dashboard/objects',    'Object Detection'  ],
    ['/dashboard/articles',   'Article Reader'    ],
    ['/dashboard/emergency',  'Emergency Contacts'],
    ['/dashboard/sos',        'SOS'               ],
    ['/dashboard/camera',     'Camera'            ],
  ];
  for (const [path, name] of pages) {
    const slow = path.includes('objects') || path.includes('camera');
    await page.goto(SITE + path, { waitUntil: slow ? 'load' : 'networkidle', timeout: 25000 });
    if (slow) await page.waitForTimeout(1500);
    const h1 = await page.locator('h1').first().textContent().catch(() => '?');
    const ok = h1 && !h1.includes('Sign') && !h1.includes('Welcome') && !h1.includes('?');
    console.log(' ', ok ? '✅' : '❌', name.padEnd(20), '→', h1.trim());
  }
  await page.screenshot({ path: 't_02_dashboard.png' });

  // 3. Sign out + auth guard
  console.log('\n[3] Sign out');
  await page.goto(SITE + '/dashboard', { waitUntil: 'load' });
  await page.locator('text=Sign Out').first().click({ timeout: 8000 });
  await page.waitForURL(/signin/, { timeout: 10000 });
  console.log('  signed out:', page.url().includes('signin'));
  await page.goto(SITE + '/dashboard', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  console.log('  auth guard:', page.url().includes('signin') ? '✅ redirected to /signin' : '❌ ' + page.url());

  // 4. Register fresh account
  console.log('\n[4] Register  ' + EMAIL);
  await page.goto(SITE + '/signup', { waitUntil: 'load' });
  await page.fill('input[type=text]',  'Tester');
  await page.fill('input[type=email]', EMAIL);
  const pws = await page.locator('input[type=password]').all();
  await pws[0].fill(PASS); await pws[1].fill(PASS);
  await page.click('button[type=submit]');
  await page.waitForURL(/dashboard/, { timeout: 45000 });
  await page.waitForTimeout(600);
  const regH1 = await page.locator('h1').first().textContent().catch(() => '?');
  console.log('  result:', regH1.trim());
  await page.screenshot({ path: 't_04_register.png' });

  // 5. Probes
  console.log('\n[5] Probes');
  await page.evaluate(() => localStorage.clear());
  await page.goto(SITE + '/signin', { waitUntil: 'load' });
  await page.fill('input[type=email]', OWNER.email);
  await page.fill('input[type=password]', 'wrongpass');
  await page.click('button[type=submit]');
  await page.waitForTimeout(3000);
  const wpMsg = await page.locator('.alert').first().textContent().catch(() => null);
  console.log('  wrong password:', wpMsg ? wpMsg.trim() : '(none)');

  await page.goto(SITE + '/signup', { waitUntil: 'load' });
  await page.fill('input[type=text]', 'X'); await page.fill('input[type=email]', 'x@x.com');
  const sp = await page.locator('input[type=password]').all();
  await sp[0].fill('short'); await sp[1].fill('short');
  await page.click('button[type=submit]');
  await page.waitForTimeout(1500);
  const shortMsg = await page.locator('.alert').first().textContent().catch(() => null);
  console.log('  short password:', shortMsg ? shortMsg.trim() : '(none)');

  const hs = await Promise.all(Array.from({length:15},()=>fetch(BACKEND+'/health').then(r=>r.status).catch(()=>'err')));
  console.log('  /health ×15:', hs.every(s=>s===200) ? '✅ all 200' : '❌ '+hs.join(' '));

  // Summary
  console.log('\n── API calls ──');
  [...new Set(api)].forEach(c => console.log(' ', c));
  console.log('\n── JS errors ──');
  errs.length ? errs.forEach(e => console.log('  ⚠', e)) : console.log('  none');

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
