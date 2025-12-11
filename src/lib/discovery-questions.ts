import type { VibeTag } from './data';

export type DiscoveryQuestion = {
  id: string;
  text: string;
  options: {
    text: string;
    vibeTags: VibeTag[];
  }[];
};

export const discoveryQuestions: DiscoveryQuestion[] = [
  {
    id: 'q1',
    text: 'You walk into a crowded party. Your immediate reaction is:',
    options: [
      { text: 'Find the DJ and request a banger.', vibeTags: ['visual', 'social'] }, // i
      { text: 'Scan the room for the most important person.', vibeTags: ['bold', 'classic'] }, // d
      { text: 'Look for the dog/cat.', vibeTags: ['comfort'] }, // s
      { text: 'Critique the interior design and acoustics.', vibeTags: ['complex'] }, // c
    ],
  },
  {
    id: 'q2',
    text: 'The IKEA furniture instructions are wrong. You:',
    options: [
      { text: 'Throw them away and build it my way.', vibeTags: ['bold', 'classic'] }, // d
      { text: 'Call a friend to help (and bring wine).', vibeTags: ['visual', 'social'] }, // i
      { text: 'Patiently try to make it work anyway.', vibeTags: ['comfort'] }, // s
      { text: 'Write a strongly worded email to IKEA.', vibeTags: ['complex'] }, // c
    ],
  },
  {
    id: 'q3',
    text: 'Someone steals your parking spot. You:',
    options: [
      { text: 'Honk and stare them down.', vibeTags: ['bold', 'classic'] }, // d
      { text: 'Make a joke about it to your passenger.', vibeTags: ['visual', 'social'] }, // i
      { text: 'Sigh and find another spot.', vibeTags: ['comfort'] }, // s
      { text: 'Calculate if their car fits the legal dimensions.', vibeTags: ['complex'] }, // c
    ],
  },
  {
    id: 'q4',
    text: 'Zombie apocalypse! What\'s your role?',
    options: [
      { text: 'The Leader (obviously).', vibeTags: ['bold', 'classic'] }, // d
      { text: 'The Morale Booster / Bard.', vibeTags: ['visual', 'social'] }, // i
      { text: 'The Medic / Cook.', vibeTags: ['comfort'] }, // s
      { text: 'The Strategist / Map Reader.', vibeTags: ['complex'] }, // c
    ],
  },
];
