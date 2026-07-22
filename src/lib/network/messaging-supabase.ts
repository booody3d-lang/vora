import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByAccountId } from "@/lib/profile/profile-store";
import { resolveAvatarUrl } from "@/lib/profile/avatar";
import { isAccountOnline } from "@/lib/network/presence-store";
import type {
  ChatAccessType,
  ChatMessage,
  ConversationPreview,
  MessageAttachment,
  NetworkUser,
} from "@/types/network";

interface DbConversationRow {
  id: string;
  participant_a: string;
  participant_b: string;
  company_initiated: boolean;
  last_message_at: string;
  created_at: string;
}

interface DbMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  status: "sent" | "delivered" | "read";
  created_at: string;
}

function orderedParticipants(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function participantFromAccount(accountId: string): NetworkUser | null {
  const profile = getProfileByAccountId(accountId);
  if (!profile) return null;

  return {
    id: profile.id,
    accountId,
    slug: profile.slug,
    fullName: profile.fullName,
    headline: profile.headline,
    profilePhotoUrl: resolveAvatarUrl({
      photoUrl: profile.profilePhotoUrl,
      gender: profile.gender,
    }),
    coverImageUrl: profile.coverImageUrl ?? "",
    location: profile.location ?? "",
    isVerified: profile.isVerified,
    isPremium: profile.isPremium,
    professionalScore: profile.professionalScore,
    hasFreelancerStore: profile.hasFreelancerStore,
    gender: profile.gender,
    isOnline: isAccountOnline(accountId),
  };
}

function mapMessageRow(row: DbMessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content ?? undefined,
    fileUrl: row.file_url ?? undefined,
    fileName: row.file_name ?? undefined,
    fileSize: row.file_size ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

function conversationPreviewFromRow(
  row: DbConversationRow,
  viewerId: string,
  messages: ChatMessage[]
): ConversationPreview | null {
  const otherId = row.participant_a === viewerId ? row.participant_b : row.participant_a;
  const participant = participantFromAccount(otherId);
  if (!participant) return null;

  const last = messages[messages.length - 1];
  const unreadCount = messages.filter(
    (message) => message.senderId !== viewerId && message.status !== "read"
  ).length;

  return {
    id: row.id,
    participant,
    lastMessage: last?.content ?? "",
    lastMessageAt: last?.createdAt ?? row.last_message_at,
    unreadCount,
    isTyping: false,
    accessType: row.company_initiated ? "hr_applicant" : "mutual_connection",
  };
}

export async function getConversationsForAccountFromSupabase(
  accountId: string
): Promise<ConversationPreview[]> {
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("conversations")
    .select("*")
    .or(`participant_a.eq.${accountId},participant_b.eq.${accountId}`)
    .order("last_message_at", { ascending: false });

  if (error) throw error;
  if (!rows?.length) return [];

  const conversationIds = (rows as DbConversationRow[]).map((row) => row.id);
  const { data: messageRows, error: messageError } = await admin
    .from("messages")
    .select("*")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });

  if (messageError) throw messageError;

  const messagesByConversation = new Map<string, ChatMessage[]>();
  for (const row of (messageRows ?? []) as DbMessageRow[]) {
    const list = messagesByConversation.get(row.conversation_id) ?? [];
    list.push(mapMessageRow(row));
    messagesByConversation.set(row.conversation_id, list);
  }

  return (rows as DbConversationRow[])
    .map((row) =>
      conversationPreviewFromRow(row, accountId, messagesByConversation.get(row.id) ?? [])
    )
    .filter((preview): preview is ConversationPreview => preview !== null);
}

export async function getMessagesFromSupabase(
  conversationId: string,
  viewerId: string
): Promise<ChatMessage[]> {
  const admin = createAdminClient();

  const { data: conversation, error: convError } = await admin
    .from("conversations")
    .select("participant_a, participant_b")
    .eq("id", conversationId)
    .maybeSingle();

  if (convError) throw convError;
  if (
    !conversation ||
    (conversation.participant_a !== viewerId && conversation.participant_b !== viewerId)
  ) {
    return [];
  }

  const { data: rows, error } = await admin
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const messages = ((rows ?? []) as DbMessageRow[]).map(mapMessageRow);

  const unreadIds = messages
    .filter((message) => message.senderId !== viewerId && message.status !== "read")
    .map((message) => message.id);

  if (unreadIds.length > 0) {
    await admin.from("messages").update({ status: "read" }).in("id", unreadIds);
    for (const message of messages) {
      if (unreadIds.includes(message.id)) message.status = "read";
    }
  }

  return messages;
}

