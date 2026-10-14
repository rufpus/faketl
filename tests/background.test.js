import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as settingsModule from '../settings.js';

const source = readFileSync(new URL('../background.js', import.meta.url), 'utf8').replace(/^import .*?;\r?\n/, '');
const core = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
const copy = x => structuredClone(x);
async function harness(initial = {}) {
  const state = {storage: copy(initial), scripts: [], rules: [], fail: null, listener: null};
  const fail = kind => { if (state.fail === kind) { state.fail = null; throw new Error(`simulated ${kind} failure`); } };
  const chrome = {
    runtime: {id: 'test', getURL: file => 'chrome-extension://test/' + file,
      onInstalled: {addListener() {}}, onStartup: {addListener() {}}, onMessage: {addListener(fn) { state.listener = fn; }}},
    action: {async setBadgeText() {}, async setBadgeBackgroundColor() {}},
    storage: {local: {
      async get(keys) { return copy(Object.fromEntries(keys.filter(k => k in state.storage).map(k => [k, state.storage[k]]))); },
      async set(data) { if ('settings' in data) fail('storage'); Object.assign(state.storage, copy(data)); },
      async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete state.storage[key]; }
    }},
    userScripts: {
      async getScripts() { return copy(state.scripts); },
      async register(scripts) { fail('script'); state.scripts = copy(scripts); },
      async update(scripts) { fail('script'); state.scripts = copy(scripts); },
      async unregister() { fail('script'); state.scripts = []; }
    },
    declarativeNetRequest: {
      async getDynamicRules() { return copy(state.rules); },
      async updateDynamicRules({addRules}) { fail('network'); state.rules = copy(addRules); }
    }
  };
  vm.runInNewContext(source, {...settingsModule, chrome, console: {error() {}}, fetch: async () => ({ok: true, text: async () => core})});
  const sender = {id: 'test', url: chrome.runtime.getURL('popup.html')};
  const send = msg => new Promise(resolve => state.listener(msg, sender, resolve));
  await send({type: 'status'});
  return {state, send};
}
for (const failure of ['network', 'script', 'storage']) {
  test(`failed ${failure} update does not report success and restores old settings`, async () => {
    const {state, send} = await harness();
    const scripts = copy(state.scripts); const rules = copy(state.rules); const saved = copy(state.storage.settings);
    state.fail = failure;
    const result = await send({type: 'save', settings: {enabled: true, timeZone: 'America/New_York', languages: ['de-DE', 'de'], siteMode: 'include', sites: ['allowed.test']}});
    assert.equal(result.ok, false); assert.match(result.error, new RegExp(failure));
    assert.deepEqual(state.scripts, scripts); assert.deepEqual(state.rules, rules); assert.deepEqual(state.storage.settings, saved);
    assert.ok(state.storage.applyError); assert.equal(state.storage.pending, undefined);
  });
}
test('disable removes network and script registration; page cannot call privileged endpoint', async () => {
  const {state, send} = await harness();
  const result = await send({type: 'save', settings: {...settingsModule.DEFAULT_SETTINGS, enabled: false}});
  assert.equal(result.ok, true); assert.deepEqual(state.rules, []); assert.deepEqual(state.scripts, []);
  assert.equal(state.listener({type: 'save'}, {id: 'test', url: 'https://example.test/'}, () => {}), false);
});
test('unfinished application is reconciled from durable intent on worker start', async () => {
  const desired = {enabled: true, timeZone: 'Europe/Berlin', languages: ['de-DE', 'de']};
  const {state, send} = await harness({settings: settingsModule.DEFAULT_SETTINGS, pending: desired});
  assert.equal((await send({type: 'status'})).ok, true);
  assert.deepEqual(state.storage.settings, settingsModule.normalizeSettings(desired)); assert.equal(state.storage.pending, undefined);
});
