"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";
import AdminNav from "@/components/admin-nav";
import NotificationBell from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

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

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center">
            <Button
              variant="secondary"
              size="icon"
              aria-label="Toggle menu"
              onClick={() => setOpen((v) => !v)}
              className="bg-brand-blue-500 text-white hover:bg-brand-blue-600 border-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile panel */}
        {open && (
          <div className="md:hidden border-t border-divider py-3">
            <div className="flex items-center justify-between pb-3">
              <NotificationBell />
            </div>
            <div className="pt-2">
              <AdminNav variant="mobile" onNavigate={() => setOpen(false)} />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
