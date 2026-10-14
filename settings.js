export const DEFAULT_SETTINGS = Object.freeze({enabled: true, timeZone: 'UTC', languages: ['en-US', 'en'], siteMode: 'exclude', sites: []});
export const SCRIPT_ID = 'locale-timezone-main-v1';
export const RULE_ID = 1;
export const CONFIG_KEY = 'locale-timezone/config/v1';

export function normalizeSites(input) {
  if (!Array.isArray(input) || input.length > 100 || input.some(x => typeof x !== 'string' || !x.trim() || x.length > 2048)) {
    throw new RangeError('Укажите не более 100 доменов или HTTP/HTTPS-адресов.');
  }
  const domains = input.map(value => {
    const text = value.trim();
    let url;
    try { url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `http://${text}`); }
    catch { throw new RangeError('Некорректный адрес сайта: ' + text); }
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    const validLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !host || host.length > 253 || !host.split('.').every(x => validLabel.test(x))) {
      throw new RangeError('Некорректный адрес сайта: ' + text);
    }
    return host;
  });
  return [...new Set(domains)].sort();
}

export function siteApplies(settings, hostname) {
  if (!settings.enabled) return false;
  const sites = settings.sites || [];
  const host = hostname.toLowerCase().replace(/\.$/, '');
  const listed = sites.some(domain => host === domain || host.endsWith('.' + domain));
  return (settings.siteMode || 'exclude') === 'include' ? listed : !listed;
}

export function normalizeSettings(input) {
  if (!input || typeof input.enabled !== 'boolean') throw new TypeError('Некорректный переключатель.');
  if (typeof input.timeZone !== 'string' || input.timeZone.length > 100 || /^[+-]/.test(input.timeZone)) {
    throw new RangeError('Выберите часовой пояс IANA.');
  }
  const timeZone = new Intl.DateTimeFormat('en-US', {timeZone: input.timeZone}).resolvedOptions().timeZone;
  if (!Array.isArray(input.languages) || !input.languages.length || input.languages.length > 10 ||
      input.languages.some(x => typeof x !== 'string' || !x.trim() || x.length > 100)) {
    throw new RangeError('Укажите от 1 до 10 языков BCP 47.');
  }
  const languages = Intl.getCanonicalLocales(input.languages.map(x => x.trim()));
  const siteMode = input.siteMode ?? 'exclude';
  if (!['exclude', 'include'].includes(siteMode)) throw new RangeError('Выберите режим применения к сайтам.');
  const sites = normalizeSites(input.sites ?? []);
  return {enabled: input.enabled, timeZone, languages, siteMode, sites};
}

export function acceptLanguage(languages) {
  return languages.map((x, i) => i === 0 ? x : `${x};q=${(1 - i / 10).toFixed(1)}`).join(',');
}

export function makeScript(settings, packagedSource) {
  // Only canonical, validated JSON is interpolated; never user-provided source code.
  const json = JSON.stringify(settings).replace(/</g, '\\u003c');
  const marker = '/*FAKETL_CONFIG*/ undefined';
  if (!packagedSource.includes(marker)) throw new Error('Не удалось прочитать main.js из пакета расширения.');
  return {
    id: SCRIPT_ID, matches: ['http://*/*', 'https://*/*'], allFrames: true,
    runAt: 'document_start', world: 'MAIN',
    js: [{code: packagedSource.replace(marker, json)}]
  };
}

export function makeRules(settings) {
  if (!settings.enabled || (settings.siteMode === 'include' && !(settings.sites || []).length)) return [];
  const domains = settings.sites || [];
  const scope = domains.length ? {[settings.siteMode === 'include' ? 'topDomains' : 'excludedTopDomains']: domains} : {};
  return [{
    id: RULE_ID, priority: 1,
    action: {type: 'modifyHeaders', requestHeaders: [{header: 'accept-language', operation: 'set', value: acceptLanguage(settings.languages)}]},
    // All supported HTTP(S) resource types, including main/sub_frame and other.
    condition: {regexFilter: '^https?://', resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'webtransport', 'webbundle', 'other'], ...scope}
  }];
}
