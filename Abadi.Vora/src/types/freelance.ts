export type ServiceCategory =
  | "design"
  | "development"
  | "writing"
  | "translation"
  | "marketing"
  | "business"
  | "video"
  | "audio"
  | "ai";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "awaiting_requirements"
  | "in_progress"
  | "delivered"
  | "revision_requested"
  | "completed"
  | "disputed"
  | "cancelled";

export type StoreTab = "services" | "portfolio" | "reviews" | "video";

export interface ServiceAddon {
  id: string;
  title: string;
  description?: string;
  price: number;
  extraDays: number;
}

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface MarketplaceService {
  id: string;
  slug: string;
  storeId: string;
  storeSlug: string;
  storeName: string;
  sellerAvatar: string;
  title: string;
  shortDescription: string;
  category: ServiceCategory;
  thumbnailUrl: string;
  galleryUrls: string[];
  videoUrl?: string;
  price?: number | null;
  deliveryDays: number;
  revisionsIncluded: number;
  rating: number;
  reviewCount: number;
  salesCount: number;
  isFeatured: boolean;
  isSponsored: boolean;
  isNew: boolean;
  description: string;
  faq: ServiceFaq[];
  addons: ServiceAddon[];
}

export interface FreelancerStore {
  id: string;
  slug: string;
  seoSlug: string;
  storeName: string;
  tagline?: string;
  description: string;
  logoUrl?: string;
  coverImageUrl?: string;
  videoIntroUrl?: string;
  isVerified: boolean;
  isPremium?: boolean;
  ratingAvg: number;
  totalReviews: number;
  professionalProfileSlug?: string;
  viewCount: number;
  conversionRate: number;
}

export interface PortfolioItem {
  id: string;
  title: string;
  imageUrl: string;
  category?: string;
}

export interface StoreReview {
  id: string;
  buyerName: string;
  buyerAvatar: string;
  serviceTitle: string;
  overallQuality: number;
  communication: number;
  deliveryPunctuality: number;
  publicReview: string;
  createdAt: string;
}

export interface FreelanceOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  service: MarketplaceService;
  buyerId: string;
  sellerId: string;
  basePrice: number;
  addonsTotal: number;
  totalPrice: number;
  currency: string;
  deliveryDays: number;
  revisionsRemaining: number;
  selectedAddonIds: string[];
  requirementsText?: string;
  requirementsFiles: string[];
  deliveryFiles: string[];
  escrowReleased: boolean;
  createdAt: string;
}

export interface OrderMessage {
  id: string;
  senderId: string;
  senderName: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  isSystem: boolean;
  createdAt: string;
}

export interface ReviewSubmission {
  overallQuality: number;
  communication: number;
  deliveryPunctuality: number;
  publicReview: string;
}

export interface SellerAnalytics {
  totalViews: number;
  activeOrders: number;
  totalRevenue: number;
  conversionRate: number;
  monthlyRevenue: { month: string; revenue: number }[];
  topServices: { title: string; sales: number; revenue: number }[];
}

export const SERVICE_CATEGORIES: { id: ServiceCategory; labelEn: string; labelAr: string; icon: string }[] = [
  { id: "design", labelEn: "Design", labelAr: "تصميم", icon: "🎨" },
  { id: "development", labelEn: "Development", labelAr: "برمجة", icon: "💻" },
  { id: "writing", labelEn: "Writing", labelAr: "كتابة", icon: "✍️" },
  { id: "translation", labelEn: "Translation", labelAr: "ترجمة", icon: "🌐" },
  { id: "marketing", labelEn: "Marketing", labelAr: "تسويق", icon: "📣" },
  { id: "business", labelEn: "Business", labelAr: "أعمال", icon: "💼" },
  { id: "video", labelEn: "Video", labelAr: "فيديو", icon: "🎬" },
  { id: "audio", labelEn: "Audio", labelAr: "صوتيات", icon: "🎵" },
  { id: "ai", labelEn: "AI Services", labelAr: "خدمات AI", icon: "🤖" },
];
