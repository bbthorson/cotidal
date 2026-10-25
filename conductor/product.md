> **Historical.** This is the brief the project started from. The product as
> built is described in README.md, docs/brand.md and docs/routes.md; where they
> disagree with this file, they are right. Notably: there is no Genkit (the
> model is Cloudflare Workers AI, docs/generation.md), the quiz is adaptive
> after four fixed openers rather than three fixed steps, and the map's y axis
> runs Savory (−10) to Sweet (+10).

# Initial Concept

Cotidal is a Palate Companion application designed to help adventurous drinkers who don't know where to start by triangulating their taste preferences into a Palate Matrix and providing AI-powered recommendations.

# Cotidal (Palate Companion)

## Product Vision
A "Palate Companion" application designed to evolve with the user, acting as a persistent utility for understanding and exploring personal taste preferences with a touch of mystic guidance.

## Target Audience
- **The Adventurous Novice:** Drinkers who want to explore beyond their usual comfort zone but lack the vocabulary or knowledge to know where to start.

## Core UX Goals
- **Discovery:** Pinpoint a user's "Palate Coordinate" on a 2D matrix (Rich vs. Crisp, Sweet vs. Savory) and provide tailored drink recommendations.
- **Education (In-Flow):** Demystify complex flavor concepts (acid, bitter, sweetness) through interactive calibration and context-aware AI explanations.

## MVP Features
- **3-Step Triangulation (Calibration Phase):** The cornerstone feature.
    - **Calibration (Biological):** Assesses sugar/bitter sensitivity and acid tolerance.
    - **Architecture (Structural):** Determines preference for texture, temperature, and vessel.
    - **Context (Environmental):** Applies hard filters (Smoke, Anise) and pacing preferences.
- **The Palate Map:** A 2D matrix (X: Rich to Crisp, Y: Sweet to Savory) plotting the user as a "Pulsing Dot."
- **AI Sommelier (Genkit):** Provides witty, educational explanations for recommendations, explaining *why* a drink matches the user's palate coordinate.
- **Baseline Mode ("My Usual"):** Focused on pure flavor affinity recommendations for the MVP.

## Education Strategy
- **AI-Powered Context:** The primary driver for education is the AI Sommelier explaining recommendations.
- **Progressive Disclosure:** Use tooltips for technical terms to keep the UI clean while providing information on demand.