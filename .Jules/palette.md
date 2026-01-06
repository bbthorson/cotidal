## 2025-05-27 - [Live Regions for Async Status]
**Learning:** Screen reader users often don't know when an async operation (like an AI search) is "thinking" or "finished" if the visual feedback is purely graphical.
**Action:** Use `role="status"` and `aria-live="polite"` on the container of loading indicators to announce "processing" states. When results arrive, programmatically move focus to the result header to confirm completion and facilitate immediate reading.
