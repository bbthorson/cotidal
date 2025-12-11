# Agent Context: The Living Matrix

This document serves as a guide for AI agents working on "The Living Matrix" codebase. It outlines the architectural philosophy, key data structures, and the vision for the product's evolution.

## Product Vision: From Quiz to Companion

We have pivoted from a static "Discovery Quiz" to a persistent "Palate Companion".
*   **Old Model:** User takes quiz -> Gets Result -> Leaves.
*   **New Model:** User gets Profile -> Uses Map for different occasions -> Updates Profile over time.

## Key Components

### 1. The Palate Map (`src/components/app/ResultsScreen.tsx`)
*   **Visuals:** A 2D Cartesian plane.
*   **Data:** `User` has `x, y` coordinates. `Drink` has `x, y` coordinates.
*   **Logic:**
    *   **Distance:** Euclidean distance determines the "raw match".
    *   **Vibe Tags:** Secondary sorting layer (e.g., "Classic", "Social").
    *   **Context:** Temporary filters/boosts applied on top of the base map (e.g., "Business" context boosts "Prestige" tags).

### 2. Data Model (`src/lib/data.ts`)
*   **`VibeTag`**: Controlled vocabulary for drink attributes.
    *   *New Tags:* `messy`, `polarizing`, `prestige`, `warm`, `spice`, `crushable`.
*   **`Drink`**: The static database of beverages.
    *   *Important:* Coordinates (`x`, `y`) are fixed.
    *   *Constraints:* `hasSmoke`, `isBitter` are boolean flags for hard filtering.

### 3. AI Integration (`src/ai/`)
*   **Sommelier:** Generates explanations for *why* a drink fits a user (`src/app/actions/explain-drink.ts`).
*   **Future:** "Active Tasting Loop" - AI interviews the user after a drink to update their `x, y` coordinates.

## UX Principles
*   **"Your Dot Stays Put":** When changing contexts (Business, Holiday), the user's profile dot *does not move*. The *map around them* changes (different drinks light up).
*   **Mid-Century Modern:** The aesthetic is "Palm Springs 1960s". Use `shadow-mcm`, `#B7410E` (Rust), and Cream backgrounds.

## Future Roadmap (for next Agent)
1.  **Persistence:** Save the User's `x, y` to a database (Firebase/Postgres).
2.  **The Feedback Loop:** Implement the "Rate this Drink" feature that adjusts the User's `x, y` based on feedback (e.g., "Too bitter" -> Move user left).
3.  **Dynamic Map:** Allow users to drag their dot to explore "What if I try something Rich?"

## Development Tips
*   Always check `src/lib/data.ts` when adding new filtering logic.
*   Use `pnpm` for all package operations.
