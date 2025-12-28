# Track Plan: Complete Triangulation Logic (Tiers 2 & 3)

## Phase 1: Data & Logic Definition [checkpoint: 0c78821]
- [x] Task: Define Tier 2 & 3 Questions f9bc7af
    - [x] Subtask: Update `src/lib/discovery-questions.ts` with the remaining questions from the Product Guidelines (Fizzy/Still, Glassware, Smoke, Pacing).
    - [x] Subtask: Ensure accurate `dx`, `dy`, and `vibeTag` mappings for each option.
- [x] Task: Enhanced Scoring Logic cd7724f
    - [x] Subtask: Update `src/components/app/DiscoveryQuiz.tsx` to ensure `vibeTags` are correctly accumulated in the state.
    - [x] Subtask: Write a unit test verifying that selecting specific options results in the expected profile state (e.g., "Fizzy" adds 'crushable' tag).
- [x] Task: Conductor - User Manual Verification 'Data & Logic Definition' (Protocol in workflow.md) 0c78821

## Phase 2: UI & Interaction
- [ ] Task: Implement Multi-Option Grid Layout
    - [ ] Subtask: Verify `DiscoveryQuiz.tsx` correctly renders 4-option questions using the grid layout.
    - [ ] Subtask: Ensure the glassmorphism style is consistent for grid cards.
- [ ] Task: Visual Feedback Polish
    - [ ] Subtask: Add a subtle pulse animation to the progress bar when an answer is selected.
- [ ] Task: Conductor - User Manual Verification 'UI & Interaction' (Protocol in workflow.md)
