
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
    text: 'You walk into a crowded party. Your immediate reaction is:',
    options: [
      { text: 'Find the DJ and request a banger.', value: 'i' },
      { text: 'Scan the room for the most important person.', value: 'd' },
      { text: 'Look for the dog/cat.', value: 's' },
      { text: 'Critique the interior design and acoustics.', value: 'c' },
    ],
  },
  {
    id: 'q2',
    text: 'The IKEA furniture instructions are wrong. You:',
    options: [
      { text: 'Throw them away and build it my way.', value: 'd' },
      { text: 'Call a friend to help (and bring wine).', value: 'i' },
      { text: 'Patiently try to make it work anyway.', value: 's' },
      { text: 'Write a strongly worded email to IKEA.', value: 'c' },
    ],
  },
  {
    id: 'q3',
    text: 'Someone steals your parking spot. You:',
    options: [
      { text: 'Honk and stare them down.', value: 'd' },
      { text: 'Make a joke about it to your passenger.', value: 'i' },
      { text: 'Sigh and find another spot.', value: 's' },
      { text: 'Calculate if their car fits the legal dimensions.', value: 'c' },
    ],
  },
  {
    id: 'q4',
    text: 'Zombie apocalypse! What\'s your role?',
    options: [
      { text: 'The Leader (obviously).', value: 'd' },
      { text: 'The Morale Booster / Bard.', value: 'i' },
      { text: 'The Medic / Cook.', value: 's' },
      { text: 'The Strategist / Map Reader.', value: 'c' },
    ],
  },
];
