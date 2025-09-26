"use client";

import Link from "next/link";
import Image from "next/image";
// removed unused Menu import
import AdminNav from "@/components/admin-nav";
import NotificationBell from "@/components/notification-bell";
import MobileLangSwitch from "@/components/mobile-lang-switch";
// no state needed; bottom nav handles mobile
import MobileBottomNav from "@/components/mobile-bottom-nav";

export default function Navbar() {
  return (
    <header className="w-full bg-brand-navy-800 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 focus-visible:ring-2 ring-focus rounded-md"
            >
              <Image
                src="/logo.jpg"
                alt="GTC Logo"
                width={100}
                height={60}
                className="rounded-sm object-cover"
                priority
              />
            </Link>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            <NotificationBell />
            <AdminNav />
          </div>

          {/* Mobile actions: show notification bell on small screens */}
          <div className="md:hidden flex items-center gap-2">
            <NotificationBell />
            {/* Language switch (mobile) */}
            <MobileLangSwitch />
          </div>
        </div>

        {/* Mobile panel removed; we use WhatsApp-style bottom nav */}
      </div>

      {/* Fixed mobile bottom navigation */}
      <MobileBottomNav />
    </header>
  );
}
