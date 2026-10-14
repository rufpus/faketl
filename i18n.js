const messages = {
  ru: {
    interfaceLanguage: 'Интерфейс', interfaceLanguageAria: 'Язык интерфейса', enabled: 'Подмена включена',
    timeZone: 'Часовой пояс IANA', zoneSearch: 'Поиск: Москва, Tokyo, UTC…',
    zoneInfo: 'Сейчас {offset}. У региональных зон смещение зависит от даты. UTC всегда +0.',
    primaryLanguage: 'Основной язык (BCP 47)', otherLanguages: 'Остальные языки по приоритету',
    languagesPlaceholder: 'en, de-DE — через запятую или с новой строки', languageHint: 'Основной язык первый. До 10 языков; повторы удаляются.',
    save: 'Сохранить и применить', active: 'Активная конфигурация', checking: 'Проверка…', applying: 'Применение…',
    saved: 'Настройки сохранены и проверены. Перезагрузите открытые страницы.',
    disabled: 'Подмена выключена. После перезагрузки — исходные значения Chrome.',
    unconfirmed: 'Применение не подтверждено.', reloadNote: 'После изменения настроек перезагрузите открытые страницы.',
    reload: 'Перезагрузить текущую страницу', noResponse: 'Нет ответа от фонового обработчика.', noTab: 'Не найдена текущая вкладка.',
    uiSaved: 'Язык интерфейса сохранён. Настройки сайтов не изменились.', uiSaveFailed: 'Не удалось сохранить язык интерфейса: {error}'
  },
  en: {
    interfaceLanguage: 'Interface', interfaceLanguageAria: 'Interface language', enabled: 'Spoofing enabled',
    timeZone: 'IANA time zone', zoneSearch: 'Search: Moscow, Tokyo, UTC…',
    zoneInfo: 'Now {offset}. Regional offsets depend on the date. UTC is always +0.',
    primaryLanguage: 'Primary language (BCP 47)', otherLanguages: 'Other languages, in priority order',
    languagesPlaceholder: 'en, de-DE — separated by commas or new lines', languageHint: 'Primary language comes first. Up to 10 languages; duplicates are removed.',
    save: 'Save and apply', active: 'Active configuration', checking: 'Checking…', applying: 'Applying…',
    saved: 'Settings saved and verified. Reload open pages.',
    disabled: 'Spoofing is off. Reload pages to restore Chrome’s original values.',
    unconfirmed: 'Application not confirmed.', reloadNote: 'Reload open pages after changing settings.',
    reload: 'Reload current page', noResponse: 'No response from the background worker.', noTab: 'No active tab found.',
    uiSaved: 'Interface language saved. Website settings are unchanged.', uiSaveFailed: 'Could not save the interface language: {error}'
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
  ['Некорректный переключатель.', 'Invalid enabled setting.'],
  ['Выберите часовой пояс IANA.', 'Choose a valid IANA time zone.'],
  ['Укажите от 1 до 10 языков BCP 47.', 'Enter between 1 and 10 BCP 47 language tags.'],
  ['Не удалось прочитать main.js из пакета расширения.', 'Could not read main.js from the extension package.'],
  ['Нет доступа к userScripts. В chrome://extensions откройте «Подробнее» и включите «Разрешить пользовательские скрипты», затем снова сохраните настройки.', 'The userScripts API is unavailable. Open chrome://extensions, click Details, enable Allow User Scripts, then save the settings again.'],
  ['Сохранённые настройки и активные правила не совпадают. Нажмите «Сохранить и применить».', 'Saved settings do not match the active rules. Click Save and apply.'],
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
