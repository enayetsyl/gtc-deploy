"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";

type AdminNavProps = {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
};

// Base admin items (use translation keys)
const baseItems = [
  { href: "/admin/sectors", labelKey: "nav.sectors" },
  { href: "/admin/points", labelKey: "nav.points" },
  { href: "/admin/services", labelKey: "nav.services" },
];

export default function AdminNav({
  variant = "desktop",
  onNavigate,
}: AdminNavProps) {
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
    items.unshift(
      { href: "/owner/leads", labelKey: "nav.leads" },
      { href: "/owner/points", labelKey: "nav.points" }
    );
  }

  const isMobile = variant === "mobile";

  return (
    <nav
      className={cn(
        isMobile ? "flex flex-col gap-2" : "flex items-center gap-2"
      )}
      aria-label={t("nav.primary")}
    >
      {/* language switcher */}
      <div
        className={cn("flex items-center gap-1", isMobile && "order-last pt-2")}
        aria-label={t("nav.languageSwitcher")}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocale?.("en")}
          className={cn(
            "px-2 py-1 text-xs",
            isMobile ? "w-min" : "",
            "bg-white/5 border-white/20 text-white hover:bg-white/10"
          )}
        >
          {t("nav.lang.en")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocale?.("it")}
          className="px-2 py-1 text-xs bg-white/5 border-white/20 text-white hover:bg-white/10"
        >
          {t("nav.lang.it")}
        </Button>
      </div>

      {items.map((it) => {
        // Avoid '/admin/points' matching '/admin/points-onboarding'
        const active =
          pathname === it.href ||
          (it.href.endsWith("/")
            ? pathname?.startsWith(it.href)
            : pathname?.startsWith(it.href + "/"));
        const linkClass = cn(
          "rounded-md px-3 py-2 text-sm",
          isMobile
            ? "block w-full text-left text-white/90 hover:text-white hover:bg-white/10"
            : "text-white/90 hover:text-white hover:bg-white/10"
        );
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            className={cn(linkClass, active && "text-white bg-white/10")}
          >
            {it.labelKey ? t(it.labelKey) : it.href}
          </Link>
        );
      })}

      <Button
        onClick={logout}
        variant={isMobile ? "secondary" : "ghost"}
        className={cn(
          isMobile
            ? "w-full bg-brand-blue-500 hover:bg-brand-blue-600 text-white cursor-pointer"
            : "text-white hover:bg-white/10 bg-transparent border-0 cursor-pointer"
        )}
        size={isMobile ? "lg" : "sm"}
      >
        {t("nav.logout")}
      </Button>
    </nav>
  );
}
