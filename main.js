((injectedConfig) => {
  'use strict';
  const key = Symbol.for('locale-timezone/config/v1');
  const installed = Symbol.for('locale-timezone/installed/v1');
  if (globalThis[installed]) return;
  let config = injectedConfig;
  // userScripts has no matchOriginAsFallback option. The static MAIN script
  // handles accessible related frames by synchronously reading the parent's
  // public, immutable configuration. Opaque origins cannot use this path.
  if (!config && /^(about:|blob:|data:)/.test(location.protocol)) {
    for (const source of [globalThis.parent, globalThis.opener]) {
      try { if (source && source !== globalThis && source[installed]) config = source[key]; } catch {}
      if (config) break;
    }
  }
  if (!config?.enabled) return;
  // Match the top-level site, including cross-origin iframes. ancestorOrigins
  // is synchronous and independent of document.referrer/referrer policies.
  let siteHost = config.siteHost || '';
  try {
    const origins = location.ancestorOrigins;
    if (origins?.length) siteHost = new URL(origins[origins.length - 1]).hostname;
    else if (/^https?:$/.test(location.protocol)) siteHost = location.hostname;
  } catch { siteHost = ''; }
  siteHost = siteHost.toLowerCase().replace(/\.$/, '');
  const sites = config.sites || [];
  const siteMode = config.siteMode || 'exclude';
  const listed = sites.some(domain => siteHost === domain || siteHost.endsWith('.' + domain));
  if (sites.length && !siteHost) return; // Unknown top-level origin: preserve originals.
  if (siteMode === 'include' ? !listed : listed) return;
  // Public state is limited to the applied profile for related-frame inheritance.
  // The allow/exception list stays inside this synchronous function invocation.
  config = Object.freeze({enabled: true, timeZone: config.timeZone, languages: Object.freeze([...config.languages]), siteHost});

  const NativeDate = Date;
  const NativeDTF = Intl.DateTimeFormat;
  const nativeCanonical = Intl.getCanonicalLocales;
  const apply = Reflect.apply;
  const construct = Reflect.construct;
  const dp = NativeDate.prototype;
  const native = {};
  for (const name of Object.getOwnPropertyNames(dp)) if (typeof dp[name] === 'function') native[name] = dp[name];
  const parse = NativeDate.parse;
  const now = NativeDate.now;
  const call = (name, date, args = []) => apply(native[name], date, args);
  const time = date => call('getTime', date);
  const pad = (n, width = 2) => String(n).padStart(width, '0');
  const partsFormatter = new NativeDTF('en-US-u-ca-gregory-nu-latn', {
    timeZone: config.timeZone, era: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  const zoneNameFormatter = new NativeDTF('en-US', {timeZone: config.timeZone, timeZoneName: 'long'});
  const formatParts = NativeDTF.prototype.formatToParts;
  // A bounded cache makes repeated getters inexpensive without caching a single
  // offset for a regional zone. Each entry represents one specific instant.
  const cache = new Map();
  function civilDays(year, month, day) {
    year -= month <= 2 ? 1 : 0;
    const era = Math.floor(year / 400);
    const y = year - era * 400;
    const doy = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
    return era * 146097 + y * 365 + Math.floor(y / 4) - Math.floor(y / 100) + doy - 719468;
  }
  function makeWall(fields) {
    if (fields.some(v => !Number.isFinite(v))) return NaN;
    let [year, month, day, hour, minute, second, ms] = fields.map(Math.trunc);
    year += Math.floor(month / 12);
    month = ((month % 12) + 12) % 12;
    return (civilDays(year, month + 1, 1) + day - 1) * 86400000 + hour * 3600000 + minute * 60000 + second * 1000 + ms;
  }
  function localFields(t) {
    if (!Number.isFinite(t)) return Array(8).fill(NaN);
    if (cache.has(t)) return cache.get(t);
    const p = {};
    for (const part of apply(formatParts, partsFormatter, [new NativeDate(t)])) p[part.type] = part.value;
    const year = p.era === 'BC' ? 1 - Number(p.year) : Number(p.year);
    const value = [year, Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second), call('getUTCMilliseconds', new NativeDate(t))];
    value.push(((Math.floor(makeWall(value) / 86400000) + 4) % 7 + 7) % 7);
    if (cache.size >= 256) cache.clear();
    cache.set(t, value);
    return value;
  }
  function wallAt(t) { return makeWall(localFields(t).slice(0, 7)); }
  const offsetAt = t => wallAt(t) - t;
  function fromWall(w) {
    if (!Number.isFinite(w) || Math.abs(w) > 8640000000000000 + 172800000) return NaN;
    const bounded = t => Math.max(-8640000000000000, Math.min(8640000000000000, t));
    // ECMAScript Date's compatible disambiguation: earlier instant in overlaps,
    // advance by the size of a gap for nonexistent local times.
    const offsets = new Set();
    for (const days of [-2, -1, 0, 1, 2]) {
      offsets.add(offsetAt(bounded(w + days * 86400000)));
    }
    for (let guess = w, i = 0; i < 4; i++) {
      const o = offsetAt(bounded(guess));
      offsets.add(o);
      guess = w - o;
      if (!Number.isFinite(guess) || Math.abs(guess) > 8640000000000000) break;
    }
    const candidates = [...offsets].map(o => w - o).filter(t => Number.isFinite(t) && Math.abs(t) <= 8640000000000000);
    const exact = candidates.filter(t => wallAt(t) === w);
    if (exact.length) return Math.min(...exact);
    const after = candidates.map(t => ({t, delta: wallAt(t) - w})).filter(x => x.delta > 0).sort((a, b) => a.delta - b.delta || a.t - b.t);
    return after.length ? after[0].t : NaN;
  }
  function defaultLocales(locales) {
    if (locales === undefined) return config.languages;
    const canonical = apply(nativeCanonical, Intl, [locales]);
    return canonical.length ? canonical : config.languages;
  }
  function zoneOptions(options) {
    if (options === undefined) return {timeZone: config.timeZone};
    if (options === null) return null; // Let the original API throw its own error.
    // Do not spread options: inherited properties, getters and validation order
    // are significant. Forward native reads, supplying only an absent timeZone.
    const object = Object(options);
    return new Proxy(Object.create(null), {get(_target, property) {
      const value = Reflect.get(object, property, object);
      return property === 'timeZone' && value === undefined ? config.timeZone : value;
    }});
  }
  function replaceMethod(target, name, fn) {
    const desc = Object.getOwnPropertyDescriptor(target, name);
    Object.defineProperty(fn, 'name', {value: name, configurable: true});
    Object.defineProperty(fn, 'length', {value: desc.value.length, configurable: true});
    Object.defineProperty(target, name, {...desc, value: fn});
  }
  function method(fn) { return {run(...args) { return fn(this, args); }}.run; }

  for (const name of ['DateTimeFormat', 'NumberFormat', 'Collator', 'PluralRules', 'RelativeTimeFormat', 'ListFormat', 'DisplayNames', 'Segmenter', 'DurationFormat']) {
    const Original = Intl[name];
    if (typeof Original !== 'function') continue;
    function argumentsFor(args) {
      const next = [...args];
      next[0] = defaultLocales(next[0]);
      if (name === 'DateTimeFormat') next[1] = zoneOptions(next[1]);
      return next;
    }
    const Wrapped = new Proxy(Original, {
      apply(target, receiver, args) { return apply(target, receiver, argumentsFor(args)); },
      construct(target, args, newTarget) { return construct(target, argumentsFor(args), newTarget); }
    });
    Object.defineProperty(Intl, name, {...Object.getOwnPropertyDescriptor(Intl, name), value: Wrapped});
  }

  for (const [local, index] of Object.entries({
    getFullYear: 0, getMonth: 1, getDate: 2, getDay: 7,
    getHours: 3, getMinutes: 4, getSeconds: 5, getMilliseconds: 6
  })) replaceMethod(dp, local, method(date => localFields(time(date))[index]));
  replaceMethod(dp, 'getYear', method(date => localFields(time(date))[0] - 1900));
  replaceMethod(dp, 'getTimezoneOffset', method(date => {
    const t = time(date);
    return (t - wallAt(t)) / 60000;
  }));

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function dateString(t) {
    if (!Number.isFinite(t)) return 'Invalid Date';
    const w = localFields(t);
    const year = w[0];
    const yearString = (year < 0 ? '-' : '') + pad(Math.abs(year), 4);
    return `${weekdays[w[7]]} ${months[w[1]]} ${pad(w[2])} ${yearString}`;
  }
  function timeString(t) {
    if (!Number.isFinite(t)) return 'Invalid Date';
    const w = localFields(t);
    const offset = offsetAt(t) / 60000;
    const absolute = Math.abs(offset);
    const zoneName = apply(formatParts, zoneNameFormatter, [new NativeDate(t)]).find(p => p.type === 'timeZoneName').value;
    return `${pad(w[3])}:${pad(w[4])}:${pad(w[5])} GMT${offset < 0 ? '-' : '+'}${pad(Math.floor(absolute / 60))}${pad(Math.floor(absolute % 60))} (${zoneName})`;
  }
  replaceMethod(dp, 'toDateString', method(date => dateString(time(date))));
  replaceMethod(dp, 'toTimeString', method(date => timeString(time(date))));
  replaceMethod(dp, 'toString', method(date => {
    const t = time(date);
    return Number.isFinite(t) ? `${dateString(t)} ${timeString(t)}` : 'Invalid Date';
  }));
  for (const name of ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString']) {
    replaceMethod(dp, name, method((date, args) => {
      // Invalid Date returns before locale/options validation in the native API.
      if (!Number.isFinite(time(date))) return apply(native[name], date, args);
      return apply(native[name], date, [defaultLocales(args[0]), zoneOptions(args[1])]);
    }));
  }

  for (const [local, indices] of Object.entries({
    setFullYear: [0, 1, 2], setMonth: [1, 2], setDate: [2], setHours: [3, 4, 5, 6],
    setMinutes: [4, 5, 6], setSeconds: [5, 6], setMilliseconds: [6]
  })) replaceMethod(dp, local, method((date, args) => {
    const t = time(date);
    const fields = local === 'setFullYear' && Number.isNaN(t) ? [1970, 0, 1, 0, 0, 0, 0] : localFields(t).slice(0, 7);
    for (let i = 0; i < Math.min(indices.length, Math.max(1, args.length)); i++) fields[indices[i]] = +args[i];
    return call('setTime', date, [fromWall(makeWall(fields))]);
  }));
  replaceMethod(dp, 'setYear', method((date, args) => {
    const t = time(date); // Receiver validation precedes argument coercion.
    let year = +args[0];
    if (Number.isFinite(year)) {
      year = Math.trunc(year);
      if (year >= 0 && year <= 99) year += 1900;
    }
    const fields = Number.isNaN(t) ? [1970, 0, 1, 0, 0, 0, 0] : localFields(t).slice(0, 7);
    fields[0] = year;
    return call('setTime', date, [fromWall(makeWall(fields))]);
  }));

  function parseString(string) {
    // ECMAScript ISO date-time without an offset is local; date-only is UTC.
    // Legacy, implementation-dependent formats intentionally retain native parsing.
    if (/^(?:\d{4}|[+-]\d{6})(?:-\d{2}(?:-\d{2})?)?T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(string)) {
      return fromWall(apply(parse, NativeDate, [string + 'Z']));
    }
    return apply(parse, NativeDate, [string]);
  }
  function primitive(value) {
    if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return value;
    const exotic = value[Symbol.toPrimitive];
    if (exotic !== undefined && exotic !== null) {
      const result = apply(exotic, value, ['default']);
      if (Object(result) === result) throw new TypeError('Cannot convert object to primitive value');
      return result;
    }
    for (const name of ['valueOf', 'toString']) {
      if (typeof value[name] === 'function') {
        const result = apply(value[name], value, []);
        if (Object(result) !== result) return result;
      }
    }
    throw new TypeError('Cannot convert object to primitive value');
  }
  const WrappedDate = new Proxy(NativeDate, {
    apply() { const t = apply(now, NativeDate, []); return `${dateString(t)} ${timeString(t)}`; },
    construct(target, args, newTarget) {
      if (args.length === 0) return construct(target, args, newTarget);
      if (args.length > 1) {
        const fields = [NaN, NaN, 1, 0, 0, 0, 0];
        for (let i = 0; i < Math.min(args.length, 7); i++) fields[i] = +args[i];
        if (Number.isFinite(fields[0]) && Math.trunc(fields[0]) >= 0 && Math.trunc(fields[0]) <= 99) fields[0] = Math.trunc(fields[0]) + 1900;
        const w = makeWall(fields);
        return construct(target, [fromWall(w)], newTarget);
      }
      let value;
      try { value = time(args[0]); } catch { value = primitive(args[0]); }
      const t = typeof value === 'string' ? parseString(value) : +value;
      return construct(target, [t], newTarget);
    }
  });
  replaceMethod(NativeDate, 'parse', method((_receiver, args) => parseString(`${args[0]}`)));
  Object.defineProperty(globalThis, 'Date', {...Object.getOwnPropertyDescriptor(globalThis, 'Date'), value: WrappedDate});
  Object.defineProperty(dp, 'constructor', {...Object.getOwnPropertyDescriptor(dp, 'constructor'), value: WrappedDate});

  for (const target of [Number.prototype, typeof BigInt === 'function' ? BigInt.prototype : null]) {
    if (!target) continue;
    const original = target.toLocaleString;
    const originalValueOf = target.valueOf;
    replaceMethod(target, 'toLocaleString', method((receiver, args) => {
      // Preserve native receiver checks before processing locale arguments.
      apply(originalValueOf, receiver, []);
      return apply(original, receiver, [defaultLocales(args[0]), args[1]]);
    }));
  }
  for (const name of ['localeCompare', 'toLocaleLowerCase', 'toLocaleUpperCase']) {
    const original = String.prototype[name];
    replaceMethod(String.prototype, name, method((receiver, args) => {
      if (receiver === null || receiver === undefined) return apply(original, receiver, args);
      // Native converts the string (and comparator) before processing locales.
      const str = `${receiver}`;
      const next = [...args];
      const index = name === 'localeCompare' ? 1 : 0;
      if (name === 'localeCompare') next[0] = `${next[0]}`;
      next[index] = defaultLocales(next[index]);
      return apply(original, str, next);
    }));
  }
  for (const [name, value] of [['language', config.languages[0]], ['languages', config.languages]]) {
    const proto = Navigator.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
    if (descriptor?.get) Object.defineProperty(proto, name, {...descriptor, get() {
      apply(descriptor.get, this, []); // Keep the original illegal-receiver check.
      return value;
    }});
  }
  Object.defineProperty(globalThis, key, {value: config, configurable: false, writable: false});
  Object.defineProperty(globalThis, installed, {value: true, configurable: false, writable: false});
})(/*FAKETL_CONFIG*/ undefined);
