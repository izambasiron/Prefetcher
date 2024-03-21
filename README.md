# Prefetcher
Prefetcher is a lightweight JavaScript tool designed to enhance the performance of Outsystems reactive applications by preloading specified resources. It operates on the principle of fetching designated assets ahead of time, reducing load times and improving the responsiveness of the application during navigation.

## Motivation
Web applications often experience lag during navigation due to large resource files, such as JavaScript libraries, which lead to slow screen loads. This issue, characterized by a delay between user interaction and screen transition, is what some might call response latency, jank or interaction inertia.

## What This Does
Prefetcher relies on OutSystems application manifest, which can be found in the browser's local storage (found under `$OS_<ModuleName>$ApplicationInfo`). This tool empowers developers to specify which resources from the manifest to download, which to exclude, and the sequence of loading. It employs a service worker to fetch these assets, effectively "warming up" the browser cache and keeping the main thread unoccupied for optimal user experience. Prefetcher is designed for simplicity, bypassing the Cache API and not providing offline capabilities.

## Key Features
- Utilizes a service worker to offload fetching tasks.
- Relies on the browser's native cache for simplicity.
- Lightweight, non-intrusive addition to existing OutSystems projects.
- Employs requestIdleCallback avoiding network congestion.

## How to Use
Step 1: Add the Prefetcher component on the desired screens. Configure the following parameters where necessary:
- Include: Regex patterns for assets to prefetch from the Manifest.
- Exclude: Regex patterns for assets to exclude from prefetching.
- Order: Prioritize the order of asset prefetching (e.g., ".js", ".css").
- Delay: Time in milliseconds to wait between prefetching assets.

Step 2: Manually add `prefetch-service-worker.js` to your module's Resources due to service worker scope requirements. Find this file in the Prefetch module's Resources, save it without renaming, and import it as a Resource and set for **"Deploy to Target Directory"**.

Step 3: Publish your module, navigate to your app's screen where prefetching should occur, and open the browser's developer tools to confirm that the Prefetcher service worker is registered and actively prefetching the defined assets.

## Contribute
I welcome contributions to Prefetcher! If you have any ideas, suggestions, or bug reports, please submit an issue or a pull request.

## Support
If you find this project helpful, consider supporting me by buying me a coffee:

[![Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-%23FFDD00.svg?&style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/izambasiron)