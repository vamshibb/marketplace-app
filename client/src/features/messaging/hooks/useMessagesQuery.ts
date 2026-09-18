import { useQuery } from "@tanstack/react-query";
import { getMessages } from "../api/messagingApi";
import { messagingQueryKeys } from "../queryKeys";

export const useMessagesQuery = (id: string, userId?: string) => useQuery({
  queryKey: messagingQueryKeys.messages(userId, id),
  queryFn: ({ signal }) => getMessages(id, signal),
  enabled: Boolean(id && userId),
});
