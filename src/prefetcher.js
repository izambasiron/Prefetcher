let config, triggerOnPrefetchComplete, messageListener, localStorageKey;
const _testExports = {};

const parseConfig = (cfg) => {
    try {
        return JSON.parse(cfg);
    } catch (e) {
        return {};
    }
};

const getManifest = (key) => {
    const manifestRaw = localStorage.getItem(key);
    try {
        return JSON.parse(manifestRaw);
    } catch (e) {
        return {};
    }
};

const createMessage = (cfg, key) => {
    const data = parseConfig(cfg);
    return {
        action: 'prefetchResources',
        manifest: getManifest(key),
        includeList: data.include,
        excludeList: data.exclude,
        priorityPatterns: data.order,
        delay: data.delay
    };
};

const addServiceWorkerListener = () => {
    messageListener = function (event) {
        const data = event.data;
        if (data.action === 'prefetchComplete') {
            console.debug('Prefetch complete');
            if (typeof triggerOnPrefetchComplete === 'function') {
                triggerOnPrefetchComplete();
            }
        }
    };
    navigator.serviceWorker.addEventListener('message', messageListener);
};

const runWhenIdle = (callback) => {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(callback, { timeout: 2000 });
    } else {
        setTimeout(callback, 500);
    }
};

const sendPrefetchRequestToServiceWorker = () => {
    const message = createMessage(config, localStorageKey);
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(message);
    } else {
        navigator.serviceWorker.ready.then((r) => {
            r.active.postMessage(message);
        });
    }
};

// Only expose init and removeEventListener
export const init = (cfg, lsKey, onComplete) => {
    config = cfg;
    triggerOnPrefetchComplete = onComplete;
    localStorageKey = lsKey;
    addServiceWorkerListener();
    runWhenIdle(sendPrefetchRequestToServiceWorker);
};

export const removeEventListener = () => {
    navigator.serviceWorker.removeEventListener('message', messageListener);
};

// Conditional export for testing
if (process.env.TESTING) {
    Object.assign(_testExports, {
        parseConfig,
        getManifest,
        createMessage,
        addServiceWorkerListener,
        runWhenIdle,
        sendPrefetchRequestToServiceWorker,
    });
}

export { _testExports };