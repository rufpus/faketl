const messages = {
  ru: {
    interfaceLanguage: 'Интерфейс', interfaceLanguageAria: 'Язык интерфейса', enabled: 'Подмена данных',
    timeZone: 'Часовой пояс', zoneSearch: 'Найти город или часовой пояс…',
    zoneInfo: 'Сейчас {offset}. У региональных зон смещение зависит от даты. UTC всегда +0.',
    primaryLanguage: 'Основной язык сайта', otherLanguages: 'Другие языки по приоритету',
    languagesPlaceholder: 'Например: en, de-DE', languageHint: 'Теги BCP 47: en-US, ru-RU. Основной язык — первый в списке. До 10 языков.',
    save: 'Сохранить', active: 'Сохранённый профиль', checking: 'Проверка…', applying: 'Применение…',
    saved: 'Настройки сохранены и проверены. Перезагрузите открытые страницы.',
    disabled: 'Подмена выключена. После перезагрузки — исходные значения Chrome.',
    unconfirmed: 'Применение не подтверждено.', reloadNote: 'После изменения настроек перезагрузите открытые страницы.',
    reload: 'Перезагрузить', noResponse: 'Нет ответа от фонового обработчика.', noTab: 'Не найдена текущая вкладка.',
    uiSaved: 'Язык интерфейса сохранён. Настройки сайтов не изменились.', uiSaveFailed: 'Не удалось сохранить язык интерфейса: {error}',
    settingsTabs: 'Разделы настроек', profileTab: 'Язык и время', sitesTab: 'Сайты',
    on: 'Включено', off: 'Выключено', unsaved: 'Есть изменения. Нажмите «Сохранить».',
    scopeTitle: 'Где применять подмену', excludeMode: 'Везде, кроме списка', includeMode: 'Только на сайтах из списка',
    excludeDescription: 'Указанные сайты увидят исходные значения.', includeDescription: 'Все остальные сайты увидят исходные значения.',
    exceptionsLabel: 'Сайты без подмены', includedLabel: 'Сайты с подменой', sitesPlaceholder: 'example.com\nnews.example.org',
    sitesHint: 'Домены или адреса, по одному на строку. Поддомены включены; путь и порт не учитываются. До 100 сайтов.',
    addCurrentSite: 'Добавить текущий сайт', currentSite: 'Текущий сайт: {site}', noCurrentSite: 'Откройте обычный HTTP/HTTPS-сайт, чтобы добавить его.',
    siteWillSpoof: 'После перезагрузки: подмена.', siteWillOriginal: 'После перезагрузки: исходные значения.',
    excludeEmpty: 'Список пуст: подмена работает на всех доступных сайтах.', includeEmpty: 'Список пуст: подмена не применяется ни к одному сайту.',
    excludeNote: 'Сайты из списка и их поддомены будут пропущены.', includeNote: 'Подмена действует только на сайтах из списка и их поддоменах.',
    scopeAll: 'Все доступные сайты', scopeExclude: 'Все сайты, кроме исключений: {count}', scopeInclude: 'Только сайты из списка: {count}'
  },
  en: {
    interfaceLanguage: 'Interface', interfaceLanguageAria: 'Interface language', enabled: 'Data spoofing',
    timeZone: 'Time zone', zoneSearch: 'Find a city or time zone…',
    zoneInfo: 'Now {offset}. Regional offsets depend on the date. UTC is always +0.',
    primaryLanguage: 'Primary website language', otherLanguages: 'Other languages, in priority order',
    languagesPlaceholder: 'For example: en, de-DE', languageHint: 'BCP 47 tags: en-US, ru-RU. Your primary language comes first. Up to 10 languages.',
    save: 'Save', active: 'Saved profile', checking: 'Checking…', applying: 'Applying…',
    saved: 'Settings saved and verified. Reload open pages.',
    disabled: 'Spoofing is off. Reload pages to restore Chrome’s original values.',
    unconfirmed: 'Application not confirmed.', reloadNote: 'Reload open pages after changing settings.',
    reload: 'Reload page', noResponse: 'No response from the background worker.', noTab: 'No active tab found.',
    uiSaved: 'Interface language saved. Website settings are unchanged.', uiSaveFailed: 'Could not save the interface language: {error}',
    settingsTabs: 'Settings sections', profileTab: 'Language & time', sitesTab: 'Websites',
    on: 'On', off: 'Off', unsaved: 'Unsaved changes. Click Save.',
    scopeTitle: 'Where to apply spoofing', excludeMode: 'Everywhere except the list', includeMode: 'Only websites in the list',
    excludeDescription: 'Listed websites see the original values.', includeDescription: 'All other websites see the original values.',
    exceptionsLabel: 'Websites without spoofing', includedLabel: 'Websites with spoofing', sitesPlaceholder: 'example.com\nnews.example.org',
    sitesHint: 'Domains or URLs, one per line. Subdomains are included; paths and ports are ignored. Up to 100 websites.',
    addCurrentSite: 'Add current website', currentSite: 'Current website: {site}', noCurrentSite: 'Open a regular HTTP/HTTPS website to add it.',
    siteWillSpoof: 'After reloading: spoofed values.', siteWillOriginal: 'After reloading: original values.',
    excludeEmpty: 'The list is empty: spoofing applies to all accessible websites.', includeEmpty: 'The list is empty: spoofing applies to no websites.',
    excludeNote: 'Listed websites and their subdomains will be skipped.', includeNote: 'Spoofing applies only to listed websites and their subdomains.',
    scopeAll: 'All accessible websites', scopeExclude: 'All websites, except listed exceptions: {count}', scopeInclude: 'Only listed websites: {count}'
  }
};
export function translate(language, key, values = {}) {
  const text = messages[language === 'en' ? 'en' : 'ru'][key];
  if (text === undefined) throw new Error(`Unknown translation: ${key}`);
  return text.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? `{${name}}`);
}
const errorTranslations = [
  ['Нет ответа от фонового обработчика.', 'No response from the background worker.'],
  ['Не найдена текущая вкладка.', 'No active tab found.'],
  ['Укажите не более 100 доменов или HTTP/HTTPS-адресов.', 'Enter up to 100 domains or HTTP/HTTPS URLs.'],
  ['Некорректный адрес сайта:', 'Invalid website address:'],
  ['Выберите режим применения к сайтам.', 'Choose a website mode.'],
  ['Откройте обычный HTTP/HTTPS-сайт, чтобы добавить его.', 'Open a regular HTTP/HTTPS website to add it.'],
  ['Некорректный переключатель.', 'Invalid enabled setting.'],
  ['Выберите часовой пояс IANA.', 'Choose a valid IANA time zone.'],
  ['Укажите от 1 до 10 языков BCP 47.', 'Enter between 1 and 10 BCP 47 language tags.'],
  ['Не удалось прочитать main.js из пакета расширения.', 'Could not read main.js from the extension package.'],
  ['Нет доступа к userScripts. В chrome://extensions откройте «Подробнее» и включите «Разрешить пользовательские скрипты», затем снова сохраните настройки.', 'The userScripts API is unavailable. Open chrome://extensions, click Details, enable Allow User Scripts, then save the settings again.'],
  ['Сохранённые настройки и активные правила не совпадают. Нажмите «Сохранить и применить».', 'Saved settings do not match the active rules. Click Save and apply.'],
  ['Сохранённые настройки и активные правила не совпадают. Нажмите «Сохранить».', 'Saved settings do not match the active rules. Click Save.'],
  ['Применение прервано. Сохраните настройки ещё раз.', 'Application was interrupted. Save the settings again.'],
  ['Неизвестная операция.', 'Unknown operation.'],
  ['Откат неполный:', 'Rollback is incomplete:'],
  ['Предыдущая конфигурация восстановлена.', 'The previous configuration has been restored.']
];
export function localizedError(error, language) {
  let text = error?.message || String(error);
  if (language === 'en') for (const [ru, en] of errorTranslations) text = text.replaceAll(ru, en);
  return text;
}
const cityNames = {
  ru: {UTC: 'UTC — постоянное UTC+0', 'Europe/Moscow': 'Москва', 'Europe/Berlin': 'Берлин', 'America/New_York': 'Нью-Йорк', 'Asia/Tokyo': 'Токио', 'Europe/London': 'Лондон', 'Asia/Kolkata': 'Калькутта', 'Asia/Calcutta': 'Калькутта', 'America/Los_Angeles': 'Лос-Анджелес'},
  en: {UTC: 'UTC — fixed UTC+0', 'Europe/Moscow': 'Moscow', 'Europe/Berlin': 'Berlin', 'America/New_York': 'New York', 'Asia/Tokyo': 'Tokyo', 'Europe/London': 'London', 'Asia/Kolkata': 'Kolkata', 'Asia/Calcutta': 'Kolkata', 'America/Los_Angeles': 'Los Angeles'}
};
export function zoneLabel(zone, language) {
  return cityNames[language === 'en' ? 'en' : 'ru'][zone] || new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'ru-RU', {timeZone: zone, timeZoneName: 'long'})
    .formatToParts(new Date()).find(p => p.type === 'timeZoneName').value;
}
