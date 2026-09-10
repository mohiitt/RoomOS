export function greeting(date = new Date(), name?: string) {
  const hour = date.getHours();
  const hello = hour < 12 ? "Morning" : hour < 17 ? "Hey" : "Evening";
  if (!name) return hello;
  return `${hello}, ${name}`;
}

export const copy = {
  landingKicker: "RoomOS",
  landingHeadline: "Five roommates. One fridge. Zero group-chat math.",
  landingSub: "Tap your name. Then the apartment PIN.",
  pinSub: "Four digits. The one on the fridge.",
  pinNotYou: "Not you?",
  pinChecking: "Checking…",
  wrongPin: [
    "Nope. That's the microwave clock.",
    "Wrong. The plants are laughing.",
    "Not it. Try the one you actually use.",
    "Denied. The kettle knows the real one.",
  ],
  homeSubtitle: "The fridge is judging you. Affectionately.",
  activityEmpty: "Quiet. Too quiet. Someone should cook.",
  foodSubtitle: "What's in the fridge, freezer, and pantry.",
  foodEmptyTitle: "The fridge is giving you nothing.",
  foodEmptyBody: "Add something before the next person asks who ate the last yogurt.",
  recipesSubtitle: "How we cook things in this apartment.",
  recipesEmptyTitle: "No recipes yet.",
  recipesEmptyBody: "Write it down so nobody has to text how you made that.",
  moneySubtitle: "Who owes whom, without the spreadsheet.",
  moneyEmptyTitle: "Nobody spent anything.",
  moneyEmptyBody: "Either a miracle or someone forgot to log Costco.",
  settledAside: "Nobody owes nobody. Weird.",
  balanceOwedAside: "Time to collect. Politely.",
  balanceOweAside: "You know what to do.",
  foodAsideExpiring: "The milk is writing its will.",
  foodAsideOk: "The fridge is behaving. For now.",
  moneyAside: "The latest hit to the group chat.",
  latestExpenseEmpty: "No expenses yet",
  choresSubtitle: "The sponge has a union now.",
  issuesSubtitle: "Leaky faucet, broken light, weird smell.",
} as const;

export function pinHey(name: string) {
  return `Hey ${name}.`;
}

export function wrongPinLine(attempt = 0) {
  return copy.wrongPin[Math.abs(attempt) % copy.wrongPin.length];
}

export function balanceAside(net: number) {
  if (net === 0) return copy.settledAside;
  if (net > 0) return copy.balanceOwedAside;
  return copy.balanceOweAside;
}

export function foodAside(expiringCount: number) {
  return expiringCount > 0 ? copy.foodAsideExpiring : copy.foodAsideOk;
}
