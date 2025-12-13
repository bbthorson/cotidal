# Palette's UX Journal

## 2025-12-13 - [Accessible Data Visualization]
**Learning:** The "Palate Map" used `div`s for drink pins, making the core visualization inaccessible to keyboard users. Tooltip triggers must be interactive elements.
**Action:** When creating custom charts/maps, always use `<button>` for data points and explicitly bind `onFocus` handlers to mirror `onMouseEnter` logic so keyboard users get the same "preview" experience.
