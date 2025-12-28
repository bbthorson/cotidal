# Track Spec: Threshold Calibration & Mystic Rebrand

## Goal
Transition the existing application to "The Crystal Coupe" by establishing the new visual identity and implementing the first tier of the calibration flow.

## Requirements

### 1. Visual Identity Overhaul
- **Theme:** Botanical & Mystic (Sage, Terracotta, Obsidian).
- **Components:** Update Tailwind configuration and global CSS to reflect the new palette.
- **Landing Page:** Update `src/app/page.tsx` to use new hero copy and visual style (glassmorphism).

### 2. The Threshold (Tier 1 Calibration)
- **Interaction:** Binary questions (e.g., "Coffee or Tea?").
- **Logic:** Each answer should map to a broad quadrant on the Palate Matrix.
- **UI:** Simple, elegant cards with thematic imagery/icons.
- **State:** Store initial coordinates in local state or URL parameters.

### 3. Technical Cleanup
- **Rename:** Ensure all user-facing strings refer to "The Crystal Coupe."
- **Routes:** Ensure the quiz flow starts correctly from the new landing page.
