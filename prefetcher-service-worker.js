/**
 * This service worker is responsible for prefetching resources.
 * It listens for messages from the client to start prefetching resources.
 * It also sends a message to the client when prefetching is complete.
 * @see prefetcher.js
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
 * @author Izam Basiron
 */
let fetchQueue = [];
let isProcessingQueue = false;
let fetchDelay = 1000;

async function fetchAndCache(url) {
    fetch(url).then(response => {
        if (response.ok) {
            console.debug(`Prefetched: ${url}`);
        } else {
            console.error(`Failed to fetch ${url}`);
        }
    }).catch(error => {
        console.error(`Error fetching ${url}: `, error);
    });
}

function processQueue() {
    isProcessingQueue = true;
    if (fetchQueue.length === 0) {
        console.log('Prefetch complete');
        isProcessingQueue = false;

        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    action: 'prefetchComplete'
                });
            });
        });
        return;
    }

    const url = fetchQueue.shift();
    setTimeout(() => {
        fetchAndCache(url).then(() => {
            processQueue();
        });
    }, fetchDelay);
}

function enqueueFetch(url) {
    fetchQueue.push(url);
    if (!isProcessingQueue) {
        processQueue();
    }
}

function shouldBePrefetched(url, includeList, excludeList) {
    const isIncluded = includeList.length === 0 || includeList.some(regex => regex.test(url));
    const isExcluded = excludeList.some(regex => regex.test(url));

    return isIncluded && !isExcluded;
}

function prioritizeUrls(urls, priorityPatterns) {
    const priorities = priorityPatterns.map(pattern => new RegExp(pattern, 'i'));

    return urls.sort((a, b) => {
        const priorityA = priorities.findIndex(pattern => pattern.test(a));
        const priorityB = priorities.findIndex(pattern => pattern.test(b));

        return priorityA - priorityB || a.localeCompare(b);
    });
}

function startPrefetching(manifest, includeList, excludeList, priorityPatterns) {
    let resources = manifest.manifest.urlVersions;
    let urls = [];
    for (const path in resources) {
        const versionQuery = resources[path];
        const fullUrl = `${location.origin}${path}${versionQuery}`;
        urls.push(fullUrl);
    }

    resources = manifest.manifest.urlMappings;
    for (const path in resources) {
        const fullUrl = `${location.origin}${path}`;
        urls.push(fullUrl);
    }

    if (priorityPatterns && priorityPatterns.length > 0) {
        urls = prioritizeUrls(urls, priorityPatterns);
    }

    const includes = includeList.map(pattern => new RegExp(pattern, 'i'));
    const excludes = excludeList.map(pattern => new RegExp(pattern, 'i'));

    urls.forEach(url => {
        if (shouldBePrefetched(url, includes, excludes)) {
            enqueueFetch(url);
        }
    });
}

/**
 * So that clients loaded in the same scope do not need to be reloaded
 * before their fetches will go through this service worker.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim
 */
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('message', event => {
    const data = event.data;
    if (data.action === 'prefetchResources') {
        const { manifest, includeList, excludeList, priorityPatterns, delay } = data;
        fetchDelay = delay;
        startPrefetching(manifest, includeList, excludeList, priorityPatterns);
    }
});