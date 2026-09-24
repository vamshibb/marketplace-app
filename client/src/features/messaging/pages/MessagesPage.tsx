import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { useCurrentUserQuery } from "../../auth";
import { useConversationsQuery } from "../hooks/useConversationsQuery";

export const MessagesPage = (): ReactElement => {
  const user = useCurrentUserQuery();
  const conversations = useConversationsQuery();
  const hasError = user.isError || conversations.isError;

  return (
    <section className="w-full min-w-0 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-gray-950">Messages</h1>
      {hasError ? (
        <div className="space-y-3">
          <p role="alert" className="text-red-600">Unable to load messages.</p>
          <button type="button" disabled={user.isFetching || conversations.isFetching}
            onClick={() => { if (user.isError) void user.refetch(); else void conversations.refetch(); }}
            className="rounded font-medium text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
            Retry
          </button>
        </div>
      ) : conversations.isPending ? (
        <p role="status">Loading conversations...</p>
      ) : conversations.data.length === 0 ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-slate-600">No conversations yet.</p>
          <Link to="/products" className="inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Browse Products</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {conversations.data.map((conversation) => (
            <li key={conversation.id}>
              <Link to={`/messages/${conversation.id}`}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold wrap-anywhere text-slate-900">
                    {conversation.otherParticipant
                      ? conversation.otherParticipant.displayName ?? conversation.otherParticipant.email
                      : "Participant unavailable"}
                  </p>
                  <p className="text-sm wrap-anywhere text-slate-600">{conversation.product?.title ?? "Listing no longer available"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                {conversation.unreadCount > 0 && <span aria-label={`${conversation.unreadCount} unread messages`} className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {conversation.unreadCount}
                </span>}
                <time dateTime={conversation.lastMessageAt} className="shrink-0 text-xs text-slate-500">
                  {new Date(conversation.lastMessageAt).toLocaleString()}
                </time>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
