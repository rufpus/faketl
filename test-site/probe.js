/* Runs in an ordinary HTTP page, iframe, or a worker; no extension APIs. */
globalThis.snapshot = function snapshot() {
  const samples = ['2026-01-15T12:34:56.789Z', '2026-07-15T12:34:56.789Z'].map(iso => {
    const d = new Date(iso);
    return {iso, timestamp: d.getTime(), value: d.valueOf(), utc: [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()],
      offset: d.getTimezoneOffset(), local: [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds(), d.getDay()],
      string: d.toString(), dateString: d.toDateString(), timeString: d.toTimeString(),
      localeString: d.toLocaleString(), localeDate: d.toLocaleDateString(), localeTime: d.toLocaleTimeString(),
      intl: new Intl.DateTimeFormat(undefined, {dateStyle: 'full', timeStyle: 'long'}).format(d)};
  });
  return {language: navigator.language, languages: [...navigator.languages],
    zone: new Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: new Intl.NumberFormat().resolvedOptions().locale,
    explicit: {locale: new Intl.NumberFormat('de-DE').resolvedOptions().locale,
      zone: new Intl.DateTimeFormat('en-US', {timeZone: 'Asia/Tokyo'}).resolvedOptions().timeZone,
      hoursTokyo: new Intl.DateTimeFormat('en-US', {timeZone: 'Asia/Tokyo', hour: 'numeric', hourCycle: 'h23'}).format(new Date(samples[0].timestamp))},
    temporal: typeof Temporal === 'undefined' ? {available: false} : {available: true, zone: Temporal.Now.timeZoneId()}, samples};
};