export async function getOrCreateConversationInSupabase(
  accountId: string,
  targetAccountId: string
): Promise<{ id: string } | null> {
  if (accountId === targetAccountId || !getProfileByAccountId(targetAccountId)) return null;

  const admin = createAdminClient();
  const [participantA, participantB] = orderedParticipants(accountId, targetAccountId);

  const { data: existing, error: fetchError } = await admin
    .from("conversations")
    .select("id")
    .eq("participant_a", participantA)
    .eq("participant_b", participantB)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return { id: existing.id };

  const { data: inserted, error } = await admin
    .from("conversations")
    .insert({
      participant_a: participantA,
      participant_b: participantB,
      company_initiated: false,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: inserted.id };
}

export async function sendMessageInSupabase(
  accountId: string,
  conversationId: string,
  content: string,
  file?: MessageAttachment
): Promise<ChatMessage | null> {
  const admin = createAdminClient();

  const { data: conversation, error: convError } = await admin
    .from("conversations")
    .select("participant_a, participant_b")
    .eq("id", conversationId)
    .maybeSingle();

  if (convError) throw convError;
  if (
    !conversation ||
    (conversation.participant_a !== accountId && conversation.participant_b !== accountId)
  ) {
    return null;
  }

  const { data: row, error } = await admin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: accountId,
      content: content || null,
      file_url: file?.url ?? null,
      file_name: file?.name ?? null,
      file_size: file?.size ?? null,
      status: "sent",
    })
    .select("*")
    .single();

  if (error) throw error;

  await admin
    .from("conversations")
    .update({ last_message_at: row.created_at })
    .eq("id", conversationId);

  return mapMessageRow(row as DbMessageRow);
}

export async function getConversationForViewerFromSupabase(
  conversationId: string,
  viewerId: string
): Promise<ConversationPreview | null> {
  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) throw error;
  if (
    !row ||
    (row.participant_a !== viewerId && row.participant_b !== viewerId)
  ) {
    return null;
  }

  const messages = await getMessagesFromSupabase(conversationId, viewerId);
  return conversationPreviewFromRow(row as DbConversationRow, viewerId, messages);
}

export async function countConversationsInSupabase(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("conversations")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

export interface JsonMessagingMigrationPayload {
  conversations: Array<{
    id: string;
    memberIds: string[];
    accessType: ChatAccessType;
    createdAt: string;
    updatedAt: string;
  }>;
  messages: Record<string, ChatMessage[]>;
}

export async function migrateJsonMessagingToSupabase(
  payload: JsonMessagingMigrationPayload
): Promise<number> {
  const admin = createAdminClient();
  const existingCount = await countConversationsInSupabase();
  if (existingCount > 0 || payload.conversations.length === 0) return 0;

  const idMap = new Map<string, string>();
  let migrated = 0;

  for (const conv of payload.conversations) {
    if (conv.memberIds.length !== 2) continue;
    const [memberA, memberB] = conv.memberIds;
    const [participantA, participantB] = orderedParticipants(memberA, memberB);

    const { data: inserted, error } = await admin
      .from("conversations")
      .insert({
        participant_a: participantA,
        participant_b: participantB,
        company_initiated: conv.accessType === "hr_applicant",
        created_at: conv.createdAt,
        last_message_at: conv.updatedAt,
      })
      .select("id")
      .single();

    if (error || !inserted) continue;
    idMap.set(conv.id, inserted.id);
    migrated += 1;
  }

  for (const [oldConvId, messages] of Object.entries(payload.messages)) {
    const newConvId = idMap.get(oldConvId);
    if (!newConvId) continue;

    for (const message of messages) {
      await admin.from("messages").insert({
        conversation_id: newConvId,
        sender_id: message.senderId,
        content: message.content ?? null,
        file_url: message.fileUrl ?? null,
        file_name: message.fileName ?? null,
        file_size: message.fileSize ?? null,
        status: message.status ?? "sent",
        created_at: message.createdAt,
      });
    }
  }

  return migrated;
}
