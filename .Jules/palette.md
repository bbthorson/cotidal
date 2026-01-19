# Palette's UX Journal

## 2025-12-13 - [Accessible Data Visualization]
**Learning:** The "Palate Map" used `div`s for drink pins, making the core visualization inaccessible to keyboard users. Tooltip triggers must be interactive elements.
**Action:** When creating custom charts/maps, always use `<button>` for data points and explicitly bind `onFocus` handlers to mirror `onMouseEnter` logic so keyboard users get the same "preview" experience.

## 2025-12-16 - [Immediate Interaction Feedback]
**Learning:** Transition delays (e.g., waiting for next question) without visual feedback confuse users and encourage "rage clicking".
**Action:** Always pair artificial delays (like `setTimeout` for pacing) with an immediate "locked" state (disabled buttons) and a visual indicator (spinner/color change) to confirm the input was received.

## 2025-12-17 - [SPA Focus Management]
**Learning:** In Single Page Applications, replacing content (like quiz questions) without reloading the page often leaves keyboard focus lost on the `body`.
**Action:** When swapping major content blocks, programmatically move focus to the new content's heading (using `tabIndex={-1}`) to ensure screen readers announce it and keyboard navigation resumes from a logical place. Use `onAnimationComplete` for animated transitions.

## 2025-05-22 - [Map Self-Location Accessibility]
**Learning:** In visual maps, screen reader users can navigate data points (pins) but lack context of *their own* position if the "You Are Here" marker is purely visual.
**Action:** Implement the "You Are Here" marker as a focusable element (e.g., button) with an ARIA label describing its semantic position (e.g., "Quadrant: Lush & Lively") to ground the user in the data space.

## 2025-05-23 - [Synchronized List-Map Focus]
**Learning:** When a list of items corresponds to markers on a map/chart, keyboard users miss the connection if navigating the list doesn't highlight the map markers.
**Action:** Ensure list items corresponding to map markers are focusable (`tabIndex={0}`) and bind `onFocus` to the same state setter as `onMouseEnter`, providing equivalent visual feedback for keyboard navigation.

## 2025-05-24 - [Conversational Inline Feedback]
**Learning:** Using global Toast notifications for immediate, context-specific feedback (like quiz answers) breaks the visual flow and forces eye movement away from the interaction point.
**Action:** For conversational interfaces (quizzes, wizards), place feedback directly within or adjacent to the active element (button) to maintain focus and create a "dialogue" feel.

## 2025-05-25 - [Component Semantics vs Names]
**Learning:** The `CardTitle` component renders a `div` by default, not a semantic heading (h1-h6), leading to documents with poor outline structure despite using "Title" components.
**Action:** Always verify the underlying HTML tag of UI components. Use standard HTML headings (h1, h2) for semantic structure, applying the component's styling classes manually if necessary, rather than relying on the component name to imply semantics.

## 2025-05-26 - [Accessible Tab Lists]
**Learning:** Container components like `TabsList` often lack semantic context for screen readers, leaving users guessing what the tabs control (e.g., "Business" vs. "Party" could be anything).
**Action:** Always provide an explicit `aria-label` to `TabsList` components (e.g., `aria-label="Filter recommendations by context"`) to describe the purpose of the categorization.

## 2025-12-18 - [Responsive Accessible Labels]
**Learning:** When text labels are visually hidden on small screens (leaving only icons), the accessible name relies on the icon (often an emoji), which can be ambiguous or fail to match the desktop label.
**Action:** Use `aria-label` on the interactive element (e.g., `TabsTrigger`) to force the accessible name to match the full text label (e.g., "My Usual") regardless of the current visual state.

## 2025-05-27 - [Redundant Keyboard Shortcuts]
**Learning:** For binary choices presented side-by-side, users on mobile keyboards or using vertical navigation modes expect Up/Down to map to the options, not just Left/Right.
**Action:** Map `ArrowUp` to the first option (Left) and `ArrowDown` to the second option (Right) in binary choice components, and expose this via `aria-keyshortcuts` and visual hints.
