export type AdminRole = "owner" | "admin" | "moderator";
export type UserAccountRole = "user" | "professional" | "company" | "admin";
export type BanType = "none" | "temporary" | "permanent";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type DisputeStatus = "urgent" | "in_review" | "resolved_refund" | "resolved_pay_seller";
export type ModerationAction = "hide" | "delete" | "edit" | "flag";
export type SecurityEventType = "failed_login" | "multi_device" | "ip_anomaly" | "rate_limit";

export interface GrowthMetric {
  value: number;
  growthPercent: number;
  label: string;
  sublabel?: string;
}

export interface PlatformOverview {
  totalUsers: GrowthMetric;
  basicUsers: number;
  professionalUsers: number;
  totalCompanies: GrowthMetric;
  activeJobVacancies: GrowthMetric;
  totalStores: GrowthMetric;
  publishedServices: GrowthMetric;
  activeEscrowOrders: GrowthMetric;
}

export interface FinancialSummary {
  grossPlatformRevenue: number;
  netSubscriptionRevenue: number;
  netCommissionRevenue: number;
  activeEscrowLiquidity: number;
  revenueGrowthPercent: number;
}

export interface AdminUserRecord {
  id: string;
  slug: string;
  fullName: string;
  email: string;
  role: UserAccountRole;
  tier: "basic" | "professional";
  isVerified: boolean;
  isPremium: boolean;
  isBanned: boolean;
  banType: BanType;
  banReason?: string;
  joinedAt: string;
  lastActiveAt: string;
  hasStore: boolean;
  hasCompany: boolean;
}

export interface VerificationApplication {
  id: string;
  applicantName: string;
  applicantType: "individual" | "company";
  documentType: string;
  documentUrl: string;
  submittedAt: string;
  status: VerificationStatus;
}

export interface ModerationStore {
  id: string;
  storeName: string;
  ownerName: string;
  servicesCount: number;
  rating: number;
  isHidden: boolean;
  reportCount: number;
  lastReportReason?: string;
}

export interface ModerationService {
  id: string;
  title: string;
  storeName: string;
  price: number;
  category: string;
  isHidden: boolean;
  reportCount: number;
}

export interface ModerationCompany {
  id: string;
  name: string;
  slug: string;
  activeJobs: number;
  subscriptionStatus: string;
  licenseVerified: boolean;
  reportCount: number;
}

export interface DisputeTicket {
  id: string;
  orderId: string;
  orderNumber: string;
  serviceTitle: string;
  buyerName: string;
  sellerName: string;
  amount: number;
  status: DisputeStatus;
  reason: string;
  openedAt: string;
  messages: DisputeMessage[];
  attachments: DisputeAttachment[];
  transactionLog: DisputeTransactionEntry[];
}

export interface DisputeMessage {
  id: string;
  senderName: string;
  senderRole: "buyer" | "seller" | "system";
  content: string;
  createdAt: string;
}

export interface DisputeAttachment {
  id: string;
  fileName: string;
  uploadedBy: string;
  url: string;
}

export interface DisputeTransactionEntry {
  id: string;
  action: string;
  amount?: number;
  timestamp: string;
}

export interface SecurityLogEntry {
  id: string;
  type: SecurityEventType;
  userEmail: string;
  ipAddress: string;
  location: string;
  details: string;
  timestamp: string;
  severity: "low" | "medium" | "high";
}

export interface AuditLogEntry {
  id: string;
  adminName: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface AbuseSignal {
  id: string;
  userName: string;
  signalType: string;
  count: number;
  threshold: number;
  timestamp: string;
}

export interface AnalyticsTimeSeries {
  label: string;
  users: number;
  companies: number;
}

export interface RevenueDistribution {
  label: string;
  amount: number;
  color: string;
}

export interface CategoryPerformance {
  category: string;
  orders: number;
  revenue: number;
}

export interface IndustryHiring {
  industry: string;
  jobCount: number;
  applications: number;
}
