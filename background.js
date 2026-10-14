import {DEFAULT_SETTINGS, SCRIPT_ID, RULE_ID, normalizeSettings, makeRules, makeScript} from './settings.js';

let queue = Promise.resolve();
const serial = task => {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
};
const errorText = e => e?.message || String(e);
let sourcePromise;
function packagedSource() {
  if (!sourcePromise) sourcePromise = fetch(chrome.runtime.getURL('main.js')).then(response => {
    if (!response.ok) throw new Error('Не удалось прочитать main.js из пакета расширения.');
    return response.text();
  }).catch(error => { sourcePromise = undefined; throw error; });
  return sourcePromise;
}

async function userScripts() {
  try {
    return await chrome.userScripts.getScripts({ids: [SCRIPT_ID]});
  } catch {
    throw new Error('Нет доступа к userScripts. В chrome://extensions откройте «Подробнее» и включите «Разрешить пользовательские скрипты», затем снова сохраните настройки.');
  }
}

async function writeScript(settings) {
  const existing = await userScripts();
  if (!settings.enabled) {
    if (existing.length) await chrome.userScripts.unregister({ids: [SCRIPT_ID]});
  } else {
    const next = makeScript(settings, await packagedSource());
    if (existing.length) await chrome.userScripts.update([next]);
    else await chrome.userScripts.register([next]);
  }
}

async function inspect(settings) {
  const scripts = await userScripts();
  const rules = (await chrome.declarativeNetRequest.getDynamicRules()).filter(x => x.id === RULE_ID);
  const expected = settings.enabled ? makeScript(settings, await packagedSource()) : null;
  const scriptOK = expected ? scripts.length === 1 &&
    scripts[0].world === 'MAIN' && scripts[0].runAt === 'document_start' && scripts[0].allFrames === true &&
    JSON.stringify(scripts[0].matches) === JSON.stringify(expected.matches) &&
    JSON.stringify(scripts[0].js) === JSON.stringify(expected.js) : scripts.length === 0;
  const expectedRules = makeRules(settings);
  const ruleOK = expectedRules.length ? rules.length === 1 && rules[0].action.type === 'modifyHeaders' &&
    rules[0].action.requestHeaders?.[0]?.value === makeRules(settings)[0].action.requestHeaders[0].value &&
    rules[0].action.requestHeaders?.[0]?.operation === 'set' && rules[0].condition.regexFilter === '^https?://' &&
    JSON.stringify([...(rules[0].condition.resourceTypes || [])].sort()) === JSON.stringify([...expectedRules[0].condition.resourceTypes].sort()) &&
    ['topDomains', 'excludedTopDomains'].every(key => JSON.stringify([...(rules[0].condition[key] || [])].sort()) === JSON.stringify([...(expectedRules[0].condition[key] || [])].sort())) : rules.length === 0;
  if (!scriptOK || !ruleOK) throw new Error('Сохранённые настройки и активные правила не совпадают. Нажмите «Сохранить».');
}

async function apply(input) {
  const next = normalizeSettings(input);
  const previousScripts = await userScripts();
  const previousRules = (await chrome.declarativeNetRequest.getDynamicRules()).filter(x => x.id === RULE_ID);
  const previousStorage = await chrome.storage.local.get(['settings', 'applyError', 'pending']);
  // Durable intent: an interrupted transaction is completed on the next worker start.
  await chrome.storage.local.set({pending: next});
  try {
    await writeScript(next);
    await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds: [RULE_ID], addRules: makeRules(next)});
    await inspect(next);
    await chrome.storage.local.set({settings: next, applyError: null});
    await chrome.storage.local.remove('pending');
    await chrome.action.setBadgeText({text: ''});
    return next;
  } catch (error) {
    const failures = [];
    try {
      const current = await userScripts();
      if (previousScripts.length) {
        if (current.length) await chrome.userScripts.update(previousScripts);
        else await chrome.userScripts.register(previousScripts);
      } else if (current.length) await chrome.userScripts.unregister({ids: [SCRIPT_ID]});
    } catch (e) { failures.push(errorText(e)); }
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds: [RULE_ID], addRules: previousRules});
    } catch (e) { failures.push(errorText(e)); }
    const message = errorText(error) + (failures.length ? ` Откат неполный: ${failures.join('; ')}` : ' Предыдущая конфигурация восстановлена.');
    try {
      if (previousStorage.settings) await chrome.storage.local.set({settings: previousStorage.settings});
      else await chrome.storage.local.remove('settings');
      await chrome.storage.local.set({applyError: message});
      if (!failures.length) await chrome.storage.local.remove('pending');
      await chrome.action.setBadgeText({text: '!'});
      await chrome.action.setBadgeBackgroundColor({color: '#b42318'});
    } catch { /* The caller still receives the original failure. */ }
    throw new Error(message);
  }
}

async function initialize() {
  const saved = await chrome.storage.local.get(['settings', 'pending']);
  const desired = saved.pending || saved.settings || DEFAULT_SETTINGS;
  if (!saved.settings) await chrome.storage.local.set({settings: normalizeSettings(desired)});
  try {
    if (!saved.pending && saved.settings) {
      await inspect(normalizeSettings(desired));
      return;
    }
  } catch { /* Reconcile lost registration after extension update. */ }
  await apply(desired);
}

// Register event handlers synchronously before doing any asynchronous work.
chrome.runtime.onInstalled.addListener(() => { serial(initialize).catch(recordFailure); });
chrome.runtime.onStartup.addListener(() => { serial(initialize).catch(recordFailure); });
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  // No page bridge, no externally_connectable, no content-script privileged endpoint.
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('popup.html')) return false;
  serial(async () => {
    if (message?.type === 'save') return {ok: true, settings: await apply(message.settings)};
    if (message?.type === 'status') {
      const saved = await chrome.storage.local.get(['settings', 'applyError', 'pending']);
      const settings = normalizeSettings(saved.settings || DEFAULT_SETTINGS);
      try {
        if (saved.pending) throw new Error('Применение прервано. Сохраните настройки ещё раз.');
        await inspect(settings);
        return {ok: true, settings};
      } catch (e) { return {ok: false, settings, error: saved.applyError || errorText(e)}; }
    }
    throw new Error('Неизвестная операция.');
  }).then(respond, e => respond({ok: false, error: errorText(e)}));
  return true;
});
async function recordFailure(error) {
  console.error(error);
  try {
    await chrome.storage.local.set({applyError: errorText(error)});
    await chrome.action.setBadgeText({text: '!'});
  } catch { /* Storage can itself be unavailable. */ }
}
serial(initialize).catch(recordFailure);
