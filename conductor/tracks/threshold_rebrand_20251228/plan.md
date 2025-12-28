# Track Plan: Threshold Calibration & Mystic Rebrand

## Phase 1: Visual Foundation & Rebrand
- [x] Task: Update Tailwind Config with Botanical Palette ba19a1c
    - [x] Subtask: Define colors (Sage, Terracotta, Obsidian) in `tailwind.config.ts`.
    - [x] Subtask: Add glassmorphism utility classes if not present.
- [x] Task: Global Style Updates ba19a1c
    - [x] Subtask: Update `globals.css` to set the new background and font styles.
- [x] Task: Update Landing Page Hero ba19a1c
    - [x] Subtask: Rewrite copy to "The Crystal Coupe" and "Reveal Your Palate."
    - [x] Subtask: Apply new glassmorphism styles to the main container.
- [ ] Task: Conductor - User Manual Verification 'Visual Foundation & Rebrand' (Protocol in workflow.md)

## Phase 2: The Threshold (Tier 1 Quiz)
- [ ] Task: Define Quiz Data Structure
    - [ ] Subtask: Create/Update `src/lib/discovery-questions.ts` with new binary "Threshold" questions.
- [ ] Task: Create Threshold Question Component
    - [ ] Subtask: Build a reusable `BinaryQuestionCard.tsx` with new styling.
- [ ] Task: Implement Quiz Logic
    - [ ] Subtask: Write unit tests for mapping binary answers to matrix quadrants.
    - [ ] Subtask: Implement the state logic to track progress.
- [ ] Task: Conductor - User Manual Verification 'The Threshold (Tier 1 Quiz)' (Protocol in workflow.md)
