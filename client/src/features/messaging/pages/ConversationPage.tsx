import type { ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { useCurrentUserQuery } from "../../auth";
import { useConversationQuery } from "../hooks/useConversationQuery";
import { useMessagesQuery } from "../hooks/useMessagesQuery";
import { MessageComposer } from "../components/MessageComposer";
import { MessageList } from "../components/MessageList";

export const ConversationPage = (): ReactElement => {
  const { conversationId = "" } = useParams();
  const user = useCurrentUserQuery();
  const conversation = useConversationQuery(conversationId, user.data?.id);
  const messages = useMessagesQuery(conversationId, user.data?.id);
  if (!conversationId) return <p role="alert">Invalid conversation.</p>;
  if (user.isError || conversation.isError) return <section className="space-y-3 py-6">
    <p role="alert" className="text-red-600">Unable to open this conversation. It may be unavailable or you may not have access.</p>
    <Link to="/messages" className="text-blue-600 underline">{ "\u2190 Back to Messages" }</Link>
  </section>;
  if (!user.data || !conversation.data) return <p role="status" className="py-6">Loading conversation...</p>;
  const otherParticipant = conversation.data.participants.find((participant) => participant.id !== user.data.id);
  return <section className="space-y-4">
    <Link to="/messages" className="text-sm font-medium text-blue-600 hover:underline">{ "\u2190 Back to Messages" }</Link>
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <header className="space-y-1 border-b border-slate-200 pb-3">
        <h1 className="text-xl font-semibold wrap-anywhere">{otherParticipant ? otherParticipant.displayName ?? otherParticipant.email : "Conversation"}</h1>
        {conversation.data.product ? <Link className="text-sm text-blue-600 hover:underline" to={`/products/${conversation.data.product.id}`}>
          {conversation.data.product.title}
        </Link> : <p className="text-sm text-slate-500">Listing no longer available</p>}
      </header>
      {messages.isPending ? <p role="status">Loading messages...</p> : messages.isError ? <div className="space-y-2">
        <p role="alert" className="text-red-600">Unable to load messages.</p>
        <button type="button" className="text-blue-600 underline" onClick={() => void messages.refetch()}>Try again</button>
      </div> : <MessageList messages={messages.data} userId={user.data.id} />}
      <MessageComposer key={`${user.data.id}:${conversationId}`} conversationId={conversationId} userId={user.data.id} />
    </div>
  </section>;
};
