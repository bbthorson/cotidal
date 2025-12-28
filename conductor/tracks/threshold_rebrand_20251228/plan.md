# Track Plan: Threshold Calibration & Mystic Rebrand

## Phase 1: Visual Foundation & Rebrand [checkpoint: 962976d]
- [x] Task: Update Tailwind Config with Botanical Palette ba19a1c
    - [x] Subtask: Define colors (Sage, Terracotta, Obsidian) in `tailwind.config.ts`.
    - [x] Subtask: Add glassmorphism utility classes if not present.
- [x] Task: Global Style Updates ba19a1c
    - [x] Subtask: Update `globals.css` to set the new background and font styles.
- [x] Task: Update Landing Page Hero ba19a1c
    - [x] Subtask: Rewrite copy to "The Crystal Coupe" and "Reveal Your Palate."
    - [x] Subtask: Apply new glassmorphism styles to the main container.
- [x] Task: Conductor - User Manual Verification 'Visual Foundation & Rebrand' (Protocol in workflow.md) 962976d

## Phase 2: The Threshold (Tier 1 Quiz)
- [x] Task: Define Quiz Data Structure ab433f9
    - [x] Subtask: Create/Update `src/lib/discovery-questions.ts` with new binary "Threshold" questions.
- [x] Task: Create Threshold Question Component bfb0805
    - [x] Subtask: Build a reusable `BinaryQuestionCard.tsx` with new styling.
- [x] Task: Implement Quiz Logic f5fd1af
    - [x] Subtask: Write unit tests for mapping binary answers to matrix quadrants.
    - [x] Subtask: Implement the state logic to track progress.
- [ ] Task: Conductor - User Manual Verification 'The Threshold (Tier 1 Quiz)' (Protocol in workflow.md)
