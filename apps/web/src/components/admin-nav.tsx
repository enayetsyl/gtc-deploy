"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";

// Base admin items (use translation keys)
const baseItems = [
  { href: "/admin/sectors", labelKey: "nav.sectors" },
  { href: "/admin/points", labelKey: "nav.points" },
  { href: "/admin/services", labelKey: "nav.services" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { t, setLocale } = useI18n();

  // Show base admin items only to ADMIN users
  const items = user?.role === "ADMIN" ? [...baseItems] : [];

  // Role-aware prepend items
  if (user?.role === "ADMIN") {
    // Admin sees Admin Leads + Admin Conventions
    items.unshift(
      { href: "/admin/leads", labelKey: "nav.leads" },
      { href: "/admin/conventions", labelKey: "nav.conventions" },
      { href: "/admin/points-onboarding", labelKey: "nav.pointsOnboarding" },
      { href: "/admin/sector-owners", labelKey: "nav.sectorOwners" }
    );
  } else if (user?.role === "GTC_POINT") {
    // Point users see My Conventions + Point Leads
    items.unshift(
      { href: "/point/leads", labelKey: "nav.leads" },
      { href: "/point/conventions", labelKey: "nav.myConventions" },
      { href: "/point/services", labelKey: "nav.services" },
      { href: "/point/sectors", labelKey: "nav.sectors" }
    );
  } else if (user?.role === "SECTOR_OWNER") {
    // Sector owners see Owner Leads
    items.unshift({ href: "/owner/leads", labelKey: "nav.leads" });
  }

  return (
    <nav className="flex gap-2">
      {/* language switcher */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setLocale?.("en")}
          className="rounded-md border px-2 py-1 text-xs"
        >
          EN
        </button>
        <button
          onClick={() => setLocale?.("it")}
          className="rounded-md border px-2 py-1 text-xs"
        >
          IT
        </button>
      </div>
      {items.map((it) => {
        // Avoid '/admin/points' matching '/admin/points-onboarding'
        const active =
          pathname === it.href ||
          (it.href.endsWith("/")
            ? pathname?.startsWith(it.href)
            : pathname?.startsWith(it.href + "/"));
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50",
              active && "bg-black text-white hover:bg-black"
            )}
          >
            {it.labelKey ? t(it.labelKey) : it.href}
          </Link>
        );
      })}

      <button
        onClick={logout}
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        {t("nav.logout")}
      </button>
    </nav>
  );
}
