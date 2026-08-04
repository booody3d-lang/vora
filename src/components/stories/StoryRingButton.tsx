"use client";

import { useEffect, useState, type ReactNode } from "react";
import { StoryViewer } from "@/components/stories/StoryViewer";
import type { ContentOwnerType, StoryOwnerGroup } from "@/types/albums-stories";
import { cn } from "@/lib/utils";

interface StoryRingButtonProps {
  ownerType: ContentOwnerType;
  ownerId: string;
  displayName: string;
  avatarUrl?: string;
  gender?: "male" | "female" | null;
  slug?: string;
  className?: string;
  isOwner?: boolean;
  canInteract?: boolean;
  children: ReactNode;
}

export function StoryRingButton({
  ownerType,
  ownerId,
  displayName,
  avatarUrl,
  gender,
  slug,
  className,
  isOwner = false,
  canInteract = false,
  children,
}: StoryRingButtonProps) {
  const [group, setGroup] = useState<StoryOwnerGroup | null>(null);
  const [open, setOpen] = useState(false);
  const [hasActive, setHasActive] = useState(false);
  const [hasUnseen, setHasUnseen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(
        `/api/stories?ownerType=${ownerType}&ownerId=${encodeURIComponent(ownerId)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (cancelled || !res.ok) return;
      const stories = data.stories ?? [];
      setHasActive(stories.length > 0);
      setHasUnseen(stories.some((s: { viewedByMe?: boolean }) => !s.viewedByMe));
      if (stories.length > 0) {
        setGroup({
          ownerType,
          ownerId,
          displayName,
          avatarUrl,
          gender,
          slug,
          hasUnseen: stories.some((s: { viewedByMe?: boolean }) => !s.viewedByMe),
          stories,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerType, ownerId, displayName, avatarUrl, gender, slug]);

  if (!hasActive) {
    return <span className={className}>{children}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "rounded-full p-[3px]",
          hasUnseen
            ? "bg-gradient-to-tr from-[#F59E0B] via-[#EF4444] to-[#3B5998]"
            : "bg-slate-300",
          className
        )}
        aria-label={`${displayName} story`}
      >
        <span className="block rounded-full bg-white p-[2px]">{children}</span>
      </button>
      {open && group && (
        <StoryViewer
          group={group}
          isOwner={isOwner}
          canInteract={canInteract || isOwner}
          onClose={() => setOpen(false)}
          onDeleted={() => {
            setHasActive(false);
            setOpen(false);
          }}
          onExhausted={() => {
            setHasUnseen(false);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
