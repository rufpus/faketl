import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {mkdir, writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createServer} from '../test-site/server.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let playwright;
try { playwright = await import('playwright-core'); }
catch { playwright = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || path.resolve(path.dirname(process.execPath), '../node_modules/playwright-core/index.mjs')).href); }
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = path.join(root, '.test-profile', String(Date.now()));
await mkdir(profile, {recursive: true});
const server = createServer();
await new Promise(resolve => server.listen(8787, '127.0.0.1', resolve));
let context;
const evidence = {cases: [], warnings: [], browser: null};
async function launch() {
  return playwright.chromium.launchPersistentContext(profile, {executablePath, headless: true,
    ignoreDefaultArgs: ['--disable-extensions'], args: ['--enable-unsafe-extension-debugging', '--host-resolver-rules=MAP *.test 127.0.0.1', '--no-proxy-server'], viewport: {width: 1000, height: 900}});
}
async function save(popup, zone, enabled = true, languages = ['en-US', 'en'], siteMode = 'exclude', sites = []) {
  await popup.reload();
  await popup.locator('#primary-language').fill(languages[0]);
  await popup.locator('#other-languages').fill(languages.slice(1).join(', '));
  await popup.locator('#time-zone').selectOption(zone);
  await popup.locator('#enabled').setChecked(enabled);
  await popup.locator('#tab-sites').click();
  await popup.locator(`[name="site-mode"][value="${siteMode}"]`).check();
  await popup.locator('#site-list').fill(sites.join('\n'));
  await popup.locator('#save').click();
  await popup.waitForFunction(() => !document.getElementById('save').disabled);
  const msg = await popup.locator('#message').innerText();
  assert.match(msg, /Настройки сохранены и проверены|Settings saved and verified/, msg);
}
async function setInterface(popup, language) {
  await popup.locator(`[data-ui-language="${language}"]`).click();
  await popup.waitForFunction(language => document.documentElement.lang === language && !document.querySelector('[data-ui-language="' + language + '"]').disabled, language);
}
async function inspectScope(host, spoofed, name, native) {
  const page = await context.newPage();
  await page.goto(`http://${host}:8787/scope`);
  await page.waitForFunction(() => window.scopeReport?.http && scopeReport?.thirdParty && scopeReport?.frame?.http);
  const result = await page.evaluate(() => scopeReport);
  const header = spoofed ? 'en-US,en;q=0.9' : native.navigationHeader;
  for (const h of [result.navigationHeader, result.http.acceptLanguage, result.thirdParty.acceptLanguage, result.frame.http.acceptLanguage]) assert.equal(h, header, name);
  for (const snapshot of [result.early, result.frame.early]) {
    assert.equal(snapshot.language, spoofed ? 'en-US' : native.early.language, name);
    assert.equal(snapshot.zone, spoofed ? 'UTC' : native.early.zone, name);
    assert.equal(snapshot.hours, spoofed ? 12 : native.early.hours, name);
    assert.deepEqual(snapshot.languages, spoofed ? ['en-US', 'en'] : native.early.languages, name);
  }
  const keys = await page.evaluate(() => Object.getOwnPropertySymbols(window).filter(s => String(s).includes('locale-timezone')).map(String));
  if (!spoofed) assert.deepEqual(keys, [], 'An exempt site gets no public extension state');
  evidence.cases.push({name, scope: {host, spoofed, result}});
  return page;
}
async function inspectPage(zone, hours, offsets, name, query = '') {
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const response = await page.goto(`http://127.0.0.1:8787/${query}`);
  await page.waitForFunction(() => window.testReport?.http && window.testReport?.workers?.service && Object.keys(window.testReport.frames).length >= 5);
  const report = await page.evaluate(() => window.testReport);
  if (errors.length) evidence.warnings.push({name, errors});
  const records = await page.evaluate(async () => (await fetch('/records')).json());
  assert.equal(report.http.acceptLanguage, 'en-US,en;q=0.9');
  assert.equal(records.findLast(r => r.path === '/' + query)?.acceptLanguage, 'en-US,en;q=0.9');
  for (const route of ['/frame', '/probe.js', '/page.js', '/worker.js']) assert.equal(records.findLast(r => r.path === route)?.acceptLanguage, 'en-US,en;q=0.9', route);
  for (const snap of [report.main, report.early, report.frames['iframe HTTP'], report.frames['iframe другой origin']]) {
    assert.equal(snap.language, 'en-US'); assert.deepEqual(snap.languages, ['en-US', 'en']); assert.equal(snap.zone, zone);
  }
  for (const name of ['srcdoc', 'blob:', 'about:blank']) {
    if (report.frames[name]) { assert.equal(report.frames[name].zone, zone); assert.equal(report.frames[name].language, 'en-US'); }
  }
  report.main.samples.forEach((s, i) => {
    assert.equal(s.offset, offsets[i]); assert.equal(s.local[3], hours[i]);
    assert.equal(new Date(s.timestamp).toISOString(), s.iso); assert.equal(s.value, s.timestamp); assert.equal(s.utc[3], 12);
  });
  assert.equal(report.main.explicit.locale, 'de-DE'); assert.equal(report.main.explicit.zone, 'Asia/Tokyo');
  assert.equal(report.early.hours, hours[0]);
  const semantics = await page.evaluate(() => {
    const d = new Date(2026, 2, 8, 2, 30);
    const overlap = new Date(2026, 10, 1, 1, 30);
    const setter = new Date(2026, 2, 8, 0, 30); setter.setHours(2);
    return {gap: d.toISOString(), overlap: overlap.toISOString(), setter: setter.toISOString(), parse: new Date('2026-01-15T12:34:56').getHours(),
      number: (1234.5).toLocaleString(), originalTime: Date.now(), clockDifference: Math.abs(Date.now() - performance.timeOrigin - performance.now()), string: Date(), temporal: typeof Temporal !== 'undefined' ? Temporal.Now.timeZoneId() : null,
      calendarAgreement: ['2026-01-01T02:30:00Z','2026-12-31T22:30:00Z'].every(iso=>{
        const d=new Date(iso), p=Object.fromEntries(new Intl.DateTimeFormat(undefined,{year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric',hourCycle:'h23'}).formatToParts(d).map(p=>[p.type,p.value]));
        return [d.getFullYear(),d.getMonth()+1,d.getDate(),d.getHours(),d.getMinutes(),d.getSeconds()].join(',')===[p.year,p.month,p.day,p.hour,p.minute,p.second].map(Number).join(',');
      })};
  });
  if (zone === 'America/New_York') {
    assert.equal(semantics.gap, '2026-03-08T07:30:00.000Z'); assert.equal(semantics.overlap, '2026-11-01T05:30:00.000Z'); assert.equal(semantics.setter, semantics.gap);
  }
  assert.equal(semantics.parse, 12); assert.equal(semantics.number, '1,234.5');
  assert.equal(semantics.calendarAgreement, true); assert.ok(semantics.clockDifference < 2000);
  evidence.cases.push({name, status: response.status(), report, semantics});
  await page.close();
}
try {
  context = await launch();
  const cdp = await context.browser().newBrowserCDPSession();
  evidence.browser = await cdp.send('Browser.getVersion');
  let extensions = await cdp.send('Extensions.getExtensions');
  evidence.extensions = extensions;
  let id = extensions.extensions.find(x => x.name === 'FakeTL')?.id;
  if (!id) ({id} = await cdp.send('Extensions.loadUnpacked', {path: root}));
  evidence.extensionId = id;
  const setup = await context.newPage();
  await setup.goto(`chrome://extensions/?id=${id}`);
  await setup.locator('extensions-detail-view').waitFor({state: 'attached', timeout: 5000});
  const devMode = setup.locator('#devMode');
  if (await devMode.count() && await devMode.getAttribute('aria-checked') !== 'true') await devMode.click();
  await setup.locator('extensions-manager').waitFor({state: 'attached'});
  await setup.waitForFunction(() => !!document.querySelector('extensions-manager')?.shadowRoot?.querySelector('extensions-toolbar'));
  const toggle = setup.locator('#allow-user-scripts');
  if (await toggle.count()) {
    const switchControl = toggle.locator('cr-toggle');
    const checked = await switchControl.getAttribute('aria-checked');
    if (checked !== 'true') await switchControl.click();
  } else {
    await writeFile(path.join(root, 'extension-setup-debug.html'), await setup.evaluate(() => {
      function tree(el) { return el.outerHTML + (el.shadowRoot ? [...el.shadowRoot.children].map(tree).join('\n') : '') + [...el.children].map(tree).join('\n'); }
      return tree(document.querySelector('extensions-manager'));
    }));
    throw new Error('Не найден переключатель Allow User Scripts; см. extension-setup-debug.html');
  }
  await setup.close();
  let popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  evidence.extension = await popup.evaluate(async () => {
    const manifest = chrome.runtime.getManifest();
    const icons = {};
    for (const [size, file] of Object.entries(manifest.icons)) {
      const image = new Image(); image.src = chrome.runtime.getURL(file); await image.decode();
      icons[size] = {width: image.naturalWidth, height: image.naturalHeight, action: manifest.action.default_icon[size] === file};
    }
    return {version: manifest.version, icons};
  });
  for (const [size, icon] of Object.entries(evidence.extension.icons)) {
    assert.equal(icon.width, Number(size)); assert.equal(icon.height, Number(size)); assert.equal(icon.action, true);
  }
  await save(popup, 'UTC');
  evidence.permissions = await popup.evaluate(() => chrome.permissions.getAll());
  await inspectPage('UTC', [12, 12], [0, 0], 'UTC');
  // UI language is independent of spoofed website locales and preserves drafts.
  const originalSettings = await popup.evaluate(async () => (await chrome.storage.local.get('settings')).settings);
  await popup.locator('#tab-profile').click();
  await popup.locator('#primary-language').fill('fr-FR');
  await popup.locator('#time-zone').selectOption('Asia/Tokyo');
  await popup.locator('#tab-sites').click();
  await popup.locator('[name="site-mode"][value="include"]').check();
  await popup.locator('#site-list').fill('draft.test');
  await setInterface(popup, 'en');
  assert.equal(await popup.locator('#save').innerText(), 'Save');
  assert.equal(await popup.locator('#primary-language').inputValue(), 'fr-FR');
  assert.equal(await popup.locator('#time-zone').inputValue(), 'Asia/Tokyo');
  assert.equal(await popup.locator('#site-list').inputValue(), 'draft.test');
  assert.equal(await popup.locator('[name="site-mode"][value="include"]').isChecked(), true);
  assert.deepEqual(await popup.evaluate(async () => (await chrome.storage.local.get('settings')).settings), originalSettings);
  await popup.reload();
  await popup.waitForFunction(() => document.documentElement.lang === 'en' && !document.getElementById('save').disabled);
  assert.equal(await popup.locator('#primary-language').inputValue(), 'en-US');
  assert.equal(await popup.locator('#time-zone').inputValue(), 'UTC');
  await popup.locator('#other-languages').fill('en,fr,de,it,es,pt,nl,sv,fi,ja');
  await popup.locator('#save').click();
  await popup.waitForFunction(() => !document.getElementById('save').disabled);
  assert.match(await popup.locator('#message').innerText(), /Enter between 1 and 10 BCP 47/);
  assert.deepEqual(await popup.evaluate(async () => (await chrome.storage.local.get('settings')).settings), originalSettings);
  await save(popup, 'UTC');
  await mkdir(path.join(root, 'verification'), {recursive: true});
  await popup.setViewportSize({width: 400, height: 600});
  await popup.locator('#tab-profile').click();
  await popup.screenshot({path: path.join(root, 'verification/popup-en.png'), fullPage: true});
  await setInterface(popup, 'ru');
  assert.equal(await popup.locator('#save').innerText(), 'Сохранить');
  await popup.screenshot({path: path.join(root, 'verification/popup.png'), fullPage: true});
  await setInterface(popup, 'en');
  evidence.cases.push({name: 'English/Russian interface switch', ui: {persisted: true, draftsPreserved: true, websiteSettingsUnchanged: true, errorsLocalized: true}});
  await inspectPage('UTC', [12, 12], [0, 0], 'UTC, strict CSP', '?csp=1');
  await save(popup, 'Europe/Moscow'); await inspectPage('Europe/Moscow', [15, 15], [-180, -180], 'Moscow');
  await save(popup, 'America/New_York', true, ['en-US', 'en'], 'include', ['127.0.0.1']); await inspectPage('America/New_York', [7, 8], [300, 240], 'New York');
  // Stop the extension worker through CDP, then navigate without waking it.
  const pageCDP = await context.newCDPSession(popup);
  const lifecycle = [];
  pageCDP.on('ServiceWorker.workerVersionUpdated', event => lifecycle.push(...event.versions.filter(v => v.scriptURL === `chrome-extension://${id}/background.js`)));
  const versionEvent = new Promise(resolve => pageCDP.once('ServiceWorker.workerVersionUpdated', resolve));
  await pageCDP.send('ServiceWorker.enable');
  const versions = (await versionEvent).versions;
  const extensionWorker = versions.find(v => v.scriptURL === `chrome-extension://${id}/background.js`);
  assert.ok(extensionWorker, 'extension service worker visible');
  await pageCDP.send('ServiceWorker.stopWorker', {versionId: extensionWorker.versionId});
  await inspectPage('America/New_York', [7, 8], [300, 240], 'Stopped extension service worker');
  assert.equal(lifecycle.at(-1).runningStatus, 'stopped');
  evidence.stoppedWorkerLifecycle = lifecycle;
  await context.close(); context = await launch();
  const restartedCDP = await context.browser().newBrowserCDPSession();
  const restored = await restartedCDP.send('Extensions.getExtensions');
  if (!restored.extensions.some(x => x.id === id)) {
    evidence.warnings.push('CDP loads an extension for the current browser session. After real browser restart the extension had to be loaded again; automatic restoration of a normally installed unpacked extension remains unverified.');
    await restartedCDP.send('Extensions.loadUnpacked', {path: root});
    const reenable = await context.newPage(); await reenable.goto(`chrome://extensions/?id=${id}`);
    const control = reenable.locator('#allow-user-scripts cr-toggle'); await control.waitFor({state: 'attached'});
    if (await control.getAttribute('aria-checked') !== 'true') await control.click();
    await reenable.close();
  }
  popup = await context.newPage(); await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForFunction(() => document.getElementById('time-zone').value === 'America/New_York');
  assert.equal(await popup.locator('[data-ui-language="en"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await popup.locator('#save').innerText(), 'Save');
  const restoredSites = await popup.evaluate(async () => (await chrome.storage.local.get('settings')).settings);
  assert.equal(restoredSites.siteMode, 'include'); assert.deepEqual(restoredSites.sites, ['127.0.0.1']);
  // The original saved preferences survive even this session-only loader.
  await save(popup, 'America/New_York', true, ['en-US', 'en'], 'include', ['127.0.0.1']);
  await inspectPage('America/New_York', [7, 8], [300, 240], 'Browser restart plus CDP reload, persisted settings');
  // Language defaults in all supported locale-dependent constructors.
  await save(popup, 'Europe/Berlin', true, ['de-DE', 'de']);
  const german = await context.newPage(); await german.goto('http://127.0.0.1:8787/');
  await german.waitForFunction(() => window.testReport?.http);
  const languageReport = await german.evaluate(() => ({report: testReport, constructors: ['NumberFormat','Collator','PluralRules','RelativeTimeFormat','ListFormat','Segmenter','DurationFormat'].filter(n=>Intl[n]).map(n=>[n,new Intl[n]().resolvedOptions().locale,new Intl[n]('de-DE').resolvedOptions().locale]), displayNames: new Intl.DisplayNames(undefined,{type:'language'}).resolvedOptions().locale}));
  assert.equal(languageReport.report.http.acceptLanguage, 'de-DE,de;q=0.9');
  for (const [, locale, explicit] of languageReport.constructors) assert.equal(locale, explicit);
  assert.equal(languageReport.displayNames, 'de-DE');
  evidence.cases.push({name: 'German defaults', languageReport}); await german.close();
  // Site filters: use real local DNS mappings, not language/time-zone emulation.
  await save(popup, 'UTC', false);
  const baseline = await context.newPage(); await baseline.goto('http://alpha.test:8787/scope');
  await baseline.waitForFunction(() => window.scopeReport?.http && scopeReport.frame?.http && scopeReport.thirdParty);
  const native = await baseline.evaluate(() => scopeReport); await baseline.close();
  await save(popup, 'UTC', true, ['en-US', 'en'], 'exclude', ['alpha.test']);
  await (await inspectScope('alpha.test', false, 'Exception: main/third-party/frame preserve originals', native)).close();
  await (await inspectScope('sub.alpha.test', false, 'Exception applies to subdomains', native)).close();
  await (await inspectScope('beta.test', true, 'Unlisted website still spoofed', native)).close();
  await save(popup, 'UTC', true, ['en-US', 'en'], 'include', ['alpha.test']);
  await (await inspectScope('alpha.test', true, 'Include: main/third-party/frame spoofed', native)).close();
  await (await inspectScope('sub.alpha.test', true, 'Include applies to subdomains', native)).close();
  await (await inspectScope('beta.test', false, 'Unlisted website original in include mode', native)).close();
  await save(popup, 'UTC', true, ['en-US', 'en'], 'include', []);
  const sitePage = await inspectScope('alpha.test', false, 'Empty include list affects no websites', native);
  await sitePage.bringToFront(); await popup.reload();
  await popup.locator('#tab-sites').click(); await popup.locator('#add-site').click();
  await popup.waitForFunction(() => document.getElementById('site-list').value === 'alpha.test');
  await popup.locator('#save').click(); await popup.waitForFunction(() => !document.getElementById('save').disabled);
  assert.match(await popup.locator('#message').innerText(), /Settings saved and verified/);
  await sitePage.close();
  await (await inspectScope('alpha.test', true, 'Add current website', native)).close();
  await popup.locator('#tab-sites').click();
  await popup.setViewportSize({width: 400, height: 600});
  await popup.screenshot({path: path.join(root, 'verification/popup-sites-en.png'), fullPage: true});
  await popup.reload(); await popup.locator('#tab-sites').click();
  assert.equal(await popup.locator('#site-list').inputValue(), 'alpha.test');
  assert.equal(await popup.locator('[name="site-mode"][value="include"]').isChecked(), true);
  evidence.cases.push({name: 'Site mode and list persist after popup reopen'});
  await save(popup, 'UTC', false);
  const disabled = await context.newPage(); await disabled.goto('http://127.0.0.1:8787/');
  await disabled.waitForFunction(() => window.testReport?.workers?.dedicated && window.testReport?.http);
  const report = await disabled.evaluate(() => window.testReport);
  assert.equal(report.main.zone, report.workers.dedicated.zone);
  assert.equal(report.main.language, report.workers.dedicated.language);
  assert.deepEqual(report.main.languages, report.workers.dedicated.languages);
  evidence.cases.push({name: 'Disabled and reloaded', report});
  // Exercise the shipped popup document. Headless Playwright does not expose
  // native action popups as Page targets, so the same document is open in a tab.
  await popup.setViewportSize({width: 400, height: 600});
  await mkdir(path.join(root, 'verification'), {recursive: true});
  await popup.screenshot({path: path.join(root, 'verification/popup-disabled-en.png'), fullPage: true});
  await disabled.bringToFront();
  const previousOrigin = await disabled.evaluate(() => performance.timeOrigin);
  const navigation = disabled.waitForEvent('domcontentloaded');
  await popup.locator('#reload').click();
  await navigation;
  assert.notEqual(await disabled.evaluate(() => performance.timeOrigin), previousOrigin);
  evidence.cases.push({name: 'Popup document and reload button'});
  console.log(JSON.stringify({passed: evidence.cases.map(c => c.name), browser: evidence.browser.product}, null, 2));
} catch (error) {
  evidence.error = error.stack; console.error(error); process.exitCode = 1;
} finally {
  await mkdir(path.join(root, 'test-results'), {recursive: true});
  await writeFile(path.join(root, 'test-results/browser.json'), JSON.stringify(evidence, null, 2));
  if (context) await context.close(); await new Promise(resolve => server.close(resolve));
}
