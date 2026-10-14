importScripts('/probe.js');
onconnect = event => { event.ports[0].postMessage(snapshot()); };
