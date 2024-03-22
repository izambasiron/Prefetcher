import * as PrefetcherServiceWorkerUtils from './prefetcherServiceWorkerUtil.js';

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('message', event => {
    const data = event.data;
    if (data.action === 'prefetchResources') {
        const { manifest, includeList, excludeList, priorityPatterns, delay } = data;
        PrefetcherServiceWorkerUtils.startPrefetching(manifest, includeList, excludeList, priorityPatterns, delay);
    }
});