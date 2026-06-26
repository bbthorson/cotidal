import { test, expect } from '@playwright/test';
import { calculateWeightedRelevance, type MinimalDrinkLog } from '../src/lib/scoring';
import type { Drink } from '../src/lib/data';

test('Relevance Score: Perfect match without logs', async () => {
  const user = {
    x: 0,
    y: 0,
    vibeTags: { classic: 5.0, social: 5.0 }
  };

  const perfectDrink: Drink = {
    name: 'Perfect Dry Martini',
    type: 'Cocktail',
    x: 0,
    y: 0,
    hasSmoke: false,
    isBitter: false,
    hasAnise: false,
    tags: ['classic', 'social']
  };

  // Sensory similarity: distance 0 -> 100 points -> 40 points weighted
  // Vibe tag affinity: all user vibe tags matched -> 100 points -> 30 points weighted
  // History: 0 points -> 0 points weighted
  // Venue: 0 points -> 0 points weighted
  // Total: 40 + 30 = 70 points
  const score = calculateWeightedRelevance(user, perfectDrink, []);
  expect(score).toBe(70);
});

test('Relevance Score: Tasted history bias and venue boosts', async () => {
  const user = {
    x: 0,
    y: 0,
    vibeTags: { classic: 5.0 }
  };

  const drink: Drink = {
    name: 'Venue Negroni',
    type: 'Cocktail',
    x: 0,
    y: 0,
    hasSmoke: false,
    isBitter: true,
    hasAnise: false,
    tags: ['classic']
  };

  // 1. History log: Liked Highly (Hedonic Scale >= 7) -> Adds 100 pts * 0.20 = 20 pts
  const history: MinimalDrinkLog[] = [
    {
      drinkName: 'Venue Negroni',
      location: 'The Nomad Bar',
      hedonicScale: 8,
      createdAt: new Date().toISOString()
    }
  ];

  // Base score without location filter (Sensory 40 + Vibe 30 + History 20 = 90)
  const scoreNoLocation = calculateWeightedRelevance(user, drink, history);
  expect(scoreNoLocation).toBe(90);

  // Score with matching location filter (adds Venue 100 pts * 0.10 = 10 pts -> Total = 100)
  const scoreWithLocation = calculateWeightedRelevance(user, drink, history, 'The Nomad Bar');
  expect(scoreWithLocation).toBe(100);

  // Score with non-matching location filter (Venue score is 0 -> Total = 90)
  const scoreDiffLocation = calculateWeightedRelevance(user, drink, history, 'Sage Apothecary');
  expect(scoreDiffLocation).toBe(90);
});

test('Relevance Score: Disliked history penalty', async () => {
  const user = {
    x: 0,
    y: 0,
    vibeTags: { classic: 5.0 }
  };

  const dislikedDrink: Drink = {
    name: 'Disliked Gin Tonic',
    type: 'Cocktail',
    x: 0,
    y: 0,
    hasSmoke: false,
    isBitter: false,
    hasAnise: false,
    tags: ['classic']
  };

  // History log: Disliked (Hedonic Scale <= 3) -> Subtracts 50 points
  const history: MinimalDrinkLog[] = [
    {
      drinkName: 'Disliked Gin Tonic',
      location: 'The Nomad Bar',
      hedonicScale: 2,
      createdAt: new Date().toISOString()
    }
  ];

  // Sensory 40 + Vibe 30 - History Penalty 50 = 20
  const score = calculateWeightedRelevance(user, dislikedDrink, history);
  expect(score).toBe(20);
});
