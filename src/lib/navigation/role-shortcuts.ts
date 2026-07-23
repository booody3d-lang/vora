import type { ResolvedNavigationLink } from "@/types/navigation";
import type { PlatformContext } from "@/types/vora";
import type { VoraRole } from "@/types/security";

interface RoleShortcutContext {
  platform: PlatformContext;
  role: VoraRole;
  isAuthenticated: boolean;
  profileSlug?: string | null;
  storeSlug?: string | null;
}

function isProfileNavLink(link: ResolvedNavigationLink): boolean {
  return (
    link.labelKey === "nav.profile" ||
    link.href.includes("/profile/") ||
    link.href === "/profile/me"
  );
}

/** Role-specific shortcuts appended after base platform links */
export function appendRoleShortcuts(
  links: ResolvedNavigationLink[],
  ctx: RoleShortcutContext
): ResolvedNavigationLink[] {
  const existing = new Set(links.map((l) => l.href));
  const extras: ResolvedNavigationLink[] = [];

  function add(link: ResolvedNavigationLink) {
    if (!existing.has(link.href)) {
      extras.push(link);
      existing.add(link.href);
    }
  }

  if (!ctx.isAuthenticated) return [...links, ...extras];

  if (ctx.role === "company") {
    add({
      id: "role-company-portal",
      href: "/company/dashboard",
      icon: "🏢",
      labelKey: "company.nav.portal",
      labelEn: "Company Portal",
      labelAr: "بوابة الشركة",
    });
    add({
      id: "role-company-jobs",
      href: "/company/dashboard/jobs",
      icon: "📋",
      labelKey: "company.nav.jobs",
      labelEn: "Manage Jobs",
      labelAr: "إدارة الوظائف",
    });
  }

  if (
    ctx.platform === "network" &&
    (ctx.role === "registered" || ctx.role === "professional")
  ) {
    add({
      id: "role-network-settings",
      href: "/network/settings",
      icon: "⚙️",
      labelKey: "nav.settings",
      labelEn: "Settings",
      labelAr: "الإعدادات",
    });
    add({
      id: "role-edit-profile",
      href: "/network/settings/profile",
      icon: "✏️",
      labelKey: "profile.header.editProfile",
      labelEn: "Edit Profile",
      labelAr: "تعديل الملف",
    });
    add({
      id: "role-billing",
      href: "/billing/wallet",
      icon: "💳",
      labelKey: "billing.nav.billingLabel",
      labelEn: "Billing",
      labelAr: "الفواتير",
    });
  }

  if (ctx.role === "professional" && ctx.platform === "network") {
    add({
      id: "role-pro-ai",
      href: "/network/ai",
      icon: "✨",
      labelKey: "nav.voraAi",
      labelEn: "VORA AI",
      labelAr: "VORA AI",
    });
  }

  if (
    (ctx.role === "registered" || ctx.role === "professional") &&
    ctx.platform === "freelance"
  ) {
    add({
      id: "role-freelance-edit-profile",
      href: "/network/settings/profile",
      icon: "✏️",
      labelKey: "profile.header.editProfile",
      labelEn: "Edit Profile",
      labelAr: "تعديل الملف",
    });
    add({
      id: "role-freelance-billing",
      href: "/billing/wallet",
      icon: "💳",
      labelKey: "billing.nav.billingLabel",
      labelEn: "Billing",
      labelAr: "الفواتير",
    });

    if (ctx.storeSlug) {
      add({
        id: "role-my-store",
        href: `/freelance/store/${ctx.storeSlug}`,
        icon: "🛒",
        labelKey: "sidebar.freelance.myStore",
        labelEn: "View My Store",
        labelAr: "عرض متجري",
      });
      add({
        id: "role-edit-store",
        href: `/freelance/store/${ctx.storeSlug}/edit`,
        icon: "📝",
        labelKey: "storeEdit.editStore",
        labelEn: "Edit Store",
        labelAr: "تعديل المتجر",
      });
      add({
        id: "role-manage-store",
        href: `/freelance/manage-store`,
        icon: "⚙️",
        labelKey: "sidebar.freelance.createManageStore",
        labelEn: "Create / Manage Store",
        labelAr: "إنشاء / إدارة المتجر",
      });
      add({
        id: "role-my-services",
        href: `/freelance/manage-store?section=services`,
        icon: "📋",
        labelKey: "sidebar.freelance.myServices",
        labelEn: "My Services",
        labelAr: "خدماتي",
      });
    }
  }

  if (ctx.platform === "network" && ctx.isAuthenticated) {
    for (const link of links) {
      if (isProfileNavLink(link)) {
        link.href = ctx.profileSlug
          ? `/network/profile/${ctx.profileSlug}`
          : "/profile/me";
      }
    }
  }

  return [...links, ...extras];
}
