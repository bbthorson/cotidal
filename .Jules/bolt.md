## 2025-02-24 - Parallelize Async Operations
**Learning:** Found a "waterfall" pattern in `ResultsScreen` where drink details were fetched sequentially inside a `for` loop within `useEffect`. This unnecessarily delays the UI update for subsequent items.
**Action:** Always use `Promise.all` (or similar concurrency tools) when fetching multiple independent resources, rather than awaiting them sequentially in a loop.
