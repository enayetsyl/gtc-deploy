"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

// Base admin items (kept as-is)
const baseItems = [
  { href: "/admin/sectors", label: "Sectors" },
  { href: "/admin/points", label: "GTC Points" },
  { href: "/admin/services", label: "Services" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  // If you want to HIDE admin-only items for non-admins, flip this:
  // const items = user?.role === "ADMIN" ? [...baseItems] : [];
  const items = [...baseItems];

  // Role-aware prepend items
  if (user?.role === "ADMIN") {
    // Admin sees Admin Leads + Admin Conventions
    items.unshift(
      { href: "/admin/leads", label: "Leads" },
      { href: "/admin/conventions", label: "Conventions" },
    );
  } else if (user?.role === "GTC_POINT") {
    // Point users see My Conventions + Point Leads
    items.unshift(
      { href: "/point/leads", label: "Leads" },
      { href: "/point/conventions", label: "My Conventions" },
    );
  } else if (user?.role === "SECTOR_OWNER") {
    // Sector owners see Owner Leads
    items.unshift({ href: "/owner/leads", label: "Leads" });
  }

  return (
    <nav className="flex gap-2">
      {items.map((it) => {
        const active = pathname?.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50",
              active && "bg-black text-white hover:bg-black"
            )}
          >
            {it.label}
          </Link>
        );
      })}

      <button
        onClick={logout}
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        Logout
      </button>
    </nav>
  );
}
