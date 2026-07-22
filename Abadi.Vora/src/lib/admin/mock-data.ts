import type {
  AdminJobPosting,
  AdminTransaction,
  AdminUserRecord,
  AnalyticsTimeSeries,
  AuditLogEntry,
  AbuseSignal,
  CategoryPerformance,
  DisputeTicket,
  FinancialSummary,
  IndustryHiring,
  ModerationCompany,
  ModerationService,
  ModerationStore,
  PlatformOverview,
  RevenueDistribution,
  SecurityLogEntry,
  VerificationApplication,
} from "@/types/admin";

export const ADMIN_PLATFORM_OVERVIEW: PlatformOverview = {
  totalUsers: { value: 24847, growthPercent: 5.2, label: "Total Registered Users" },
  basicUsers: 19204,
  professionalUsers: 5643,
  totalCompanies: { value: 892, growthPercent: 3.8, label: "Registered Companies" },
  activeJobVacancies: { value: 1247, growthPercent: 7.1, label: "Active Job Vacancies" },
  totalStores: { value: 3156, growthPercent: 4.5, label: "Freelancer Stores" },
  publishedServices: { value: 12840, growthPercent: 6.3, label: "Published Services" },
  activeEscrowOrders: { value: 438, growthPercent: 2.1, label: "Active Escrow Orders" },
};

export const ADMIN_FINANCIAL_SUMMARY: FinancialSummary = {
  grossPlatformRevenue: 2847650.0,
  netSubscriptionRevenue: 486720.0,
  netCommissionRevenue: 198430.0,
  activeEscrowLiquidity: 847320.0,
  revenueGrowthPercent: 8.4,
};

export const ADMIN_USERS: AdminUserRecord[] = [
  { id: "u1", slug: "alex-morgan", fullName: "Alex Morgan", email: "alex@vora.sa", role: "professional", tier: "professional", isVerified: true, isPremium: true, isBanned: false, banType: "none", joinedAt: "2025-03-12", lastActiveAt: "2026-07-16T22:00:00Z", hasStore: true, hasCompany: false },
  { id: "u2", slug: "sarah-chen", fullName: "Sarah Chen", email: "sarah@example.com", role: "professional", tier: "professional", isVerified: true, isPremium: true, isBanned: false, banType: "none", joinedAt: "2025-06-01", lastActiveAt: "2026-07-17T08:00:00Z", hasStore: false, hasCompany: false },
  { id: "u3", slug: "mohammed-al", fullName: "Mohammed Al-Rashid", email: "m.alrashid@gmail.com", role: "user", tier: "basic", isVerified: false, isPremium: false, isBanned: false, banType: "none", joinedAt: "2026-01-15", lastActiveAt: "2026-07-15T14:00:00Z", hasStore: true, hasCompany: false },
  { id: "u4", slug: "techcorp-hr", fullName: "TechCorp HR", email: "hr@techcorp.com", role: "company", tier: "professional", isVerified: true, isPremium: false, isBanned: false, banType: "none", joinedAt: "2025-09-20", lastActiveAt: "2026-07-17T06:00:00Z", hasStore: false, hasCompany: true },
  { id: "u5", slug: "spam-user-99", fullName: "Fake Listings Bot", email: "bot@spam.net", role: "user", tier: "basic", isVerified: false, isPremium: false, isBanned: true, banType: "permanent", banReason: "Mass duplicate service listings", joinedAt: "2026-07-10", lastActiveAt: "2026-07-11T03:00:00Z", hasStore: true, hasCompany: false },
  { id: "u6", slug: "lisa-tan", fullName: "Lisa Tan", email: "lisa.tan@outlook.com", role: "user", tier: "basic", isVerified: false, isPremium: false, isBanned: true, banType: "temporary", banReason: "Harassment in direct messages", joinedAt: "2026-02-28", lastActiveAt: "2026-07-14T19:00:00Z", hasStore: false, hasCompany: false },
];

export const ADMIN_VERIFICATION_QUEUE: VerificationApplication[] = [
  { id: "v1", applicantName: "Mohammed Al-Rashid", applicantType: "individual", documentType: "National ID (Saudi Iqama)", documentUrl: "#", submittedAt: "2026-07-16T10:00:00Z", status: "pending" },
  { id: "v2", applicantName: "DesignHub KSA", applicantType: "company", documentType: "Commercial Registration (CR)", documentUrl: "#", submittedAt: "2026-07-15T14:30:00Z", status: "pending" },
  { id: "v3", applicantName: "Noura Al-Faisal", applicantType: "individual", documentType: "Freelancer Certificate (MHRSD)", documentUrl: "#", submittedAt: "2026-07-14T09:00:00Z", status: "pending" },
];

