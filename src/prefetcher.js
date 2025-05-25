let config, localStorageKey, triggerOnPrefetchComplete;
const _testExports = {};

// --- Utility Functions ---

function shouldBePrefetched(url, includeList = [], excludeList = []) {
    if (excludeList.some(pattern => new RegExp(pattern).test(url))) {
        return false;
    }
    if (includeList.length === 0 || includeList.some(pattern => new RegExp(pattern).test(url))) {
        return true;
    }
    return false;
}

function prioritizeUrls(urls, priorityPatterns = []) {
    if (!priorityPatterns || priorityPatterns.length === 0) {
        return urls;
    }
    return [...urls].sort((a, b) => {
        let priorityA = -1;
        let priorityB = -1;

        priorityPatterns.forEach((pattern, index) => {
            if (new RegExp(pattern).test(a)) {
                priorityA = index;
            }
            if (new RegExp(pattern).test(b)) {
                priorityB = index;
            }
        });

        if (priorityA === -1 && priorityB === -1) return 0; // No specific priority for either
        if (priorityA === -1) return 1; // b has priority (lower index or A is not in patterns)
        if (priorityB === -1) return -1; // a has priority (lower index or B is not in patterns)
        return priorityA - priorityB; // lower index means higher priority
    });
}

function determineLinkAsType(url) {
    const extension = url.split('.').pop().toLowerCase().split('?')[0]; // Get extension before query params
    switch (extension) {
        case 'js':
            return 'script';
        case 'css':
            return 'style';
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'webp':
        case 'svg':
            return 'image';
        case 'woff':
        case 'woff2':
        case 'ttf':
        case 'otf':
            return 'font';
        default:
            return 'fetch'; // Default for unknown types
    }
}

const parseConfig = (cfg) => {
    try {
        return JSON.parse(cfg);
    } catch (e) {
        console.error("Failed to parse prefetcher config:", e);
        return {};
    }
};

const getManifest = (key) => {
    const manifestRaw = localStorage.getItem(key);
    try {
        return JSON.parse(manifestRaw);
    } catch (e) {
        console.error("Failed to parse prefetcher manifest from localStorage:", e);
        return {};
    }
};

const processManifestAndPreload = (manifestData, includeList, excludeList, priorityPatterns) => {
    if (!manifestData || !manifestData.manifest) {
        console.debug('Prefetcher: Manifest data is invalid or missing.');
        if (typeof triggerOnPrefetchComplete === 'function') {
            triggerOnPrefetchComplete();
        }
        return;
    }

    let allUrls = [];
    const baseUrl = location.origin;

    // Extract from urlVersions
    if (manifestData.manifest.urlVersions) {
        Object.keys(manifestData.manifest.urlVersions).forEach(path => {
            const versionQuery = manifestData.manifest.urlVersions[path];
            allUrls.push(`${baseUrl}${path}${versionQuery}`);
        });
    }

    // Extract from urlMappings
    if (manifestData.manifest.urlMappings) {
        Object.values(manifestData.manifest.urlMappings).forEach(mappedUrl => {
            // Assuming mappedUrl is a full path, or needs baseUrl if it's relative
            if (mappedUrl.startsWith('/')) {
                 allUrls.push(`${baseUrl}${mappedUrl}`);
            } else {
                 allUrls.push(mappedUrl); // Or handle as per expected format
            }
        });
    }
    
    console.debug('Prefetcher: Extracted URLs:', allUrls);

    const filteredUrls = allUrls.filter(url => shouldBePrefetched(url, includeList, excludeList));
    console.debug('Prefetcher: Filtered URLs:', filteredUrls);

    const prioritizedUrls = prioritizeUrls(filteredUrls, priorityPatterns);
    console.debug('Prefetcher: Prioritized URLs for preloading:', prioritizedUrls);

    prioritizedUrls.forEach(url => {
        try {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = url;
            link.as = determineLinkAsType(url);
            document.head.appendChild(link);
            console.debug(`Prefetcher: Appended <link rel="preload" href="${url}" as="${link.as}">`);
        } catch (e) {
            console.warn(`Prefetcher: Failed to preload ${url}:`, e);
        }
    });

    if (typeof triggerOnPrefetchComplete === 'function') {
        triggerOnPrefetchComplete();
    }
};

const runWhenIdle = (callback) => {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(callback, { timeout: 2000 });
    } else {
        // Fallback for browsers that don't support requestIdleCallback
        setTimeout(callback, 500); // Execute after a short delay
    }
};

// Only expose init
export const init = (cfg, lsKey, onComplete) => {
    config = parseConfig(cfg);
    localStorageKey = lsKey;
    triggerOnPrefetchComplete = onComplete;

    const manifest = getManifest(localStorageKey);
    console.debug('Prefetcher: Initialized with config:', config, 'and manifest:', manifest);

    if (!manifest || Object.keys(manifest).length === 0) {
        console.warn('Prefetcher: Manifest is empty or invalid. Prefetching aborted.');
        if (typeof triggerOnPrefetchComplete === 'function') {
            triggerOnPrefetchComplete(); // Call complete even if there's nothing to do or an error
        }
        return;
    }
    
    const { include = [], exclude = [], order = [], delay = 0 } = config;

    if (delay > 0) {
        setTimeout(() => {
            runWhenIdle(() => processManifestAndPreload(manifest, include, exclude, order));
        }, delay);
    } else {
        runWhenIdle(() => processManifestAndPreload(manifest, include, exclude, order));
    }
};

// Conditional export for testing
if (process.env.TESTING) {
    Object.assign(_testExports, {
        parseConfig,
        getManifest,
        shouldBePrefetched,
        prioritizeUrls,
        determineLinkAsType,
        processManifestAndPreload,
        runWhenIdle,
    });
}

export { _testExports };