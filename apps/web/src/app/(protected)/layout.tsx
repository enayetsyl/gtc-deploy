"use client/";
import Image from "next/image";
import AdminNav from "@/components/admin-nav";
import Protected from "@/components/protected";
import NotificationBell from "@/components/notification-bell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Protected>
      <div className="p-6 space-y-6">
        <header className="flex items-center justify-between">
          <Image
            src="/logo.jpg"
            alt="GTC Logo"
            width={160}
            height={80}
            priority
            className="object-contain"
          />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <AdminNav />
          </div>
        </header>
        {children}
      </div>
    </Protected>
  );
}
