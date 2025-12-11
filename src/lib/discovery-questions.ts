import { VibeTag } from './data';

export interface DiscoveryQuestion {
  id: string;
  text: string;
  options: {
    text: string;
    vibeTags: VibeTag[];
  }[];
}

export const discoveryQuestions: DiscoveryQuestion[] = [
  {
    id: 'q1',
    text: 'If your soul had a texture, what would it be?',
    options: [
      { text: 'Polished Marble & Steel', vibeTags: ['classic', 'bold'] },
      { text: 'Worn Leather & Old Books', vibeTags: ['complex', 'comfort'] },
      { text: 'Crushed Velvet & Silk', vibeTags: ['comfort', 'sweet'] },
      { text: 'Neon Light & Glitter', vibeTags: ['visual', 'social'] },
    ],
  },
  {
    id: 'q2',
    text: 'Choose the setting for your perfect night.',
    options: [
      { text: 'A rooftop in Tokyo, surrounded by lights.', vibeTags: ['visual', 'bold'] },
      { text: 'A secret basement speakeasy, dimly lit.', vibeTags: ['classic', 'complex'] },
      { text: 'A bustling dinner party, loud with laughter.', vibeTags: ['social', 'sweet'] },
      { text: 'A cabin in the woods, just a fire.', vibeTags: ['comfort'] },
    ],
  },
  {
    id: 'q3',
    text: 'Which geometric shape speaks to you?',
    options: [
      { text: 'The Triangle (Sharp, Directional)', vibeTags: ['bold', 'classic'] },
      { text: 'The Circle (Continuous, Smooth)', vibeTags: ['social', 'comfort'] },
      { text: 'The Hexagon (Structural, Complex)', vibeTags: ['complex', 'classic'] },
      { text: 'The Star (Explosive, Radiant)', vibeTags: ['visual', 'social'] },
    ],
  },
  {
    id: 'q4',
    text: 'Pick a color palette.',
    options: [
      { text: 'Vantablack & Deep Purple', vibeTags: ['bold', 'complex'] },
      { text: 'Champagne Gold & White', vibeTags: ['classic', 'visual'] },
      { text: 'Moss Green & Earth', vibeTags: ['comfort', 'complex'] },
      { text: 'Electric Blue & Hot Pink', vibeTags: ['social', 'visual'] },
    ],
  },
];
