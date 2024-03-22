import {
    init, removeEventListener, _testExports
} from '../src/prefetcher';

// Mock the browser APIs used in prefetcher.js
global.localStorage = {
    getItem: jest.fn(),
};
global.navigator = {
    serviceWorker: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        controller: {
            postMessage: jest.fn(),
        },
        ready: Promise.resolve({
            active: {
                postMessage: jest.fn(),
            },
        }),
    }
};
global.requestIdleCallback = jest.fn().mockImplementation(callback => {
    // Simulate immediate execution
    callback();
});
// Mock requestIdleCallback
global.window = {
    requestIdleCallback: global.requestIdleCallback,
};

describe('Prefetcher Tests', () => {
    beforeEach(() => {
        // Clear all mock implementations and instances before each test
        jest.clearAllMocks();
    });

    describe('Internal Functions', () => {
        it('parseConfig correctly parses configuration string', () => {
            const testConfig = JSON.stringify({ include: ['test'], exclude: [], order: [], delay: 1000 });
            expect(_testExports.parseConfig(testConfig)).toEqual({ include: ['test'], exclude: [], order: [], delay: 1000 });
        });

        it('getManifest retrieves and parses manifest from localStorage', () => {
            const testManifest = { key: 'value' };
            localStorage.getItem.mockReturnValueOnce(JSON.stringify(testManifest));
            expect(_testExports.getManifest('manifestKey')).toEqual(testManifest);
        });

        it('createMessage correctly constructs message object', () => {
            const testConfig = JSON.stringify({ include: ['test'], exclude: [], order: [], delay: 1000 });
            const testManifest = { key: 'value' };
            localStorage.getItem.mockReturnValueOnce(JSON.stringify(testManifest));
            expect(_testExports.createMessage(testConfig, 'manifestKey')).toEqual({
                action: 'prefetchResources',
                manifest: testManifest,
                includeList: ['test'],
                excludeList: [],
                priorityPatterns: [],
                delay: 1000
            });
        });

        it('addServiceWorkerListener adds message listener', () => {
            _testExports.addServiceWorkerListener();
            expect(global.navigator.serviceWorker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
        });

        it('runWhenIdle uses requestIdleCallback if available', () => {
            const mockCallback = jest.fn();
            _testExports.runWhenIdle(mockCallback);
            expect(mockCallback).toHaveBeenCalled();
        });

        it('sendPrefetchRequestToServiceWorker sends message to controller if available', () => {
            _testExports.sendPrefetchRequestToServiceWorker();
            expect(global.navigator.serviceWorker.controller.postMessage).toHaveBeenCalled();
        });
    });

    describe('Public API', () => {
        it('init sets up correctly and sends prefetch request', async () => {
            const cfg = JSON.stringify({ include: ['.*'], exclude: [], order: [], delay: 1000 });
            const lsKey = 'localStorageKey';
            const onComplete = jest.fn();
            localStorage.getItem.mockReturnValue(cfg);

            await init(cfg, lsKey, onComplete);

            expect(localStorage.getItem).toHaveBeenCalledWith(lsKey);
            expect(global.navigator.serviceWorker.controller.postMessage).toHaveBeenCalledWith(expect.any(Object));
        });

        it('removeEventListener removes service worker message listener', () => {
            removeEventListener();
            expect(global.navigator.serviceWorker.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
        });

        // Add more integration tests for the public API as needed
    });
});
