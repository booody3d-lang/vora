"use client";

import { ADD_ITEM_BUTTON_CLASS } from "@/components/profile/profile-edit-styles";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

const FALLBACK_LABELS = {
  en: "Add Item",
  ar: "أضف عنصر",
} as const;

interface AddItemButtonProps {
  onClick: () => void;
  className?: string;
}

export function AddItemButton({ onClick, className }: AddItemButtonProps) {
  const { t, locale } = useTranslations();
  const translated = t("profileEdit.addItem");
  const label =
    translated && translated !== "profileEdit.addItem"
      ? translated
      : FALLBACK_LABELS[locale === "ar" ? "ar" : "en"];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(ADD_ITEM_BUTTON_CLASS, className)}
    >
      + {label}
    </button>
  );
}
