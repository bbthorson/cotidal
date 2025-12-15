## 2024-05-24 - Quiz Transition Locking
**Learning:** In quiz interfaces with automated transitions (timeout-based), users often feel uncertain if their click registered, leading to "rage clicks" or double submissions.
**Action:** Implement a "lock" state immediately upon interaction that:
1. Disables all other options to prevent error.
2. Visually highlights the selected option (overriding disabled opacity) to confirm choice.
3. Holds this state until the transition completes.
This creates a "confident" interface that acknowledges intent instantly.
