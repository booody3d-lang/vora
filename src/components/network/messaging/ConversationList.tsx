import type { ConversationPreview } from "@/types/network";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  conversations: ConversationPreview[];
  activeId: string;
  onSelect: (id: string) => void;
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
}: ConversationListProps) {
  return (
    <ul className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
      {conversations.map((conv) => (
        <li key={conv.id}>
          <button
            type="button"
            onClick={() => onSelect(conv.id)}
            className={cn(
              "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50",
              activeId === conv.id && "bg-[#3B5998]/5 border-r-2 border-[#3B5998]"
            )}
          >
            <div className="relative shrink-0">
              <img
                src={conv.participant.profilePhotoUrl}
                alt=""
                className="h-11 w-11 rounded-full border border-slate-200"
              />
              {conv.unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#EA580C] text-[10px] font-bold text-white">
                  {conv.unreadCount}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-[#0F172A]">
                  {conv.participant.fullName}
                </span>
                <span className="shrink-0 text-[10px] text-slate-400">
                  {formatTime(conv.lastMessageAt)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {conv.isTyping ? (
                  <span className="italic text-[#3B5998]">typing...</span>
                ) : (
                  conv.lastMessage
                )}
              </p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
