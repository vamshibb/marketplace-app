import { useQuery } from "@tanstack/react-query";
import { getListings } from "../api/listingApi";

export function useListings() {
  return useQuery({
    queryKey: ["listings"],
    queryFn: getListings,
  });
}