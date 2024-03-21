/**
 * @file Prefetcher.js
 * @description This file contains the logic for the prefetcher.
 * It is responsible for sending the prefetch request to the service worker.
 * It also listens for the prefetch complete message from the service worker.
 * @see prefetcher-service-worker.js
 * @author Izam Basiron
 */
var Prefetcher = Prefetcher || {};

Prefetcher = (function () {
    let config, triggerOnPrefetchComplete, messageListener, localStorageKey;

    function parseConfig() {
        try {
            return JSON.parse(config);
        } catch (e) {
            return {};
        }
    }

    function getManifest() {
        const manifestRaw = localStorage.getItem(localStorageKey);
        try {
            return JSON.parse(manifestRaw);
        } catch (e) {
            return {};
        }
    }

    function createMessage() {
        const data = parseConfig();
        return {
            action: 'prefetchResources',
            manifest: getManifest(),
            includeList: data.include,
            excludeList: data.exclude,
            priorityPatterns: data.order,
            delay: data.delay
        };
    }

    function addServiceWorkerListener() {
        messageListener = function (event) {
            const data = event.data;
            if (data.action === 'prefetchComplete') {
                console.debug('Prefetch complete');
                if (typeof triggerOnPrefetchComplete === "function") {
                    triggerOnPrefetchComplete();
                }
            }
        };
        navigator.serviceWorker.addEventListener('message', messageListener);
    }

    function runWhenIdle(callback) {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(callback, { timeout: 2000 });
        } else {
            setTimeout(callback, 500);
        }
    }

    function sendPrefetchRequestToServiceWorker() {
        const message = createMessage();
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage(message);
        } else {
            navigator.serviceWorker.ready.then((r) => {
                r.active.postMessage(message);
            });
        }
    }

    return {
        init: function (cfg, lsKey, onComplete) {
            config = cfg;
            triggerOnPrefetchComplete = onComplete;
            localStorageKey = lsKey;
            addServiceWorkerListener();
            runWhenIdle(sendPrefetchRequestToServiceWorker);
        },
        removeEventListener: function () {
            navigator.serviceWorker.removeEventListener('message', messageListener);
        }
    };
})();