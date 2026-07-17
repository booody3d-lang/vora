import type { PlatformContext } from "@/types/vora";

/** Official VORA brand palette — Network: Blue/Slate · Freelance: Orange/Amber */
export const brandColors = {
  network: {
    blue: "#3B5998",
    slate: "#475569",
    navy: "#1E293B",
    light: "#64748B",
  },
  freelance: {
    orange: "#EA580C",
    amber: "#F59E0B",
    deep: "#C2410C",
    light: "#FB923C",
  },
  shared: {
    diamond: "#0F172A",
    white: "#FFFFFF",
  },
} as const;

export const networkTheme = {
  name: "network" as const,
  label: "VORA Network",
  description:
    "Build your professional future, apply for global corporate jobs, and scale your network.",
  primary: brandColors.network.blue,
  primaryDark: brandColors.network.navy,
  accent: brandColors.network.slate,
  surface: "#F1F5F9",
  muted: brandColors.network.light,
  gradient: `linear-gradient(135deg, ${brandColors.network.navy} 0%, ${brandColors.network.blue} 50%, ${brandColors.network.slate} 100%)`,
} as const;

export const freelanceTheme = {
  name: "freelance" as const,
  label: "VORA Freelance",
  description: "Buy and sell micro-services instantly with trusted escrow protection.",
  primary: brandColors.freelance.orange,
  primaryDark: brandColors.freelance.deep,
  accent: brandColors.freelance.amber,
  surface: "#FFFBEB",
  muted: "#A8A29E",
  gradient: `linear-gradient(135deg, ${brandColors.freelance.deep} 0%, ${brandColors.freelance.orange} 50%, ${brandColors.freelance.amber} 100%)`,
} as const;

export const themes = {
  network: networkTheme,
  freelance: freelanceTheme,
} as const;

export function getTheme(platform: PlatformContext) {
  return themes[platform];
}

export function getPlatformDataAttribute(platform: PlatformContext) {
  return platform;
}
