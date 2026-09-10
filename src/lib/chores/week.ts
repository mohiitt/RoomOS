import { addDaysISO, todayISO } from "../dates.ts";

export function weekDueDate(today = todayISO()): string {
  const [year, month, day] = today.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  const daysUntilSunday = (7 - weekday) % 7;
  return addDaysISO(today, daysUntilSunday);
}
