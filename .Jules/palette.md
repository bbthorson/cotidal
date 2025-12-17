# Palette's UX Journal

## 2025-12-13 - [Accessible Data Visualization]
**Learning:** The "Palate Map" used `div`s for drink pins, making the core visualization inaccessible to keyboard users. Tooltip triggers must be interactive elements.
**Action:** When creating custom charts/maps, always use `<button>` for data points and explicitly bind `onFocus` handlers to mirror `onMouseEnter` logic so keyboard users get the same "preview" experience.

## 2025-12-16 - [Immediate Interaction Feedback]
**Learning:** Transition delays (e.g., waiting for next question) without visual feedback confuse users and encourage "rage clicking".
**Action:** Always pair artificial delays (like `setTimeout` for pacing) with an immediate "locked" state (disabled buttons) and a visual indicator (spinner/color change) to confirm the input was received.
