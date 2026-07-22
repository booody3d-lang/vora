/** Official VORA wordmark — do not alter colors or proportions */
export const VORA_LOGO = {
  src: "/brand/vora-logo.png",
  width: 1024,
  height: 682,
} as const;

export const VORA_LOGO_SIZES = {
  xs: { height: 24, className: "h-6" },
  sm: { height: 28, className: "h-7" },
  md: { height: 36, className: "h-9" },
  lg: { height: 44, className: "h-11" },
  xl: { height: 48, className: "h-12" },
  auth: { height: 56, className: "h-14" },
} as const;

export type VoraLogoSize = keyof typeof VORA_LOGO_SIZES;

export function voraLogoDisplayWidth(height: number): number {
  return Math.round(height * (VORA_LOGO.width / VORA_LOGO.height));
}
