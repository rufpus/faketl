importScripts('/probe.js');
addEventListener('install', () => skipWaiting());
addEventListener('activate', event => event.waitUntil(clients.claim()));
addEventListener('message', event => { if (event.ports[0]) event.ports[0].postMessage(snapshot()); });
