import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
} from "@/lib/supabase/safe-db";
import {
  getConversationForViewerFromSupabase,
  getConversationsForAccountFromSupabase,
  getMessagesFromSupabase,
  getOrCreateConversationInSupabase,
  migrateJsonMessagingToSupabase,
  sendMessageInSupabase,
} from "@/lib/network/messaging-supabase";
import { getProfileByAccountId, listLinkedAccounts } from "@/lib/profile/profile-store";
import { resolveAvatarUrl } from "@/lib/profile/avatar";
import { isAccountOnline } from "@/lib/network/presence-store";
import { canInitiateMessage } from "@/lib/network/social-store";
import type {
  ChatAccessType,
  ChatMessage,
  ConversationPreview,
  MessageAttachment,
  NetworkUser,
} from "@/types/network";

const DATA_FILE = "messaging-data.json";
const MIGRATION_FLAG = "messaging-supabase-migrated.json";

interface StoredConversation {
  id: string;
  memberIds: string[];
  accessType: ChatAccessType;
  createdAt: string;
  updatedAt: string;
}

interface MessagingDataFile {
  conversations: StoredConversation[];
  messages: Record<string, ChatMessage[]>;
}

let messagingTableProbed = false;
let messagingTableAvailable = false;

async function isMessagingSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (messagingTableProbed) return messagingTableAvailable;

  messagingTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("conversations").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("conversations missing", error);
      }
      messagingTableAvailable = false;
      return false;
    }
    messagingTableAvailable = true;
    return true;
  } catch {
    messagingTableAvailable = false;
    return false;
  }
}

function readData(): MessagingDataFile {
  const data = readJsonStore(DATA_FILE, () => ({
    conversations: [] as StoredConversation[],
    messages: {} as Record<string, ChatMessage[]>,
  }));
  if (!data.conversations) data.conversations = [];
  if (!data.messages) data.messages = {};
  return data;
}

