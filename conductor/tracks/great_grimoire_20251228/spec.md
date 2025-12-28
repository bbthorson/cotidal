# Track Spec: The Great Grimoire: Expanded Library & AI Archetyping

## Goal
Expand the application's drink knowledge from a small seed list to a comprehensive universe of cocktails, using AI to dynamically archetype and map any drink to the Palate Matrix.

## Requirements

### 1. Curated Expansion
- **Broad Coverage:** Expand `src/lib/data.ts` to include 50+ classic and modern cocktails, ensuring every quadrant of the matrix has high-density coverage.
- **Metadata:** Ensure every drink has accurate `hasSmoke`, `hasAnise`, `isBitter` flags and `vibeTags`.

### 2. AI Archetyping Engine (The Grimoire Access)
- **Categorization Logic:** Implement a Genkit flow that takes a drink name and description/ingredients and outputs its Matrix DNA (`x`, `y`, and `vibeTags`).
- **Persona:** Use "The Oracle" persona for the categorization reasoning.

### 3. Dynamic Discovery
- **CocktailDB Sync:** Create a mechanism to potentially fetch and archetype drinks from CocktailDB that aren't in our static seed list if a user's palate is in a unique coordinate.
