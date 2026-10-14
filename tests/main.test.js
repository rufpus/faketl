import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {normalizeSettings, acceptLanguage} from '../settings.js';
const source = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
function realm(timeZone, languages = ['en-US', 'en'], scope = {}, host = 'example.test', ancestors = []) {
  const context = vm.createContext({URL});
  vm.runInContext(`class Navigator { get language(){if (!(this instanceof Navigator)) throw new TypeError(); return 'ru-RU'} get languages(){return ['ru-RU']} }; globalThis.Navigator=Navigator; globalThis.navigator=new Navigator(); globalThis.location={protocol:'https:',hostname:${JSON.stringify(host)},ancestorOrigins:${JSON.stringify(ancestors)}}; globalThis.parent=globalThis; globalThis.opener=null;`, context);
  vm.runInContext(source.replace('/*FAKETL_CONFIG*/ undefined', JSON.stringify({enabled: true, timeZone, languages, ...scope})), context);
  return code => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, context));
}
test('settings canonicalization and header', () => {
  assert.deepEqual(normalizeSettings({enabled: true, timeZone: 'UTC', languages: ['EN-us', 'en', 'en-US']}), {enabled: true, timeZone: 'UTC', languages: ['en-US', 'en'], siteMode: 'exclude', sites: []});
  assert.equal(acceptLanguage(['en-US', 'en']), 'en-US,en;q=0.9');
  for (const x of ['en_US', '', 'x']) assert.throws(() => normalizeSettings({enabled: true, timeZone: 'UTC', languages: [x]}));
  assert.throws(() => normalizeSettings({enabled: true, timeZone: 'not-a-zone', languages: ['en']}));
  assert.throws(() => normalizeSettings({enabled: true, timeZone: '+03:00', languages: ['en']}));
});
for (const [zone, offsets, hours] of [['UTC', [0, 0], [12, 12]], ['Europe/Moscow', [-180, -180], [15, 15]], ['America/New_York', [300, 240], [7, 8]]]) {
  test(`${zone}: navigator, Intl, timestamps and local getters`, () => {
    const run = realm(zone);
    assert.deepEqual(run('[navigator.language,[...navigator.languages],new Intl.DateTimeFormat().resolvedOptions().timeZone,new Intl.NumberFormat().resolvedOptions().locale]'), ['en-US', ['en-US', 'en'], zone, 'en-US']);
    const result = run(`['2026-01-15T12:34:56.789Z','2026-07-15T12:34:56.789Z'].map(s=>{const d=new Date(s); return [d.getTimezoneOffset(),d.getHours(),d.toISOString(),d.getTime(),d.valueOf(),d.getUTCHours(),d.getMinutes(),d.getSeconds(),d.getMilliseconds()]})`);
    result.forEach((x, i) => assert.deepEqual(x, [offsets[i], hours[i], i ? '2026-07-15T12:34:56.789Z' : '2026-01-15T12:34:56.789Z', Date.parse(i ? '2026-07-15T12:34:56.789Z' : '2026-01-15T12:34:56.789Z'), Date.parse(i ? '2026-07-15T12:34:56.789Z' : '2026-01-15T12:34:56.789Z'), 12, 34, 56, 789]));
    assert.deepEqual(run(`[new Intl.NumberFormat('de-DE').resolvedOptions().locale,new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo'}).resolvedOptions().timeZone]`), ['de-DE', 'Asia/Tokyo']);
    assert.equal(run(`new Date(2026,0,15,12,34,56,789).getHours()`), 12);
    assert.equal(run(`new Date('2026-01-15T12:34:56.789').getHours()`), 12);
    assert.equal(run(`Date.parse('2026-01-15T12:34:56.789')`), run(`new Date(2026,0,15,12,34,56,789).getTime()`));
    assert.equal(run(`new Date('2026-01-15').toISOString()`), '2026-01-15T00:00:00.000Z');
    assert.equal(run(`(()=>{let d=new Date(2026,0,15,12);d.setHours(20,1,2,3);return d.getHours()})()`), 20);
    assert.match(run(`new Date('2026-01-15T12:34:56Z').toTimeString()`), new RegExp(`^${String(hours[0]).padStart(2, '0')}:34:56 GMT`));
    assert.equal(run(`(()=>{let d=new Date(2026,0,15,12);return Date.parse(d.toString())===d.getTime()})()`), true);
  });
}
test('New York gap and overlap use compatible disambiguation', () => {
  const run = realm('America/New_York');
  assert.equal(run(`new Date(2026,2,8,2,30).toISOString()`), '2026-03-08T07:30:00.000Z');
  assert.equal(run(`new Date(2026,10,1,1,30).toISOString()`), '2026-11-01T05:30:00.000Z');
  assert.equal(run(`(()=>{let d=new Date(2026,2,8,0,30);d.setHours(2);return d.toISOString()})()`), '2026-03-08T07:30:00.000Z');
  assert.equal(run(`(()=>{let d=new Date(2026,2,7,12);d.setDate(8);return d.toISOString()})()`), '2026-03-08T16:00:00.000Z');
});
test('invalid dates, exceptions, constructors, locale options', () => {
  const run = realm('UTC');
  assert.deepEqual(run(`(()=>{const d=new Date(NaN);return [d.toString(),d.toDateString(),d.toTimeString(),d.toLocaleString('bad_tag'),Number.isNaN(d.getHours()),Number.isNaN(d.setHours(1)),d.setFullYear(2026),d.toISOString()]})()`), ['Invalid Date', 'Invalid Date', 'Invalid Date', 'Invalid Date', true, true, Date.parse('2026-01-01T00:00Z'), '2026-01-01T00:00:00.000Z']);
  assert.equal(run(`(()=>{try{Date.prototype.getHours.call({});return false}catch(e){return e instanceof TypeError}})()`), true);
  assert.equal(run(`(()=>{try{new Date(1n);return false}catch(e){return e instanceof TypeError}})()`), true);
  assert.equal(run(`(()=>{try{new Date().toLocaleString(undefined,null);return false}catch(e){return e instanceof TypeError}})()`), true);
  assert.equal(run(`(()=>{try{new Intl.NumberFormat('bad_tag');return false}catch(e){return e instanceof RangeError}})()`), true);
  assert.equal(run(`(()=>{let d=new Date(123);return new Date(d).getTime()})()`), 123);
  assert.equal(run(`(()=>{class D extends Date{};const d=new D(2026,0,1);return d instanceof D && d instanceof Date})()`), true);
  assert.equal(run(`new Date(99,0,1).getFullYear()`), 1999);
  assert.equal(run(`new Date('2026-01-01T24:00').toISOString()`), '2026-01-02T00:00:00.000Z');
  assert.equal(run(`new Intl.DateTimeFormat([],Object.create({timeZone:'Asia/Tokyo'})).resolvedOptions().timeZone`), 'Asia/Tokyo');
  assert.equal(run(`new Intl.NumberFormat([]).resolvedOptions().locale`), 'en-US');
  assert.equal(run(`(1234.5).toLocaleString()`), '1,234.5');
  assert.equal(run(`'I'.toLocaleLowerCase('tr')`), 'ı');
});
test('Date range limits, component overflow and argument coercion', () => {
  const utc = realm('UTC');
  const tokyo = realm('Asia/Tokyo');
  assert.deepEqual(utc(`[new Date(8640000000000000).getFullYear(), new Date(-8640000000000000).getFullYear()]`), [275760, -271821]);
  assert.equal(tokyo(`new Date(8640000000000000).getHours()`), 9);
  assert.equal(tokyo(`new Date(275760,8,13,1).toISOString()`), '+275760-09-12T16:00:00.000Z');
  assert.equal(tokyo(`(()=>{const d=new Date(8640000000000000);d.setHours(1);return d.toISOString()})()`), '+275760-09-12T16:00:00.000Z');
  assert.equal(utc(`new Date(2026,12,0,25,61,61,1001).toISOString()`), '2027-01-01T02:02:02.001Z');
  assert.equal(utc(`(()=>{let seen=[];new Date(...[2026,0,1,2,3,4,5].map((n,i)=>({valueOf(){seen.push(i);return n}})));return seen.join(',')})()`), '0,1,2,3,4,5,6');
  assert.equal(utc(`(()=>{let n=0;const d=new Date(NaN);d.setMonth({valueOf(){n++;return 1}},{valueOf(){n++;return 2}});return n})()`), 2);
  assert.equal(utc(`(()=>{try{Date.parse(Symbol());return false}catch(e){return e instanceof TypeError}})()`), true);
});
test('calendar getters agree with Intl across midnight, DST and year boundaries', () => {
  for (const zone of ['UTC', 'Europe/Moscow', 'Europe/Berlin', 'America/New_York', 'Asia/Tokyo']) {
    const run = realm(zone);
    const agrees = run(`['2026-01-01T02:30:00Z','2026-12-31T22:30:00Z','2026-03-08T07:01:00Z','2026-11-01T06:30:00Z'].every(s=>{
      const d=new Date(s), p=Object.fromEntries(new Intl.DateTimeFormat(undefined,{year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric',hourCycle:'h23'}).formatToParts(d).map(p=>[p.type,p.value]));
      return [d.getFullYear(),d.getMonth()+1,d.getDate(),d.getHours(),d.getMinutes(),d.getSeconds()].join(',')===[p.year,p.month,p.day,p.hour,p.minute,p.second].map(Number).join(',');
    })`);
    assert.equal(agrees, true, zone);
  }
});
test('MAIN world filters top-level domains and cross-origin frames synchronously', () => {
  const include = {siteMode: 'include', sites: ['allowed.test']};
  const exclude = {siteMode: 'exclude', sites: ['ignored.test']};
  const lang = r => r('navigator.language');
  assert.equal(lang(realm('UTC', ['en-US'], include, 'allowed.test')), 'en-US');
  assert.equal(lang(realm('UTC', ['en-US'], include, 'assets.test', ['https://allowed.test'])), 'en-US');
  assert.equal(lang(realm('UTC', ['en-US'], include, 'allowed.test', ['https://other.test'])), 'ru-RU');
  assert.equal(lang(realm('UTC', ['en-US'], exclude, 'assets.test', ['https://ignored.test'])), 'ru-RU');
  assert.equal(lang(realm('UTC', ['en-US'], {siteMode: 'include', sites: []})), 'ru-RU');
  const ignored = realm('UTC', ['en-US'], exclude, 'ignored.test');
  assert.equal(ignored(`Object.getOwnPropertySymbols(globalThis).some(s=>String(s).includes('locale-timezone'))`), false);
  const allowed = realm('UTC', ['en-US'], include, 'allowed.test');
  assert.equal(allowed(`globalThis[Symbol.for('locale-timezone/config/v1')].sites === undefined`), true);
});