export const ADMIN_MODERATION_STORES: ModerationStore[] = [
  { id: "s1", storeName: "Alex Design Studio", ownerName: "Alex Morgan", servicesCount: 12, rating: 4.9, isHidden: false, reportCount: 0 },
  { id: "s2", storeName: "Cheap Logos Fast", ownerName: "Spam User", servicesCount: 47, rating: 2.1, isHidden: false, reportCount: 8, lastReportReason: "Template reselling / misleading portfolio" },
  { id: "s3", storeName: "Riyadh Dev Shop", ownerName: "Khalid Omar", servicesCount: 6, rating: 4.5, isHidden: false, reportCount: 1, lastReportReason: "Late delivery complaints" },
];

export const ADMIN_MODERATION_SERVICES: ModerationService[] = [
  { id: "svc1", title: "Professional Logo Design", storeName: "Alex Design Studio", price: 299, category: "Design", isHidden: false, reportCount: 0 },
  { id: "svc2", title: "Logo in 1 Hour — $5", storeName: "Cheap Logos Fast", price: 19, category: "Design", isHidden: false, reportCount: 5 },
  { id: "svc3", title: "Full Stack Web App", storeName: "Riyadh Dev Shop", price: 4500, category: "Development", isHidden: false, reportCount: 0 },
];

export const ADMIN_MODERATION_COMPANIES: ModerationCompany[] = [
  { id: "c1", name: "TechCorp Global", slug: "techcorp-global", activeJobs: 8, subscriptionStatus: "trial", licenseVerified: true, reportCount: 0 },
  { id: "c2", name: "Gulf Ventures LLC", slug: "gulf-ventures", activeJobs: 3, subscriptionStatus: "active", licenseVerified: true, reportCount: 0 },
  { id: "c3", name: "Unknown Startup Co", slug: "unknown-startup", activeJobs: 12, subscriptionStatus: "expired", licenseVerified: false, reportCount: 2 },
];

export const ADMIN_DISPUTES: DisputeTicket[] = [
  {
    id: "disp-1",
    orderId: "ord-dispute-1",
    orderNumber: "VORA-2026-9102",
    serviceTitle: "UI/UX App Design",
    buyerName: "Fatima Al-Qahtani",
    sellerName: "Alex Morgan",
    amount: 899,
    status: "urgent",
    reason: "Delivered files do not match agreed scope — missing responsive layouts",
    openedAt: "2026-07-16T18:30:00Z",
    messages: [
      { id: "m1", senderName: "System", senderRole: "system", content: "Dispute ticket opened by buyer.", createdAt: "2026-07-16T18:30:00Z" },
      { id: "m2", senderName: "Fatima Al-Qahtani", senderRole: "buyer", content: "The mobile screens are incomplete. Only 3 of 8 screens were delivered.", createdAt: "2026-07-16T18:32:00Z" },
      { id: "m3", senderName: "Alex Morgan", senderRole: "seller", content: "The remaining screens were in the revision phase. Buyer rejected without requesting revision.", createdAt: "2026-07-16T19:00:00Z" },
      { id: "m4", senderName: "Fatima Al-Qahtani", senderRole: "buyer", content: "I requested revision twice in chat before opening dispute.", createdAt: "2026-07-16T19:15:00Z" },
    ],
    attachments: [
      { id: "a1", fileName: "delivered-screens.zip", uploadedBy: "Alex Morgan", url: "#" },
      { id: "a2", fileName: "original-brief.pdf", uploadedBy: "Fatima Al-Qahtani", url: "#" },
      { id: "a3", fileName: "scope-comparison.png", uploadedBy: "Fatima Al-Qahtani", url: "#" },
    ],
    transactionLog: [
      { id: "t1", action: "Order placed — escrow locked", amount: 899, timestamp: "2026-07-10T10:00:00Z" },
      { id: "t2", action: "Requirements submitted", timestamp: "2026-07-10T14:00:00Z" },
      { id: "t3", action: "Work delivered by seller", timestamp: "2026-07-15T16:00:00Z" },
      { id: "t4", action: "Revision requested by buyer", timestamp: "2026-07-15T20:00:00Z" },
      { id: "t5", action: "Dispute opened — funds frozen", amount: 899, timestamp: "2026-07-16T18:30:00Z" },
    ],
  },
  {
    id: "disp-2",
    orderId: "ord-dispute-2",
    orderNumber: "VORA-2026-8871",
    serviceTitle: "WordPress Website Setup",
    buyerName: "Omar Hassan",
    sellerName: "Khalid Omar",
    amount: 350,
    status: "in_review",
    reason: "Seller unresponsive for 5 days after payment",
    openedAt: "2026-07-15T09:00:00Z",
    messages: [
      { id: "m1", senderName: "System", senderRole: "system", content: "Dispute ticket opened by buyer.", createdAt: "2026-07-15T09:00:00Z" },
      { id: "m2", senderName: "Omar Hassan", senderRole: "buyer", content: "No response since payment. Requirements submitted 5 days ago.", createdAt: "2026-07-15T09:05:00Z" },
    ],
    attachments: [],
    transactionLog: [
      { id: "t1", action: "Order placed — escrow locked", amount: 350, timestamp: "2026-07-10T08:00:00Z" },
      { id: "t2", action: "Dispute opened — funds frozen", amount: 350, timestamp: "2026-07-15T09:00:00Z" },
    ],
  },
];

