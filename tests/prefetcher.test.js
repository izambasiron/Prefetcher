import { init, _testExports } from '../src/prefetcher';

// Mock browser APIs
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(), // Mock setItem if needed for any setup
    clear: jest.fn(),
};

// Mocks for DOM manipulation
let appendChildSpy;
let createElementSpy;

// Mock for requestIdleCallback and setTimeout (via Jest's fake timers)
jest.useFakeTimers();

describe('Prefetcher Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Clear all mocks

        // Setup spies for DOM manipulation
        // Spy on document.head.appendChild and provide a mock implementation
        appendChildSpy = jest.spyOn(document.head, 'appendChild').mockImplementation(node => {
            // console.log('appendChild called with:', node.outerHTML); // For debugging
        });
        // Spy on document.createElement and make it return a mock element
        createElementSpy = jest.spyOn(document, 'createElement').mockImplementation(tagName => {
            // console.log('createElement called with:', tagName); // For debugging
            const mockElement = {
                tagName: tagName.toUpperCase(),
                rel: '',
                href: '',
                as: '',
                // Simulate dataset for any attributes if needed
                dataset: {},
                // Add other properties if your code uses them
            };
            // console.log('Returning mock element:', mockElement); // For debugging
            return mockElement;
        });

        // Reset localStorage for each test to ensure isolation
        localStorage.getItem.mockReset();
    });

    afterEach(() => {
        // Restore the original implementations after each test
        if (appendChildSpy) appendChildSpy.mockRestore();
        if (createElementSpy) createElementSpy.mockRestore();
    });

    describe('_testExports.parseConfig', () => {
        it('should parse a valid JSON config string', () => {
            const configStr = '{"include": ["/js/"], "exclude": ["/css/"], "order": ["/js/main.js"], "delay": 500}';
            expect(_testExports.parseConfig(configStr)).toEqual({
                include: ["/js/"],
                exclude: ["/css/"],
                order: ["/js/main.js"],
                delay: 500,
            });
        });

        it('should return an empty object for invalid JSON', () => {
            expect(_testExports.parseConfig("not json")).toEqual({});
        });

        it('should return an empty object for null input', () => {
            expect(_testExports.parseConfig(null)).toEqual({});
        });
    });

    describe('_testExports.getManifest', () => {
        it('should retrieve and parse a valid manifest from localStorage', () => {
            const manifest = { manifest: { urlVersions: { "/app.js": "?v=1" } } };
            localStorage.getItem.mockReturnValueOnce(JSON.stringify(manifest));
            expect(_testExports.getManifest('testManifestKey')).toEqual(manifest);
            expect(localStorage.getItem).toHaveBeenCalledWith('testManifestKey');
        });

        it('should return an empty object if manifest is not in localStorage', () => {
            localStorage.getItem.mockReturnValueOnce(null);
            expect(_testExports.getManifest('testManifestKey')).toEqual({});
        });

        it('should return an empty object for invalid JSON in localStorage', () => {
            localStorage.getItem.mockReturnValueOnce("not json");
            expect(_testExports.getManifest('testManifestKey')).toEqual({});
        });
    });

    describe('_testExports.determineLinkAsType', () => {
        const { determineLinkAsType } = _testExports;
        it('should return "script" for .js files', () => {
            expect(determineLinkAsType('http://example.com/file.js')).toBe('script');
            expect(determineLinkAsType('/path/to/script.js?v=1.2.3')).toBe('script');
        });
        it('should return "style" for .css files', () => {
            expect(determineLinkAsType('http://example.com/style.css')).toBe('style');
        });
        it('should return "image" for common image types', () => {
            ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].forEach(ext => {
                expect(determineLinkAsType(`http://example.com/image.${ext}`)).toBe('image');
            });
        });
        it('should return "font" for common font types', () => {
            ['woff', 'woff2', 'ttf', 'otf'].forEach(ext => {
                expect(determineLinkAsType(`http://example.com/font.${ext}`)).toBe('font');
            });
        });
        it('should return "fetch" for other file types or no extension', () => {
            expect(determineLinkAsType('http://example.com/file.xml')).toBe('fetch');
            expect(determineLinkAsType('http://example.com/data')).toBe('fetch');
        });
    });

    describe('_testExports.shouldBePrefetched', () => {
        const { shouldBePrefetched } = _testExports;
        const url = 'http://example.com/path/file.js';

        it('should return true if includeList is empty and url is not in excludeList', () => {
            expect(shouldBePrefetched(url, [], [])).toBe(true);
        });
        it('should return false if url is in excludeList', () => {
            expect(shouldBePrefetched(url, [], ['example.com'])).toBe(false);
        });
        it('should return true if url matches includeList and not in excludeList', () => {
            expect(shouldBePrefetched(url, ['example.com'], [])).toBe(true);
            expect(shouldBePrefetched(url, ['/path/'], [])).toBe(true);
        });
        it('should return false if url does not match includeList', () => {
            expect(shouldBePrefetched(url, ['/otherpath/'], [])).toBe(false);
        });
        it('should prioritize excludeList over includeList', () => {
            expect(shouldBePrefetched(url, ['example.com'], ['file.js'])).toBe(false);
        });
    });

    describe('_testExports.prioritizeUrls', () => {
        const { prioritizeUrls } = _testExports;
        const urls = [
            'http://example.com/style.css',
            'http://example.com/script.js',
            'http://example.com/image.png',
            'http://example.com/font.woff',
            'http://example.com/another.js',
        ];

        it('should return urls as is if no priorityPatterns', () => {
            expect(prioritizeUrls(urls, [])).toEqual(urls);
        });
        it('should prioritize URLs based on patterns', () => {
            const priorityPatterns = ['script.js', '\\.css$', 'image\\.png'];
            const expected = [
                'http://example.com/script.js',
                'http://example.com/style.css',
                'http://example.com/image.png',
                'http://example.com/font.woff', // These were not in patterns, order among them is preserved
                'http://example.com/another.js',
            ];
            expect(prioritizeUrls(urls, priorityPatterns)).toEqual(expected);
        });
         it('should handle non-matching patterns gracefully', () => {
            const priorityPatterns = ['nonexistent', 'anothernonexistent'];
            expect(prioritizeUrls(urls, priorityPatterns)).toEqual(urls);
        });
    });

    describe('_testExports.processManifestAndPreload', () => {
        const { processManifestAndPreload } = _testExports;
        const mockManifest = {
            manifest: {
                urlVersions: {
                    '/app.js': '?v=1',
                    '/style.css': '?v=1',
                    '/image.png': '?v=1',
                    '/font.woff': '?v=1',
                    '/data.json': '?v=1', // 'fetch'
                    '/excluded.js': '?v=1',
                },
                urlMappings: {
                    "friendly-name.js": "/app.js?v=1", // Should be de-duped by full URL construction
                    "absolute/path.js": "https://cdn.example.com/lib.js?v=2"
                }
            }
        };

        beforeEach(() => {
            // Ensure location.origin is defined for tests
            global.location = { origin: 'http://localhost' };
        });

        it('should create and append link elements for preloading', () => {
            processManifestAndPreload(mockManifest, [], [], []);
            jest.runAllTimers(); // To execute logic within runWhenIdle

            // Expected URLs from urlVersions + urlMappings, after full path construction
            // Note: /app.js is listed twice in manifest but should only be processed once due to URL construction
            // http://localhost/app.js?v=1 (from urlVersions)
            // http://localhost/style.css?v=1
            // http://localhost/image.png?v=1
            // http://localhost/font.woff?v=1
            // http://localhost/data.json?v=1
            // http://localhost/excluded.js?v=1
            // https://cdn.example.com/lib.js?v=2 (from urlMappings)

            expect(createElementSpy).toHaveBeenCalledTimes(7); // 6 from urlVersions, 1 from urlMappings
            expect(appendChildSpy).toHaveBeenCalledTimes(7);

            const appendedLinks = appendChildSpy.mock.calls.map(call => call[0]);

            expect(appendedLinks.find(link => link.href === 'http://localhost/app.js?v=1').as).toBe('script');
            expect(appendedLinks.find(link => link.href === 'http://localhost/style.css?v=1').as).toBe('style');
            expect(appendedLinks.find(link => link.href === 'http://localhost/image.png?v=1').as).toBe('image');
            expect(appendedLinks.find(link => link.href === 'http://localhost/font.woff?v=1').as).toBe('font');
            expect(appendedLinks.find(link => link.href === 'http://localhost/data.json?v=1').as).toBe('fetch');
            expect(appendedLinks.find(link => link.href === 'https://cdn.example.com/lib.js?v=2').as).toBe('script');


            appendedLinks.forEach(link => {
                expect(link.rel).toBe('preload');
            });
        });

        it('should respect includeList and excludeList', () => {
            const include = ['/app.js', 'cdn.example.com'];
            const exclude = ['/excluded.js', '/style.css']; // style.css will be excluded
            processManifestAndPreload(mockManifest, include, exclude, []);
            jest.runAllTimers();
            
            // Expected: /app.js, https://cdn.example.com/lib.js
            expect(createElementSpy).toHaveBeenCalledTimes(2);
            expect(appendChildSpy).toHaveBeenCalledTimes(2);

            const appendedLinks = appendChildSpy.mock.calls.map(call => call[0]);
            expect(appendedLinks.some(link => link.href === 'http://localhost/app.js?v=1')).toBe(true);
            expect(appendedLinks.some(link => link.href === 'https://cdn.example.com/lib.js?v=2')).toBe(true);
        });

        it('should prioritize links based on order patterns', () => {
            const order = ['\\.css$', '/app\\.js']; // CSS first, then app.js
            processManifestAndPreload(mockManifest, [], ['/excluded.js'], order); // Exclude one to simplify
            jest.runAllTimers();

            // Expected 5 links (original 7 - /excluded.js - /app.js from mapping which is a duplicate)
            // Actually 6 links (original 7 - /excluded.js = 6 links)
            expect(createElementSpy).toHaveBeenCalledTimes(6);
            expect(appendChildSpy).toHaveBeenCalledTimes(6);

            const appendedLinksHrefs = appendChildSpy.mock.calls.map(call => call[0].href);
            
            // Check if style.css comes before app.js
            const cssIndex = appendedLinksHrefs.indexOf('http://localhost/style.css?v=1');
            const appJsIndex = appendedLinksHrefs.indexOf('http://localhost/app.js?v=1');

            expect(cssIndex).not.toBe(-1);
            expect(appJsIndex).not.toBe(-1);
            expect(cssIndex).toBeLessThan(appJsIndex);
        });
        
        it('should call onComplete callback if provided, even if manifest is empty', () => {
            const onCompleteCallback = jest.fn();
            // Simulate init's role in setting triggerOnPrefetchComplete
            _testExports.triggerOnPrefetchComplete = onCompleteCallback; 
            
            processManifestAndPreload({ manifest: {} }, [], [], []);
            jest.runAllTimers();
            expect(onCompleteCallback).toHaveBeenCalledTimes(1);
        });
    });

    describe('init', () => {
        const mockManifestContent = {
            manifest: {
                urlVersions: { '/main.js': '?v=1' },
                urlMappings: {}
            }
        };
        const configStr = '{"delay": 100}'; // With a delay

        beforeEach(() => {
            localStorage.getItem.mockReturnValue(JSON.stringify(mockManifestContent));
             // Ensure location.origin is defined for tests
            global.location = { origin: 'http://localhost' };
        });

        it('should parse config, get manifest, and schedule preloading with delay', () => {
            const onComplete = jest.fn();
            init(configStr, 'manifestKey', onComplete);

            expect(localStorage.getItem).toHaveBeenCalledWith('manifestKey');
            expect(appendChildSpy).not.toHaveBeenCalled(); // Not yet, due to delay + runWhenIdle

            jest.advanceTimersByTime(99); // Advance time by less than delay
            expect(appendChildSpy).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1); // Advance time to meet delay
            jest.runAllTimers(); // Execute requestIdleCallback

            expect(createElementSpy).toHaveBeenCalledTimes(1);
            expect(appendChildSpy).toHaveBeenCalledTimes(1);
            const link = appendChildSpy.mock.calls[0][0];
            expect(link.href).toBe('http://localhost/main.js?v=1');
            expect(link.rel).toBe('preload');
            expect(link.as).toBe('script');
            expect(onComplete).toHaveBeenCalledTimes(1);
        });

        it('should proceed immediately if delay is 0 or not specified', () => {
            const onComplete = jest.fn();
            const noDelayConfig = '{}'; // No delay
            init(noDelayConfig, 'manifestKey', onComplete);
            
            expect(localStorage.getItem).toHaveBeenCalledWith('manifestKey');
            expect(appendChildSpy).not.toHaveBeenCalled(); // Not yet, due to runWhenIdle

            jest.runAllTimers(); // Execute requestIdleCallback

            expect(createElementSpy).toHaveBeenCalledTimes(1);
            expect(appendChildSpy).toHaveBeenCalledTimes(1);
            expect(onComplete).toHaveBeenCalledTimes(1);
        });
        
        it('should call onComplete even if manifest is empty or invalid', () => {
            localStorage.getItem.mockReturnValueOnce(JSON.stringify({})); // Empty manifest
            const onComplete = jest.fn();
            init('{}', 'emptyManifestKey', onComplete);
            jest.runAllTimers();
            expect(onComplete).toHaveBeenCalledTimes(1);
            expect(appendChildSpy).not.toHaveBeenCalled();

            localStorage.getItem.mockReturnValueOnce("invalid json"); // Invalid manifest
            const onComplete2 = jest.fn();
            init('{}', 'invalidManifestKey', onComplete2);
            jest.runAllTimers();
            expect(onComplete2).toHaveBeenCalledTimes(1);
            expect(appendChildSpy).not.toHaveBeenCalled();
        });
    });
});
