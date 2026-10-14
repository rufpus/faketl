export const DEFAULT_SETTINGS = Object.freeze({enabled: true, timeZone: 'UTC', languages: ['en-US', 'en']});
export const SCRIPT_ID = 'locale-timezone-main-v1';
export const RULE_ID = 1;
export const CONFIG_KEY = 'locale-timezone/config/v1';

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
  return {enabled: input.enabled, timeZone, languages};
}

export function acceptLanguage(languages) {
  return languages.map((x, i) => i === 0 ? x : `${x};q=${(1 - i / 10).toFixed(1)}`).join(',');
}

export function makeScript(settings, packagedSource) {
  // Only canonical, validated JSON is interpolated; never user-provided source code.
  const json = JSON.stringify(settings).replace(/</g, '\\u003c');
  return {
    id: SCRIPT_ID, matches: ['http://*/*', 'https://*/*'], allFrames: true,
    runAt: 'document_start', world: 'MAIN',
    js: [{code: `globalThis[Symbol.for(${JSON.stringify(CONFIG_KEY)})] = ${json};\n${packagedSource}`}]
  };
}

export function makeRules(settings) {
  return settings.enabled ? [{
    id: RULE_ID, priority: 1,
    action: {type: 'modifyHeaders', requestHeaders: [{header: 'accept-language', operation: 'set', value: acceptLanguage(settings.languages)}]},
    // All supported HTTP(S) resource types, including main/sub_frame and other.
    condition: {regexFilter: '^https?://', resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'webtransport', 'webbundle', 'other']}
  }] : [];
}