function writeData(data: MessagingDataFile) {
  writeJsonStore(DATA_FILE, data);
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

function conversationPreview(
  conv: StoredConversation,
  viewerId: string,
  messages: ChatMessage[]
): ConversationPreview | null {
  const otherId = conv.memberIds.find((id) => id !== viewerId);
  if (!otherId) return null;

  const participant = participantFromAccount(otherId);
  if (!participant) return null;

  const last = messages[messages.length - 1];
  const unreadCount = messages.filter(
    (message) => message.senderId !== viewerId && message.status !== "read"
  ).length;

  return {
    id: conv.id,
    participant,
    lastMessage: last?.content ?? "",
    lastMessageAt: last?.createdAt ?? conv.updatedAt,
    unreadCount,
    isTyping: false,
    accessType: conv.accessType,
  };
}

async function maybeMigrateJsonToSupabase(): Promise<void> {
  if (!(await isMessagingSupabaseReady())) return;

  const flag = readJsonStore(MIGRATION_FLAG, () => ({ done: false as boolean }));
  if (flag.done) return;

  const data = readData();
  await runOptionalDbSync("messaging-json-migration", async () => {
    const migrated = await migrateJsonMessagingToSupabase({
      conversations: data.conversations,
      messages: data.messages,
    });
    writeJsonStore(MIGRATION_FLAG, {
      done: true,
      migratedAt: new Date().toISOString(),
      migratedConversations: migrated,
    });
    return migrated;
  }, 0);

  if (!readJsonStore(MIGRATION_FLAG, () => ({ done: false as boolean })).done) {
    writeJsonStore(MIGRATION_FLAG, { done: true, skipped: true });
  }
}

export async function getConversationsForAccount(
  accountId: string
): Promise<ConversationPreview[]> {
  if (await isMessagingSupabaseReady()) {
    await maybeMigrateJsonToSupabase();
    return runOptionalDbSync(
      "getConversationsForAccount",
      () => getConversationsForAccountFromSupabase(accountId),
      getConversationsForAccountJson(accountId)
    );
  }
  return getConversationsForAccountJson(accountId);
}

function getConversationsForAccountJson(accountId: string): ConversationPreview[] {
  const data = readData();
  return data.conversations
    .filter((conv) => conv.memberIds.includes(accountId))
    .map((conv) => conversationPreview(conv, accountId, data.messages[conv.id] ?? []))
    .filter((conv): conv is ConversationPreview => conv !== null)
    .sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
}

export async function getMessages(
  conversationId: string,
  viewerId: string
): Promise<ChatMessage[]> {
  if (await isMessagingSupabaseReady()) {
    return runOptionalDbSync(
      "getMessages",
      () => getMessagesFromSupabase(conversationId, viewerId),
      getMessagesJson(conversationId, viewerId)
    );
  }
  return getMessagesJson(conversationId, viewerId);
}

function getMessagesJson(conversationId: string, viewerId: string): ChatMessage[] {
  const data = readData();
  const conv = data.conversations.find((item) => item.id === conversationId);
  if (!conv || !conv.memberIds.includes(viewerId)) return [];

  const messages = data.messages[conversationId] ?? [];
  let changed = false;

  for (const message of messages) {
    if (message.senderId !== viewerId && message.status !== "read") {
      message.status = "read";
      changed = true;
    }
  }

  if (changed) writeData(data);
  return messages;
}

export async function getOrCreateConversation(
  accountId: string,
  targetAccountId: string
): Promise<StoredConversation | null> {
  if (accountId === targetAccountId) return null;
  if (!getProfileByAccountId(targetAccountId)) return null;
  if (!(await canInitiateMessage(accountId, targetAccountId))) return null;

  if (await isMessagingSupabaseReady()) {
    await maybeMigrateJsonToSupabase();
    return runOptionalDbSync(
      "getOrCreateConversation",
      async () => {
        const row = await getOrCreateConversationInSupabase(accountId, targetAccountId);
        if (!row) return null;
        return {
          id: row.id,
          memberIds: [accountId, targetAccountId],
          accessType: "mutual_connection" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      },
      getOrCreateConversationJson(accountId, targetAccountId)
    );
  }

  return getOrCreateConversationJson(accountId, targetAccountId);
}

function getOrCreateConversationJson(
  accountId: string,
  targetAccountId: string
): StoredConversation | null {
  const data = readData();
  const existing = data.conversations.find(
    (conv) =>
      conv.memberIds.length === 2 &&
      conv.memberIds.includes(accountId) &&
      conv.memberIds.includes(targetAccountId)
  );
  if (existing) return existing;

  const conv: StoredConversation = {
    id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    memberIds: [accountId, targetAccountId],
    accessType: "mutual_connection",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.conversations.push(conv);
  data.messages[conv.id] = [];
  writeData(data);
  return conv;
}

export async function sendMessage(
  accountId: string,
  conversationId: string,
  content: string,
  file?: MessageAttachment
): Promise<ChatMessage | null> {
  if (await isMessagingSupabaseReady()) {
    return runOptionalDbSync(
      "sendMessage",
      () => sendMessageInSupabase(accountId, conversationId, content, file),
      sendMessageJson(accountId, conversationId, content, file)
    );
  }
  return sendMessageJson(accountId, conversationId, content, file);
}

function sendMessageJson(
  accountId: string,
  conversationId: string,
  content: string,
  file?: MessageAttachment
): ChatMessage | null {
  const data = readData();
  const conv = data.conversations.find((item) => item.id === conversationId);
  if (!conv || !conv.memberIds.includes(accountId)) return null;
  if (conv.accessType === "locked") return null;

  const message: ChatMessage = {
    id: `msg-${Date.now()}`,
    conversationId,
    senderId: accountId,
    content: content || undefined,
    fileUrl: file?.url,
    fileName: file?.name,
    fileSize: file?.size,
    mimeType: file?.mimeType,
    mediaType: file?.mediaType,
    durationSeconds: file?.durationSeconds,
    status: "sent",
    createdAt: new Date().toISOString(),
  };

  if (!data.messages[conversationId]) data.messages[conversationId] = [];
  data.messages[conversationId].push(message);
  conv.updatedAt = message.createdAt;
  writeData(data);
  return message;
}

export async function getConversationForViewer(
  conversationId: string,
  viewerId: string
): Promise<ConversationPreview | null> {
  if (await isMessagingSupabaseReady()) {
    return runOptionalDbSync(
      "getConversationForViewer",
      () => getConversationForViewerFromSupabase(conversationId, viewerId),
      getConversationForViewerJson(conversationId, viewerId)
    );
  }
  return getConversationForViewerJson(conversationId, viewerId);
}

function getConversationForViewerJson(
  conversationId: string,
  viewerId: string
): ConversationPreview | null {
  const data = readData();
  const conv = data.conversations.find((item) => item.id === conversationId);
  if (!conv || !conv.memberIds.includes(viewerId)) return null;
  return conversationPreview(conv, viewerId, data.messages[conversationId] ?? []);
}

export async function getMessagingContacts(viewerId: string): Promise<NetworkUser[]> {
  const linked = listLinkedAccounts();
  const contacts: NetworkUser[] = [];

  for (const accountId of linked) {
    if (accountId === viewerId) continue;
    if (!(await canInitiateMessage(viewerId, accountId))) continue;
    const user = participantFromAccount(accountId);
    if (user) contacts.push(user);
  }

  return contacts;
}
