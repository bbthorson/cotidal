## 2025-02-19 - Effect Dependency Stabilization
**Learning:** Passing derived objects (like sliced arrays) directly into useEffect dependency arrays causes the effect to run on every render, even if the underlying data hasn't changed. This causes unnecessary re-renders when other state (like hover state) changes.
**Action:** Always memoize derived objects (using useMemo) before adding them to dependency arrays to ensure referential stability.
