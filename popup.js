import {DEFAULT_SETTINGS, normalizeSettings, acceptLanguage} from './settings.js';
import {translate, localizedError, zoneLabel} from './i18n.js';
const $ = id => document.getElementById(id);
const zones = [...new Set(['UTC', 'Europe/Moscow', 'Europe/Berlin', 'America/New_York', 'Asia/Tokyo', ...Intl.supportedValuesOf('timeZone')])];
let selectedZone = 'UTC';
let uiLanguage = 'ru';
let activeSettings = null;
let messageState = null;
let applicationError = null;
const t = (key, values) => translate(uiLanguage, key, values);
function offset(zone) {
  return new Intl.DateTimeFormat(uiLanguage === 'en' ? 'en-US' : 'ru-RU', {timeZone: zone, timeZoneName: 'longOffset'})
    .formatToParts(new Date()).find(p => p.type === 'timeZoneName').value.replace('GMT', 'UTC');
}
function renderZones() {
  const query = $('zone-search').value.trim().toLowerCase();
  const visible = zones.filter(zone => zone === selectedZone || `${zone} ${zoneLabel(zone, uiLanguage)}`.toLowerCase().includes(query));
  $('time-zone').replaceChildren(...visible.map(zone => {
    const option = document.createElement('option');
    option.value = zone;
    option.textContent = `${zoneLabel(zone, uiLanguage)} · ${zone} (${offset(zone)})`;
    option.selected = zone === selectedZone;
    return option;
  }));
  $('zone-info').textContent = t('zoneInfo', {offset: offset(selectedZone)});
}
function renderMessage() {
  $('message').textContent = !messageState ? '' : messageState.error
    ? localizedError(messageState.error, uiLanguage) : t(messageState.key, messageState.values);
  $('message').className = messageState?.kind || '';
}
function message(key, kind = '', values) { messageState = {key, kind, values}; renderMessage(); }
function errorMessage(error) { messageState = {error, kind: 'error'}; renderMessage(); }
function renderActive() {
  if (applicationError) $('active').textContent = t('unconfirmed') + ' ' + localizedError(applicationError, uiLanguage);
  else if (!activeSettings) $('active').textContent = t('checking');
  else $('active').textContent = activeSettings.enabled
    ? `${activeSettings.timeZone}\n${activeSettings.languages.join(' → ')}\nAccept-Language: ${acceptLanguage(activeSettings.languages)}` : t('disabled');
}
function renderInterface() {
  document.documentElement.lang = uiLanguage;
  for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
  for (const element of document.querySelectorAll('[data-i18n-placeholder]')) element.placeholder = t(element.dataset.i18nPlaceholder);
  for (const element of document.querySelectorAll('[data-i18n-aria]')) element.setAttribute('aria-label', t(element.dataset.i18nAria));
  $('ui-language').value = uiLanguage;
  $('ui-language').setAttribute('aria-label', t('interfaceLanguageAria'));
  renderZones(); renderActive(); renderMessage();
}
function fill(settings) {
  $('enabled').checked = settings.enabled;
  selectedZone = settings.timeZone;
  if (!zones.includes(selectedZone)) zones.unshift(selectedZone);
  $('primary-language').value = settings.languages[0];
  $('other-languages').value = settings.languages.slice(1).join(', ');
  renderZones();
}
$('ui-language').addEventListener('change', async () => {
  const next = $('ui-language').value;
  $('ui-language').disabled = true;
  try {
    await chrome.storage.local.set({uiLanguage: next});
    uiLanguage = next;
    renderInterface();
    if (!applicationError && messageState?.kind !== 'error') message('uiSaved', 'success');
  } catch (e) {
    $('ui-language').value = uiLanguage;
    message('uiSaveFailed', 'error', {error: localizedError(e, uiLanguage)});
  } finally { $('ui-language').disabled = false; }
});
$('zone-search').addEventListener('input', renderZones);
$('time-zone').addEventListener('change', () => { selectedZone = $('time-zone').value; renderZones(); });
$('settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('save').disabled = true;
  message('applying');
  try {
    const languages = [$('primary-language').value, ...$('other-languages').value.split(/[,\n]+/).map(x => x.trim()).filter(Boolean)];
    const settings = normalizeSettings({enabled: $('enabled').checked, timeZone: selectedZone, languages});
    const result = await chrome.runtime.sendMessage({type: 'save', settings});
    if (!result?.ok) throw new Error(result?.error || t('noResponse'));
    fill(result.settings); activeSettings = result.settings; applicationError = null; renderActive();
    message('saved', 'success');
  } catch (e) {
    applicationError = e; renderActive(); errorMessage(e);
  } finally { $('save').disabled = false; }
});
$('reload').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab?.id) throw new Error(t('noTab'));
    await chrome.tabs.reload(tab.id);
    window.close();
  } catch (e) { errorMessage(e); }
});
fill(DEFAULT_SETTINGS);
$('ui-language').disabled = true;
try {
  const stored = await chrome.storage.local.get('uiLanguage');
  uiLanguage = stored.uiLanguage === 'en' ? 'en' : 'ru';
} catch (e) { errorMessage(e); }
renderInterface();
$('ui-language').disabled = false;
try {
  const status = await chrome.runtime.sendMessage({type: 'status'});
  if (status?.settings) fill(status.settings);
  if (!status?.ok) throw new Error(status?.error || t('noResponse'));
  activeSettings = status.settings; renderActive();
} catch (e) { applicationError = e; renderActive(); errorMessage(e); }
finally { $('save').disabled = false; }
