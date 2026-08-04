import type { ContentOwnerType, ContentVisibility } from "@/types/albums-stories";

export interface AlbumFeedEvent {
  v: 1;
  kind: "album_created";
  albumId: string;
  ownerType: ContentOwnerType;
  ownerId: string;
  title: string;
  visibility: ContentVisibility;
  coverUrls: string[];
  photoCount: number;
  at: string;
}

const PREFIX = "__vora_album__:";

export function encodeAlbumFeedEvent(
  event: Omit<AlbumFeedEvent, "v" | "kind" | "at"> & { at?: string }
): string {
  const payload: AlbumFeedEvent = {
    v: 1,
    kind: "album_created",
    albumId: event.albumId,
    ownerType: event.ownerType,
    ownerId: event.ownerId,
    title: event.title,
    visibility: event.visibility,
    coverUrls: event.coverUrls ?? [],
    photoCount: event.photoCount ?? 0,
    at: event.at ?? new Date().toISOString(),
  };
  return `${PREFIX}${JSON.stringify(payload)}`;
}

export function parseAlbumFeedEvent(content: string | undefined | null): AlbumFeedEvent | null {
  if (!content?.startsWith(PREFIX)) return null;
  try {
    const raw = JSON.parse(content.slice(PREFIX.length)) as AlbumFeedEvent;
    if (raw?.v !== 1 || raw.kind !== "album_created" || !raw.albumId) return null;
    return raw;
  } catch {
    return null;
  }
}
