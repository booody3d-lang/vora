export type ConnectionStatus = "pending" | "accepted" | "declined";
export type PostType = "text" | "image" | "video" | "article" | "poll";
export type ReactionType = "like" | "insightful" | "support" | "celebrate";
export type ProficiencyLevel = "elementary" | "limited" | "professional" | "full" | "native";
export type MessageStatus = "sent" | "delivered" | "read";
import type { UserGender } from "@/types/profile";

export type ProfileTab =
  | "about"
  | "video"
  | "experience"
  | "education"
  | "certifications"
  | "skills"
  | "languages"
  | "projects"
  | "resume";

export interface NetworkUser {
  id: string;
  slug: string;
  fullName: string;
  headline: string;
  profilePhotoUrl: string;
  coverImageUrl: string;
  location: string;
  isVerified: boolean;
  isPremium: boolean;
  professionalScore: number;
  hasFreelancerStore: boolean;
  freelancerStoreSlug?: string;
  /** Synced from store settings — controls Visit Store on public profile */
  showVisitStoreOnProfile?: boolean;
  currentRole?: string;
  currentCompany?: { id: string; name: string; slug: string; logoUrl?: string };
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  gender?: UserGender;
  accountId?: string;
  isOnline?: boolean;
  /** Public follower count — lists remain private */
  followerCount?: number;
  isFollowing?: boolean;
  isAccepted?: boolean;
  canMessage?: boolean;
}

export interface ExperienceItem {
  id: string;
  title: string;
  companyName: string;
  companyId?: string;
  companySlug?: string;
  companyLogoUrl?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
  isVerified: boolean;
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  country?: string;
  startDate?: string;
  endDate?: string;
  isVerified: boolean;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate?: string;
  credentialUrl?: string;
}

export interface SkillItem {
  id: string;
  name: string;
  endorsementCount: number;
  videoVerified: boolean;
  verificationVideoUrl?: string;
}

export interface LanguageItem {
  id: string;
  language: string;
  proficiency: ProficiencyLevel;
}

export interface ProjectItem {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  projectUrl?: string;
}

export interface FullProfessionalProfile extends NetworkUser {
  about: string;
  videoIntroUrl?: string;
  resumeUrl?: string;
  onboardingCompletedAt?: string;
  /** Owner-only — never expose on public profile APIs */
  privateMobileNumber?: string;
  backupEmail?: string;
  experiences: ExperienceItem[];
  education: EducationItem[];
  certifications: CertificationItem[];
  skills: SkillItem[];
  languages: LanguageItem[];
  projects: ProjectItem[];
}

export interface PollOption {
  text: string;
  votes: number;
}

export interface PostMediaItem {
  url: string;
  width?: number;
  height?: number;
  mimeType?: string;
  durationSeconds?: number;
}

export interface FeedPostAuthor {
  id: string;
  slug: string;
  fullName: string;
  headline: string;
  profilePhotoUrl: string;
  subscriptionBadge?: {
    iconUrl?: string;
    iconSvg?: string;
    tierNameEn?: string;
    tierNameAr?: string;
  } | null;
}

export interface FeedComment {
  id: string;
  author: FeedPostAuthor;
  content: string;
  createdAt: string;
  replies?: FeedComment[];
}

export interface FeedPost {
  id: string;
  type: PostType;
  author: FeedPostAuthor;
  content?: string;
  mediaUrls?: string[];
  media?: PostMediaItem[];
  articleTitle?: string;
  articleCoverUrl?: string;
  pollQuestion?: string;
  pollOptions?: PollOption[];
  pollExpiresAt?: string;
  reactions: Record<ReactionType, number>;
  userReaction?: ReactionType;
  commentCount: number;
  shareCount: number;
  isSaved: boolean;
  comments?: FeedComment[];
  createdAt: string;
}

export interface RecommendedJob {
  id: string;
  slug: string;
  title: string;
  company: string;
  companySlug: string;
  location: string;
  employmentType: string;
}

export interface TrendingInsight {
  id: string;
  title: string;
  category: string;
  readerCount: number;
}

export type ChatAccessType = "mutual_connection" | "hr_applicant" | "locked";

export interface CreatePostInput {
  type: PostType;
  content?: string;
  mediaUrls?: string[];
  media?: PostMediaItem[];
  articleTitle?: string;
  articleCoverUrl?: string;
  pollQuestion?: string;
  pollOptions?: PollOption[];
  pollExpiresAt?: string;
}

export interface ConversationPreview {
  id: string;
  participant: NetworkUser;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isTyping: boolean;
  accessType: ChatAccessType;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  mediaType?: "image" | "video" | "file";
  durationSeconds?: number;
  status: MessageStatus;
  createdAt: string;
}

export interface MessageAttachment {
  url: string;
  name: string;
  size: number;
  mimeType?: string;
  mediaType?: "image" | "video" | "file";
  durationSeconds?: number;
}

export interface ConnectionRequest {
  id: string;
  user: NetworkUser;
  status: ConnectionStatus;
  message?: string;
  createdAt: string;
}
