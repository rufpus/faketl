# FakeTL — FakeTimeLanguage

[Русский](#русский) · [English](#english) · [Release 1.2.1](https://github.com/rufpus/faketl/releases/tag/v1.2.1) · [Source](https://github.com/rufpus/faketl)

![FTL icon](icons/icon128.png)

## Русский

### Что делает расширение

FakeTL позволяет выбрать язык и часовой пояс, которые сайты получают через поддерживаемые JavaScript API и HTTP-заголовок `Accept-Language`. Например, при русских настройках компьютера и UTC+3 можно выбрать `UTC` и языки `en-US`, `en`: после перезагрузки поддерживаемые интерфейсы сайта покажут эту конфигурацию, а сервер получит `Accept-Language: en-US,en;q=0.9`.

Это расширение Manifest V3 на JavaScript, HTML и CSS. Сборщик, внешние зависимости, удалённый код, телеметрия и внешние сервисы для его работы не нужны. **Требуется Chrome 145+**: фильтрация сетевых запросов по сайту в адресной строке использует `topDomains` / `excludedTopDomains`, доступные с версии 145.

### Установка и обновление

1. Скачайте **`FakeTL-1.2.1.zip`** из [релиза](https://github.com/rufpus/faketl/releases/tag/v1.2.1) и распакуйте его. Также можно использовать **Code → Download ZIP** или локальный `FakeTL.zip`. В выбранной папке должны находиться `manifest.json`, файлы `.js`, `popup.html`, `popup.css` и каталог `icons`.
2. Откройте `chrome://extensions` и включите **«Режим разработчика»**.
3. Нажмите **«Загрузить распакованное расширение»**, выберите папку с `manifest.json`.
4. В карточке FakeTL нажмите **«Подробнее»** и включите **«Разрешить пользовательские скрипты»**. Без этого доступа popup сообщит, что применение не подтверждено.
5. Разрешите доступ к сайтам, на которых хотите использовать FakeTL. Для режима «везде, кроме списка» нужен доступ ко всем нужным HTTP/HTTPS-сайтам. При желании закрепите FakeTL на панели инструментов.
6. Откройте FakeTL, настройте профиль, нажмите **«Сохранить»**, дождитесь подтверждения и перезагрузите открытые страницы.

При обновлении замените файлы в той же папке и нажмите **обновление расширения** в `chrome://extensions`, затем перезагрузите сайты. Существующие настройки сохраняются. Настройки версий 1.0/1.1 автоматически получают режим «везде, кроме списка» с пустым списком; выбранные зона и языки сохраняются.

Версия **1.2.1** добавляет лаконичную иконку **FTL** в лавандово-бирюзовой палитре для панели Chrome и карточки расширения. Релиз содержит ZIP и файл SHA-256. [История изменений](CHANGELOG.md). Исходник — `icons/ftl.svg`, готовые PNG — 16/32/48/128 пикселей. Chrome использует PNG; SVG включён для редактирования.

### Язык, время и интерфейс

- Общий переключатель включает или выключает подмену. Изменение начинает действовать после **«Сохранить»** и перезагрузки страниц.
- Вкладка **«Язык и время»** содержит поиск и список зон IANA, например `UTC`, `Europe/Moscow`, `Europe/Berlin`, `America/New_York`, `Asia/Tokyo`. Указанное смещение относится к текущей дате; региональные зоны могут менять его зимой и летом. Для постоянного UTC+0 выбирайте **`UTC`**, а не `Europe/London`.
- Основной язык вводится тегом BCP 47: `en-US`, `en-GB`, `ru-RU`, `de-DE`. Другие языки перечисляются по приоритету через запятую или с новой строки. До 10 языков; регистр нормализуется, дубликаты удаляются, исходные языки Chrome не добавляются.
- Нажмите **флаг России** для русского интерфейса или **флаг Великобритании** для английского. Это отдельная настройка: она сохраняется сразу, сохраняет несохранённые поля формы и не меняет языки сайтов. Переводятся подписи, названия зон, подсказки, статусы и ошибки приложения.
- Блок **«Сохранённый профиль»** показывает подтверждённую конфигурацию. Пока изменения не сохранены, действует прежний профиль. Кнопка **«Перезагрузить»** обновляет текущую вкладку.

Начальный профиль: включено, `UTC`, `["en-US", "en"]`, режим «везде, кроме списка», список пуст. Все настройки хранятся в `chrome.storage.local`.

### Исключения и список включённых сайтов

Во вкладке **«Сайты»** выберите один из двух режимов:

| Режим | Что происходит | Пустой список |
|---|---|---|
| **Везде, кроме списка** | Сайты из списка получают исходные значения; остальные — выбранный профиль | Подмена на всех доступных сайтах |
| **Только на сайтах из списка** | Подмена только на перечисленных сайтах; остальные получают исходные значения | Подмена нигде не применяется |

Введите домены или HTTP/HTTPS-адреса, по одному на строку; можно разделять запятыми. Например:

```text
example.com
https://news.example.org/article
```

Адрес из второго примера сохраняется как `news.example.org`: **путь, порт, протокол и параметры не различаются**. Домен `example.com` включает `www.example.com`, `shop.example.com` и другие его поддомены, но не `notexample.com` или `example.com.other.org`. `www.example.com` — более узкая запись; основной `example.com` в неё не входит. Unicode-домены нормализуются в ASCII/punycode. Поддержаны домены, `localhost` и IPv4; IPv6-литералы, маски `*.example.com`, адреса с логином/паролем и не-HTTP(S) схемы не принимаются. До 100 записей; повторы удаляются.

Кнопка **«Добавить текущий сайт»** добавляет домен активной HTTP/HTTPS-вкладки. Проверьте список, нажмите **«Сохранить»** и перезагрузите страницы.

Правило относится к **сайту в адресной строке**, включая его доступные iframe и сетевые запросы к сторонним ресурсам. Например, исключение `example.com` сохраняет исходные значения и для iframe с другим доменом внутри этого сайта. При открытии того же стороннего домена отдельной вкладкой правило оценивается заново по его собственному адресу. Для сетевых запросов без связанной вкладки Chrome использует домен инициатора — это особенно важно для автономных запросов Service Worker.

### Поддерживаемые API и реализация

- Подменяются `navigator.language`, `navigator.languages`, HTTP `Accept-Language`, локаль по умолчанию в Intl DateTimeFormat, NumberFormat, Collator, PluralRules, RelativeTimeFormat, ListFormat, DisplayNames, Segmenter и DurationFormat, когда API доступен.
- Выбранная зона используется в Intl DateTimeFormat и `resolvedOptions()`, Date `getTimezoneOffset`, локальных getters, строковых `toString` / `toDateString` / `toTimeString`, трёх `toLocale…` методах, локальных setters, числовом конструкторе `new Date(y, m, …)` и стандартных ISO date-time строках с `T` без зоны.
- Локаль по умолчанию подменяется также в Number/BigInt `toLocaleString` и String `localeCompare` / `toLocaleLowerCase` / `toLocaleUpperCase`.
- Явные параметры сохраняются: `Intl.NumberFormat("de-DE")` остаётся немецким, а явно заданный `timeZone: "Asia/Tokyo"` — токийским. `Date.now`, timestamps, `getTime`, `valueOf`, `toISOString`, Date.UTC и UTC-методы сохраняют смысл. ISO-строки только с датой остаются UTC.
- Смещение рассчитывается оригинальным Intl для каждой даты. Переходы DST учитываются: повторяющееся время выбирает первое вхождение, отсутствующее время сдвигается вперёд на размер разрыва. Сохраняются Invalid Date, типы исключений, преобразование аргументов, наследование Date и границы диапазона Date; оригинальные методы захвачены до подмены.

Фоновый service worker заранее регистрирует единый `chrome.userScripts`-скрипт в **MAIN world**, на **document_start**, во всех доступных HTTP/HTTPS-фреймах. Проверенный JSON настроек подставляется в аргумент функции из локального `main.js`. Страница не ждёт `chrome.storage`, сообщения или пробуждение worker; код не использует eval/Function. Для JS-фильтра сайт верхнего уровня определяется синхронно через `location.ancestorOrigins`, независимо от Referer. Сетевой фильтр использует те же домены в динамическом DNR-правиле с `set`.

Статический MAIN-скрипт с `all_frames`, `match_about_blank`, `match_origin_as_fallback` наследует уже применённый профиль для доступных связанных about:blank/srcdoc/blob-фреймов. Список сайтов остаётся внутри функции и не публикуется в window. На исключённом документе не создаётся публичное состояние расширения. Привилегированного моста сообщений нет; фоновый обработчик принимает команды только от своего `popup.html`.

Сохранение последовательно обновляет JS-регистрацию, DNR и хранилище, проверяет записи Chrome и откатывает ошибки. Незавершённое применение хранится как `pending` и восстанавливается при следующем запуске worker. Общей атомарной транзакции между этими API нет: **не начинайте навигацию во время сохранения**. При первой установке, обновлении или восстановлении регистрации ранняя навигация может увидеть прежнюю конфигурацию. После подтверждения сохранения перезагрузите страницы; уже созданные документы, BFCache и предварительно загруженные страницы не обновляются автоматически.

### Разрешения и ограничения

| Разрешение | Назначение |
|---|---|
| `storage` | Постоянные настройки, язык интерфейса и незавершённое применение |
| `userScripts` | Ранний MAIN-скрипт с сохранённым профилем |
| `declarativeNetRequestWithHostAccess` | Подмена Accept-Language с фильтром сайта верхнего уровня |
| HTTP/HTTPS host permissions | Работа на посещаемых сайтах и в доступных iframe |

Дополнительные разрешения tabs, activeTab, scripting, webRequest и DNR feedback не запрашиваются. ID/URL активной разрешённой HTTP/HTTPS-вкладки и её перезагрузка доступны с имеющимися правами. Включённый профиль **не охватывает**:

- JavaScript в Dedicated Worker, SharedWorker и Service Worker; HTTP-запросы, дошедшие до сети, обрабатываются DNR, но ответы из Service Worker/CacheStorage без сети не получают заголовок.
- Temporal: его определение зоны и форматирование не подменяются.
- Непрозрачные data/sandbox-документы, недоступный opener или неизвестный origin верхнего уровня. Синхронное обращение к начальному пустому iframe сразу после создания может опередить инъекцию.
- Нестандартный разбор строк без зоны, например `01/15/2026 12:00` или с пробелом вместо `T`: его локальная семантика остаётся у оригинального Date.parse. Используйте стандартный ISO с `T` или числовой конструктор.
- Интерфейс Chrome, настройки ОС, HTML date/datetime-local controls, CSS, будущие API, защищённые chrome:// / страницы магазина и другие расширения. Исторические правила зависят от ICU Chrome; смещения с секундами могут дать дробные минуты в getTimezoneOffset, строковый GMT показывает минуты.

Подмена обнаружима и может быть изменена или обойдена кодом страницы/другим realm. Она не меняет IP, геолокацию, язык Chrome или системные настройки и не гарантирует анонимность. Отозванный доступ к сайту, политика организации и другие расширения могут мешать применению.


## English

### What the extension does

FakeTL lets you choose the language and time zone websites receive through supported JavaScript APIs and the HTTP `Accept-Language` header. For example, with a Russian computer locale and UTC+3, choose `UTC` and `en-US`, `en`: after reloading, supported website APIs report that profile and the server receives `Accept-Language: en-US,en;q=0.9`.

This Manifest V3 extension uses JavaScript, HTML and CSS. Its runtime needs no build step, external dependencies, remote code, telemetry or external services. **Chrome 145+ is required**: network filtering by the website in the address bar uses `topDomains` / `excludedTopDomains`, available since Chrome 145.

### Installation and updates

1. Download **`FakeTL-1.2.1.zip`** from the [release](https://github.com/rufpus/faketl/releases/tag/v1.2.1) and extract it. **Code → Download ZIP** or the local `FakeTL.zip` also work. The selected folder must contain `manifest.json`, the JavaScript files, `popup.html`, `popup.css` and `icons`.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the folder containing `manifest.json`.
4. Open FakeTL’s **Details** and enable **Allow User Scripts**. Without this access the popup reports that application is not confirmed.
5. Allow access to the websites you want to cover. The “everywhere except the list” mode needs access to all relevant HTTP/HTTPS websites. Optionally pin FakeTL to the toolbar.
6. Open FakeTL, configure the profile, click **Save**, wait for confirmation and reload open pages.

To update, replace files in the same folder, click the extension’s **reload/update** button in `chrome://extensions`, then reload websites. Preferences are preserved. Settings from versions 1.0/1.1 migrate to “everywhere except the list” with an empty list, preserving the selected time zone and languages.

Version **1.2.1** adds a minimal **FTL** icon in a lavender/teal palette for the Chrome toolbar and extension card. The release includes a ZIP and a SHA-256 file. [Changelog](CHANGELOG.md). Source: `icons/ftl.svg`; committed PNGs: 16/32/48/128 pixels. Chrome uses PNG; the SVG is provided for editing.

### Language, time and interface

- The master switch enables/disables spoofing. Changes take effect after **Save** and page reloads.
- **Language & time** provides search and an IANA zone list, such as `UTC`, `Europe/Moscow`, `Europe/Berlin`, `America/New_York`, `Asia/Tokyo`. Displayed offsets are for the current date; regional zones can change between winter and summer. Use **`UTC`** for constant UTC+0, rather than `Europe/London`.
- Enter the primary language as a BCP 47 tag: `en-US`, `en-GB`, `ru-RU`, `de-DE`. Enter other languages in priority order, separated by commas or new lines. Up to 10 languages; case is normalized, duplicates removed, and Chrome’s original languages are not added.
- Click the **Russian flag** for Russian or the **British flag** for English. Interface language is saved immediately, preserves unsaved form edits, and does not change website languages. Labels, zone names, help, status and application errors are translated.
- **Saved profile** shows the confirmed configuration. Unsaved edits leave the previous profile active. **Reload page** reloads the current tab.

Initial profile: enabled, `UTC`, `["en-US", "en"]`, “everywhere except the list”, empty list. All preferences are stored in `chrome.storage.local`.

### Exceptions and included websites

Choose one of two modes under **Websites**:

| Mode | Behavior | Empty list |
|---|---|---|
| **Everywhere except the list** | Listed websites receive original values; all others receive the selected profile | Spoofing on all accessible websites |
| **Only websites in the list** | Only listed websites receive the selected profile; all others receive original values | No websites are spoofed |

Enter domains or HTTP/HTTPS URLs, one per line; commas also work. For example:

```text
example.com
https://news.example.org/article
```

The second entry is saved as `news.example.org`: **paths, ports, protocols and query parameters are not distinguished**. `example.com` includes `www.example.com`, `shop.example.com` and other subdomains, but not `notexample.com` or `example.com.other.org`. `www.example.com` is narrower and does not include its parent `example.com`. Unicode domains become ASCII/punycode. Domains, localhost and IPv4 are supported; IPv6 literals, wildcards such as `*.example.com`, URLs containing credentials and non-HTTP(S) schemes are rejected. Up to 100 entries; duplicates are removed.

**Add current website** inserts the domain of the active HTTP/HTTPS tab. Review the list, click **Save**, then reload pages.

Rules apply to **the website in the address bar**, including its accessible iframes and requests for third-party resources. For example, excluding `example.com` also preserves original values in a cross-origin iframe inside that website. Opening that third-party domain in its own tab evaluates the rules against its own address. For requests without an associated tab, Chrome uses the initiator domain, which matters for autonomous Service Worker requests.

### Supported APIs and implementation

- Changes navigator.language/languages, HTTP Accept-Language, and default locales in Intl DateTimeFormat, NumberFormat, Collator, PluralRules, RelativeTimeFormat, ListFormat, DisplayNames, Segmenter and DurationFormat when available.
- Uses the selected zone in Intl DateTimeFormat/resolvedOptions, Date getTimezoneOffset, local getters, toString/toDateString/toTimeString, the three toLocale methods, local setters, numeric Date construction and standard ISO date-time strings with `T` but no zone.
- Changes default locales in Number/BigInt toLocaleString and String localeCompare/toLocaleLowerCase/toLocaleUpperCase.
- Preserves explicit options: Intl.NumberFormat("de-DE") remains German; an explicit timeZone "Asia/Tokyo" remains Tokyo. Date.now, timestamps, getTime, valueOf, toISOString, Date.UTC and UTC methods retain their semantics. ISO date-only strings remain UTC.
- Calculates offsets with the original Intl for each instant, including DST. Overlaps choose the first occurrence; gaps move forward by the gap size. Invalid Date, exception types, argument coercion, Date subclassing and Date range boundaries are preserved; original methods are captured before patching.

The background service worker pre-registers one `chrome.userScripts` script in **MAIN world**, at **document_start**, in all accessible HTTP/HTTPS frames. Validated settings JSON is inserted as an argument to the packaged main.js function. Page loading does not wait for storage, messages or worker startup; no eval/Function is used. The JavaScript filter reads the top-level site synchronously from location.ancestorOrigins, independently of Referer. The network filter uses the same domains in a dynamic DNR rule with the `set` operation.

A static MAIN script with all_frames, match_about_blank and match_origin_as_fallback inherits an already applied profile in accessible related about:blank/srcdoc/blob frames. The website list stays inside the function and is not published on window. Exempt documents receive no public extension state. There is no privileged page messaging bridge; the worker accepts commands only from its own popup.html.

Saving serially updates the JS registration, DNR and storage, verifies Chrome’s records and rolls back errors. Interrupted application is stored as pending and reconciled on the next worker start. Chrome has no common atomic transaction across these APIs: **avoid navigation while saving**. Initial installation, updates or registration recovery can race with early navigation. Reload after confirmation; existing documents, BFCache and preloaded pages are not updated automatically.

### Permissions and limitations

| Permission | Purpose |
|---|---|
| `storage` | Persistent profile, interface language and interrupted application |
| `userScripts` | Early MAIN script with the saved profile |
| `declarativeNetRequestWithHostAccess` | Accept-Language replacement with top-level website filtering |
| HTTP/HTTPS host permissions | Access to visited websites and accessible iframes |

No additional tabs, activeTab, scripting, webRequest or DNR feedback permission is requested. The active authorized HTTP/HTTPS tab’s ID/URL and reload are available with existing permissions. The enabled profile **does not cover**:

- JavaScript in Dedicated Worker, SharedWorker or Service Worker. DNR handles requests reaching the network, but Service Worker/CacheStorage responses without a network request get no modified header.
- Temporal: zone detection and formatting are unchanged.
- Opaque data/sandbox documents, inaccessible openers or unknown top-level origins. Synchronously accessing an initial empty iframe immediately after creation can precede injection.
- Implementation-dependent legacy parsing without a zone, such as `01/15/2026 12:00` or a space instead of `T`; original Date.parse retains its local semantics. Use standard ISO with `T` or the numeric constructor.
- The Chrome UI, OS settings, HTML date/datetime-local controls, CSS, future APIs, protected chrome:// / store pages and other extensions. Historical rules depend on Chrome ICU; offsets containing seconds can produce fractional getTimezoneOffset minutes, while the GMT string shows minutes.

Spoofing is detectable and can be changed or bypassed by page code or another realm. It does not change IP, geolocation, Chrome language or OS preferences and does not guarantee anonymity. Revoked site access, organization policy and other extensions can interfere with application.


## Official references / Официальные источники

- [Chrome userScripts](https://developer.chrome.com/docs/extensions/reference/api/userScripts): registration, MAIN world, document_start and Allow User Scripts.
- [Chrome declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest): dynamic modifyHeaders/set and topDomains/excludedTopDomains (Chrome 145+).
- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) and [manifest content_scripts](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts): related frames and execution timing.
- [HTML Standard: Location.ancestorOrigins](https://html.spec.whatwg.org/multipage/nav-history-apis.html#dom-location-ancestororigins): synchronous ancestor origins.

