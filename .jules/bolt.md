## 2024-05-22 - Memory vs Code Discrepancy
**Learning:** The system memory claimed `explainDrinkMatch` had an in-memory LRU cache, but the code did not. This highlights the importance of verifying "facts" from memory against the actual codebase.
**Action:** Always verify optimizations mentioned in memory/documentation exist in the code before assuming they are active. If missing, implementing them is a valid task.
