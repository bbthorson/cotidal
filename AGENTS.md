# Agent Context: The Crystal Coupe

This document serves as a guide for AI agents working on "The Crystal Coupe" codebase. It outlines the architectural philosophy, key data structures, and the vision for the product's evolution.

## Product Vision: From Static Quiz to Triangulation Engine

We have pivoted from a simple linear quiz to a **"Triangulation Engine"**.
*   **Old Model:** Linear questions -> Score.
*   **New Model:** 3-Stage Triangulation (Calibration -> Architecture -> Context) to pinpoint the user's biological, structural, and environmental preferences.

## Key Components

### 1. The Palate Map (`src/components/app/ResultsScreen.tsx`)
*   **Visuals:** A 2D Cartesian plane.
*   **Data:** `User` has `x, y` coordinates. `Drink` has `x, y` coordinates.
*   **Logic:**
    *   **Distance:** Euclidean distance determines the "raw match".
    *   **Vibe Tags:** Secondary sorting layer (e.g., "Classic", "Social").
    *   **Context:** Temporary filters/boosts applied on top of the base map (e.g., "Business" context boosts "Prestige" tags).

### 2. Data Model (`src/lib/data.ts`)
*   **`User`**: Now tracks `dislikesAnise` explicitly alongside `dislikesSmoke` and `dislikesBitter`.
*   **`VibeTag`**: Controlled vocabulary for drink attributes.
*   **`Drink`**: The static database of beverages.
    *   *New Field:* `hasAnise` (boolean).
    *   *Constraints:* `hasSmoke`, `isBitter`, `hasAnise` are boolean flags for hard filtering.

### 3. External Integrations
*   **TheCocktailDB**: We now use `src/lib/cocktail-api.ts` to fetch real-time metadata (Images, Instructions) for the recommended drinks. This replaces static placeholders.

### 4. AI Integration (`src/ai/`)
*   **Sommelier:** Generates explanations for *why* a drink fits a user (`src/app/actions/explain-drink.ts`).

## UX Principles
*   **"Your Dot Stays Put":** When changing contexts (Business, Holiday), the user's profile dot *does not move*. The *map around them* changes (different drinks light up).
*   **Botanical & Mystic:** The aesthetic is "Mystic Pharmacy". Use glassmorphism, Botanical greens (Sage), Terracotta accents, and Obsidian backgrounds.

## Future Roadmap (for next Agent)
1.  **Framework Transition (Astro Native):** We have migrated the application to Astro. In future efforts, progressively transition UI components away from React Islands to native Astro components / Web Components / lightweight vanilla JS where feasible for zero client JS footprint.
2.  **Persistence:** Save the User's `x, y` to AT Protocol PDS / local storage.
3.  **The Feedback Loop:** Implement the "Rate this Drink" feature that adjusts the User's `x, y` based on feedback (e.g., "Too bitter" -> Move user left).
4.  **Dynamic Map:** Allow users to drag their dot to explore "What if I try something Rich?"

## Development Tips
*   Always check `src/lib/data.ts` when adding new filtering logic.
*   Use `pnpm` for all package operations.
