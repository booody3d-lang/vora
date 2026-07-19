import type { ConversationPreview } from "@/types/network";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PresenceIndicator } from "@/components/ui/PresenceIndicator";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  conversations: ConversationPreview[];
  activeId: string;
  onSelect: (id: string) => void;
  emptyLabel?: string;
  compact?: boolean;
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  emptyLabel,
  compact = false,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-400">
        {emptyLabel ?? "No conversations yet"}
      </p>
    );
  }

  return (
    <ul
      className="overflow-y-auto"
      style={{ maxHeight: compact ? "240px" : "calc(100vh - 200px)" }}
    >
      {conversations.map((conv) => {
        const hasUnread = conv.unreadCount > 0;
        return (
          <li key={conv.id}>
            <button
              type="button"
              onClick={() => onSelect(conv.id)}
              className={cn(
                "flex w-full items-start gap-3 border-s-[3px] px-4 py-3 text-start transition-colors",
                hasUnread
                  ? "border-s-[#3B5998] bg-[#3B5998]/8 hover:bg-[#3B5998]/12"
                  : "border-s-transparent hover:bg-slate-50",
                activeId === conv.id && !hasUnread && "border-s-[#3B5998] bg-[#3B5998]/5"
              )}
            >
              <div className="relative shrink-0">
                <UserAvatar
                  photoUrl={conv.participant.profilePhotoUrl}
                  gender={conv.participant.gender}
                  name={conv.participant.fullName}
                  className="h-11 w-11 border border-slate-200"
                />
                <PresenceIndicator
                  isOnline={conv.participant.isOnline}
                  className="-bottom-0.5 -end-0.5"
                  size="sm"
                />
                {hasUnread && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#3B5998] px-1 text-[10px] font-bold text-white">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-sm",
                      hasUnread ? "font-bold text-[#3B5998]" : "font-semibold text-[#0F172A]"
                    )}
                  >
                    {conv.participant.fullName}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[10px]",
                      hasUnread ? "font-semibold text-[#3B5998]" : "text-slate-400"
                    )}
                  >
                    {formatTime(conv.lastMessageAt)}
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-0.5 truncate text-xs",
                    hasUnread ? "font-medium text-[#1E40AF]" : "text-slate-500"
                  )}
                >
                  {conv.isTyping ? (
                    <span className="italic text-[#3B5998]">typing...</span>
                  ) : (
                    conv.lastMessage
                  )}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
