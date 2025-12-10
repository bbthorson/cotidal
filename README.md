# Sure Shot

Sure Shot is a Next.js-based drink recommendation application designed to help users discover their perfect beverage match. It utilizes a unique coordinate-based system and personality quizzes to tailor recommendations, alongside AI-powered search capabilities.

## Features

### 1. Palette Quiz
A coordinate-based recommendation engine that maps user preferences on two axes:
- **X-Axis:** Sweet (Negative) to Bitter (Positive)
- **Y-Axis:** Rich (Negative) to Crisp (Positive)

Users answer a series of questions about their taste preferences (e.g., coffee, dessert, texture), and the app calculates their "flavor profile" coordinates to suggest drinks from a curated database including Cocktails, Wines, Beers, and Spirits.

### 2. Discovery Quiz
A fun, personality-based quiz that categorizes users into archetypes (D, I, S, C) based on their reactions to social and hypothetical situations. This adds a layer of personalization to the experience.

### 3. AI-Powered Cocktail Search
Integrated with **Google Genkit**, the app features an ingredient-based cocktail search agent. Users can input ingredients they have on hand, and the AI agent (simulating an expert mixologist) suggests recipes.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [Radix UI](https://www.radix-ui.com/) & [Lucide React](https://lucide.dev/)
- **AI Integration:** [Genkit](https://firebase.google.com/docs/genkit) (`@genkit-ai/google-genai`)
- **Deployment/Hosting:** Firebase (configured via `apphosting.yaml`)

## Getting Started

### Prerequisites
- Node.js (v20 or later recommended)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd nextn
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

### AI Development

To run the Genkit developer UI:

```bash
npm run genkit:dev
```

## Project Structure

- `src/app`: Next.js App Router pages and layouts.
- `src/components`: UI components (Quizzes, Results Screens, etc.).
- `src/lib`: Data definitions (`data.ts` for drinks, `discovery-questions.ts` for personality quiz).
- `src/ai`: Genkit flows and configuration.

## License

Private
