import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SETTINGS, normalizeSettings, normalizeSites, siteApplies, makeRules} from '../settings.js';

test('site input canonicalizes URLs, Unicode, duplicates, paths and ports', () => {
  assert.deepEqual(normalizeSites(['HTTPS://Example.COM:8443/path', 'example.com', 'пример.рф', 'LOCALHOST:8787', '127.0.0.1', 'example.com.']), ['127.0.0.1', 'example.com', 'localhost', 'xn--e1afmkfd.xn--p1ai']);
  for (const input of ['*.example.com', 'ftp://example.com', 'https://user:pass@example.com', 'file:///a', '', '-bad.test', 'bad_.test', '[::1]']) assert.throws(() => normalizeSites([input]), RangeError);
  assert.throws(() => normalizeSites(Array(101).fill('example.com')), RangeError);
});
test('domain boundaries and empty lists in both modes', () => {
  const exclude = {...DEFAULT_SETTINGS, sites: ['example.com']};
  const include = {...exclude, siteMode: 'include'};
  for (const host of ['example.com', 'sub.example.com', 'a.b.example.com', 'EXAMPLE.COM.']) {
    assert.equal(siteApplies(exclude, host), false); assert.equal(siteApplies(include, host), true);
  }
  for (const host of ['notexample.com', 'example.com.evil.test', 'other.test']) {
    assert.equal(siteApplies(exclude, host), true); assert.equal(siteApplies(include, host), false);
  }
  assert.equal(siteApplies(DEFAULT_SETTINGS, 'any.test'), true);
  assert.equal(siteApplies({...DEFAULT_SETTINGS, siteMode: 'include'}, 'any.test'), false);
});
test('DNR scopes the top-level site and retains main/sub-frame coverage', () => {
  const exclude = makeRules({...DEFAULT_SETTINGS, sites: ['example.com']});
  const include = makeRules({...DEFAULT_SETTINGS, sites: ['example.com'], siteMode: 'include'});
  assert.deepEqual(exclude[0].condition.excludedTopDomains, ['example.com']);
  assert.equal(exclude[0].condition.requestDomains, undefined);
  assert.deepEqual(include[0].condition.topDomains, ['example.com']);
  assert.ok(include[0].condition.resourceTypes.includes('main_frame'));
  assert.ok(include[0].condition.resourceTypes.includes('sub_frame'));
  assert.deepEqual(makeRules({...DEFAULT_SETTINGS, siteMode: 'include'}), []);
  assert.deepEqual(makeRules({...DEFAULT_SETTINGS, enabled: false, sites: ['example.com']}), []);
});
test('existing settings migrate to global mode without losing profile', () => {
  const stored = {enabled: true, timeZone: 'Asia/Tokyo', languages: ['ru-RU', 'ru']};
  assert.deepEqual(normalizeSettings(stored), {...stored, siteMode: 'exclude', sites: []});
  assert.throws(() => normalizeSettings({...stored, siteMode: 'wrong'}), RangeError);
});
