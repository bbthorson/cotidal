## 2024-05-22 - Prefetching to Eliminate Waterfalls
**Learning:** React "Render -> Effect -> Fetch" waterfalls can be eliminated by initiating the fetch in the previous step (e.g., the event handler that triggers the navigation), especially when using a cache that deduplicates in-flight promises.
**Action:** When identifying slow page transitions, check if the next page's data requirements are known. If so, call the fetch function (which must use a cache/promise-sharing mechanism) before changing state/navigating.
