import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Noto_Sans_Arabic } from "next/font/google";
import { VoraProviders } from "@/providers/VoraProviders";
import { CurrentProfileProvider } from "@/providers/CurrentProfileProvider";
import { CurrentCompanyProvider } from "@/providers/CurrentCompanyProvider";
import { LocaleProvider } from "@/providers/LocaleProvider";
import { SidebarProvider } from "@/providers/SidebarProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { PlatformThemeShell } from "@/components/layout/PlatformThemeShell";
import { AppShell } from "@/components/layout/AppShell";
import { MessagingDockRoot } from "@/components/network/messaging/MessagingDockRoot";
import { LOCALE_COOKIE, getDirection, coerceLocale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { organizationJsonLd } from "@/lib/seo/json-ld";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  display: "swap",
});

export const metadata: Metadata = buildPageMetadata({
  title: "VORA — Professional Network & Freelance Marketplace",
  description:
    "One unified account. Two powerful platforms. Build your professional future or buy and sell micro-services with escrow protection in Saudi Arabia.",
  path: "/",
  keywords: ["VORA", "professional network", "freelance", "jobs", "Saudi Arabia", "SAR", "escrow"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let locale = coerceLocale(undefined);

  try {
    const cookieStore = await cookies();
    locale = coerceLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  } catch {
    // Fall back to default locale during static generation
  }

  const dir = getDirection(locale);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoArabic.variable} antialiased`}
        data-locale={locale}
      >
        <VoraProviders>
          <CurrentProfileProvider>
          <CurrentCompanyProvider>
          <LocaleProvider initialLocale={locale}>
            <SidebarProvider>
              <NotificationProvider>
                <PlatformThemeShell>
                  <MessagingDockRoot>
                    <AppShell>{children}</AppShell>
                  </MessagingDockRoot>
                </PlatformThemeShell>
              </NotificationProvider>
            </SidebarProvider>
          </LocaleProvider>
          </CurrentCompanyProvider>
          </CurrentProfileProvider>
        </VoraProviders>
      </body>
    </html>
  );
}
