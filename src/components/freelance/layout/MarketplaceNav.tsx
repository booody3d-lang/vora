"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { VoraLogo } from "@/components/brand/VoraLogo";
import { DualDashboardToggle } from "@/components/navigation/DualDashboardToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { useTranslations } from "@/i18n/use-translations";
import { getCurrentUserProfileUrl } from "@/lib/network/urls";
import type { MarketplaceService } from "@/types/freelance";
import { cn } from "@/lib/utils";

export function MarketplaceSearch() {
  const router = useRouter();
  const { t } = useTranslations();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MarketplaceService[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  async function handleInput(value: string) {
    setQuery(value);
    if (value.trim().length <= 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const res = await fetch("/api/marketplace/services");
      const data = await res.json();
      const filtered =
        (data.services as MarketplaceService[] | undefined)
          ?.filter(
            (s) =>
              s.title.toLowerCase().includes(value.toLowerCase()) ||
              s.storeName.toLowerCase().includes(value.toLowerCase())
          )
          .slice(0, 5) ?? [];
      setSuggestions(filtered);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/freelance/search?q=${encodeURIComponent(query.trim())}`);
      setShowSuggestions(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-2xl">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => query.length > 1 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={t("marketplace.searchPlaceholder")}
          className="flex-1 rounded-xl border border-white/20 bg-white/95 px-5 py-3.5 text-sm text-slate-800 shadow-lg outline-none placeholder:text-slate-400 focus:border-[#EA580C]"
        />
        <button
          type="submit"
          className="rounded-xl bg-[#EA580C] px-6 py-3.5 text-sm font-semibold text-white shadow-lg hover:opacity-90"
        >
          {t("marketplace.searchButton")}
        </button>
      </form>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {suggestions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/freelance/services/${s.slug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50"
              >
                <img src={s.thumbnailUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{s.title}</p>
                  <p className="text-xs text-slate-400">SAR {s.price} · {s.storeName}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FreelanceNav() {
  const { t } = useTranslations();
  const { fullName, avatarUrl, profilePhotoUrl, gender } = useCurrentProfile();
  const profileHref = getCurrentUserProfileUrl();

  return (
    <header className="sticky top-0 z-30 border-b border-[#EA580C]/10 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <VoraLogo size="md" href="/freelance" />
        <DualDashboardToggle />
        <nav className="flex items-center gap-3">
          <NotificationBell variant="dark" />
          <Link href="/freelance/messages" className="text-sm font-medium text-slate-600 hover:text-[#EA580C]">
            💬 {t("common.messages")}
          </Link>
          <LocaleSwitcher variant="dark" />
          <Link href="/freelance/dashboard" className="text-sm font-medium text-[#EA580C] hover:underline">
            {t("common.myStore")}
          </Link>
          <Link href={profileHref}>
            <UserAvatar
              photoUrl={profilePhotoUrl || avatarUrl}
              gender={gender}
              name={fullName}
              className="h-8 w-8 border-2 border-[#EA580C]/40"
            />
          </Link>
        </nav>
      </div>
    </header>
  );
}

const CATEGORY_IDS = [
  "all", "design", "development", "writing", "translation",
  "marketing", "business", "video", "audio", "ai",
] as const;

interface CategoryBarProps {
  active?: string;
  onSelect?: (cat: string) => void;
}

const CATEGORY_ICONS: Record<(typeof CATEGORY_IDS)[number], string> = {
  all: "🏠", design: "🎨", development: "💻", writing: "✍️", translation: "🌐",
  marketing: "📣", business: "💼", video: "🎬", audio: "🎵", ai: "🤖",
};

export function CategoryBar({ active, onSelect }: CategoryBarProps) {
  const { t } = useTranslations();

  return (
    <div className="overflow-x-auto border-b border-slate-100 bg-white">
      <div className="mx-auto flex max-w-7xl gap-1 px-4 py-2 md:px-6">
        {CATEGORY_IDS.map((catId) => (
          <button
            key={catId}
            type="button"
            onClick={() => onSelect?.(catId)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-colors",
              active === catId
                ? "bg-[#EA580C] text-white"
                : "text-slate-600 hover:bg-orange-50 hover:text-[#EA580C]"
            )}
          >
            {CATEGORY_ICONS[catId]} {t(`marketplace.categories.${catId}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
