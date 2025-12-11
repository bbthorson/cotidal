# The Living Matrix (formerly Sure Shot)

The Living Matrix is a "Palate Companion" application designed to evolve with the user. Unlike a traditional one-and-done quiz, it acts as a persistent utility for understanding and exploring one's own taste preferences across different contexts.

## Core Concepts

### 1. The Palate Map
At the heart of the experience is a 2D Matrix:
- **X-Axis:** Rich (Left) to Crisp (Right) -- *Note: Code may map this differently, check `src/lib/data.ts`*
- **Y-Axis:** Sweet (Bottom) to Savory (Top)

Users are plotted as a "Pulsing Dot" on this map. Their position is calculated via a "Sensory Calibration" quiz.

### 2. Context Awareness
Your taste doesn't change, but your situation does. The app features a **Context Switcher** that adapts recommendations without moving your palate profile:
- **My Usual:** The baseline recommendations based on pure flavor affinity.
- **Business:** Filters for "Safe", "Prestige", and "Classic" drinks.
- **Party:** Prioritizes "Social" and "Crushable" drinks.
- **Holiday:** Highlights "Warm", "Comfort", and "Spiced" notes.

### 3. AI Sommelier
Integrated with **Google Genkit**, the app provides witty, context-aware explanations for why a specific drink matches the user's palate and the current vibe.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [Radix UI](https://www.radix-ui.com/) & [Lucide React](https://lucide.dev/)
- **AI Integration:** [Genkit](https://firebase.google.com/docs/genkit) (`@genkit-ai/google-genai`)
- **Package Manager:** pnpm

## Getting Started

### Prerequisites
- Node.js (v20 or later recommended)
- pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd nextn
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

### Running the Application

To start the development server:

```bash
pnpm dev
```

The app will be available at `http://localhost:9002`.

### AI Development

To run the Genkit developer UI:

```bash
pnpm genkit:dev
```

## Project Structure

- `src/app`: Next.js App Router pages and layouts.
- `src/components/app`: Core application logic (DiscoveryQuiz, ResultsScreen).
- `src/lib`: Data definitions (`data.ts` for drinks and questions).
- `src/ai`: Genkit flows and configuration.

## License

Private
