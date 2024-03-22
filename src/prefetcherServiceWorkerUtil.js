const fetchQueue = [];
let isProcessingQueue = false;
let fetchDelay = 0;

const fetchAndCache = async (url) => {
    fetch(url).then(response => {
        if (response.ok) {
            // console.debug(`Prefetched: ${url}`);
        } else {
            console.error(`Failed to fetch ${url}`);
        }
    }).catch(error => {
        console.error(`Error fetching ${url}: `, error);
    });
};

const processQueue = () => {
    isProcessingQueue = true;
    if (fetchQueue.length === 0) {
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
};

const enqueueFetch = (url) => {
    fetchQueue.push(url);
    if (!isProcessingQueue) {
        processQueue();
    }
};

const shouldBePrefetched = (url, includeList, excludeList) => {
    const isIncluded = includeList.length === 0 || includeList.some(regex => regex.test(url));
    const isExcluded = excludeList.some(regex => regex.test(url));

    return isIncluded && !isExcluded;
};

const prioritizeUrls = (urls, priorityPatterns) => {
    const priorities = priorityPatterns.map(pattern => new RegExp(pattern, 'i'));

    return urls.sort((a, b) => {
        const priorityA = priorities.findIndex(pattern => pattern.test(a));
        const priorityB = priorities.findIndex(pattern => pattern.test(b));

        return priorityA - priorityB || a.localeCompare(b);
    });
};

export const startPrefetching = (manifest, includeList, excludeList, priorityPatterns, delay) => {
    let resources = manifest.manifest.urlVersions;
    let urls = [];
    fetchDelay = delay;
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
};

// Conditional exports for testing
const _testExports = {};

if (process.env.NODE_ENV === 'test') {
  Object.assign(_testExports, {
    fetchAndCache,
    processQueue,
    enqueueFetch,
    shouldBePrefetched,
    prioritizeUrls,
    startPrefetching,
    fetchQueue,
  });
}

export { _testExports };