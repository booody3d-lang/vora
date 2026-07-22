import type {
  FreelanceOrder,
  FreelancerStore,
  MarketplaceService,
  OrderMessage,
  PortfolioItem,
  SellerAnalytics,
  StoreReview,
} from "@/types/freelance";

export const DEMO_STORE: FreelancerStore = {
  id: "store-1",
  slug: "alex-design-studio",
  seoSlug: "alex-design-studio",
  storeName: "Alex Design Studio",
  tagline: "Premium UI/UX & Brand Identity",
  description:
    "We craft pixel-perfect digital experiences for startups and enterprises. Specializing in product design, design systems, and brand identity with 500+ completed projects.",
  logoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  coverImageUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=300&fit=crop",
  videoIntroUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
  isVerified: true,
  isPremium: true,
  ratingAvg: 4.9,
  totalReviews: 127,
  professionalProfileSlug: "alex-morgan",
  viewCount: 8420,
  conversionRate: 3.8,
};

function baseService(overrides: Partial<MarketplaceService> & Pick<MarketplaceService, "id" | "slug" | "title" | "category">): MarketplaceService {
  return {
    storeId: DEMO_STORE.id,
    storeSlug: DEMO_STORE.slug,
    storeName: DEMO_STORE.storeName,
    sellerAvatar: DEMO_STORE.logoUrl!,
    shortDescription: "Professional quality delivery with escrow protection.",
    thumbnailUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=260&fit=crop",
    galleryUrls: [
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=500&fit=crop",
      "https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&h=500&fit=crop",
    ],
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    deliveryDays: 5,
    revisionsIncluded: 2,
    rating: 4.9,
    reviewCount: 48,
    salesCount: 156,
    isFeatured: false,
    isSponsored: false,
    isNew: false,
    price: 299,
    description:
      "## What You Get\n\n- Professional logo design in multiple formats (AI, SVG, PNG, PDF)\n- Full brand color palette and typography guide\n- Social media kit (profile + cover templates)\n- Unlimited revisions within scope\n- 100% original work — no templates\n\n## Process\n\n1. Brief review & moodboard\n2. Initial concepts (3 directions)\n3. Refinement & final delivery\n\nAll files delivered via VORA escrow upon your approval.",
    faq: [
      { question: "What file formats do I receive?", answer: "AI, SVG, PNG, PDF, and source files." },
      { question: "Can I request more revisions?", answer: "Yes, add the Extra Revisions addon at checkout." },
      { question: "Do you offer rush delivery?", answer: "Select Express Delivery addon for 48-hour turnaround." },
    ],
    addons: [
      { id: "addon-1", title: "Express Delivery (48h)", description: "Priority queue", price: 150, extraDays: -3 },
      { id: "addon-2", title: "Extra Revision Round", description: "+1 revision cycle", price: 75, extraDays: 1 },
      { id: "addon-3", title: "Social Media Kit", description: "10 platform templates", price: 120, extraDays: 2 },
    ],
    ...overrides,
  };
}

export const DEMO_SERVICES: MarketplaceService[] = [
  baseService({ id: "svc-1", slug: "professional-logo-design", title: "Professional Logo Design", price: 299, category: "design", isFeatured: true, isSponsored: true, salesCount: 312, rating: 4.9 }),
  baseService({ id: "svc-2", slug: "ui-ux-app-design", title: "Complete UI/UX App Design", price: 1499, category: "design", salesCount: 89, rating: 5.0, deliveryDays: 14 }),
  baseService({ id: "svc-3", slug: "wordpress-website", title: "WordPress Website Development", price: 899, category: "development", salesCount: 234, rating: 4.8, isFeatured: true }),
  baseService({ id: "svc-4", slug: "seo-audit", title: "Complete SEO Audit & Strategy", price: 449, category: "marketing", salesCount: 178, rating: 4.7 }),
  baseService({ id: "svc-5", slug: "arabic-english-translation", title: "Professional AR ↔ EN Translation", price: 199, category: "translation", salesCount: 421, rating: 4.9, isFeatured: true }),
  baseService({ id: "svc-6", slug: "product-demo-video", title: "Product Demo Video (60 sec)", price: 599, category: "video", salesCount: 67, rating: 4.8, isNew: true }),
  baseService({ id: "svc-7", slug: "business-plan", title: "Investor-Ready Business Plan", price: 799, category: "business", salesCount: 45, rating: 4.6, isNew: true }),
  baseService({ id: "svc-8", slug: "ai-chatbot", title: "Custom AI Chatbot Integration", price: 1299, category: "ai", salesCount: 23, rating: 4.9, isNew: true, isSponsored: true }),
  baseService({ id: "svc-9", slug: "blog-articles", title: "10 SEO-Optimized Blog Articles", price: 349, category: "writing", salesCount: 198, rating: 4.8 }),
  baseService({ id: "svc-10", slug: "podcast-editing", title: "Professional Podcast Editing", price: 249, category: "audio", salesCount: 112, rating: 4.7 }),
];

