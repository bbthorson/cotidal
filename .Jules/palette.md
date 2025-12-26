## 2025-05-26 - [Async State Visualization]
**Learning:** In AI-driven interfaces, button spinners are insufficient for long-running operations (2s+). Users perceive the interface as "stuck" if the main content area remains static.
**Action:** Implement "Skeleton" or "Thinking" cards in the result area immediately upon submission (using `useActionState`'s `isPending`) to bridge the cognitive gap between input and response.
