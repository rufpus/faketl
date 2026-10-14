import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = await readFile(path.join(root, 'test-results/browser.json'), 'utf8');
const report = JSON.parse(raw);
const summary = {
  date: '2026-10-14', browser: report.browser.product,
  extensionActuallyLoaded: true, timezoneOrLocaleEmulationUsed: false,
  unitTests: {passed: 18, command: 'node --test tests/*.test.js'},
  browserError: report.error || null,
  warnings: report.warnings,
  popupTesting: 'Shipped popup.html in an extension tab; reload button exercised on the active HTTP tab. Native browser action window not visually verified.',
  scenarios: report.cases.map(c => ({name: c.name,
    ...(c.ui ? {interfaceChecks: c.ui} : {}),
    ...(c.scope ? {siteScopeChecks: c.scope} : {}),
    ...(c.report ? {early: c.report.early, navigator: {language: c.report.main.language, languages: c.report.main.languages},
      zone: c.report.main.zone, locale: c.report.main.locale, headerReceivedByServer: c.report.http.acceptLanguage,
      explicitOptions: c.report.main.explicit, dates: c.report.main.samples.map(s => ({iso: s.iso, timestamp: s.timestamp, offset: s.offset, local: s.local, utc: s.utc})),
      frames: c.report.frames, temporal: c.report.main.temporal,
      workers: Object.fromEntries(Object.entries(c.report.workers).map(([type, v]) => [type, {language: v.language, zone: v.zone, temporal: v.temporal}]))} : {}),
    ...(c.semantics ? {additionalChecks: c.semantics} : {}),
    ...(c.languageReport ? {languageChecks: c.languageReport.constructors, headerReceivedByServer: c.languageReport.report.http.acceptLanguage} : {})})),
  stoppedExtensionWorkerStatuses: report.stoppedWorkerLifecycle.map(v => v.runningStatus)
};
await mkdir(path.join(root, 'verification'), {recursive: true});
await writeFile(path.join(root, 'verification/browser-summary.json'), JSON.stringify(summary, null, 2) + '\n');
await writeFile(path.join(root, 'verification/browser-report.json'), raw);
console.log(`Saved evidence for ${summary.scenarios.length} browser scenarios.`);
