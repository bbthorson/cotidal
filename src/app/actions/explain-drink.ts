export async function explainDrinkMatch(drinkName: string, userProfile: unknown): Promise<string> {
  try {
    const res = await fetch('/api/explain-drink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drinkName, userProfile }),
    });

    const data = await res.json();
    return data.text || "This drink is an excellent choice for your palate.";
  } catch (error) {
    console.error("Failed to explain drink match:", error);
    return "This drink is an excellent choice for your palate.";
  }
}
