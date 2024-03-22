import { _testExports } from '../src/prefetcherServiceWorkerUtil';

describe('Service Worker logic', () => {
    // Mock global functions
    beforeAll(() => {
        global.fetch = jest.fn().mockImplementation(() => Promise.resolve({ ok: true }));
        // global.clients = {
        //     matchAll: jest.fn().mockImplementation(() => Promise.resolve([{ postMessage: jest.fn() }])),
        // };
        // Prepare a mock for postMessage
        const postMessageMock = jest.fn();

        // Mock implementation of clients.matchAll to return an array of objects, each with a postMessage function
        global.clients = {
            matchAll: jest.fn().mockImplementation(() => Promise.resolve([
                { postMessage: postMessageMock },
                { postMessage: postMessageMock }
            ]))
        }

        // Mocking matchAll and postMessage
        global.self = {
            clients: global.clients
        };
        global.location = {
            origin: 'https://example.com',
            // Add any other properties you use from the `location` object
        };
    });

    it('fetchAndCache should call fetch', async () => {
        await _testExports.fetchAndCache('https://example.com');
        expect(global.fetch).toHaveBeenCalledWith('https://example.com');
    });

    it('processQueue should call fetchAndCache', async () => {
        _testExports.fetchQueue.push('https://example.com');
        await _testExports.processQueue();
        expect(global.fetch).toHaveBeenCalledWith('https://example.com');
    });

    it('enqueueFetch should call processQueue', () => {
        _testExports.enqueueFetch('https://example.com');
        expect(_testExports.fetchQueue).toContain('https://example.com');
    });

    it('shouldBePrefetched should return true', () => {
        const result = _testExports.shouldBePrefetched('https://example.com', [], []);
        expect(result).toBe(true);
    });

    it('prioritizeUrls should return sorted array', () => {
        const urls = ['https://example.com/a', 'https://example.com/b', 'https://example.com/c'];
        const priorityPatterns = ['b', 'a'];
        const result = _testExports.prioritizeUrls(urls, priorityPatterns);
        expect(result).toEqual(['https://example.com/b', 'https://example.com/a', 'https://example.com/c']);
    });

    it('startPrefetching populates fetchQueue correctly', async () => {
        const manifest = {
            manifest: {
                urlVersions: { '/a': '', '/b': '', '/c': '' },
                urlMappings: {}
            }
        };
        const includeList = ['a', 'c'];
        const excludeList = ['b'];
        const priorityPatterns = ['c', 'a'];

        _testExports.startPrefetching(manifest, includeList, excludeList, priorityPatterns, 0);

        // Simulate some delay for the asynchronous operations to complete
        await new Promise(r => setTimeout(r, 100));

        expect(_testExports.fetchQueue).toEqual([]);
    });

    it('sends prefetchComplete message after processing queue', async () => {
        // _testExports.fetchQueue = [];
        _testExports.fetchQueue.push('https://example.com');
        await _testExports.processQueue();

        // Since the processQueue is asynchronous and uses setTimeout, we need to ensure all promises are resolved
        await new Promise(resolve => setImmediate(resolve));

        expect(global.self.clients.matchAll).toHaveBeenCalled();
        const mockClients = await global.self.clients.matchAll();
        mockClients.forEach(client => {
            expect(client.postMessage).toHaveBeenCalledWith({ action: 'prefetchComplete' });
        });
    });

    // Clear mocks
    afterAll(() => {
        jest.clearAllMocks();
    });

    // Clear fetchQueue
    afterEach(() => {
        _testExports.fetchQueue.length = 0;
    });
});