export const ADMIN_SECURITY_LOG: SecurityLogEntry[] = [
  { id: "sec1", type: "failed_login", userEmail: "admin@vora.sa", ipAddress: "185.220.101.42", location: "Unknown (Tor exit node)", details: "5 failed login attempts in 2 minutes", timestamp: "2026-07-17T02:15:00Z", severity: "high" },
  { id: "sec2", type: "multi_device", userEmail: "alex@vora.sa", ipAddress: "46.152.88.12 / 72.14.201.55", location: "Riyadh, SA / New York, US", details: "Active sessions on 2 continents simultaneously", timestamp: "2026-07-16T20:00:00Z", severity: "medium" },
  { id: "sec3", type: "ip_anomaly", userEmail: "bot@spam.net", ipAddress: "103.28.52.99", location: "Mumbai, IN", details: "Account registered with SA phone but IN IP geolocation", timestamp: "2026-07-10T04:00:00Z", severity: "high" },
  { id: "sec4", type: "rate_limit", userEmail: "lisa.tan@outlook.com", ipAddress: "78.46.12.33", location: "Berlin, DE", details: "47 direct messages sent in 10 minutes (limit: 20)", timestamp: "2026-07-14T18:45:00Z", severity: "medium" },
];

export const ADMIN_AUDIT_LOG: AuditLogEntry[] = [
  { id: "aud1", adminName: "Owner (You)", action: "Banned user permanently", target: "Fake Listings Bot (bot@spam.net)", timestamp: "2026-07-11T10:00:00Z" },
  { id: "aud2", adminName: "Owner (You)", action: "Approved withdrawal transfer", target: "Alex Morgan — SR 5,000", timestamp: "2026-07-01T09:00:00Z" },
  { id: "aud3", adminName: "Moderator A", action: "Hidden service listing", target: "Logo in 1 Hour — $5", timestamp: "2026-07-14T15:30:00Z" },
  { id: "aud4", adminName: "Owner (You)", action: "Granted verification badge", target: "Sarah Chen", timestamp: "2026-06-20T11:00:00Z" },
];

export const ADMIN_ABUSE_SIGNALS: AbuseSignal[] = [
  { id: "ab1", userName: "Fake Listings Bot", signalType: "Duplicate listings", count: 47, threshold: 5, timestamp: "2026-07-11T03:00:00Z" },
  { id: "ab2", userName: "Lisa Tan", signalType: "DM rate limit exceeded", count: 47, threshold: 20, timestamp: "2026-07-14T18:45:00Z" },
  { id: "ab3", userName: "Cheap Logos Fast", signalType: "Reported reviews spike", count: 8, threshold: 3, timestamp: "2026-07-13T12:00:00Z" },
];

export const ADMIN_GROWTH_30D: AnalyticsTimeSeries[] = [
  { label: "W1", users: 22100, companies: 820 },
  { label: "W2", users: 22800, companies: 845 },
  { label: "W3", users: 23500, companies: 860 },
  { label: "W4", users: 24847, companies: 892 },
];

