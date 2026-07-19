import Link from "next/link";

const SETTINGS_LINKS = [
  {
    href: "/network/settings/profile",
    title: "Complete profile",
    description: "Photo, headline, experience, skills, and professional score.",
  },
  {
    href: "/network/profile/edit",
    title: "Edit public profile",
    description: "Update what others see on your VORA profile.",
  },
  {
    href: "/network/settings/notifications",
    title: "Notifications",
    description: "Email, push, and in-app alert preferences.",
  },
  {
    href: "/network/settings/privacy",
    title: "Privacy & data",
    description: "Visibility, exports, and consent controls.",
  },
  {
    href: "/network/settings/security",
    title: "Security",
    description: "Password, sessions, and two-factor authentication.",
  },
] as const;

export default function NetworkSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold text-[#0F172A]">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Manage your account, profile completeness, and preferences.
      </p>
      <ul className="mt-6 space-y-3">
        {SETTINGS_LINKS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-[#3B5998]/30 hover:bg-slate-50"
            >
              <p className="font-semibold text-[#0F172A]">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500">{item.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
