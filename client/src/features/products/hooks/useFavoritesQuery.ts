import { queryOptions, useQuery } from "@tanstack/react-query";

import { useAuthStore, useCurrentUserQuery } from "../../auth";
import { getFavorites } from "../api/favoritesApi";
import { favoritesQueryKeys } from "../favoritesQueryKeys";

export const favoritesQueryOptions = (userId: string) => queryOptions({
  queryKey: favoritesQueryKeys.list(userId),
  queryFn: ({ signal }) => getFavorites(signal),
  staleTime: 30_000,
});

export const useFavoritesQuery = () => {
  const token = useAuthStore((state) => state.token);
  const { data: user } = useCurrentUserQuery();

  return useQuery({
    ...favoritesQueryOptions(user?.id ?? ""),
    enabled: Boolean(token && user),
  });
};