export const ADMIN_GROWTH_90D: AnalyticsTimeSeries[] = [
  { label: "Apr", users: 18200, companies: 620 },
  { label: "May", users: 20100, companies: 710 },
  { label: "Jun", users: 22800, companies: 810 },
  { label: "Jul", users: 24847, companies: 892 },
];

export const ADMIN_GROWTH_120D: AnalyticsTimeSeries[] = [
  { label: "Mar", users: 15800, companies: 540 },
  { label: "Apr", users: 18200, companies: 620 },
  { label: "May", users: 20100, companies: 710 },
  { label: "Jun", users: 22800, companies: 810 },
  { label: "Jul", users: 24847, companies: 892 },
];

export const ADMIN_REVENUE_DISTRIBUTION: RevenueDistribution[] = [
  { label: "Subscriptions", amount: 486720, color: "#3B5998" },
  { label: "Commissions (10%)", amount: 198430, color: "#EA580C" },
  { label: "Other", amount: 12450, color: "#64748B" },
];

export const ADMIN_TOP_CATEGORIES: CategoryPerformance[] = [
  { category: "Design & Branding", orders: 3840, revenue: 892400 },
  { category: "Web Development", orders: 2150, revenue: 1240000 },
  { category: "Digital Marketing", orders: 1920, revenue: 456200 },
  { category: "Video & Animation", orders: 980, revenue: 312800 },
  { category: "Writing & Translation", orders: 1650, revenue: 198500 },
];

export const ADMIN_TOP_INDUSTRIES: IndustryHiring[] = [
  { industry: "Technology & SaaS", jobCount: 412, applications: 8420 },
  { industry: "Finance & Banking", jobCount: 198, applications: 5240 },
  { industry: "Healthcare", jobCount: 156, applications: 3890 },
  { industry: "E-Commerce & Retail", jobCount: 134, applications: 3120 },
  { industry: "Construction & Engineering", jobCount: 98, applications: 2100 },
];

export function getDisputeById(id: string): DisputeTicket | undefined {
  return ADMIN_DISPUTES.find((d) => d.id === id);
}

export function getUrgentDisputeCount(): number {
  return ADMIN_DISPUTES.filter((d) => d.status === "urgent").length;
}

export const ADMIN_JOB_POSTINGS: AdminJobPosting[] = [
  { id: "job-1", title: "Senior Product Designer", companyName: "TechCorp Global", companySlug: "techcorp-global", location: "Riyadh · Hybrid", status: "active", applicationCount: 42, postedAt: "2026-07-10T08:00:00Z", requireVideoPitch: true },
  { id: "job-2", title: "Full Stack Engineer", companyName: "TechCorp Global", companySlug: "techcorp-global", location: "Remote · KSA", status: "active", applicationCount: 67, postedAt: "2026-07-08T12:00:00Z", requireVideoPitch: false },
  { id: "job-3", title: "Marketing Lead", companyName: "Gulf Ventures LLC", companySlug: "gulf-ventures", location: "Jeddah", status: "active", applicationCount: 18, postedAt: "2026-07-12T09:00:00Z", requireVideoPitch: false },
  { id: "job-4", title: "Unverified Role Post", companyName: "Unknown Startup Co", companySlug: "unknown-startup", location: "Dubai", status: "paused", applicationCount: 5, postedAt: "2026-06-20T14:00:00Z", requireVideoPitch: true },
];

export const ADMIN_RECENT_TRANSACTIONS: AdminTransaction[] = [
  { id: "tx-1", type: "subscription", reference: "SUB-2026-8841", party: "TechCorp Global", amount: 600, status: "completed", createdAt: "2026-07-17T10:30:00Z" },
  { id: "tx-2", type: "commission", reference: "ORD-2026-9102", party: "Alex Morgan (Seller)", amount: 89.9, status: "completed", createdAt: "2026-07-17T09:15:00Z" },
  { id: "tx-3", type: "escrow_release", reference: "ORD-2026-9088", party: "Sarah Chen (Buyer → Seller)", amount: 450, status: "processing", createdAt: "2026-07-17T08:00:00Z" },
  { id: "tx-4", type: "withdrawal", reference: "WD-2026-441", party: "Mohammed Al-Rashid", amount: 1200, status: "pending", createdAt: "2026-07-16T16:45:00Z" },
  { id: "tx-5", type: "refund", reference: "DISP-2026-102", party: "Fatima Al-Qahtani", amount: 899, status: "completed", createdAt: "2026-07-16T11:20:00Z" },
];
