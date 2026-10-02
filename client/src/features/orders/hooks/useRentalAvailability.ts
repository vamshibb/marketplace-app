import { useQueries } from "@tanstack/react-query";
import { getProductAvailability } from "../api/availabilityApi";
import { ordersQueryKeys } from "../queryKeys";
import { shiftMonth } from "../utils/rentalCalendarDates";
import type { AvailabilityDay } from "../availabilityTypes";

export const useRentalAvailability = (productId: string, months: string[], visibleMonth = months[0]) => {
  const queries = useQueries({ queries: months.map(from => ({
    queryKey: ordersQueryKeys.availability(productId, from, shiftMonth(from, 1)),
    queryFn: ({ signal }: { signal: AbortSignal }) => getProductAvailability(productId, from, shiftMonth(from, 1), signal),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  })) });
  const days = new Map<string, AvailabilityDay>();
  for (const query of queries) for (const day of query.data?.days ?? []) days.set(day.date, day);
  const visibleQuery = queries[months.indexOf(visibleMonth)];
  return {
    days,
    isPending: visibleQuery?.isPending ?? false,
    isError: visibleQuery?.isError ?? false,
    isFetching: visibleQuery?.isFetching ?? false,
    retry: () => Promise.all(queries.filter(query => query.isError).map(query => query.refetch())),
  };
};
