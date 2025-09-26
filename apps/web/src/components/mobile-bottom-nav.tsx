"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import {
  Files,
  Users,
  Layers,
  MapPin,
  Wrench,
  ClipboardList,
  UserCog,
  FolderCheck,
  MoreHorizontal,
} from "lucide-react";

// A tiny icon renderer by labelKey fallback to Files
const iconByKey: Record<string, React.ComponentType<{ className?: string }>> = {
  "nav.leads": Users,
  "nav.conventions": Files,
  "nav.myConventions": FolderCheck,
  "nav.sectors": Layers,
  "nav.points": MapPin,
  "nav.services": Wrench,
  "nav.pointsOnboarding": ClipboardList,
  "nav.sectorOwners": UserCog,
};

function ItemIcon({
  labelKey,
  className,
}: {
  labelKey: string;
  className?: string;
}) {
  const Icon = iconByKey[labelKey] ?? Files;
  return <Icon className={className} />;
}

// Build role-aware nav items mirroring AdminNav
function useRoleAwareItems(user: { role?: string } | null | undefined) {
  return useMemo(() => {
    // Base admin items
    const baseItems = [
      { href: "/admin/sectors", labelKey: "nav.sectors" },
      { href: "/admin/points", labelKey: "nav.points" },
      { href: "/admin/services", labelKey: "nav.services" },
    ];

    const items: { href: string; labelKey: string }[] =
      user?.role === "ADMIN" ? [...baseItems] : [];

    if (user?.role === "ADMIN") {
      items.unshift(
        { href: "/admin/leads", labelKey: "nav.leads" },
        { href: "/admin/conventions", labelKey: "nav.conventions" },
        { href: "/admin/points-onboarding", labelKey: "nav.pointsOnboarding" },
        { href: "/admin/sector-owners", labelKey: "nav.sectorOwners" }
      );
    } else if (user?.role === "GTC_POINT") {
      items.unshift(
        { href: "/point/leads", labelKey: "nav.leads" },
        { href: "/point/conventions", labelKey: "nav.myConventions" },
        { href: "/point/services", labelKey: "nav.services" },
        { href: "/point/sectors", labelKey: "nav.sectors" }
      );
    } else if (user?.role === "SECTOR_OWNER") {
      items.unshift(
        { href: "/owner/leads", labelKey: "nav.leads" },
        { href: "/owner/points", labelKey: "nav.points" }
      );
    }

    return items;
  }, [user]);
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useI18n();
  const items = useRoleAwareItems(user);

  const [moreOpen, setMoreOpen] = useState(false);

  // Close overflow sheet when route changes
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // WhatsApp-like: show up to 4 main tabs, rest go into More sheet
  const MAX_TABS = 4;
  const hasOverflow = items.length > MAX_TABS;
  const visibleItems = hasOverflow ? items.slice(0, MAX_TABS - 1) : items;
  const overflowItems = hasOverflow ? items.slice(MAX_TABS - 1) : [];

  if (!items.length) return null; // non-auth or roles with no items

  const activeOverflow = overflowItems.find((it) =>
    pathname?.startsWith(it.href)
  );

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Overflow sheet */}
      {hasOverflow && moreOpen && (
        <div className="absolute bottom-16 left-0 right-0 px-3">
          <div className="rounded-xl bg-white dark:bg-brand-navy-900 shadow-lg border border-gray-200/60 dark:border-white/10 overflow-hidden text-gray-800 dark:text-white">
            <ul className="max-h-72 overflow-auto divide-y divide-gray-100/60 dark:divide-white/10">
              {overflowItems.map((it) => {
                const active = pathname?.startsWith(it.href);
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={`flex items-center gap-3 px-4 py-3 text-sm ${
                        active
                          ? "bg-brand-blue-50 dark:bg-white/10 text-brand-blue-700 dark:text-white"
                          : "text-gray-700 hover:bg-gray-50 dark:text-white dark:hover:bg-white/5"
                      }`}
                    >
                      <ItemIcon labelKey={it.labelKey} className="h-5 w-5" />
                      <span className="truncate">{t(it.labelKey)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav
        aria-label="Bottom navigation"
        className="bg-white dark:bg-brand-navy-900 border-t border-gray-200 dark:border-white/10"
      >
        <ul className="grid grid-cols-4">
          {visibleItems.map((it) => {
            const active = pathname?.startsWith(it.href);
            return (
              <li key={it.href} className="list-none">
                <Link
                  href={it.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center justify-center py-2 gap-1 text-[11px] ${
                    active
                      ? "text-brand-blue-600 dark:text-white"
                      : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  <ItemIcon labelKey={it.labelKey} className="h-5 w-5" />
                  <span className="leading-none">{t(it.labelKey)}</span>
                  {/* Show text only for the active item; keep other labels accessible only */}
                  {/* {active ? (
                    <span className="leading-none">{t(it.labelKey)}</span>
                  ) : (
                    <span className="sr-only">{t(it.labelKey)}</span>
                  )} */}
                </Link>
              </li>
            );
          })}

          {hasOverflow && (
            <li className="list-none">
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-controls="mobile-nav-more"
                onClick={() => setMoreOpen((v) => !v)}
                className={`w-full flex flex-col items-center justify-center py-2 gap-1 text-[11px] ${
                  moreOpen || activeOverflow
                    ? "text-brand-blue-600 dark:text-white"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                <MoreHorizontal className="h-5 w-5" />
                {/* If an overflow item is active, show its label in the More slot; otherwise show common.more */}
                <span className="leading-none">
                  {activeOverflow
                    ? t(activeOverflow.labelKey)
                    : t("common.more") ?? "More"}
                </span>
              </button>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
