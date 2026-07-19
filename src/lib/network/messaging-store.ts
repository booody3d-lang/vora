import "server-only";

import fs from "fs";
import path from "path";
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

const DATA_DIR = path.join(process.cwd(), ".data", "vora");
const DATA_FILE = path.join(DATA_DIR, "messaging-data.json");

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

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData(): MessagingDataFile {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const initial: MessagingDataFile = { conversations: [], messages: {} };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as MessagingDataFile;
  if (!data.conversations) data.conversations = [];
  if (!data.messages) data.messages = {};
  return data;
}

function writeData(data: MessagingDataFile) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function participantFromAccount(accountId: string): NetworkUser | null {
  const profile = getProfileByAccountId(accountId);
  if (!profile) return null;
  return {
    id: profile.id,
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
    (m) => m.senderId !== viewerId && m.status !== "read"
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

export function getConversationsForAccount(accountId: string): ConversationPreview[] {
  const data = readData();
  return data.conversations
    .filter((c) => c.memberIds.includes(accountId))
    .map((c) => {
      const msgs = data.messages[c.id] ?? [];
      return conversationPreview(c, accountId, msgs);
    })
    .filter((c): c is ConversationPreview => c !== null)
    .sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
}

export function getMessages(conversationId: string, viewerId: string): ChatMessage[] {
  const data = readData();
  const conv = data.conversations.find((c) => c.id === conversationId);
  if (!conv || !conv.memberIds.includes(viewerId)) return [];

  const messages = data.messages[conversationId] ?? [];

  let changed = false;
  for (const msg of messages) {
    if (msg.senderId !== viewerId && msg.status !== "read") {
      msg.status = "read";
      changed = true;
    }
  }
  if (changed) writeData(data);

  return messages;
}

export function getOrCreateConversation(
  accountId: string,
  targetAccountId: string
): StoredConversation | null {
  if (accountId === targetAccountId) return null;
  if (!getProfileByAccountId(targetAccountId)) return null;
  if (!canInitiateMessage(accountId, targetAccountId)) return null;

  const data = readData();
  const existing = data.conversations.find(
    (c) =>
      c.memberIds.length === 2 &&
      c.memberIds.includes(accountId) &&
      c.memberIds.includes(targetAccountId)
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

export function sendMessage(
  accountId: string,
  conversationId: string,
  content: string,
  file?: MessageAttachment
): ChatMessage | null {
  const data = readData();
  const conv = data.conversations.find((c) => c.id === conversationId);
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

export function getConversationForViewer(
  conversationId: string,
  viewerId: string
): ConversationPreview | null {
  const data = readData();
  const conv = data.conversations.find((c) => c.id === conversationId);
  if (!conv || !conv.memberIds.includes(viewerId)) return null;
  const msgs = data.messages[conversationId] ?? [];
  return conversationPreview(conv, viewerId, msgs);
}

/** Other linked accounts the viewer can start a conversation with. */
export function getMessagingContacts(viewerId: string): NetworkUser[] {
  return listLinkedAccounts()
    .filter((id) => id !== viewerId)
    .map((id) => participantFromAccount(id))
    .filter((user): user is NetworkUser => user !== null);
}
