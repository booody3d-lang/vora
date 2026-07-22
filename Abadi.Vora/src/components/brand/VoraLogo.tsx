import Image from "next/image";
import Link from "next/link";
import {
  VORA_LOGO,
  VORA_LOGO_SIZES,
  voraLogoDisplayWidth,
  type VoraLogoSize,
} from "@/lib/brand/logo";
import { cn } from "@/lib/utils";

interface VoraLogoProps {
  className?: string;
  size?: VoraLogoSize;
  /** Omit to link home (`/`). Pass `null` to render without a link wrapper. */
  href?: string | null;
  /** Classes applied to the outer Link when the logo is clickable. */
  linkClassName?: string;
  /** Set false when the logo must not render its own link wrapper. */
  linked?: boolean;
  priority?: boolean;
  /** @deprecated The PNG wordmark includes the brand name */
  showWordmark?: boolean;
  /** @deprecated No longer used — logo works on light and dark backgrounds */
  variant?: "default" | "light";
}

export function VoraLogo(props: VoraLogoProps) {
  const { className, size = "md", priority = false, linked = true, linkClassName } = props;
  const preset = VORA_LOGO_SIZES[size];
  const displayWidth = voraLogoDisplayWidth(preset.height);

  const linkHref = linked
    ? !("href" in props)
      ? "/"
      : props.href == null || props.href === ""
        ? null
        : props.href
    : null;

  const image = (
    <Image
      src={VORA_LOGO.src}
      alt="VORA"
      width={displayWidth}
      height={preset.height}
      priority={priority}
      className={cn(
        "w-auto max-w-full shrink-0 bg-transparent object-contain object-start",
        preset.className,
        className
      )}
    />
  );

  if (linkHref) {
    return (
      <Link
        href={linkHref}
        className={cn(
          linkClassName ?? "inline-flex max-w-full bg-transparent transition-opacity hover:opacity-90"
        )}
      >
        {image}
      </Link>
    );
  }

  return image;
}
