# The Crystal Coupe

The Crystal Coupe is a "Palate Companion" application designed to evolve with the user. Unlike a traditional one-and-done quiz, it acts as a persistent utility for understanding and exploring one's own taste preferences across different contexts.

## Core Concepts

### 1. Triangulation (Calibration Phase)
Instead of a simple linear quiz, we use a 3-step triangulation process to pinpoint the user's "Palate Coordinate":
1.  **Calibration (Biological):** Assesses sugar/bitter sensitivity and acid tolerance.
2.  **Architecture (Structural):** Determines preference for texture (fizzy/still), temperature, and vessel.
3.  **Context (Environmental):** Applies hard filters (Smoke, Anise) and pacing preferences.

### 2. The Palate Map
At the heart of the experience is a 2D Matrix:
- **X-Axis:** Rich (Left) to Crisp (Right)
- **Y-Axis:** Sweet (Bottom) to Savory (Top)

Users are plotted as a "Pulsing Dot" on this map.

### 3. Context Awareness
Your taste doesn't change, but your situation does. The app features a **Context Switcher** that adapts recommendations without moving your palate profile:
- **My Usual:** The baseline recommendations based on pure flavor affinity.
- **Business:** Filters for "Safe", "Prestige", and "Classic" drinks.
- **Party:** Prioritizes "Social" and "Crushable" drinks.
- **Holiday:** Highlights "Warm", "Comfort", and "Spiced" notes.

### 4. AI Sommelier
Integrated with **Vercel AI SDK (`@ai-sdk/google`)**, the app provides witty, context-aware explanations for why a specific drink matches the user's palate and the current vibe.

## Tech Stack

- **Framework:** [Astro 7](https://astro.build/) (Server / Hybrid)
- **Deployment:** [Cloudflare Pages](https://pages.cloudflare.com/) (`@astrojs/cloudflare`)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [React 19](https://react.dev/), [Radix UI](https://www.radix-ui.com/) & [Lucide React](https://lucide.dev/)
- **Data Enrichment:** [TheCocktailDB API](https://www.thecocktaildb.com/) (Real-time images/recipes)
- **AI Integration:** [Vercel AI SDK](https://sdk.vercel.ai/docs) (`@ai-sdk/google`)
- **Package Manager:** npm

## Getting Started

### Prerequisites
- Node.js (v22 or later recommended)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd crystal-coupe
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

To start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:9002`.

## License

Private
