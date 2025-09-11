"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const items = [
  { href: "/admin/sectors", label: "Sectors" },
  { href: "/admin/points", label: "GTC Points" },
  { href: "/admin/services", label: "Services" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
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
