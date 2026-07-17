import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface VoraLogoProps {
  className?: string;
  variant?: "default" | "light";
  showWordmark?: boolean;
  href?: string;
}

export function VoraLogo({
  className,
  variant = "default",
  showWordmark = true,
  href = "/",
}: VoraLogoProps) {
  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/brand/vora-logo.svg"
        alt="VORA"
        width={40}
        height={40}
        priority
        className="h-10 w-10 shrink-0 object-contain"
      />
      {showWordmark && (
        <span
          className={cn(
            "text-xl font-bold tracking-tight",
            variant === "light" ? "text-white" : "text-[var(--vora-primary)]"
          )}
        >
          VORA
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
