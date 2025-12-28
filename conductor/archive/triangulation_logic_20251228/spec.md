# Track Spec: Complete Triangulation Logic (Tiers 2 & 3)

## Goal
Fully implement the "Dynamic Tiered Calibration" logic for Tier 2 (Architecture) and Tier 3 (Context) to refine the user's Palate Matrix coordinates and vibe profile.

## Requirements

### 1. Data Model Refinement
- **Tier 2 (Architecture):** Questions must adjust `x` (Rich/Crisp) and `y` (Sweet/Savory) with lower magnitude than Tier 1 but higher precision. They may also apply `vibeTags`.
- **Tier 3 (Context):** Questions must primarily apply `vibeTags` (e.g., 'complex', 'social') and potential hard filters (Smoke).

### 2. Logic Implementation
- **Vector Addition:** Ensure subsequent questions add to the existing vector, not replace it.
- **Normalization:** Ensure coordinates are clamped within the matrix bounds (-10 to 10).
- **Vibe Accumulation:** Ensure `vibeTags` are accumulated (weighted sum) to influence the final sorting algorithm.

### 3. UI Integration
- **Multi-Choice Support:** Ensure the `DiscoveryQuiz` component handles questions with more than 2 options (using the previously created grid layout).
- **Feedback:** Ensure immediate feedback (toasts or inline text) is displayed for Tier 2 & 3 selections.
