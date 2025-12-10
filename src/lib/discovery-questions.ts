
export type DiscoveryQuestion = {
  id: string;
  text: string;
  options: {
    text: string;
    value: 'd' | 'i' | 's' | 'c';
  }[];
};

export const discoveryQuestions: DiscoveryQuestion[] = [
  {
    id: 'q1',
    text: 'Your ideal weekend getaway looks like...',
    options: [
      { text: 'An action-packed adventure', value: 'd' },
      { text: 'A group trip to a lively city', value: 'i' },
      { text: 'A relaxing retreat to a cozy cabin', value: 's' },
      { text: 'A cultural tour of a historic city', value: 'c' },
    ],
  },
  {
    id: 'q2',
    text: 'You\'re at a party. Where can we find you?',
    options: [
      { text: 'Leading a competitive game', value: 'd' },
      { text: 'Telling stories in the center of a group', value: 'i' },
      { text: 'Having a deep conversation with a close friend', value: 's' },
      { text: 'Observing from the sidelines', value: 'c' },
    ],
  },
  {
    id: 'q3',
    text: 'How do you choose a movie to watch?',
    options: [
      { text: 'Pick the highest-rated action blockbuster', value: 'd' },
      { text: 'Whatever my friends are excited about', value: 'i' },
      { text: 'Re-watch a favorite classic I know I love', value: 's' },
      { text: 'Researching reviews and trailers for 30 mins', value: 'c' },
    ],
  },
  {
    id: 'q4',
    text: 'What\'s your approach to a new project?',
    options: [
      { text: 'Jump in and figure it out as I go', value: 'd' },
      { text: 'Brainstorm exciting ideas with a team', value: 'i' },
      { text: 'Look for a clear, step-by-step plan', value: 's' },
      { text: 'Create a detailed spreadsheet and timeline first', value: 'c' },
    ],
  },
];
