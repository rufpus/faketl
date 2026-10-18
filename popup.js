import {DEFAULT_SETTINGS, normalizeSettings, normalizeSites, siteApplies} from './settings.js';
import {translate, localizedError, zoneLabel} from './i18n.js';
const $ = id => document.getElementById(id);
const zones = [...new Set(['UTC', 'Europe/Moscow', 'Europe/Berlin', 'America/New_York', 'Asia/Tokyo', ...Intl.supportedValuesOf('timeZone')])];
let selectedZone = 'UTC';
let uiLanguage = 'ru';
let activeSettings = null;
let messageState = null;
let applicationError = null;
let selectedTab = 'profile';
let currentSite = '';
const t = (key, values) => translate(uiLanguage, key, values);
const flags = [...document.querySelectorAll('[data-ui-language]')];
const draftSiteMode = () => document.querySelector('[name="site-mode"]:checked').value;
const draftSites = () => $('site-list').value.split(/[\s,]+/).map(x => x.trim()).filter(Boolean);
function offset(zone) {
  return new Intl.DateTimeFormat(uiLanguage === 'en' ? 'en-US' : 'ru-RU', {timeZone: zone, timeZoneName: 'longOffset'})
    .formatToParts(new Date()).find(p => p.type === 'timeZoneName').value.replace('GMT', 'UTC');
}
function renderZones() {
  const query = $('zone-search').value.trim().toLowerCase();
  const visible = zones.filter(zone => zone === selectedZone || `${zone} ${zoneLabel(zone, uiLanguage)}`.toLowerCase().includes(query));
  $('time-zone').replaceChildren(...visible.map(zone => {
    const option = document.createElement('option'); option.value = zone;
    option.textContent = `${zoneLabel(zone, uiLanguage)} · ${zone} (${offset(zone)})`;
    option.selected = zone === selectedZone; return option;
  }));
  $('zone-info').textContent = t('zoneInfo', {offset: offset(selectedZone)});
}
function renderSites() {
  const include = draftSiteMode() === 'include';
  $('site-list-label').textContent = t(include ? 'includedLabel' : 'exceptionsLabel');
  $('scope-note').textContent = t(draftSites().length ? (include ? 'includeNote' : 'excludeNote') : (include ? 'includeEmpty' : 'excludeEmpty'));
  const state = currentSite && activeSettings && !applicationError ? t(siteApplies(activeSettings, currentSite) ? 'siteWillSpoof' : 'siteWillOriginal') : '';
  $('current-site').textContent = currentSite ? t('currentSite', {site: currentSite}) + (state ? '\n' + state : '') : t('noCurrentSite');
}
function renderEnabled() { $('enabled-state').textContent = t($('enabled').checked ? 'on' : 'off'); }
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
  else if (!activeSettings.enabled) $('active').textContent = t('disabled');
  else {
    const count = activeSettings.sites?.length || 0;
    const scope = activeSettings.siteMode === 'include' ? t('scopeInclude', {count}) : count ? t('scopeExclude', {count}) : t('scopeAll');
    $('active').textContent = `${activeSettings.timeZone} · ${activeSettings.languages.join(' → ')}\n${scope}`;
  }
}
function selectTab(name, focus = false) {
  selectedTab = name;
  for (const tab of ['profile', 'sites']) {
    const selected = tab === name;
    $('tab-' + tab).setAttribute('aria-selected', String(selected));
    $('tab-' + tab).tabIndex = selected ? 0 : -1;
    $('panel-' + tab).hidden = !selected;
  }
  document.querySelector('main').scrollTop = 0;
  if (focus) $('tab-' + name).focus();
}
function renderInterface() {
  document.documentElement.lang = uiLanguage;
  for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
  for (const element of document.querySelectorAll('[data-i18n-placeholder]')) element.placeholder = t(element.dataset.i18nPlaceholder);
  for (const element of document.querySelectorAll('[data-i18n-aria]')) element.setAttribute('aria-label', t(element.dataset.i18nAria));
  for (const flag of flags) flag.setAttribute('aria-pressed', String(flag.dataset.uiLanguage === uiLanguage));
  renderZones(); renderSites(); renderEnabled(); renderActive(); renderMessage();
}
function fill(settings) {
  $('enabled').checked = settings.enabled;
  selectedZone = settings.timeZone;
  if (!zones.includes(selectedZone)) zones.unshift(selectedZone);
  $('primary-language').value = settings.languages[0];
  $('other-languages').value = settings.languages.slice(1).join(', ');
  document.querySelector(`[name="site-mode"][value="${settings.siteMode || 'exclude'}"]`).checked = true;
  $('site-list').value = (settings.sites || []).join('\n');
  renderZones(); renderSites(); renderEnabled();
}
function dirty() { if (!applicationError) message('unsaved'); }
for (const flag of flags) flag.addEventListener('click', async () => {
  const next = flag.dataset.uiLanguage;
  if (next === uiLanguage) return;
  flags.forEach(button => { button.disabled = true; });
  try {
    await chrome.storage.local.set({uiLanguage: next}); uiLanguage = next; renderInterface();
    if (!applicationError && messageState?.kind !== 'error' && messageState?.key !== 'unsaved') message('uiSaved', 'success');
  } catch (e) { message('uiSaveFailed', 'error', {error: localizedError(e, uiLanguage)}); }
  finally { flags.forEach(button => { button.disabled = false; }); }
});
for (const tab of ['profile', 'sites']) $('tab-' + tab).addEventListener('click', () => selectTab(tab));
document.querySelector('.tabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  selectTab(event.key === 'Home' ? 'profile' : event.key === 'End' ? 'sites' : selectedTab === 'profile' ? 'sites' : 'profile', true);
});
$('zone-search').addEventListener('input', renderZones);
$('time-zone').addEventListener('change', () => { selectedZone = $('time-zone').value; renderZones(); dirty(); });
$('enabled').addEventListener('change', () => { renderEnabled(); dirty(); });
$('settings-form').addEventListener('input', event => { if (event.target.id !== 'zone-search') { renderSites(); dirty(); } });
$('settings-form').addEventListener('change', renderSites);
async function activeSite() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab?.url) return '';
  const url = new URL(tab.url);
  return /^https?:$/.test(url.protocol) ? normalizeSites([url.href])[0] : '';
}
$('add-site').addEventListener('click', async () => {
  try {
    currentSite = await activeSite();
    if (!currentSite) throw new Error(t('noCurrentSite'));
    $('site-list').value = normalizeSites([...draftSites(), currentSite]).join('\n');
    renderSites(); dirty();
  } catch (e) { errorMessage(e); }
});
$('settings-form').addEventListener('submit', async event => {
  event.preventDefault(); $('save').disabled = true; message('applying');
  try {
    const languages = [$('primary-language').value, ...$('other-languages').value.split(/[,\n]+/).map(x => x.trim()).filter(Boolean)];
    const settings = normalizeSettings({enabled: $('enabled').checked, timeZone: selectedZone, languages, siteMode: draftSiteMode(), sites: draftSites()});
    const result = await chrome.runtime.sendMessage({type: 'save', settings});
    if (!result?.ok) throw new Error(result?.error || t('noResponse'));
    fill(result.settings); activeSettings = result.settings; applicationError = null; renderActive(); renderSites(); message('saved', 'success');
  } catch (e) { applicationError = e; renderActive(); errorMessage(e); }
  finally { $('save').disabled = false; }
});
$('reload').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab?.id) throw new Error(t('noTab'));
    await chrome.tabs.reload(tab.id); window.close();
  } catch (e) { errorMessage(e); }
});
fill(DEFAULT_SETTINGS); selectTab('profile');
flags.forEach(button => { button.disabled = true; });
try { const stored = await chrome.storage.local.get('uiLanguage'); uiLanguage = stored.uiLanguage === 'en' ? 'en' : 'ru'; }
catch (e) { errorMessage(e); }
renderInterface(); flags.forEach(button => { button.disabled = false; });
try {
  const status = await chrome.runtime.sendMessage({type: 'status'});
  if (status?.settings) fill(status.settings);
  if (!status?.ok) throw new Error(status?.error || t('noResponse'));
  activeSettings = status.settings; renderActive();
} catch (e) { applicationError = e; renderActive(); errorMessage(e); }
finally { $('save').disabled = false; }
try { currentSite = await activeSite(); renderSites(); } catch { /* Manual site entry remains available. */ }
