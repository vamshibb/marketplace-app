const DAY_MS = 86_400_000;
export const utcToday = (): string => new Date().toISOString().slice(0, 10);
export const addDays = (day: string, count: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + count * DAY_MS).toISOString().slice(0, 10);
export const monthStart = (day: string): string => `${day.slice(0, 7)}-01`;
export const shiftMonth = (month: string, count: number): string => {
  const date = new Date(`${month}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + count);
  return date.toISOString().slice(0, 10);
};
export const monthDays = (month: string): string[] => {
  const next = shiftMonth(month, 1);
  const result: string[] = [];
  for (let day = month; day < next; day = addDays(day, 1)) result.push(day);
  return result;
};

// Include intervening months so skipping ahead cannot hide an occupied day.
export const requiredAvailabilityMonths = (visible: string, from?: string, to?: string): string[] => {
  const months = new Set([visible]);
  if (from) {
    const first = monthStart(from);
    const last = to && to > from ? monthStart(addDays(to, -1)) : (visible > first ? visible : first);
    for (let month = first; month <= last; month = shiftMonth(month, 1)) months.add(month);
  }
  return [...months].sort();
};