export const DEMO_PORTFOLIO: PortfolioItem[] = [
  { id: "p1", title: "Fintech Dashboard", imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop", category: "UI/UX" },
  { id: "p2", title: "Brand Identity — NovaTech", imageUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=350&fit=crop", category: "Branding" },
  { id: "p3", title: "E-commerce Redesign", imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=280&fit=crop", category: "Web" },
  { id: "p4", title: "Mobile App — HealthTrack", imageUrl: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=320&fit=crop", category: "Mobile" },
  { id: "p5", title: "SaaS Landing Page", imageUrl: "https://images.unsplash.com/photo-1558655146-d09347e92766?w=400&h=300&fit=crop", category: "Web" },
  { id: "p6", title: "Logo Collection 2025", imageUrl: "https://images.unsplash.com/photo-1626785774573-4b799314346d?w=400&h=340&fit=crop", category: "Branding" },
];

export const DEMO_STORE_REVIEWS: StoreReview[] = [
  { id: "r1", buyerName: "Sarah A.", buyerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=SarahA", serviceTitle: "Professional Logo Design", overallQuality: 5, communication: 5, deliveryPunctuality: 5, publicReview: "Exceptional work! Alex delivered beyond expectations with a complete brand kit.", createdAt: "2026-07-10T00:00:00Z" },
  { id: "r2", buyerName: "Mohammed K.", buyerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=MohammedK", serviceTitle: "UI/UX App Design", overallQuality: 5, communication: 4, deliveryPunctuality: 5, publicReview: "تصميم رائع واحترافي. أنصح بالتعامل مع هذا المتجر بشدة.", createdAt: "2026-07-05T00:00:00Z" },
  { id: "r3", buyerName: "Lisa T.", buyerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=LisaT", serviceTitle: "Professional Logo Design", overallQuality: 4, communication: 5, deliveryPunctuality: 4, publicReview: "Great communication throughout. Minor revision needed but resolved quickly.", createdAt: "2026-06-28T00:00:00Z" },
];

export const DEMO_ORDER: FreelanceOrder = {
  id: "ord-1",
  orderNumber: "VORA-2026-7842",
  status: "in_progress",
  service: DEMO_SERVICES[0],
  buyerId: "buyer-1",
  sellerId: "seller-1",
  basePrice: 299,
  addonsTotal: 150,
  totalPrice: 449,
  currency: "SAR",
  deliveryDays: 2,
  revisionsRemaining: 2,
  selectedAddonIds: ["addon-1"],
  requirementsText: "Brand name: TechFlow. Colors: blue/teal. Modern minimalist style.",
  requirementsFiles: ["brand-brief.pdf"],
  deliveryFiles: [],
  escrowReleased: false,
  createdAt: "2026-07-15T10:00:00Z",
};

export const DEMO_ORDER_MESSAGES: OrderMessage[] = [
  { id: "om1", senderId: "system", senderName: "VORA Escrow", content: "Payment of SAR 449 received. Funds secured in escrow.", isSystem: true, createdAt: "2026-07-15T10:01:00Z" },
  { id: "om2", senderId: "buyer-1", senderName: "You (Buyer)", content: "Hi! I've uploaded the brand brief. Looking for a modern tech feel.", isSystem: false, createdAt: "2026-07-15T10:15:00Z" },
  { id: "om3", senderId: "seller-1", senderName: "Alex Design Studio", content: "Thanks! I'll start with 3 moodboard directions. Expect first concepts in 24h.", isSystem: false, createdAt: "2026-07-15T11:00:00Z" },
  { id: "om4", senderId: "seller-1", senderName: "Alex Design Studio", content: "Here are the initial concepts", fileUrl: "#", fileName: "concepts-v1.zip", isSystem: false, createdAt: "2026-07-16T09:00:00Z" },
];

export const DEMO_SELLER_ANALYTICS: SellerAnalytics = {
  totalViews: 8420,
  activeOrders: 7,
  totalRevenue: 34850,
  conversionRate: 3.8,
  monthlyRevenue: [
    { month: "Feb", revenue: 4200 },
    { month: "Mar", revenue: 5100 },
    { month: "Apr", revenue: 4800 },
    { month: "May", revenue: 6200 },
    { month: "Jun", revenue: 7100 },
    { month: "Jul", revenue: 7450 },
  ],
  topServices: [
    { title: "Professional Logo Design", sales: 312, revenue: 93388 },
    { title: "WordPress Website", sales: 234, revenue: 210366 },
    { title: "AR ↔ EN Translation", sales: 421, revenue: 83779 },
  ],
};

export function getServiceUrl(slug: string) {
  return `/freelance/services/${slug}`;
}

export function getStoreUrl(slug: string) {
  return `/freelance/store/${slug}`;
}

export function getOrderUrl(orderId: string) {
  return `/freelance/orders/${orderId}`;
}

export function getServicesBySection(services: MarketplaceService[]) {
  return {
    featured: services.filter((s) => s.isFeatured || s.isSponsored),
    bestSellers: [...services].sort((a, b) => b.salesCount - a.salesCount).slice(0, 6),
    topRated: [...services].sort((a, b) => b.rating - a.rating).slice(0, 6),
    newArrivals: services.filter((s) => s.isNew),
  };
}
