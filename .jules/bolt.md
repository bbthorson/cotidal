## 2025-12-17 - React Effect Waterfalls
**Learning:** In `ResultsScreen`, fetching drink metadata sequentially inside `useEffect` caused a significant waterfall, multiplying latency by the number of recommendations.
**Action:** Always parallelize async operations in effects using `Promise.all` and use functional state updates (`set(prev => ...)`) to prevent race conditions when multiple effects fire rapidly.
