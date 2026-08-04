import "server-only";

import { getCompanyByAccountId, getCompanyById } from "@/lib/company/company-store";
import { getCompanySocialContext, getSocialProfileContext } from "@/lib/network/social-store";
import type { ContentOwnerType, ContentVisibility } from "@/types/albums-stories";

/** Accepted follower (or company follower) — required for like/comment even on public albums. */
export async function isAcceptedFollowerOfOwner(
  viewerAccountId: string | null | undefined,
  ownerType: ContentOwnerType,
  ownerId: string
): Promise<boolean> {
  if (!viewerAccountId) return false;
  if (ownerType === "company") {
    const ctx = await getCompanySocialContext(viewerAccountId, ownerId);
    return ctx.isAccepted || ctx.isFollowing;
  }
  const ctx = await getSocialProfileContext(viewerAccountId, ownerId);
  return ctx.isAccepted;
}

export async function isOwnerOfContent(
  viewerAccountId: string | null | undefined,
  ownerType: ContentOwnerType,
  ownerId: string
): Promise<boolean> {
  if (!viewerAccountId) return false;
  if (ownerType === "user") return viewerAccountId === ownerId;
  const company = await getCompanyById(ownerId);
  if (company) {
    const owned = await getCompanyByAccountId(viewerAccountId);
    return owned?.id === ownerId;
  }
  return false;
}

export async function canViewOwnedContent(
  viewerAccountId: string | null | undefined,
  ownerType: ContentOwnerType,
  ownerId: string,
  visibility: ContentVisibility
): Promise<boolean> {
  if (await isOwnerOfContent(viewerAccountId, ownerType, ownerId)) return true;
  if (visibility === "public") return true;
  return isAcceptedFollowerOfOwner(viewerAccountId, ownerType, ownerId);
}

/**
 * Like / comment gate: owner always; otherwise accepted followers only —
 * even when the album/photo visibility is public.
 */
export async function canInteractWithOwnedContent(
  viewerAccountId: string | null | undefined,
  ownerType: ContentOwnerType,
  ownerId: string
): Promise<boolean> {
  if (await isOwnerOfContent(viewerAccountId, ownerType, ownerId)) return true;
  return isAcceptedFollowerOfOwner(viewerAccountId, ownerType, ownerId);
}
