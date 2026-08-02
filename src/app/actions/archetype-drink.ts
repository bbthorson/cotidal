export async function archetypeDrink(drinkName: string, description?: string) {
  try {
    const res = await fetch('/api/archetype-drink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drinkName, description }),
    });
    return await res.json();
  } catch (error) {
    console.error("Failed to archetype drink:", error);
    return {
      x: 0,
      y: 0,
      hasSmoke: false,
      hasAnise: false,
      isBitter: false,
      tags: ['classic'],
      oracleReasoning: "Couldn't get a full read on this one, but it's a classic."
    };
  }
}
