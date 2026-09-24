import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { useMarkConversationReadMutation } from "../hooks/useMarkConversationReadMutation";
import { MessageList } from "./MessageList";

export const ReadMessageList = ({ messages, conversationId, userId }: {
  messages: Message[];
  conversationId: string;
  userId: string;
}) => {
  const { mutate, isError, isPending } = useMarkConversationReadMutation(conversationId, userId);
  const attempted = useRef<string | undefined>(undefined);
  const lastId = messages[messages.length - 1]?.id;

  // Runs after the successfully loaded history has committed to the page.
  useEffect(() => {
    if (!lastId || attempted.current === lastId || isPending) return;
    attempted.current = lastId;
    mutate(lastId);
  }, [lastId, mutate, isPending]);

  return <>
    <MessageList messages={messages} userId={userId} />
    {isError && <p role="alert" className="text-sm text-red-600">
      Unable to mark this conversation as read.{" "}
      <button type="button" disabled={isPending || !lastId} className="underline"
        onClick={() => { if (lastId) mutate(lastId); }}>Retry</button>
    </p>}
  </>;
};

