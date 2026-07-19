import type { PlatformContext } from "@/types/vora";
import type { VoraRole } from "@/types/security";

export type SidebarMode = PlatformContext;

export interface NavigationLinkRecord {
  id: string;
  platform: PlatformContext;
  placement: string;
  labelKey: string | null;
  labelEn: string;
  labelAr: string;
  href: string;
  icon: string | null;
  sortOrder: number;
  requiresAuth: boolean;
  minRole: VoraRole | null;
  isActive: boolean;
}

export interface ResolvedNavigationLink {
  id: string;
  href: string;
  icon: string;
  labelKey: string | null;
  labelEn: string;
  labelAr: string;
}
