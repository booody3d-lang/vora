export type StoryReplyMediaType = "image" | "video";

export interface StoryReplyEvent {
  v: 1;
  kind: "story_reply";
  storyId: string;
  mediaUrl: string;
  mediaType: StoryReplyMediaType;
  text: string;
  at: string;
}

const PREFIX = "__vora_story_reply__:";

export function encodeStoryReply(
  event: Omit<StoryReplyEvent, "v" | "kind" | "at"> & { at?: string }
): string {
  const payload: StoryReplyEvent = {
    v: 1,
    kind: "story_reply",
    storyId: event.storyId,
    mediaUrl: event.mediaUrl,
    mediaType: event.mediaType,
    text: event.text,
    at: event.at ?? new Date().toISOString(),
  };
  return `${PREFIX}${JSON.stringify(payload)}`;
}

export function parseStoryReply(content: string | undefined | null): StoryReplyEvent | null {
  if (!content?.startsWith(PREFIX)) return null;
  try {
    const raw = JSON.parse(content.slice(PREFIX.length)) as StoryReplyEvent;
    if (raw?.v !== 1 || raw.kind !== "story_reply" || !raw.mediaUrl) return null;
    return raw;
  } catch {
    return null;
  }
}
