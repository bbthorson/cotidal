import { getCollection } from 'astro:content';
import type { Register } from './register';

/**
 * The register as the islands need it (see register.ts). Server-only: pages
 * call this and pass the result down as a prop.
 */
export async function loadRegister(): Promise<Register> {
  const entries = await getCollection('drinks');
  return Object.fromEntries(
    entries.map((entry) => [
      entry.data.name,
      {
        slug: entry.id,
        title: entry.data.title,
        build: entry.data.ingredients
          .filter((i) => !i.optional)
          .map((i) => i.name)
          .join(' · '),
      },
    ])
  );
}
