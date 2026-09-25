// Date-only inputs represent midnight UTC, matching the backend's calendar days.
export const rentalDuration = (from?: string, to?: string): number | null => {
  const timestamp = (value?: string): number => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const time = Date.parse(`${value}T00:00:00.000Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : NaN;
  };
  const days = (timestamp(to) - timestamp(from)) / 86_400_000;
  return Number.isInteger(days) && days > 0 ? days : null;
};
