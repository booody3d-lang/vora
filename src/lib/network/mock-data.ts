import type {
  ChatMessage,
  ConversationPreview,
  FeedPost,
  FullProfessionalProfile,
  RecommendedJob,
  TrendingInsight,
} from "@/types/network";

export const CURRENT_USER_SLUG = "alex-morgan";

export const DEMO_CURRENT_USER: FullProfessionalProfile = {
  id: "user-1",
  slug: "alex-morgan",
  fullName: "Alex Morgan",
  headline: "Senior Product Designer · UX Strategy · Design Systems",
  profilePhotoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  coverImageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=300&fit=crop",
  location: "Dubai, UAE",
  isVerified: true,
  isPremium: false,
  professionalScore: 78,
  hasFreelancerStore: true,
  freelancerStoreSlug: "alex-design-studio",
  currentRole: "Lead Product Designer",
  currentCompany: { id: "co-1", name: "TechCorp Global", slug: "techcorp-global", logoUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=TechCorp" },
  websiteUrl: "https://alexmorgan.design",
  contactEmail: "alex@vora.com",
  contactPhone: "+971 50 123 4567",
  about: "Product designer with 10+ years crafting enterprise SaaS experiences. I lead cross-functional teams to ship measurable outcomes — from discovery through delivery. Passionate about design systems, accessibility, and mentoring the next generation of designers.",
  videoIntroUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
  resumeUrl: "/sample-resume.pdf",
  experiences: [
    { id: "exp-1", title: "Lead Product Designer", companyName: "TechCorp Global", companyId: "co-1", companySlug: "techcorp-global", companyLogoUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=TechCorp", location: "Dubai, UAE", startDate: "2022-03", isCurrent: true, description: "Led redesign of enterprise dashboard used by 50K+ professionals. Reduced task completion time by 34%.", isVerified: true },
    { id: "exp-2", title: "Senior UX Designer", companyName: "Innovate Labs", companySlug: "innovate-labs", companyLogoUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=Innovate", location: "Remote", startDate: "2019-01", endDate: "2022-02", isCurrent: false, description: "Built design system adopted across 12 product teams.", isVerified: true },
  ],
  education: [
    { id: "edu-1", institution: "Royal College of Art", degree: "MA Design", fieldOfStudy: "Interaction Design", endDate: "2018", isVerified: true },
  ],
  certifications: [
    { id: "cert-1", name: "Google UX Design Professional", issuingOrganization: "Google", issueDate: "2021-06", credentialUrl: "https://coursera.org" },
  ],
  skills: [
    { id: "sk-1", name: "Product Design", endorsementCount: 47, videoVerified: true, verificationVideoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
    { id: "sk-2", name: "Design Systems", endorsementCount: 32, videoVerified: false },
    { id: "sk-3", name: "Figma", endorsementCount: 56, videoVerified: true },
    { id: "sk-4", name: "User Research", endorsementCount: 28, videoVerified: false },
  ],
  languages: [
    { id: "lang-1", language: "English", proficiency: "native" },
    { id: "lang-2", language: "Arabic", proficiency: "professional" },
  ],
  projects: [
    { id: "proj-1", title: "Enterprise Analytics Platform", description: "End-to-end redesign for Fortune 500 client.", imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=240&fit=crop", projectUrl: "https://example.com" },
  ],
};

export const DEMO_PROFILES: Record<string, FullProfessionalProfile> = {
  "alex-morgan": DEMO_CURRENT_USER,
  "sarah-chen": {
    ...DEMO_CURRENT_USER,
    id: "user-2",
    slug: "sarah-chen",
    fullName: "Sarah Chen",
    headline: "VP Engineering · Cloud Infrastructure",
    profilePhotoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    hasFreelancerStore: false,
    professionalScore: 92,
    isPremium: true,
    about: "Engineering leader scaling cloud platforms for global enterprises.",
    experiences: DEMO_CURRENT_USER.experiences,
    education: DEMO_CURRENT_USER.education,
    certifications: DEMO_CURRENT_USER.certifications,
    skills: DEMO_CURRENT_USER.skills,
    languages: DEMO_CURRENT_USER.languages,
    projects: DEMO_CURRENT_USER.projects,
  },
};

export const DEMO_JOBS: RecommendedJob[] = [
  { id: "j1", slug: "senior-product-designer", title: "Senior Product Designer", company: "TechCorp Global", companySlug: "techcorp-global", location: "Dubai, UAE", employmentType: "Full-time" },
  { id: "j2", slug: "ux-lead", title: "UX Lead", company: "Innovate Labs", companySlug: "innovate-labs", location: "Remote", employmentType: "Full-time" },
  { id: "j3", slug: "design-manager", title: "Design Manager", company: "Scale Ventures", companySlug: "scale-ventures", location: "London, UK", employmentType: "Hybrid" },
];

export const DEMO_INSIGHTS: TrendingInsight[] = [
  { id: "i1", title: "AI in Enterprise Product Design", category: "Design", readerCount: 12400 },
  { id: "i2", title: "Remote Leadership Best Practices", category: "Leadership", readerCount: 8900 },
  { id: "i3", title: "2026 Hiring Trends Report", category: "Careers", readerCount: 15600 },
];

export const DEMO_FEED: FeedPost[] = [
  {
    id: "p1",
    type: "text",
    author: { id: "user-2", slug: "sarah-chen", fullName: "Sarah Chen", headline: "VP Engineering", profilePhotoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" },
    content: "Excited to share our Q3 product launch results! We shipped 3 major features ahead of schedule, improved uptime to 99.99%, and our NPS jumped 12 points. Huge credit to the entire engineering org — this is what great teamwork looks like. 🚀\n\nKey learnings:\n• Invest early in observability\n• Cross-team design reviews save weeks downstream\n• Celebrate small wins weekly",
    reactions: { like: 124, insightful: 45, support: 18, celebrate: 32 },
    commentCount: 23,
    shareCount: 8,
    isSaved: false,
    createdAt: "2026-07-16T08:30:00Z",
    comments: [
      { id: "c1", author: { id: "user-1", slug: "alex-morgan", fullName: "Alex Morgan", headline: "Lead Designer", profilePhotoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" }, content: "Congratulations @Sarah Chen! The observability point resonates — we saw similar gains on the design side.", createdAt: "2026-07-16T09:00:00Z" },
    ],
  },
  {
    id: "p2",
    type: "poll",
    author: { id: "user-3", slug: "marcus-webb", fullName: "Marcus Webb", headline: "Head of Talent", profilePhotoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus" },
    pollQuestion: "What's your team's primary hiring focus for H2 2026?",
    pollOptions: [
      { text: "Senior IC roles", votes: 142 },
      { text: "Engineering managers", votes: 89 },
      { text: "Design & Product", votes: 67 },
      { text: "Sales & GTM", votes: 45 },
    ],
    pollExpiresAt: "2026-07-20T23:59:00Z",
    reactions: { like: 56, insightful: 34, support: 12, celebrate: 5 },
    commentCount: 15,
    shareCount: 3,
    isSaved: true,
    createdAt: "2026-07-15T14:00:00Z",
  },
  {
    id: "p3",
    type: "image",
    author: { id: "user-1", slug: "alex-morgan", fullName: "Alex Morgan", headline: "Lead Product Designer", profilePhotoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" },
    content: "New design system tokens shipped to production. Clean, accessible, and ready to scale across VORA Network. ✨",
    mediaUrls: [
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1558655146-d09347e92766?w=600&h=400&fit=crop",
    ],
    reactions: { like: 89, insightful: 21, support: 14, celebrate: 7 },
    commentCount: 11,
    shareCount: 5,
    isSaved: false,
    createdAt: "2026-07-15T10:00:00Z",
  },
  {
    id: "p4",
    type: "article",
    author: { id: "user-4", slug: "elena-rodriguez", fullName: "Elena Rodriguez", headline: "Design Director", profilePhotoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena" },
    articleTitle: "Building Design Systems That Scale Across Global Teams",
    articleCoverUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop",
    content: "After 5 years leading design systems at three Fortune 500 companies, here are the patterns that actually work when your team spans 12 time zones...",
    reactions: { like: 234, insightful: 178, support: 45, celebrate: 12 },
    commentCount: 42,
    shareCount: 67,
    isSaved: false,
    createdAt: "2026-07-14T16:00:00Z",
  },
];

export const DEMO_CONVERSATIONS: ConversationPreview[] = [
  {
    id: "conv-1",
    participant: { id: "user-2", slug: "sarah-chen", fullName: "Sarah Chen", headline: "VP Engineering", profilePhotoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah", coverImageUrl: "", location: "Singapore", isVerified: true, isPremium: true, professionalScore: 92, hasFreelancerStore: false },
    lastMessage: "Let's sync on the design review tomorrow at 10am?",
    lastMessageAt: "2026-07-16T11:30:00Z",
    unreadCount: 2,
    isTyping: false,
    accessType: "mutual_connection",
  },
  {
    id: "conv-2",
    participant: { id: "user-5", slug: "techcorp-hr", fullName: "TechCorp HR", headline: "Talent Acquisition", profilePhotoUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=TechCorpHR", coverImageUrl: "", location: "Dubai", isVerified: true, isPremium: false, professionalScore: 100, hasFreelancerStore: false },
    lastMessage: "Thank you for applying. We'd like to schedule an interview.",
    lastMessageAt: "2026-07-15T09:00:00Z",
    unreadCount: 0,
    isTyping: true,
    accessType: "hr_applicant",
  },
  {
    id: "conv-3",
    participant: { id: "user-9", slug: "omar-hassan", fullName: "Omar Hassan", headline: "Product Manager", profilePhotoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=OmarH", coverImageUrl: "", location: "Riyadh", isVerified: false, isPremium: false, professionalScore: 55, hasFreelancerStore: false },
    lastMessage: "",
    lastMessageAt: "2026-07-14T08:00:00Z",
    unreadCount: 0,
    isTyping: false,
    accessType: "locked",
  },
];

export const DEMO_MESSAGES: Record<string, ChatMessage[]> = {
  "conv-1": [
    { id: "m1", conversationId: "conv-1", senderId: "user-2", content: "Hey Alex! Loved your design system post.", status: "read", createdAt: "2026-07-16T11:00:00Z" },
    { id: "m2", conversationId: "conv-1", senderId: "user-1", content: "Thanks Sarah! Happy to walk you through the token architecture.", status: "read", createdAt: "2026-07-16T11:15:00Z" },
    { id: "m3", conversationId: "conv-1", senderId: "user-2", content: "Let's sync on the design review tomorrow at 10am?", status: "delivered", createdAt: "2026-07-16T11:30:00Z" },
  ],
  "conv-2": [
    { id: "m4", conversationId: "conv-2", senderId: "user-5", content: "Thank you for applying to Senior Product Designer. We'd like to schedule an interview.", status: "read", createdAt: "2026-07-15T09:00:00Z" },
  ],
};

export function getFreelanceStoreUrl(storeSlug: string) {
  return `/freelance/store/${storeSlug}`;
}

export function getProfileUrl(slug: string) {
  return `/network/profile/${slug}`;
}

export function getCompanyUrl(slug: string) {
  return `/network/company/${slug}`;
}
