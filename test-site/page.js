const output = document.getElementById('output');
const frames = {};
const report = {early: window.earlySnapshot, main: snapshot(), frames, workers: {}};
window.testReport = report;
window.addEventListener('message', e => {
  if (e.data?.type === 'frame-snapshot') {
    const frame = [...document.querySelectorAll('iframe')].find(x => x.contentWindow === e.source);
    if (frame) { frames[frame.title] = e.data.snapshot; render(); }
  }
});
const frameHTML = '<!doctype html><script nonce="local-test">parent.postMessage({type:"frame-snapshot",snapshot:{language:navigator.language,languages:[...navigator.languages],zone:new Intl.DateTimeFormat().resolvedOptions().timeZone}},"*")<\/script>';
for (const [title, src] of [['iframe HTTP', '/frame'], ['iframe другой origin', 'http://localhost:' + location.port + '/frame'], ['data:', 'data:text/html,' + encodeURIComponent(frameHTML)], ['blob:', URL.createObjectURL(new Blob([frameHTML], {type: 'text/html'}))]]) {
  const frame = document.createElement('iframe'); frame.title = title; frame.src = src; document.getElementById('frames').append(frame);
}
const srcdoc = document.createElement('iframe'); srcdoc.title = 'srcdoc'; srcdoc.srcdoc = frameHTML; document.getElementById('frames').append(srcdoc);
const blank = document.createElement('iframe'); blank.title = 'about:blank'; blank.src = 'about:blank';
blank.addEventListener('load', () => {
  try {
    const w = blank.contentWindow;
    frames['about:blank'] = {language: w.navigator.language, languages: [...w.navigator.languages], zone: new w.Intl.DateTimeFormat().resolvedOptions().timeZone}; render();
  } catch (e) { frames['about:blank'] = {error: e.message}; }
});
document.getElementById('frames').append(blank);
function render() { output.textContent = JSON.stringify(report, null, 2); }
fetch('/echo?kind=fetch').then(x => x.json()).then(x => { report.http = x; render(); });
const worker = new Worker('/worker.js');
worker.onmessage = e => { report.workers.dedicated = e.data; worker.terminate(); render(); };
if ('SharedWorker' in window) {
  const shared = new SharedWorker('/shared-worker.js');
  shared.port.onmessage = e => { report.workers.shared = e.data; shared.port.close(); render(); }; shared.port.start();
}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').then(() => navigator.serviceWorker.ready).then(reg => {
    const channel = new MessageChannel(); channel.port1.onmessage = e => { report.workers.service = e.data; render(); };
    reg.active.postMessage('snapshot', [channel.port2]);
  }).catch(e => { report.workers.service = {error: e.message}; render(); });
}
render();
