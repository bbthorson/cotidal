import { VibeTag } from './data';

export interface DiscoveryQuestion {
  id: string;
  text: string;
  options: {
    text: string;
    vibeTags: VibeTag[];
    imageSrc: string;
  }[];
}

export const discoveryQuestions: DiscoveryQuestion[] = [
  {
    id: 'q1',
    text: 'If your soul had a texture, what would it be?',
    options: [
      { text: 'Polished Marble & Steel', vibeTags: ['classic', 'bold'], imageSrc: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=400' },
      { text: 'Worn Leather & Old Books', vibeTags: ['complex', 'comfort'], imageSrc: 'https://images.unsplash.com/photo-1544216717-3f1132231a96?auto=format&fit=crop&q=80&w=400' },
      { text: 'Crushed Velvet & Silk', vibeTags: ['comfort', 'sweet'], imageSrc: 'https://images.unsplash.com/photo-1571596489392-12f5a6dc6d3c?auto=format&fit=crop&q=80&w=400' },
      { text: 'Neon Light & Glitter', vibeTags: ['visual', 'social'], imageSrc: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&q=80&w=400' },
    ],
  },
  {
    id: 'q2',
    text: 'Choose the setting for your perfect night.',
    options: [
      { text: 'A rooftop in Tokyo, surrounded by lights.', vibeTags: ['visual', 'bold'], imageSrc: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&q=80&w=400' },
      { text: 'A secret basement speakeasy, dimly lit.', vibeTags: ['classic', 'complex'], imageSrc: 'https://images.unsplash.com/photo-1569937756447-e19808d8f3bb?auto=format&fit=crop&q=80&w=400' },
      { text: 'A bustling dinner party, loud with laughter.', vibeTags: ['social', 'sweet'], imageSrc: 'https://images.unsplash.com/photo-1530103862676-de3c9a59af38?auto=format&fit=crop&q=80&w=400' },
      { text: 'A cabin in the woods, just a fire.', vibeTags: ['comfort'], imageSrc: 'https://images.unsplash.com/photo-1476041800959-2f6bb412c8ce?auto=format&fit=crop&q=80&w=400' },
    ],
  },
  {
    id: 'q3',
    text: 'Which geometric shape speaks to you?',
    options: [
      { text: 'The Triangle (Sharp, Directional)', vibeTags: ['bold', 'classic'], imageSrc: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=400' },
      { text: 'The Circle (Continuous, Smooth)', vibeTags: ['social', 'comfort'], imageSrc: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=400' },
      { text: 'The Hexagon (Structural, Complex)', vibeTags: ['complex', 'classic'], imageSrc: 'https://images.unsplash.com/photo-1611195974226-a6a9be9dd091?auto=format&fit=crop&q=80&w=400' },
      { text: 'The Star (Explosive, Radiant)', vibeTags: ['visual', 'social'], imageSrc: 'https://images.unsplash.com/photo-1533227297464-9426210f8ca6?auto=format&fit=crop&q=80&w=400' },
    ],
  },
  {
    id: 'q4',
    text: 'Pick a color palette.',
    options: [
      { text: 'Vantablack & Deep Purple', vibeTags: ['bold', 'complex'], imageSrc: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&q=80&w=400' },
      { text: 'Champagne Gold & White', vibeTags: ['classic', 'visual'], imageSrc: 'https://images.unsplash.com/photo-1506792006437-256b6f9f36e2?auto=format&fit=crop&q=80&w=400' },
      { text: 'Moss Green & Earth', vibeTags: ['comfort', 'complex'], imageSrc: 'https://images.unsplash.com/photo-1463130436829-06368d447cb0?auto=format&fit=crop&q=80&w=400' },
      { text: 'Electric Blue & Hot Pink', vibeTags: ['social', 'visual'], imageSrc: 'https://images.unsplash.com/photo-1549492423-400259a2e574?auto=format&fit=crop&q=80&w=400' },
    ],
  },
];
